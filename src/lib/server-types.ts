// Tipos mínimos de API compatíveis com @pdv/server/api para a vitrine estática
export type AnyProcedure = {
  _def: any;
  query: (...args: any[]) => Promise<any>;
  mutate: (...args: any[]) => Promise<any>;
};

export type AppRouter = {
  _def: any;
  [key: string]: any;
};

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
