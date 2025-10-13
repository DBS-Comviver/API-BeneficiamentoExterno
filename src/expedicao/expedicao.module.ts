import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ExpedicaoController } from './expedicao.controller';
import { ExpedicaoService } from './expedicao.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemBeReserva } from '../entities/item-be-reservas'; 
import { ConfigModule } from '@nestjs/config';
import { ItemBe } from 'src/entities/item-be.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemBeReserva, ItemBe]), 
    HttpModule,
    ConfigModule,
  ],
  controllers: [ExpedicaoController],
  providers: [ExpedicaoService],
})
export class ExpedicaoModule {}