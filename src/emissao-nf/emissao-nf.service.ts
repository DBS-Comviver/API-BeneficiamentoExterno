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

interface DatasulResponse {
  numeroNF?: string;
  success: boolean;
  message?: string;
}

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
        .andWhere('reserva.dataEmissaoNf IS NULL')
        .andWhere('(reserva.situacao = 4 OR reserva.situacao = 3)'); 

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
    const connection = this.itemBeReservaRepository.manager.connection;
    const queryRunner = connection.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Iniciando emissão de NF para solicitação ${codSolicitacao}, ${itens.length} itens`);

      const itensCompletos = [];
      for (const item of itens) {
        const reserva = await queryRunner.manager.findOne(ItemBeReserva, {
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

        itensCompletos.push(reserva);
      }

      const fornecedores = [...new Set(itensCompletos.map(item => item.codFornecedor))];
      if (fornecedores.length > 1) {
        throw new Error('Todos os itens devem ser do mesmo fornecedor para emissão da NF');
      }

      const codFornecedor = fornecedores[0];
      if (!codFornecedor) {
        throw new Error('Fornecedor não identificado para os itens selecionados');
      }

      const itensParaEnvio = itensCompletos.map(item => {
        const quantidade = item.qtdForn ? parseFloat(item.qtdForn.toString()).toFixed(5) : '0.00000';
        const valorUnitario = item.precoUnitario ? parseFloat(item.precoUnitario.toString()).toFixed(5) : '0.00000';
        
        return `${item.itCodigo},${quantidade},${valorUnitario}`;
      });

      const parametrosItens = itensParaEnvio.join(';');


      this.logger.log(`Enviando ${itensCompletos.length} itens para API do Datasul`);
      const resultadoAPI = await this.chamarAPIDatasul(codFornecedor, parametrosItens);

      if (!resultadoAPI.success || !resultadoAPI.numeroNF) {
        throw new Error(`Falha na emissão da NF: ${resultadoAPI.message || 'Erro desconhecido'}`);
      }

      const numeroNF = resultadoAPI.numeroNF;
      this.logger.log(`NF ${numeroNF} gerada com sucesso no Datasul`);


      let itensProcessados = 0;
      const now = new Date();

      for (const item of itensCompletos) {
        await queryRunner.manager.update(
          ItemBeReserva,
          { codItemReserva: item.codItemReserva },
          { 
            dataEmissaoNf: now,
            usuarioEmissaoNf: usuario,
            numeroNf: numeroNF,
            situacao: 5 
          }
        );

        itensProcessados++;
        

        if (item.codItemBe) {
          await queryRunner.manager.update(
            ItemBe,
            { codItemBe: item.codItemBe },
            { situacao: 5 }
          );
          this.logger.log(`ItemBe ${item.codItemBe} atualizado para situação 5 (NF Emitida)`);
        }
      }


      await queryRunner.manager.update(
        SolicitacaoNF,
        { codSolicitacao },
        { situacao: 2 }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Emissão de NF concluída: ${itensProcessados} itens processados, NF ${numeroNF}`);

      return {
        success: true,
        message: `NF ${numeroNF} emitida com sucesso`,
        numeroNF: numeroNF,
        itensProcessados
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao emitir nota fiscal:', error);
      throw new InternalServerErrorException(`Erro ao emitir nota fiscal: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  private async chamarAPIDatasul(codFornecedor: number, parametrosItens: string): Promise<DatasulResponse> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const authHeader = this.getAuthHeader();

      const url = `${baseUrl}/rest_cp12200_v10`;
      
      const params = {
        tipo: '5',
        cod_estabel: '15',
        cod_emitente: codFornecedor.toString(),
        itens: parametrosItens
      };

      const config: AxiosRequestConfig = {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 30000 
      };

      this.logger.log(`Chamando API Datasul: ${url}`);
      this.logger.log(`Parâmetros: ${JSON.stringify(params)}`);

      const response = await lastValueFrom(
        this.httpService.get(url, config)
      );

      this.logger.log(`Resposta da API Datasul: ${JSON.stringify(response.data)}`);

      if (response.data && response.data.numeroNF) {
        return {
          numeroNF: response.data.numeroNF,
          success: true
        };
      } else if (response.data && response.data.NF) {
        return {
          numeroNF: response.data.NF,
          success: true
        };
      } else {
        const responseData = response.data;
        let numeroNF: string | undefined;

        if (typeof responseData === 'string' && responseData.includes('NF')) {
          const match = responseData.match(/NF[:\s]*(\d+)/i);
          numeroNF = match ? match[1] : undefined;
        } else if (responseData.numero) {
          numeroNF = responseData.numero;
        } else if (responseData.nf) {
          numeroNF = responseData.nf;
        }

        if (numeroNF) {
          return {
            numeroNF,
            success: true
          };
        } else {
          return {
            success: false,
            message: 'Número da NF não encontrado na resposta da API'
          };
        }
      }

    } catch (error: any) {
      this.logger.error('Erro na chamada à API do Datasul:', error);
      
      let errorMessage = 'Erro na comunicação com o sistema de emissão de NF';
      
      if (error.response) {
        errorMessage = `Erro ${error.response.status}: ${error.response.data || error.response.statusText}`;
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Conexão recusada com o servidor do Datasul';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout na comunicação com o Datasul';
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }
}