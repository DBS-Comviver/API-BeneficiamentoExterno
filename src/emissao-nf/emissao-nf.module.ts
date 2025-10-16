import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmissaoNFController } from './emissao-nf.controller';
import { EmissaoNFService } from './emissao-nf.service';
import { ItemBeReserva } from '../entities/item-be-reservas';
import { SolicitacaoNF } from '../entities/solicitacao-nf';
import { ItemBe } from '../entities/item-be.entity';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemBeReserva, SolicitacaoNF, ItemBe]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [EmissaoNFController],
  providers: [EmissaoNFService],
  exports: [EmissaoNFService],
})
export class EmissaoNFModule {}