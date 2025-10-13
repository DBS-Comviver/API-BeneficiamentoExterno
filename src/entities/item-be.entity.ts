import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('dbs_be_itens')
export class ItemBe {
  @PrimaryGeneratedColumn({ name: 'cod_item_be' })
  codItemBe: number;

  @Column({ name: 'nr_ord_prod', nullable: true })
  nrOrdProd: number;

  @Column({ name: 'numero_ordem', nullable: true })
  numeroOrdem: number;

  @Column({ name: 'it_codigo', length: 16, nullable: true })
  itCodigo: string;

  @Column({ name: 'desc_item', length: 100, nullable: true })
  descItem: string;

  @Column({ name: 'encomenda', length: 20, nullable: true })
  encomenda: string;

  @Column({ name: 'cod_cliente', nullable: true })
  codCliente: number;

  @Column({ name: 'nome_cliente', length: 100, nullable: true })
  nomeCliente: string;

  @Column({ name: 'qtd_item', type: 'decimal', precision: 30, scale: 5, nullable: true })
  qtdItem: number;

  @Column({ name: 'cod_fornecedor', nullable: true })
  codFornecedor: number;

  @Column({ name: 'nome_fornecedor', length: 100, nullable: true })
  nomeFornecedor: string;

  @Column({ name: 'preco_unit', type: 'decimal', precision: 30, scale: 5, nullable: true })
  precoUnit: number;

  @Column({ name: 'preco_total', type: 'decimal', precision: 30, scale: 5, nullable: true })
  precoTotal: number | null;

  @Column({ name: 'situacao', nullable: true })
  situacao: number;

  @Column({ name: 'projeto', length: 100, nullable: true })
  projeto: string;

  @Column({ name: 'tag', length: 100, nullable: true })
  tag: string;

  @Column({ name: 'data_cotacao', type: 'datetime', nullable: true })
  dataCotacao: Date;

  @Column({ name: 'usuario_cotacao', length: 45, nullable: true })
  usuarioCotacao: string;
}