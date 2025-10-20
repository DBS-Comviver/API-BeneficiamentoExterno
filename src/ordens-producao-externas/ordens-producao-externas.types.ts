export interface FiltrosOrdensProducao {
  encomenda?: string;
  op?: string;
  fornecedor?: string;
  data_inicial?: string;
  data_final?: string;
}

export interface DadosAPI {
  qtd_saldo: number;
  numero_ordem: number;
  situacao: number;
  nota_fiscal: string;
  un_med: string;
  qtd_atendida: number;
  it_codigo: string;
  nome_cliente: string;
  cod_cliente: number;
  desc_reserva: string;
  nr_ord_produ: number;
  it_reserva: string;
  qtd_item: number;
  desc_item: string;
  qtd_enviada: number;
  cod_forn: number;
  encomenda: string;
  nome_forn: string;
}

export interface DadosCombinados {
  id: number;
  op: number;
  oc: number;
  situacao: number;
  situacaoTexto: string;
  encomenda: string;
  codItem: string;
  descricaoItem: string;
  desenho: string;
  codReserva: string;
  descricaoReserva: string;
  qtd: number;
  projeto: string;
  tag: string;
  codFornecedor: number;
  nomeFornecedor: string;
  pesoBruto: number;
  pesoLiquido: number;
  dataExpedicao: string;
  usuarioExpedicao: string;
  dataSolicitacaoNF: string;
  usuarioSolicitacaoNF: string;
  dataEmissaoNF: string;
  usuarioEmissaoNF: string;
  numeroNF: string;
  dataEntrega: string;
  qtdSaldo: number;
  qtdAtendida: number;
  qtdEnviada: number;
  selecionado: boolean;
}

export interface DadosPainel {
  comFornecedor: DadosCombinados[];
  retornadas: DadosCombinados[];
  concluidas: DadosCombinados[];
  todos: DadosCombinados[];
}

export interface DadoGrafico {
  situacao?: string;
  fornecedor?: string;
  quantidade: number;
}