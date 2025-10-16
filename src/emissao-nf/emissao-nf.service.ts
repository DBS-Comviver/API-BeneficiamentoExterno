import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { ItemBeReserva } from '../entities/item-be-reservas';
import { SolicitacaoNF } from '../entities/solicitacao-nf';
import { ItemBe } from '../entities/item-be.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { ItemEmissaoNF, SolicitacaoAguardando, RespostaEmissaoNF } from './emissao-nf.types';

@Injectable()
export class EmissaoNFService {
  private readonly logger = new Logger(EmissaoNFService.name);

  constructor(
    @InjectRepository(ItemBeReserva)
    private itemBeReservaRepository: Repository<ItemBeReserva>,
    @InjectRepository(SolicitacaoNF)
    private solicitacaoNFRepository: Repository<SolicitacaoNF>,
    @InjectRepository(ItemBe)
    private itemBeRepository: Repository<ItemBe>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private getApiBaseUrl(): string {
    return this.configService.get<string>('EXTERNAL_API_BASE_URL') || '';
  }

  private getAuthHeader(): string {
    const user = this.configService.get<string>('EXTERNAL_API_USER');
    const pass = this.configService.get<string>('EXTERNAL_API_PASSWORD');
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }

  async getItensAguardandoEmissao(filters: { encomenda?: string; op?: string; oc?: string }): Promise<ItemEmissaoNF[]> {
    try {
      this.logger.log('Buscando itens aguardando emissão de NF');

        let query = this.itemBeReservaRepository
        .createQueryBuilder('reserva')
        .leftJoinAndSelect('reserva.solicitacao', 'solicitacao') 
        .select([
            'solicitacao.codSolicitacao as codSolicitacao',
            'reserva.nrOrdProd as op',
            'reserva.numeroOrdem as oc',
            'reserva.situacao as situacao',
            'reserva.encomenda as encomenda',
            'reserva.itCodigo as codItem',
            'reserva.descItem as descItem',
            'reserva.itReserva as codReserva',
            'reserva.descReserva as descReserva',
            'reserva.codFornecedor as codFornecedor',
            'reserva.nomeFornecedor as nomeFornecedor',
            'reserva.qtdForn as quantidade',
            'reserva.pesoLiquido as pesoLiquido',
            'reserva.pesoBruto as pesoBruto',
            'reserva.codItemReserva as codItemReserva',
            'solicitacao.dataSolicitacao as dataSolicitacao'
        ])
        .where('reserva.dataExpedicao IS NOT NULL') 
        .andWhere('reserva.codSolicitacao IS NOT NULL') 
        .andWhere('reserva.dataEmissaoNf IS NULL');

        query = query.andWhere('solicitacao.situacao = :situacao', { situacao: 1 });

      if (filters.encomenda) {
        query = query.andWhere('reserva.encomenda = :encomenda', { encomenda: filters.encomenda });
      }

      if (filters.op) {
        const opNum = parseInt(filters.op, 10);
        if (!isNaN(opNum)) {
          query = query.andWhere('reserva.nrOrdProd = :op', { op: opNum });
        }
      }

      if (filters.oc) {
        const ocNum = parseInt(filters.oc, 10);
        if (!isNaN(ocNum)) {
          query = query.andWhere('reserva.numeroOrdem = :oc', { oc: ocNum });
        }
      }

      query = query.orderBy('solicitacao.dataSolicitacao', 'ASC');

      const result = await query.getRawMany();

      this.logger.log(`Encontrados ${result.length} itens aguardando emissão de NF`);

      return result.map(item => ({
        codSolicitacao: item.codSolicitacao,
        op: item.op,
        oc: item.oc,
        situacao: item.situacao,
        encomenda: item.encomenda,
        codItem: item.codItem,
        descItem: item.descItem,
        codReserva: item.codReserva,
        descReserva: item.descReserva,
        codFornecedor: item.codFornecedor,
        nomeFornecedor: item.nomeFornecedor,
        quantidade: item.quantidade,
        pesoLiquido: item.pesoLiquido,
        pesoBruto: item.pesoBruto,
        codItemReserva: item.codItemReserva,
        dataSolicitacao: item.dataSolicitacao
    }));

    } catch (error) {
      this.logger.error('Erro ao buscar itens aguardando emissão:', error);
      throw new InternalServerErrorException('Falha ao buscar itens para emissão de NF');
    }
  }

  async getSolicitacoesAguardando(): Promise<SolicitacaoAguardando[]> {
    try {
      this.logger.log('Buscando solicitações aguardando emissão de NF');

      const result = await this.solicitacaoNFRepository
        .createQueryBuilder('solicitacao')
        .innerJoin('itemBeReserva', 'reserva', 'reserva.codSolicitacao = solicitacao.codSolicitacao')
        .select([
          'solicitacao.codSolicitacao as codSolicitacao',
          'solicitacao.dataSolicitacao as dataSolicitacao',
          'COUNT(reserva.codItemReserva) as quantidadeItens'
        ])
        .where('solicitacao.situacao = :situacao', { situacao: 1 }) 
        .andWhere('reserva.dataEmissaoNf IS NULL')
        .groupBy('solicitacao.codSolicitacao')
        .addGroupBy('solicitacao.dataSolicitacao')
        .orderBy('solicitacao.dataSolicitacao', 'ASC')
        .getRawMany();

      this.logger.log(`Encontradas ${result.length} solicitações aguardando emissão`);

      return result.map(item => ({
        codSolicitacao: item.codSolicitacao,
        dataSolicitacao: item.dataSolicitacao,
        quantidadeItens: parseInt(item.quantidadeItens, 10)
      }));

    } catch (error) {
      this.logger.error('Erro ao buscar solicitações aguardando emissão:', error);
      throw new InternalServerErrorException('Falha ao buscar solicitações para emissão de NF');
    }
  }

  async emitirNotaFiscal(itens: { codItemReserva: number }[], usuario: string, codSolicitacao: number): Promise<RespostaEmissaoNF> {
    try {
      this.logger.log(`Iniciando emissão de NF para solicitação ${codSolicitacao}, ${itens.length} itens`);

      for (const item of itens) {
        const reserva = await this.itemBeReservaRepository.findOne({
          where: { 
            codItemReserva: item.codItemReserva,
            codSolicitacao: codSolicitacao,
            dataExpedicao: Not(IsNull()),
            dataEmissaoNf: IsNull()
          }
        });

        if (!reserva) {
          throw new Error(`Item ${item.codItemReserva} não encontrado ou não está apto para emissão`);
        }
      }

      // pendente : emissão da NF 
      this.logger.log('Simulando integração com API do Datasul...');
      const numeroNF = this.gerarNumeroNFFicticio();
      
      this.logger.log(`NF ${numeroNF} gerada com sucesso (simulação)`);
      let itensProcessados = 0;
      const now = new Date();

      for (const item of itens) {
        const updateResult = await this.itemBeReservaRepository.update(
          { codItemReserva: item.codItemReserva },
          { 
            dataEmissaoNf: now,
            usuarioEmissaoNf: usuario,
            numeroNf: numeroNF,
            situacao: 4 
          }
        );

        if (updateResult.affected && updateResult.affected > 0) {
          itensProcessados++;
          
          try {
            const reserva = await this.itemBeReservaRepository.findOne({
              where: { codItemReserva: item.codItemReserva }
            });
            
            if (reserva && reserva.codItemBe) {
              await this.itemBeRepository.update(
                { codItemBe: reserva.codItemBe },
                { situacao: 4 } 
              );
              this.logger.log(`ItemBe ${reserva.codItemBe} atualizado para situação 4 (NF Emitida)`);
            }
          } catch (itemBeError) {
            this.logger.warn(`Não foi possível atualizar ItemBe para reserva ${item.codItemReserva}:`, itemBeError);
          }
        }
      }


      await this.solicitacaoNFRepository.update(
        { codSolicitacao },
        { situacao: 2 } 
      );

      this.logger.log(`Emissão de NF concluída: ${itensProcessados} itens processados, NF ${numeroNF}`);

      return {
        success: true,
        message: `NF ${numeroNF} emitida com sucesso`,
        numeroNF: numeroNF,
        itensProcessados
      };

    } catch (error) {
      this.logger.error('Erro ao emitir nota fiscal:', error);
      throw new InternalServerErrorException(`Erro ao emitir nota fiscal: ${error.message}`);
    }
  }

  private gerarNumeroNFFicticio(): string {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  }


  private async enviarParaDatasul(itens: any[]): Promise<{ numeroNF: string; success: boolean }> {
    return {
      numeroNF: this.gerarNumeroNFFicticio(),
      success: true
    };
  }
}