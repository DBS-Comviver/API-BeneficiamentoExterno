import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('dbs_be_solicitacoes_nf')
export class SolicitacaoNF {
  @PrimaryGeneratedColumn({ name: 'cod_solicitacao' })
  codSolicitacao!: number;

  @Column({ name: 'data_solicitacao', type: 'datetime' })
  dataSolicitacao!: Date;

  @Column({ name: 'situacao', type: 'int', default: 1 })
  situacao!: number;

  @Column({ name: 'usuario_solicitacao', type: 'varchar', length: 45 })
  usuarioSolicitacao!: string;
}