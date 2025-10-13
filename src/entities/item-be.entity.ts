import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('dbs_be_itens')
export class ItemBe {
  @PrimaryGeneratedColumn({ name: 'cod_item_be' })
  codItemBe!: number;

  @Column({ name: 'nr_ord_prod', type: 'int', nullable: true })
  nrOrdProd!: number | null;

  @Column({ name: 'numero_ordem', type: 'int', nullable: true })
  numeroOrdem!: number | null;

  @Column({ name: 'it_codigo', type: 'varchar', length: 16, nullable: true })
  itCodigo!: string | null;

  @Column({ name: 'desc_item', type: 'varchar', length: 100, nullable: true })
  descItem!: string | null;

  @Column({ name: 'encomenda', type: 'varchar', length: 20, nullable: true })
  encomenda!: string | null;

  @Column({ name: 'cod_cliente', type: 'int', nullable: true })
  codCliente!: number | null;

  @Column({ name: 'nome_cliente', type: 'varchar', length: 100, nullable: true })
  nomeCliente!: string | null;

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

  @Column({ name: 'cod_fornecedor', type: 'int', nullable: true })
  codFornecedor!: number | null;

  @Column({ name: 'nome_fornecedor', type: 'varchar', length: 100, nullable: true })
  nomeFornecedor!: string | null;

  @Column({ 
    name: 'preco_unit', 
    type: 'decimal', 
    precision: 30, 
    scale: 5, 
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => value ? parseFloat(value) : null
    }
  })
  precoUnit!: number | null;

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

  @Column({ name: 'situacao', type: 'int', nullable: true })
  situacao!: number | null;

  @Column({ name: 'projeto', type: 'varchar', length: 100, nullable: true })
  projeto!: string | null;

  @Column({ name: 'tag', type: 'varchar', length: 100, nullable: true })
  tag!: string | null;

  @Column({ name: 'data_cotacao', type: 'datetime', nullable: true })
  dataCotacao!: Date | null;

  @Column({ name: 'usuario_cotacao', type: 'varchar', length: 45, nullable: true })
  usuarioCotacao!: string | null;
}