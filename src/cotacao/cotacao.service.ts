import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemBe } from '../entities/item-be.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class CotacaoService {
  constructor(
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

  async fetchItems(filters: { encomenda?: string; oc?: string; op?: string }): Promise<any[]> {
    const params = new URLSearchParams({
      tipo: '1',
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
        throw new Error('Resposta da API não contém um array de itens');
      }
      return data;
    } catch (error) {
      console.error('Erro ao buscar itens da API externa:', error);
      throw new Error('Falha ao buscar itens da API externa');
    }
  }

  async getSavedItems(filters: { encomenda?: string; oc?: string; op?: string }): Promise<ItemBe[]> {
    try {
      const where: any = {};
      
      if (filters.encomenda) {
        where.encomenda = filters.encomenda;
      }
      if (filters.oc) {
        const ocNum = parseInt(filters.oc, 10);
        if (!isNaN(ocNum)) {
          where.numeroOrdem = ocNum;
        }
      }
      if (filters.op) {
        const opNum = parseInt(filters.op, 10);
        if (!isNaN(opNum)) {
          where.nrOrdProd = opNum;
        }
      }

      return await this.itemBeRepository.find({ where });
    } catch (error) {
      console.error('Erro ao buscar itens salvos:', error);
      throw new Error('Falha ao buscar itens salvos do banco');
    }
  }

  async searchSuppliers(termo: string): Promise<any[]> {
    const params = new URLSearchParams({
      tipo: '4',
      termo,
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
        throw new Error('Resposta da API não contém um array de fornecedores');
      }
      return data;
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      throw new Error('Falha ao buscar fornecedores da API externa');
    }
  }

  async saveItem(dataFromApi: any, userInput: { 
    codFornecedor?: number; 
    nomeFornecedor?: string; 
    precoUnit?: number; 
    projeto?: string; 
    tag?: string; 
    situacao?: number; 
    usuarioCotacao: string 
  }): Promise<ItemBe> {

    let precoTotal: number | null = null;
    if (userInput.precoUnit != null && dataFromApi.qtd_item != null) {
      const qtd = typeof dataFromApi.qtd_item === 'string' ? parseFloat(dataFromApi.qtd_item) : dataFromApi.qtd_item;
      precoTotal = userInput.precoUnit * qtd;
    }

    const hasAtLeastOneField = 
      userInput.codFornecedor != null ||
      userInput.precoUnit != null ||
      userInput.projeto != null ||
      userInput.tag != null ||
      userInput.situacao != null;

    if (!hasAtLeastOneField) {
      throw new Error('Pelo menos um dos seguintes deve ser fornecido: Fornecedor, Preço unitário, Projeto, Tag ou Situação.');
    }

    const itemData: Partial<ItemBe> = {
      nrOrdProd: dataFromApi.nr_ord_produ ?? null,
      numeroOrdem: dataFromApi.numero_ordem ?? null,
      itCodigo: dataFromApi.it_codigo ?? null,
      descItem: dataFromApi.desc_item ?? null,
      encomenda: dataFromApi.encomenda ?? null,
      codCliente: dataFromApi.cod_cliente ?? null,
      nomeCliente: dataFromApi.nome_cliente ?? null,
      qtdItem: dataFromApi.qtd_item ? parseFloat(dataFromApi.qtd_item.toString()) : null,
      codFornecedor: userInput.codFornecedor ?? null,
      nomeFornecedor: userInput.nomeFornecedor ?? null,
      precoUnit: userInput.precoUnit ?? null,
      precoTotal,
      projeto: userInput.projeto ?? null,
      tag: userInput.tag ?? null,
      dataCotacao: new Date(),
      usuarioCotacao: userInput.usuarioCotacao,
      situacao: userInput.situacao ?? dataFromApi.situacao ?? 1,
    };

    const existing = await this.itemBeRepository.findOne({
      where: {
        nrOrdProd: dataFromApi.nr_ord_produ ?? null,
        numeroOrdem: dataFromApi.numero_ordem ?? null,
        encomenda: dataFromApi.encomenda ?? null,
        itCodigo: dataFromApi.it_codigo ?? null,  
      },
    });

    let savedItem: ItemBe;
    
    if (existing) {
      const updateData = { ...existing };
      
      if (userInput.codFornecedor != null) updateData.codFornecedor = userInput.codFornecedor;
      if (userInput.nomeFornecedor != null) updateData.nomeFornecedor = userInput.nomeFornecedor;
      if (userInput.precoUnit != null) {
        updateData.precoUnit = userInput.precoUnit;
        updateData.precoTotal = precoTotal;
      }
      if (userInput.projeto != null) updateData.projeto = userInput.projeto;
      if (userInput.tag != null) updateData.tag = userInput.tag;
      if (userInput.situacao != null) updateData.situacao = userInput.situacao;
      
      updateData.dataCotacao = new Date();
      updateData.usuarioCotacao = userInput.usuarioCotacao;

      savedItem = await this.itemBeRepository.save(updateData);
    } else {
      savedItem = await this.itemBeRepository.save(this.itemBeRepository.create(itemData));
    }

    if (!savedItem) {
      throw new Error('Falha ao salvar o item.');
    }

    return savedItem;
  }
}