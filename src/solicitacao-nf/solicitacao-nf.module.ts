import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitacaoNFController } from './solicitacao-nf.controller';
import { SolicitacaoNFService } from './solicitacao-nf.service';
import { SolicitacaoNF } from '../entities/solicitacao-nf';
import { ItemBeReserva } from '../entities/item-be-reservas';
import { ItemBe } from 'src/entities/item-be.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitacaoNF, ItemBeReserva, ItemBe]),
  ],
  controllers: [SolicitacaoNFController],
  providers: [SolicitacaoNFService],
  exports: [SolicitacaoNFService],
})
export class SolicitacaoNFModule {}