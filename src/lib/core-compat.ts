// Helpers de negócio e vitrine (compatibilidade independente com @pdv/core)

export type Centavos = number;

export const MAIOR_TETO_CENTAVOS = 10_000_000;

export function formatarCentavos(valor: Centavos): string {
  if (!Number.isSafeInteger(valor)) {
    throw new RangeError(`valor em centavos precisa ser inteiro: ${String(valor)}`);
  }
  const absoluto = Math.abs(valor);
  const centavos = absoluto % 100;
  const reais = (absoluto - centavos) / 100;
  const reaisComPontos = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${valor < 0 ? '-' : ''}${reaisComPontos},${String(centavos).padStart(2, '0')}`;
}

export type TelefoneNormalizado = { ok: true; e164: string } | { ok: false };

const DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '64', '63', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '87', '82', '83', '84', '85', '88', '86', '89',
  '91', '93', '94', '92', '97', '95', '96', '98', '99',
]);

export function ehDddDoBrasil(ddd: string): boolean {
  return DDDS.has(ddd);
}

const CELULAR = /^9\d{8}$/;
const FIXO = /^[2-5]\d{7}$/;

export function normalizarTelefone(entrada: string, dddPadrao: string): TelefoneNormalizado {
  let digitos = entrada.replace(/\D/g, '');
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) digitos = digitos.slice(2);
  if (digitos.startsWith('0') && (digitos.length === 11 || digitos.length === 12)) digitos = digitos.slice(1);

  let ddd: string;
  let numero: string;
  if (digitos.length === 8 || digitos.length === 9) {
    ddd = dddPadrao;
    numero = digitos;
  } else if (digitos.length === 10 || digitos.length === 11) {
    ddd = digitos.slice(0, 2);
    numero = digitos.slice(2);
  } else {
    return { ok: false };
  }

  if (!DDDS.has(ddd)) return { ok: false };
  if (!CELULAR.test(numero) && !FIXO.test(numero)) return { ok: false };

  return { ok: true, e164: `+55${ddd}${numero}` };
}

export const RECURSOS = [
  { codigo: 'delivery_e_balcao', nome: 'Delivery e balcão', descricao: 'Registrar pedidos de entrega e de balcão.', existe: true, conferidoNoServidor: false },
  { codigo: 'impressao', nome: 'Impressão de comandas', descricao: 'Comandas da cozinha e vias de entrega na impressora térmica.', existe: true, conferidoNoServidor: false },
  { codigo: 'cozinha', nome: 'Tela da cozinha', descricao: 'A cozinha marca o pronto numa tela, sem papel.', existe: true, conferidoNoServidor: true },
  { codigo: 'expedicao', nome: 'Expedição', descricao: 'As etapas do pedido até a entrega.', existe: true, conferidoNoServidor: false },
  { codigo: 'varios_caixas', nome: 'Vários caixas', descricao: 'Mais de um caixa aberto ao mesmo tempo.', existe: true, conferidoNoServidor: true },
  { codigo: 'acerto_do_entregador', nome: 'Acerto do entregador', descricao: 'A conta do dia de cada entregador: diária, taxas e o que ele devolve.', existe: true, conferidoNoServidor: true },
  { codigo: 'aplicativo_do_entregador', nome: 'Aplicativo do entregador', descricao: 'O entregador vê a fila e dá saída e entregue pelo celular.', existe: true, conferidoNoServidor: true },
  { codigo: 'taxa_por_distancia', nome: 'Taxa por distância', descricao: 'A taxa de entrega calculada pela distância no mapa.', existe: true, conferidoNoServidor: false },
  { codigo: 'mesas', nome: 'Mesas', descricao: 'Pedidos por mesa no salão.', existe: true, conferidoNoServidor: true },
  { codigo: 'garcom_no_celular', nome: 'Garçom no celular', descricao: 'O garçom lança o pedido da mesa pelo celular.', existe: false, conferidoNoServidor: false },
  { codigo: 'autoatendimento_tablet', nome: 'Autoatendimento no tablet', descricao: 'O cliente faz o pedido sozinho num tablet.', existe: false, conferidoNoServidor: false },
  { codigo: 'cardapio_qrcode', nome: 'Cardápio no QR code', descricao: 'O cliente abre o cardápio pelo QR code.', existe: false, conferidoNoServidor: false },
  { codigo: 'varias_unidades', nome: 'Várias unidades', descricao: 'Mais de um restaurante na mesma conta.', existe: false, conferidoNoServidor: false },
  { codigo: 'painel_consolidado', nome: 'Painel consolidado', descricao: 'Os números de todas as unidades juntos.', existe: false, conferidoNoServidor: false },
] as const;

export type CodigoDoRecurso = (typeof RECURSOS)[number]['codigo'];

export const DEGRAUS_DO_SITE = ['essencial', 'delivery_completo', 'profissional', 'empresarial'] as const;
export type DegrauDoSite = (typeof DEGRAUS_DO_SITE)[number];
export type LugarDaFuncao = DegrauDoSite | 'extra' | 'todos';
export type AndamentoDaFuncao = 'fazendo' | 'planejado';

interface BaseDaFuncao {
  id: string;
  nome: string;
  frase: string;
  lugar: LugarDaFuncao;
  andamento?: AndamentoDaFuncao;
}

export interface FuncaoDeRecurso extends BaseDaFuncao {
  recurso: CodigoDoRecurso;
}

export interface FuncaoAvulsa extends BaseDaFuncao {
  existe: boolean;
}

export type FuncaoDoSite = FuncaoDeRecurso | FuncaoAvulsa;

export const FUNCOES_DO_SITE = [
  { id: 'balcao_e_delivery', nome: 'Balcão e delivery', frase: 'Do telefone tocando à comanda na cozinha.', lugar: 'essencial', recurso: 'delivery_e_balcao' },
  { id: 'cliente_pelo_telefone', nome: 'Cliente pelo telefone', frase: 'Digitou o telefone, apareceu o cliente, com os endereços e o último pedido.', lugar: 'essencial', recurso: 'delivery_e_balcao' },
  { id: 'atalhos', nome: 'Pedido pelo teclado', frase: 'Atalhos para o que se faz o tempo todo, e o dono escolhe as teclas.', lugar: 'essencial', recurso: 'delivery_e_balcao' },
  { id: 'meio_a_meio', nome: 'Meio a meio', frase: 'De 2 a 4 sabores, cobrando pelo mais caro ou pela média.', lugar: 'essencial', recurso: 'delivery_e_balcao' },
  { id: 'comanda_configuravel', nome: 'Comanda do seu jeito', frase: 'Oito blocos que mudam de ordem, com tamanho, negrito e invertido.', lugar: 'essencial', recurso: 'impressao' },
  { id: 'comanda_por_setor', nome: 'Cada cozinha recebe o seu', frase: 'A pizza vai para a pizzaria, a bebida vai para o bar.', lugar: 'essencial', recurso: 'impressao' },
  { id: 'expedicao', nome: 'Expedição', frase: 'O pedido anda nas etapas: em preparo, pronto, saiu, entregue.', lugar: 'essencial', recurso: 'expedicao' },
  { id: 'taxa_por_faixa', nome: 'Taxa de entrega por faixa de km', frase: 'Faixas de km que você monta, e a taxa fixa por endereço.', lugar: 'essencial', recurso: 'taxa_por_distancia' },
  { id: 'varios_caixas', nome: 'Vários caixas', frase: 'Mais de um caixa aberto ao mesmo tempo, e o fechamento com a diferença na tela.', lugar: 'essencial', recurso: 'varios_caixas' },
  { id: 'acerto_do_entregador', nome: 'Acerto do entregador', frase: 'A conta do dia de cada entregador: diária, taxas, caixinha e vale.', lugar: 'essencial', recurso: 'acerto_do_entregador' },
  { id: 'aplicativo_do_entregador', nome: 'Aplicativo do entregador', frase: 'O entregador liga o celular à loja com um código, sai com o pedido e marca a entrega.', lugar: 'delivery_completo', recurso: 'aplicativo_do_entregador' },
  { id: 'tela_da_cozinha', nome: 'Tela da cozinha', frase: 'A cozinha marca o pronto numa tela, sem papel.', lugar: 'delivery_completo', recurso: 'cozinha' },
  { id: 'mesas', nome: 'Mesas e contas', frase: 'Pedidos por mesa no salão, com a conta de cada mesa.', lugar: 'profissional', recurso: 'mesas' },
  { id: 'garcom_no_celular', nome: 'App do garçom', frase: 'O garçom lança o pedido da mesa pelo celular.', lugar: 'profissional', recurso: 'garcom_no_celular', andamento: 'planejado' },
  { id: 'varias_unidades', nome: 'Várias unidades', frase: 'Mais de um restaurante na mesma conta.', lugar: 'empresarial', recurso: 'varias_unidades', andamento: 'planejado' },
  { id: 'painel_consolidado', nome: 'Painel consolidado', frase: 'Os números de todas as unidades juntos.', lugar: 'empresarial', recurso: 'painel_consolidado', andamento: 'planejado' },
  { id: 'autoatendimento_tablet', nome: 'Autoatendimento por tablet', frase: 'O cliente faz o pedido sozinho num tablet na mesa, direto para a cozinha.', lugar: 'extra', recurso: 'autoatendimento_tablet', andamento: 'planejado' },
  { id: 'pedido_pelo_qrcode', nome: 'Pedido pelo QR code', frase: 'O cliente escaneia o QR da mesa e faz o pedido pelo próprio celular. Tudo cai na conta da mesa.', lugar: 'extra', recurso: 'cardapio_qrcode', andamento: 'planejado' },
  { id: 'nota_fiscal', nome: 'Nota fiscal (NFC-e)', frase: 'A nota fiscal do consumidor emitida pelo próprio caixa.', lugar: 'extra', existe: false, andamento: 'planejado' },
  { id: 'vender_sem_internet', nome: 'Vender sem internet', frase: 'O caixa continua vendendo quando a internet cai.', lugar: 'todos', existe: false, andamento: 'fazendo' },
  { id: 'caixa_para_windows', nome: 'Caixa para Windows', frase: 'O programa do caixa instalado no computador do restaurante.', lugar: 'todos', existe: false, andamento: 'fazendo' },
  { id: 'apps_nas_lojas', nome: 'Apps nas lojas', frase: 'O app do entregador e do garçom na Google Play e na App Store.', lugar: 'todos', existe: false, andamento: 'planejado' },
  { id: 'ifood', nome: 'iFood', frase: 'Os pedidos do iFood entrando direto no caixa.', lugar: 'todos', existe: false, andamento: 'planejado' },
  { id: 'estoque', nome: 'Estoque e ficha técnica', frase: 'O estoque baixando a cada venda, pela ficha técnica.', lugar: 'todos', existe: false, andamento: 'planejado' },
  { id: 'dividir_por_item', nome: 'Dividir a conta por item', frase: 'Cada um paga o que consumiu na mesa.', lugar: 'profissional', existe: false, andamento: 'planejado' },
] as const satisfies readonly FuncaoDoSite[];

export type IdDaFuncaoDoSite = (typeof FUNCOES_DO_SITE)[number]['id'];

export function funcaoExiste(funcao: FuncaoDoSite): boolean {
  if ('recurso' in funcao) return RECURSOS.find((recurso) => recurso.codigo === funcao.recurso)?.existe === true;
  return funcao.existe;
}

export type MarcaDaFuncao = 'pronta' | 'em_breve';

export function marcaDaFuncao(funcao: FuncaoDoSite): MarcaDaFuncao {
  return funcaoExiste(funcao) ? 'pronta' : 'em_breve';
}

export type ColunaDoFuturo = 'pronto' | AndamentoDaFuncao;

export function colunaDaFuncao(funcao: FuncaoDoSite): ColunaDoFuturo {
  if (funcaoExiste(funcao)) return 'pronto';
  return funcao.andamento ?? 'planejado';
}

export function funcaoDoSite(id: IdDaFuncaoDoSite): FuncaoDoSite {
  const funcao = (FUNCOES_DO_SITE as readonly FuncaoDoSite[]).find((f) => f.id === id);
  if (funcao === undefined) throw new Error(`Função do site desconhecida: ${id}`);
  return funcao;
}

export function funcoesDoLugar(lugar: LugarDaFuncao): FuncaoDoSite[] {
  return (FUNCOES_DO_SITE as readonly FuncaoDoSite[]).filter((funcao) => funcao.lugar === lugar);
}

export function situacaoDoDegrau(degrau: DegrauDoSite): 'pronto' | 'em_parte' | 'em_breve' {
  const funcoes = funcoesDoLugar(degrau);
  const prontas = funcoes.filter(funcaoExiste).length;
  if (prontas === funcoes.length) return 'pronto';
  return prontas === 0 ? 'em_breve' : 'em_parte';
}
