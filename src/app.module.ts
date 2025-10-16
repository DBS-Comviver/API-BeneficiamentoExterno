import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CotacaoModule } from './cotacao/cotacao.module';
import { ExpedicaoModule } from './expedicao/expedicao.module';
import { ItemBe } from './entities/item-be.entity';
import { ItemBeReserva } from './entities/item-be-reservas';
import { SolicitacaoNFModule } from './solicitacao-nf/solicitacao-nf.module';
import { SolicitacaoNF } from './entities/solicitacao-nf'; 
import { EmissaoNFModule } from './emissao-nf/emissao-nf.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [ItemBe, ItemBeReserva, SolicitacaoNF], 
        synchronize: false
      }),
    }),
    HttpModule,
    CotacaoModule,
    ExpedicaoModule,
    SolicitacaoNFModule,
    EmissaoNFModule,
  ],
})
export class AppModule {}