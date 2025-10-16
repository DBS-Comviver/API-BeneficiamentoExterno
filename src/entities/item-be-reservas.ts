import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SolicitacaoNF } from './solicitacao-nf';

@Entity('dbs_be_itens_reservas')
export class ItemBeReserva {
  @PrimaryGeneratedColumn({ name: 'cod_item_reserva' })
  codItemReserva!: number;

  @Column({ name: 'nr_ord_prod', type: 'int', nullable: true })
  nrOrdProd!: number | null;

  @Column({ name: 'numero_ordem', type: 'int', nullable: true })
  numeroOrdem!: number | null;

  @Column({ name: 'data_emissao', type: 'date', nullable: true })
  dataEmissao!: Date | null;

  @Column({ name: 'situacao', type: 'int', nullable: true })
  situacao!: number | null;

  @Column({ name: 'encomenda', type: 'varchar', length: 25, nullable: true })
  encomenda!: string | null;

  @Column({ name: 'it_codigo', type: 'varchar', length: 16, nullable: true })
  itCodigo!: string | null;

  @Column({ name: 'desc_item', type: 'varchar', length: 100, nullable: true })
  descItem!: string | null;

  @Column({ name: 'it_reserva', type: 'varchar', length: 16, nullable: true })
  itReserva!: string | null;

  @Column({ name: 'desc_reserva', type: 'varchar', length: 100, nullable: true })
  descReserva!: string | null;

  @Column({ 
    name: 'qtd_item', 
    type: 'decimal', 
    precision: 30, 
    scale: 5, 
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => value ? parseFloat(value) : null
    }
  })
  qtdItem!: number | null;

  @Column({ 
    name: 'saldo', 
    type: 'decimal', 
    precision: 30, 
    scale: 5, 
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => value ? parseFloat(value) : null
    }
  })
  saldo!: number | null;

  @Column({ 
    name: 'qtd_atendida', 
    type: 'decimal', 
    precision: 30, 
    scale: 5, 
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => value ? parseFloat(value) : null
    }
  })
  qtdAtendida!: number | null;

  @Column({ 
    name: 'qtd_forn', 
    type: 'decimal', 
    precision: 30, 
    scale: 5, 
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => value ? parseFloat(value) : null
    }
  })
  qtdForn!: number | null;

  @Column({ name: 'projeto', type: 'varchar', length: 45, nullable: true })
  projeto!: string | null;

  @Column({ name: 'tag', type: 'varchar', length: 45, nullable: true })
  tag!: string | null;

  @Column({ name: 'cod_fornecedor', type: 'int', nullable: true })
  codFornecedor!: number | null;

  @Column({ name: 'nome_fornecedor', type: 'varchar', length: 100, nullable: true })
  nomeFornecedor!: string | null;

  @Column({ 
    name: 'peso_liquido', 
    type: 'decimal', 
    precision: 30, 
    scale: 5, 
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => value ? parseFloat(value) : null
    }
  })
  pesoLiquido!: number | null;

  @Column({ 
    name: 'peso_bruto', 
    type: 'decimal', 
    precision: 30, 
    scale: 5, 
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => value ? parseFloat(value) : null
    }
  })
  pesoBruto!: number | null;

  @Column({ name: 'data_insercao', type: 'datetime', nullable: true })
  dataInsercao!: Date | null;

  @Column({ name: 'usuario_insercao', type: 'varchar', length: 45, nullable: true })
  usuarioInsercao!: string | null;

  @Column({ name: 'data_expedicao', type: 'datetime', nullable: true })
  dataExpedicao!: Date | null;

  @Column({ name: 'usuario_expedicao', type: 'varchar', length: 45, nullable: true })
  usuarioExpedicao!: string | null;

  @Column({ name: 'data_solicitacao_nf', type: 'datetime', nullable: true })
  dataSolicitacaoNf!: Date | null;

  @Column({ name: 'usuario_solicitacao_nf', type: 'varchar', length: 45, nullable: true })
  usuarioSolicitacaoNf!: string | null;

  @Column({ name: 'data_emissao_nf', type: 'datetime', nullable: true })
  dataEmissaoNf!: Date | null;

  @Column({ name: 'usuario_emissao_nf', type: 'varchar', length: 45, nullable: true })
  usuarioEmissaoNf!: string | null;

  @Column({ name: 'numero_nf', type: 'varchar', length: 255, nullable: true })
  numeroNf!: string | null;

  @Column({ name: 'data_entrega', type: 'datetime', nullable: true })
  dataEntrega!: Date | null;

  @Column({ 
    name: 'preco_unitario', 
    type: 'decimal', 
    precision: 30, 
    scale: 5, 
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => value ? parseFloat(value) : null
    }
  })
  precoUnitario!: number | null;

  @Column({ 
    name: 'preco_total', 
    type: 'decimal', 
    precision: 30, 
    scale: 5, 
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => value ? parseFloat(value) : null
    }
  })
  precoTotal!: number | null;

  @Column({ name: 'cod_cliente', type: 'int', nullable: true })
  codCliente!: number | null;

  @Column({ name: 'nome_cliente', type: 'varchar', length: 100, nullable: true })
  nomeCliente!: string | null;

  @Column({ name: 'cod_solicitacao', type: 'int', nullable: true })
  codSolicitacao!: number | null;

  @Column({ name: 'cod_item_be', type: 'int', nullable: true })
  codItemBe!: number | null;

  @ManyToOne(() => SolicitacaoNF, (solicitacao) => solicitacao.reservas)
  @JoinColumn({ name: 'cod_solicitacao' })
  solicitacao!: SolicitacaoNF;
}