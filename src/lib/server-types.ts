// Tipos mínimos de API compatíveis com @pdv/server/api para a vitrine estática
export type AppRouter = any;

export interface CausaDeNegocio {
  tipo: string;
  tentarDeNovoEmSegundos: number;
}

export interface DadosDoErro {
  code: string;
  causa?: unknown;
  validacao?: unknown;
}

export interface ErrosDeValidacao {
  gerais: string[];
  campos: Record<string, string[]>;
}
