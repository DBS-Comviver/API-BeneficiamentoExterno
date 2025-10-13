import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemBeReserva } from '../entities/item-be-reservas';
import { ItemBe } from '../entities/item-be.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class ExpedicaoService {
  private readonly logger = new Logger(ExpedicaoService.name);

  constructor(
    @InjectRepository(ItemBeReserva)
    private itemBeReservaRepository: Repository<ItemBeReserva>,
    @InjectRepository(ItemBe)
    private itemBeRepository: Repository<ItemBe>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.logger.log('ExpedicaoService inicializado. Verificando repositórios...');
    if (!this.itemBeReservaRepository) {
      this.logger.error('itemBeReservaRepository não injetado');
    }
    if (!this.itemBeRepository) {
      this.logger.error('itemBeRepository não injetado');
    }
  }

  private getApiBaseUrl(): string {
    const url = this.configService.get<string>('EXTERNAL_API_BASE_URL') || '';
    if (!url) {
      this.logger.error('EXTERNAL_API_BASE_URL não configurado');
      throw new InternalServerErrorException('Configuração de API externa não encontrada');
    }
    return url;
  }

  private getAuthHeader(): string {
    const user = this.configService.get<string>('EXTERNAL_API_USER');
    const pass = this.configService.get<string>('EXTERNAL_API_PASSWORD');
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }

  async fetchItems(filters: { encomenda?: string; oc?: string; op?: string }): Promise<any[]> {
    const params = new URLSearchParams({
      tipo: '2',
      op: filters.op || '',
      encomenda: filters.encomenda || '',
      oc: filters.oc || '',
    });

    const config: AxiosRequestConfig = {
      headers: { Authorization: this.getAuthHeader() },
    };

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.getApiBaseUrl()}/rest_cp12200_v7?${params.toString()}`, config),
      );
      const data = Array.isArray(response.data) ? response.data : response.data.items || [];
      if (!Array.isArray(data)) {
        throw new BadRequestException('Resposta da API não contém um array de itens');
      }
      return data;
    } catch (error) {
      this.logger.error('Erro ao buscar itens da API externa:', error);
      throw new InternalServerErrorException('Falha ao buscar itens da API externa');
    }
  }

  async getSavedReservas(filters: { encomenda?: string; oc?: string; op?: string }): Promise<ItemBeReserva[]> {
    try {
      const where: any = {};
      if (filters.encomenda) where.encomenda = filters.encomenda;
      if (filters.oc) {
        const ocNum = parseInt(filters.oc, 10);
        if (!isNaN(ocNum)) where.numeroOrdem = ocNum;
      }
      if (filters.op) {
        const opNum = parseInt(filters.op, 10);
        if (!isNaN(opNum)) where.nrOrdProd = opNum;
      }

      if (Object.keys(where).length === 0) {
        return [];
      }

      return await this.itemBeReservaRepository.find({ where });
    } catch (error) {
      this.logger.error('Erro ao buscar reservas salvas:', error);
      return [];
    }
  }

  async getLiberatedItems(filters: { encomenda?: string; oc?: string; op?: string }): Promise<ItemBe[]> {
    try {
      const where: any = { situacao: 2 };
      if (filters.encomenda) where.encomenda = filters.encomenda;
      if (filters.oc) {
        const ocNum = parseInt(filters.oc, 10);
        if (!isNaN(ocNum)) where.numeroOrdem = ocNum;
      }
      if (filters.op) {
        const opNum = parseInt(filters.op, 10);
        if (!isNaN(opNum)) where.nrOrdProd = opNum;
      }

      return await this.itemBeRepository.find({ where });
    } catch (error) {
      this.logger.error('Erro ao buscar itens liberados:', error);
      return [];
    }
  }

  async saveReserva(dataFromApi: any, userInput: { qtdForn?: number; situacao?: number; usuario: string }): Promise<ItemBeReserva> {
    this.logger.log(`Iniciando saveReserva com payload: ${JSON.stringify({ dataFromApi, userInput })}`);

    if (!dataFromApi || !dataFromApi.nr_ord_produ || !dataFromApi.numero_ordem || !dataFromApi.encomenda || !dataFromApi.it_codigo) {
      this.logger.error('Dados obrigatórios ausentes em apiData');
      throw new BadRequestException('Campos obrigatórios ausentes: nr_ord_produ, numero_ordem, encomenda, it_codigo');
    }

    const key = {
      nrOrdProd: dataFromApi.nr_ord_produ,
      numeroOrdem: dataFromApi.numero_ordem,
      encomenda: dataFromApi.encomenda,
      itCodigo: dataFromApi.it_codigo,
    };

    let itemBe;
    try {
      this.logger.log(`Buscando ItemBe com key: ${JSON.stringify(key)}`);
      itemBe = await this.itemBeRepository.findOne({ where: key });
      if (!itemBe) {
        this.logger.error(`ItemBe não encontrado para key: ${JSON.stringify(key)}`);
        throw new BadRequestException('Item principal não encontrado em dbs_be_itens. Cadastre na Cotação primeiro.');
      }
    } catch (error) {
      this.logger.error('Erro ao buscar ItemBe:', error);
      throw new InternalServerErrorException(`Erro ao buscar item principal: ${error.message}`);
    }

    const reservaKey = {
      ...key,
      itReserva: dataFromApi.it_reserva || null,
    };

    let existing;
    try {
      this.logger.log(`Buscando reserva existente com key: ${JSON.stringify(reservaKey)}`);
      existing = await this.itemBeReservaRepository.findOne({ where: reservaKey });
    } catch (error) {
      this.logger.error('Erro ao buscar reserva existente:', error);
      throw new InternalServerErrorException(`Erro ao acessar repositório de reservas: ${error.message}`);
    }

    const now = new Date();

    const reservaData: Partial<ItemBeReserva> = {
      nrOrdProd: dataFromApi.nr_ord_produ,
      numeroOrdem: dataFromApi.numero_ordem,
      encomenda: dataFromApi.encomenda,
      itCodigo: dataFromApi.it_codigo,
      descItem: dataFromApi.desc_item || null,
      itReserva: dataFromApi.it_reserva || null,
      descReserva: dataFromApi.desc_reserva || null,
      codCliente: dataFromApi.cod_cliente || null,
      nomeCliente: dataFromApi.nome_cliente || null,
      qtdItem: dataFromApi.qtd_item ? parseFloat(dataFromApi.qtd_item.toString()) : null,
      saldo: dataFromApi.qtd_saldo ? parseFloat(dataFromApi.qtd_saldo.toString()) : null,
      qtdAtendida: dataFromApi.qtd_atendida ? parseFloat(dataFromApi.qtd_atendida.toString()) : null,
      codFornecedor: itemBe.codFornecedor,
      nomeFornecedor: itemBe.nomeFornecedor,
      projeto: itemBe.projeto,
      tag: itemBe.tag,
      precoUnitario: itemBe.precoUnit,
      precoTotal: itemBe.precoTotal,
      codItemBe: itemBe.codItemBe,
      situacao: userInput.situacao ?? existing?.situacao ?? dataFromApi.situacao ?? 1,
    };

    if (userInput.qtdForn != null) {
      if (userInput.qtdForn < 0) {
        throw new BadRequestException('Quantidade a expedir deve ser maior ou igual a zero');
      }
      if (userInput.qtdForn > (reservaData.qtdItem || 0)) {
        throw new BadRequestException(`Quantidade a expedir (${userInput.qtdForn}) não pode ser maior que a quantidade disponível (${reservaData.qtdItem})`);
      }
      reservaData.qtdForn = userInput.qtdForn;
      reservaData.dataInsercao = existing?.dataInsercao ?? now;
      reservaData.usuarioInsercao = userInput.usuario;
    }

    if (userInput.situacao != null) {
      reservaData.situacao = userInput.situacao;
      if (userInput.situacao === 2) {
        reservaData.dataExpedicao = now;
        reservaData.usuarioExpedicao = userInput.usuario;
      }
    }

    let savedReserva: ItemBeReserva;
    try {
      if (existing) {
        this.logger.log('Atualizando reserva existente');
        const updateData = { ...existing, ...reservaData };
        if (userInput.qtdForn != null) {
          updateData.qtdForn = userInput.qtdForn;
          updateData.usuarioInsercao = userInput.usuario;
        }
        if (userInput.situacao != null) {
          updateData.situacao = userInput.situacao;
          if (userInput.situacao === 2) {
            updateData.dataExpedicao = now;
            updateData.usuarioExpedicao = userInput.usuario;
          }
        }
        updateData.codFornecedor = itemBe.codFornecedor;
        updateData.nomeFornecedor = itemBe.nomeFornecedor;
        updateData.projeto = itemBe.projeto;
        updateData.tag = itemBe.tag;
        updateData.precoUnitario = itemBe.precoUnit;
        updateData.precoTotal = itemBe.precoTotal;
        savedReserva = await this.itemBeReservaRepository.save(updateData);
      } else {
        this.logger.log('Criando nova reserva');
        reservaData.dataEmissao = dataFromApi.data_emissao ? new Date(dataFromApi.data_emissao) : null;
        reservaData.pesoLiquido = dataFromApi.peso_liquido ? parseFloat(dataFromApi.peso_liquido.toString()) : null;
        reservaData.pesoBruto = dataFromApi.peso_bruto ? parseFloat(dataFromApi.peso_bruto.toString()) : null;
        reservaData.dataInsercao = now;
        reservaData.usuarioInsercao = userInput.usuario;
        savedReserva = await this.itemBeReservaRepository.save(this.itemBeReservaRepository.create(reservaData));
      }
    } catch (error) {
      this.logger.error('Erro ao salvar reserva:', error);
      throw new InternalServerErrorException(`Falha ao salvar a reserva: ${error.message}`);
    }

    if (!savedReserva) {
      throw new InternalServerErrorException('Falha ao salvar a reserva');
    }

    return savedReserva;
  }
}