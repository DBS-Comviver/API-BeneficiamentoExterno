import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { ItemBeReserva } from '../entities/item-be-reservas';
import { ItemBe } from '../entities/item-be.entity';
import {
  FiltrosOrdensProducao,
  DadosAPI,
  DadosCombinados,
  DadosPainel,
  DadoGrafico
} from './ordens-producao-externas.types';

@Injectable()
export class OrdensProducaoExternasService {
  private readonly logger = new Logger(OrdensProducaoExternasService.name);

  constructor(
    @InjectRepository(ItemBeReserva)
    private itemBeReservaRepository: Repository<ItemBeReserva>,
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

  private validarFiltros(filtros: FiltrosOrdensProducao): void {
    const { encomenda, op, fornecedor, data_inicial, data_final } = filtros;
    
    const temEncomenda = !!encomenda && encomenda.trim() !== '';
    const temOP = !!op && op.trim() !== '';
    const temFornecedor = !!fornecedor && fornecedor.trim() !== '';
    const temDatas = !!data_inicial && data_inicial.trim() !== '' && 
                    !!data_final && data_final.trim() !== '';
    
    console.log('Validação filtros:', { temEncomenda, temOP, temFornecedor, temDatas });
    
    const temFiltroValido = temEncomenda || temOP || (temFornecedor && temDatas);
    
    if (!temFiltroValido) {
      throw new BadRequestException(
        'Filtro obrigatório: preencha Encomenda, Ordem de Produção ou Fornecedor + Data Inicial + Data Final'
      );
    }

    if ((temFornecedor && !temDatas) || (!temFornecedor && temDatas)) {
      throw new BadRequestException(
        'Para filtrar por fornecedor, é obrigatório informar Data Inicial e Data Final, e vice-versa'
      );
    }
  }

  private mapearSituacao(situacao: number): string {
    const statusMap: { [key: number]: string } = {
      1: 'Pendente',
      2: 'Liberado',
      3: 'Expedido',
      4: 'NF Solicitada',
      5: 'NF Emitida',
      6: 'Em Andamento',
      7: 'Concluída Parcial',
      8: 'Concluída Total',
    };
    return statusMap[situacao] || 'Desconhecido';
  }

  async buscarDadosAPI(filtros: FiltrosOrdensProducao): Promise<DadosAPI[]> {
  this.logger.log('Validando filtros...');
  this.validarFiltros(filtros);

  const params = new URLSearchParams({
    tipo: '3', 
    op: filtros.op || '',
    encomenda: filtros.encomenda || '',
    fornecedor: filtros.fornecedor || '',
    data_inicial: filtros.data_inicial || '',
    data_final: filtros.data_final || '',
  });

  const config: AxiosRequestConfig = {
    headers: { 
      Authorization: this.getAuthHeader(),
      'Content-Type': 'application/json'
    },
    timeout: 30000,
  };

  const apiUrl = `${this.getApiBaseUrl()}/rest_cp12200_v7?${params.toString()}`;
  this.logger.log(`Buscando dados da API: ${apiUrl}`);

  try {
    const response = await lastValueFrom(
      this.httpService.get(apiUrl, config),
    );
    
    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', response.headers);
    console.log('Dados brutos da resposta:', response.data);
    
    let data = response.data;
    
    if (typeof data === 'string') {
      console.log('Resposta é string, tentando parsear JSON');
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        console.log('Erro no parse JSON:', parseError);
        this.logger.error('Erro ao parsear resposta da API:', parseError);
        throw new InternalServerErrorException('Resposta da API em formato inválido');
      }
    }
    
    console.log('Dados após processamento:', data);
    
    if (Array.isArray(data)) {
      this.logger.log(`Retornados ${data.length} itens da API`);
      return data;
    } else if (data && Array.isArray(data.items)) {
      this.logger.log(`Retornados ${data.items.length} itens da API (formato items)`);
      return data.items;
    } else if (data && typeof data === 'object') {
      this.logger.log('Retornado objeto da API, convertendo para array');
      return [data];
    } else {
      this.logger.warn('Nenhum dado retornado da API');
      return [];
    }

  } catch (error) {
    console.log('ERRO COMPLETO:', error);
    this.logger.error('Erro ao buscar dados da API externa:', error);
    if (error.response) {
      this.logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      throw new InternalServerErrorException(`Falha na API externa: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      this.logger.error('Não houve resposta da API:', error.request);
      throw new InternalServerErrorException('Não foi possível conectar com a API externa');
    } else {
      throw new InternalServerErrorException(`Erro na configuração: ${error.message}`);
    }
  }
}

  async combinarDadosComSQL(dadosAPI: DadosAPI[]): Promise<DadosCombinados[]> {
    if (dadosAPI.length === 0) {
      this.logger.log('Nenhum dado da API para combinar');
      return [];
    }

    try {
      const dadosCombinados: DadosCombinados[] = [];

      for (let i = 0; i < dadosAPI.length; i++) {
        const itemAPI = dadosAPI[i];
        
        const itemBe = await this.itemBeRepository.findOne({
          where: {
            nrOrdProd: itemAPI.nr_ord_produ,
            numeroOrdem: itemAPI.numero_ordem,
            encomenda: itemAPI.encomenda,
            itCodigo: itemAPI.it_codigo,
          },
        });

        const itemBeReserva = await this.itemBeReservaRepository.findOne({
          where: {
            nrOrdProd: itemAPI.nr_ord_produ,
            numeroOrdem: itemAPI.numero_ordem,
            encomenda: itemAPI.encomenda,
            itCodigo: itemAPI.it_codigo,
            itReserva: itemAPI.it_reserva,
          },
        });

        const desenho = itemAPI.it_codigo ? 
          itemAPI.it_codigo.split('/')[0]?.replace('T', '') || '' : '';

        const dadosItem: DadosCombinados = {
          id: i + 1,
          op: itemAPI.nr_ord_produ || 0,
          oc: itemAPI.numero_ordem || 0,
          situacao: itemAPI.situacao || 1,
          situacaoTexto: this.mapearSituacao(itemAPI.situacao || 1),
          encomenda: itemAPI.encomenda || '',
          codItem: itemAPI.it_codigo || '',
          descricaoItem: itemAPI.desc_item || '',
          desenho: desenho,
          codReserva: itemAPI.it_reserva || '',
          descricaoReserva: itemAPI.desc_reserva || '',
          qtd: itemAPI.qtd_item || 0,
          projeto: itemBe?.projeto || itemBeReserva?.projeto || '',
          tag: itemBe?.tag || itemBeReserva?.tag || '',
          codFornecedor: itemAPI.cod_forn || 0,
          nomeFornecedor: itemAPI.nome_forn || '',
          pesoBruto: itemBeReserva?.pesoBruto || 0,
          pesoLiquido: itemBeReserva?.pesoLiquido || 0,
          dataExpedicao: itemBeReserva?.dataExpedicao ? 
            this.formatarDataBrasileira(itemBeReserva.dataExpedicao) : '',
          usuarioExpedicao: itemBeReserva?.usuarioExpedicao || '',
          dataSolicitacaoNF: itemBeReserva?.dataSolicitacaoNf ? 
            this.formatarDataBrasileira(itemBeReserva.dataSolicitacaoNf) : '',
          usuarioSolicitacaoNF: itemBeReserva?.usuarioSolicitacaoNf || '',
          dataEmissaoNF: itemBeReserva?.dataEmissaoNf ? 
            this.formatarDataBrasileira(itemBeReserva.dataEmissaoNf) : '',
          usuarioEmissaoNF: itemBeReserva?.usuarioEmissaoNf || '',
          numeroNF: itemBeReserva?.numeroNf || itemAPI.nota_fiscal || '',
          dataEntrega: itemBeReserva?.dataEntrega ? 
            this.formatarDataBrasileira(itemBeReserva.dataEntrega) : '',
          qtdSaldo: itemAPI.qtd_saldo || 0,
          qtdAtendida: itemAPI.qtd_atendida || 0,
          qtdEnviada: itemAPI.qtd_enviada || 0,
          selecionado: false,
        };

        dadosCombinados.push(dadosItem);
      }

      this.logger.log(`Combinados ${dadosCombinados.length} itens com dados do SQL`);
      return dadosCombinados;

    } catch (error) {
      this.logger.error('Erro ao combinar dados com SQL:', error);
      throw new InternalServerErrorException('Falha ao combinar dados com o banco de dados');
    }
  }

  private formatarDataBrasileira(data: Date): string {
    try {
      return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      this.logger.warn('Erro ao formatar data:', error);
      return '';
    }
  }

  async getOrdensComFornecedor(dados: DadosCombinados[]): Promise<DadosCombinados[]> {
    const resultado = dados.filter(item => 
      item.qtdSaldo > 0 && 
      item.qtdAtendida !== item.qtd
    );
    this.logger.log(`Filtro comFornecedor: ${resultado.length} itens`);
    return resultado;
  }

  async getOrdensRetornadas(dados: DadosCombinados[]): Promise<DadosCombinados[]> {
    const resultado = dados.filter(item => {
      const somaSaldoAtendido = item.qtdSaldo + item.qtdAtendida;
      const diferenca = Math.abs(somaSaldoAtendido - item.qtd);
      return (
        diferenca < 0.00001 && 
        item.qtdSaldo > 0 && 
        item.qtdAtendida > 0
      );
    });
    this.logger.log(`Filtro retornadas: ${resultado.length} itens`);
    return resultado;
  }

  async getOrdensConcluidas(dados: DadosCombinados[]): Promise<DadosCombinados[]> {
    const resultado = dados.filter(item => 
      (item.situacao === 7 || item.situacao === 8) && 
      item.qtdSaldo === 0
    );
    this.logger.log(`Filtro concluidas: ${resultado.length} itens`);
    return resultado;
  }

  async getDadosPainel(filtros: FiltrosOrdensProducao): Promise<DadosPainel> {
    try {
      this.logger.log('Iniciando obtenção de dados do painel');
      
      const dadosAPI = await this.buscarDadosAPI(filtros);
      const todosDados = await this.combinarDadosComSQL(dadosAPI);
      const comFornecedor = await this.getOrdensComFornecedor(todosDados);
      const retornadas = await this.getOrdensRetornadas(todosDados);
      const concluidas = await this.getOrdensConcluidas(todosDados);

      const resultado = {
        comFornecedor,
        retornadas,
        concluidas,
        todos: todosDados,
      };

      this.logger.log(`Painel finalizado: ${todosDados.length} totais, ${comFornecedor.length} com fornecedor, ${retornadas.length} retornadas, ${concluidas.length} concluídas`);

      return resultado;

    } catch (error) {
      this.logger.error('Erro ao obter dados do painel:', error);
      throw error;
    }
  }

  async getDadosGrafico(dados: DadosCombinados[], tipo: 'status' | 'fornecedor'): Promise<DadoGrafico[]> {
    if (dados.length === 0) {
      return [];
    }

    if (tipo === 'status') {
      const contagemPorStatus = dados.reduce((acc, item) => {
        const status = item.situacaoTexto;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(contagemPorStatus)
        .map(([situacao, quantidade]) => ({ situacao, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade);
    } else {
      const contagemPorFornecedor = dados.reduce((acc, item) => {
        const fornecedor = item.nomeFornecedor || 'Sem Fornecedor';
        acc[fornecedor] = (acc[fornecedor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(contagemPorFornecedor)
        .map(([fornecedor, quantidade]) => ({ fornecedor, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 10); 
    }
  }
}