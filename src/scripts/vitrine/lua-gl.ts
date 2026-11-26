// A lua de verdade: um shader WebGL pequeno e próprio que desenha a esfera (interseção ortográfica, como a lua
// vista da Terra), amostra o mapa de cor e o mapa de relevo da NASA e ilumina com a direção do Sol que vem da
// fase pedida. Sem biblioteca: um triângulo cobrindo o canvas e um fragment shader.
//
// Texturas (public/lua/): "CGI Moon Kit", NASA Scientific Visualization Studio (svs.gsfc.nasa.gov/4720),
// Ernie Wright (USRA) e Noah Petro (NASA/GSFC), a partir da câmera (LROC WAC) e do altímetro (LOLA) da sonda
// Lunar Reconnaissance Orbiter. Mídia da NASA, sem direitos autorais, de uso livre com o crédito acima.
// cor.webp: lroc_color_poles_4k reduzido a 2048×1024. normais.webp: mapa de normais (espaço tangente,
// equiretangular) calculado do ldem_16_uint (altímetro, meio metro por unidade) reduzido a 2048×1024.
//
// Reflexão de Lommel-Seeliger (a lua cheia fica chata, sem a "bola" do Lambert), terminador suave, luz cinérea
// azulada no lado escuro (a Terra iluminando a lua), halo que abraça o limbo aceso, o anel fino do eclipse da
// abertura e, para o rodapé, a sombra da Terra com penumbra macia e um resto acobreado.

const VERT = `
attribute vec2 aPos;
uniform vec2 uRes;
varying vec2 vPx;
void main(){
  vPx = vec2((aPos.x * 0.5 + 0.5) * uRes.x, (1.0 - (aPos.y * 0.5 + 0.5)) * uRes.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec2 uCentro;
uniform float uRaio;
uniform vec3 uSol;
uniform mat3 uRot;
uniform float uAnel, uAro, uHalo, uCinza, uExpo, uRelevo, uTemTex, uLuz, uClaro;
uniform vec3 uTom;
uniform vec4 uSombra;
uniform sampler2D uCor, uNorm;
varying vec2 vPx;

const float PI = 3.14159265;
vec3 paraLinear(vec3 c){ return pow(c, vec3(2.2)); }
vec3 paraSrgb(vec3 c){ return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
// compõe uma camada (cor já multiplicada pela opacidade) sobre o acumulado
void sobre(inout vec3 cor, inout float alfa, vec3 c, float a){ cor = c + cor * (1.0 - a); alfa = a + alfa * (1.0 - a); }

void main(){
  vec2 d = (vPx - uCentro) / uRaio;
  float rho = length(d);
  float px = (rho - 1.0) * uRaio;
  // o halo acaba a 0,34 raio do limbo: fora disso não há nada a desenhar (e o canvas pode ser justo)
  if (px > uRaio * 0.34) discard;
  vec3 cor = vec3(0.0);
  float alfa = 0.0;
  const vec3 LUAR = vec3(0.863, 0.890, 0.933);
  vec3 S = uRot * uSol;
  if (px < 1.0) {
    float r2 = min(rho * rho, 1.0);
    float z = sqrt(1.0 - r2);
    vec3 P = uRot * vec3(d.x, -d.y, z);
    float lon = atan(P.x, P.z);
    float lat = asin(clamp(P.y, -1.0, 1.0));
    vec2 uv = vec2(0.5 + lon / (2.0 * PI), 0.5 - lat / PI);
    vec3 alb = vec3(0.16);
    vec3 N = P;
    if (uTemTex > 0.5) {
      alb = paraLinear(texture2D(uCor, uv).rgb);
      vec3 nt = texture2D(uNorm, uv).xyz * 2.0 - 1.0;
      vec3 T = vec3(cos(lon), 0.0, -sin(lon));
      vec3 B = vec3(sin(lat) * sin(lon), -cos(lat), sin(lat) * cos(lon));
      N = normalize(P + uRelevo * (nt.x * T + nt.y * B));
    }
    vec3 V = uRot * vec3(0.0, 0.0, 1.0);
    float mu0g = dot(P, S);
    float mu0 = max(dot(N, S), 0.0);
    float mu = max(dot(N, V), 0.02);
    // o terminador geométrico, suave: o relevo não acende o que está do lado da noite
    float term = smoothstep(-0.02, 0.10, mu0g);
    float ls = mu0 / (mu0 + mu);
    float dif = (0.72 * 2.0 * ls + 0.28 * mu0) * term;
    dif *= 1.0 + 0.18 * smoothstep(0.75, 1.0, dot(V, S));
    vec3 lum = alb * dif * uExpo;
    lum += alb * uCinza * (0.55 + 0.45 * z) * vec3(0.80, 0.90, 1.0);
    float ds = length(d - uSombra.xy);
    float cob = (1.0 - smoothstep(uSombra.z - 0.11, uSombra.z + 0.02, ds)) * uSombra.w;
    vec3 umbra = alb * 0.020 * vec3(1.0, 0.72, 0.58) + 0.003;
    lum = mix(lum, umbra, cob);
    lum = lum * uTom;
    lum = lum / (1.0 + 0.45 * lum) * 1.45;
    if (uClaro > 0.5) {
      float borda = clamp(-px + 0.5, 0.0, 1.0);
      float relevoLua = clamp(dif * 1.65, 0.0, 1.0);
      float aDisco = borda * (0.035 + 0.30 * relevoLua) * uLuz;
      vec3 tinta = mix(vec3(0.50, 0.47, 0.42), uTom * 0.36, relevoLua);
      cor = tinta * aDisco;
      alfa = aDisco;
      float aro = clamp(1.0 - abs(px + 0.6), 0.0, 1.0) * 0.24 * uAro;
      sobre(cor, alfa, vec3(0.32, 0.29, 0.24) * aro, aro);
    } else {
      cor = paraSrgb(lum) * uLuz;
      alfa = clamp(-px + 0.5, 0.0, 1.0);
      cor *= alfa;
      float aro = clamp(1.0 - abs(px + 0.8), 0.0, 1.0) * 0.12 * uAro;
      sobre(cor, alfa, LUAR * aro, aro);
    }
  }
  if (px > -1.0 && uClaro < 0.5) {
    vec2 dir = rho > 0.0001 ? d / rho : vec2(0.0, 1.0);
    vec3 n = vec3(dir.x, -dir.y, 0.0);
    float lit = max(smoothstep(0.0, 0.35, dot(n, uSol)), 0.6 * smoothstep(0.8, 1.0, uSol.z));
    float dd = max(px, 0.0) / uRaio;
    float g = uHalo * lit * (0.34 * exp(-dd / 0.025) + 0.14 * exp(-dd / 0.10) + 0.06 * exp(-dd / 0.30));
    g = min(g, 0.5) * (1.0 - smoothstep(0.10, 0.33, dd));
    sobre(cor, alfa, LUAR * g, g);
  }
  if (uAnel > 0.001) {
    float a = clamp(1.6 - abs(px - 0.7), 0.0, 1.0) * 0.92 * uAnel;
    float c = exp(-max(px, 0.0) / (0.045 * uRaio)) * 0.16 * uAnel * step(0.0, px);
    vec3 corAnel = uClaro > 0.5 ? vec3(0.32, 0.29, 0.24) : LUAR;
    vec3 brilhoAnel = uClaro > 0.5 ? vec3(0.25, 0.23, 0.20) : vec3(0.95, 0.957, 0.973);
    sobre(cor, alfa, corAnel * c, c);
    sobre(cor, alfa, brilhoAnel * a, a);
  }
  gl_FragColor = vec4(cor, alfa);
}`

/** Uma lua a desenhar: posição em px de CSS dentro do canvas, fase e acabamento. */
export interface Lua {
  cx: number
  cy: number
  r: number
  /** Ângulo de fase em graus: 180 nova, 90 meia, 0 cheia. */
  theta: number
  /** Para onde a luz pende, em graus: 0 por baixo, 90 pela direita. */
  phi?: number
  /** Giro do disco em volta do eixo do olhar (graus). */
  roll?: number
  /** Libração em latitude (graus). */
  tilt?: number
  /** O anel fino do eclipse (0 a 1). */
  anel?: number
  aro?: number
  halo?: number
  /** A luz cinérea do lado escuro. */
  cinza?: number
  expo?: number
  relevo?: number
  luz?: number
  claro?: boolean
  tom?: readonly [number, number, number]
  /** A sombra da Terra: centro (x, y em raios), raio (em raios) e força. */
  sombra?: readonly [number, number, number, number]
}

export interface Renderizador {
  /** Desenha as luas (limpa o canvas antes). Devolve false se o contexto se perdeu. */
  desenhar(luas: readonly Lua[]): boolean
  /** Ajusta o tamanho do canvas ao tamanho em CSS; chame ao redimensionar. */
  medir(): void
  /** Resolve quando as texturas estão no canvas (false se falharam: a lua fica lisa). */
  pronto: Promise<boolean>
  perdido: boolean
}

const UNIFORMES = ['uRes', 'uCentro', 'uRaio', 'uSol', 'uRot', 'uAnel', 'uAro', 'uHalo', 'uCinza', 'uExpo', 'uRelevo', 'uTemTex', 'uLuz', 'uClaro', 'uTom', 'uSombra', 'uCor', 'uNorm'] as const
type Uniforme = (typeof UNIFORMES)[number]

const COR = '/lua/cor.webp'
const NORMAIS = '/lua/normais.webp'
/** O maior número de pixels por canvas: acima disso o devicePixelRatio é reduzido. */
const PIXELS_MAXIMOS = 4.2e6

let texturas: Promise<[HTMLImageElement, HTMLImageElement] | null> | null = null
function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => ok(img)
    img.onerror = () => falha(new Error(src))
    img.src = src
  })
}
/** As duas imagens, baixadas uma vez por página (os dois canvas as sobem cada um para o seu contexto). */
export function texturasDaLua(): Promise<[HTMLImageElement, HTMLImageElement] | null> {
  if (texturas === null) texturas = Promise.all([carregar(COR), carregar(NORMAIS)]).catch(() => null)
  return texturas
}

/** Se o navegador tem WebGL (um contexto de prova, descartado em seguida). */
export function temWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl', { failIfMajorPerformanceCaveat: true })
    if (gl === null) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

function rotacao(rollG: number, tiltG: number): Float32Array {
  const cr = Math.cos(rollG)
  const sr = Math.sin(rollG)
  const ct = Math.cos(tiltG)
  const st = Math.sin(tiltG)
  // olhar → objeto: Rx(tilt) · Rz(roll), em colunas
  const Rz = [cr, sr, 0, -sr, cr, 0, 0, 0, 1]
  const Rx = [1, 0, 0, 0, ct, st, 0, -st, ct]
  const m = new Float32Array(9)
  for (let c = 0; c < 3; c++)
    for (let r = 0; r < 3; r++) {
      let soma = 0
      for (let k = 0; k < 3; k++) soma += Rx[k * 3 + r]! * Rz[c * 3 + k]!
      m[c * 3 + r] = soma
    }
  return m
}

export function criarRenderizador(canvas: HTMLCanvasElement): Renderizador | null {
  let gl: WebGLRenderingContext | null
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' })
  } catch {
    gl = null
  }
  if (gl === null) return null
  const GL = gl

  function compilar(tipo: number, fonte: string): WebGLShader {
    const s = GL.createShader(tipo)
    if (s === null) throw new Error('shader')
    GL.shaderSource(s, fonte)
    GL.compileShader(s)
    if (!GL.getShaderParameter(s, GL.COMPILE_STATUS)) throw new Error(GL.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  let programa: WebGLProgram
  try {
    const p = GL.createProgram()
    if (p === null) return null
    GL.attachShader(p, compilar(GL.VERTEX_SHADER, VERT))
    GL.attachShader(p, compilar(GL.FRAGMENT_SHADER, FRAG))
    GL.linkProgram(p)
    if (!GL.getProgramParameter(p, GL.LINK_STATUS)) return null
    programa = p
  } catch {
    return null
  }
  GL.useProgram(programa)
  const buffer = GL.createBuffer()
  GL.bindBuffer(GL.ARRAY_BUFFER, buffer)
  GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), GL.STATIC_DRAW)
  const aPos = GL.getAttribLocation(programa, 'aPos')
  GL.enableVertexAttribArray(aPos)
  GL.vertexAttribPointer(aPos, 2, GL.FLOAT, false, 0, 0)
  const U = {} as Record<Uniforme, WebGLUniformLocation | null>
  for (const nome of UNIFORMES) U[nome] = GL.getUniformLocation(programa, nome)
  GL.uniform1i(U.uCor, 0)
  GL.uniform1i(U.uNorm, 1)
  GL.enable(GL.BLEND)
  GL.blendFunc(GL.ONE, GL.ONE_MINUS_SRC_ALPHA)

  let temTex = 0
  function subir(unidade: number, img: HTMLImageElement): void {
    const t = GL.createTexture()
    GL.activeTexture(GL.TEXTURE0 + unidade)
    GL.bindTexture(GL.TEXTURE_2D, t)
    GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, false)
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, img)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR_MIPMAP_LINEAR)
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR)
    GL.generateMipmap(GL.TEXTURE_2D)
    const aniso = GL.getExtension('EXT_texture_filter_anisotropic')
    if (aniso) GL.texParameterf(GL.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, GL.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number))
  }
  const estado: Renderizador = {
    perdido: false,
    pronto: texturasDaLua().then((imgs) => {
      if (imgs === null || estado.perdido) return false
      subir(0, imgs[0])
      subir(1, imgs[1])
      temTex = 1
      return true
    }),
    medir,
    desenhar,
  }
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    estado.perdido = true
  })

  let largura = 0
  let altura = 0
  let escala = 1
  function medir(): void {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    escala = Math.min(devicePixelRatio || 1, 2, Math.sqrt(PIXELS_MAXIMOS / Math.max(1, w * h)))
    const pw = Math.max(1, Math.round(w * escala))
    const ph = Math.max(1, Math.round(h * escala))
    if (pw !== largura || ph !== altura) {
      largura = pw
      altura = ph
      canvas.width = pw
      canvas.height = ph
      GL.viewport(0, 0, pw, ph)
    }
  }

  function desenhar(luas: readonly Lua[]): boolean {
    if (estado.perdido) return false
    if (largura === 0) medir()
    GL.clearColor(0, 0, 0, 0)
    GL.clear(GL.COLOR_BUFFER_BIT)
    GL.uniform2f(U.uRes, largura, altura)
    for (const L of luas) {
      const th = (L.theta * Math.PI) / 180
      const ph = ((L.phi ?? 0) * Math.PI) / 180
      GL.uniform2f(U.uCentro, L.cx * escala, L.cy * escala)
      GL.uniform1f(U.uRaio, L.r * escala)
      GL.uniform3f(U.uSol, Math.sin(th) * Math.sin(ph), -Math.sin(th) * Math.cos(ph), Math.cos(th))
      GL.uniformMatrix3fv(U.uRot, false, rotacao(((L.roll ?? 0) * Math.PI) / 180, ((L.tilt ?? 0) * Math.PI) / 180))
      GL.uniform1f(U.uAnel, L.anel ?? 0)
      GL.uniform1f(U.uAro, L.aro ?? 1)
      GL.uniform1f(U.uHalo, L.halo ?? 1)
      GL.uniform1f(U.uCinza, L.cinza ?? 0.055)
      GL.uniform1f(U.uExpo, L.expo ?? 1.5)
      GL.uniform1f(U.uRelevo, L.relevo ?? 1.6)
      GL.uniform1f(U.uTemTex, temTex)
      GL.uniform1f(U.uLuz, L.luz ?? 1)
      GL.uniform1f(U.uClaro, L.claro ? 1 : 0)
      const tom = L.tom ?? [1, 1, 1]
      GL.uniform3f(U.uTom, tom[0], tom[1], tom[2])
      const s = L.sombra ?? [0, 0, 0, 0]
      GL.uniform4f(U.uSombra, s[0], s[1], s[2], s[3])
      GL.drawArrays(GL.TRIANGLES, 0, 3)
    }
    return true
  }
  return estado
}

/** Os três tons da luz pela hora do dia: neutro no almoço, quente à tarde, azulado à noite (como a abertura já fazia). */
export const TONS_DA_LUA: readonly (readonly [number, number, number])[] = [
  [0.94, 0.965, 1.0],
  [1.0, 0.95, 0.88],
  [0.88, 0.935, 1.05],
]
