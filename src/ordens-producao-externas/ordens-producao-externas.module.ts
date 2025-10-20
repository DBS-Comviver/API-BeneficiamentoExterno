import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { OrdensProducaoExternasService } from './ordens-producao-externas.service';
import { OrdensProducaoExternasController } from './ordens-producao-externas.controller';
import { ItemBeReserva } from '../entities/item-be-reservas';
import { ItemBe } from '../entities/item-be.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemBeReserva, ItemBe]),
    HttpModule,
  ],
  controllers: [OrdensProducaoExternasController],
  providers: [OrdensProducaoExternasService],
  exports: [OrdensProducaoExternasService],
})
export class OrdensProducaoExternasModule {}