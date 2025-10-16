export interface ItemEmissaoNF {
  codSolicitacao: number;
  op: number;
  oc: number;
  situacao: number;
  encomenda: string;
  codItem: string;
  descItem: string;
  codReserva: string;
  descReserva: string;
  codFornecedor: number;
  nomeFornecedor: string;
  quantidade: number;
  pesoLiquido: number;
  pesoBruto: number;
  codItemReserva: number;
  dataSolicitacao: Date;
}

export interface SolicitacaoAguardando {
  codSolicitacao: number;
  dataSolicitacao: Date;
  quantidadeItens: number;
}

export interface RespostaEmissaoNF {
  success: boolean;
  message: string;
  numeroNF?: string;
  itensProcessados: number;
}