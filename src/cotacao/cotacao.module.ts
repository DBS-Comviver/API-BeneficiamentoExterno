import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CotacaoController } from './cotacao.controller';
import { CotacaoService } from './cotacao.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemBe } from '../entities/item-be.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemBe]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [CotacaoController],
  providers: [CotacaoService],
})
export class CotacaoModule {}