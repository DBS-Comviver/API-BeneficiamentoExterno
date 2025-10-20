import { Controller, Get, Query, Logger } from '@nestjs/common';
import { OrdensProducaoExternasService } from './ordens-producao-externas.service';
import { DadosPainel, DadoGrafico } from './ordens-producao-externas.types';

@Controller('ordens-producao-externas')
export class OrdensProducaoExternasController {
  private readonly logger = new Logger(OrdensProducaoExternasController.name);

  constructor(private readonly ordensProducaoExternasService: OrdensProducaoExternasService) {}

  @Get('painel')
  async getPainel(
    @Query('encomenda') encomenda: string,
    @Query('op') op: string,
    @Query('fornecedor') fornecedor: string,
    @Query('data_inicial') data_inicial: string,
    @Query('data_final') data_final: string,
  ): Promise<DadosPainel> {
    this.logger.log(`GET /painel - Filtros: encomenda=${encomenda}, op=${op}, fornecedor=${fornecedor}, data_inicial=${data_inicial}, data_final=${data_final}`);
    
    const filtros = {
      encomenda,
      op,
      fornecedor,
      data_inicial,
      data_final,
    };

    return this.ordensProducaoExternasService.getDadosPainel(filtros);
  }

  @Get('grafico-status')
  async getGraficoStatus(
    @Query('encomenda') encomenda: string,
    @Query('op') op: string,
    @Query('fornecedor') fornecedor: string,
    @Query('data_inicial') data_inicial: string,
    @Query('data_final') data_final: string,
    @Query('tipo') tipo: 'comFornecedor' | 'retornadas' | 'concluidas' = 'comFornecedor',
  ): Promise<DadoGrafico[]> {
    this.logger.log(`GET /grafico-status - Tipo: ${tipo}`);
    
    const filtros = {
      encomenda,
      op,
      fornecedor,
      data_inicial,
      data_final,
    };

    const dadosPainel = await this.ordensProducaoExternasService.getDadosPainel(filtros);
    
    let dadosParaGrafico;
    switch (tipo) {
      case 'comFornecedor':
        dadosParaGrafico = dadosPainel.comFornecedor;
        break;
      case 'retornadas':
        dadosParaGrafico = dadosPainel.retornadas;
        break;
      case 'concluidas':
        dadosParaGrafico = dadosPainel.concluidas;
        break;
      default:
        dadosParaGrafico = dadosPainel.comFornecedor;
    }

    return this.ordensProducaoExternasService.getDadosGrafico(dadosParaGrafico, 'status');
  }

  @Get('grafico-fornecedor')
  async getGraficoFornecedor(
    @Query('encomenda') encomenda: string,
    @Query('op') op: string,
    @Query('fornecedor') fornecedor: string,
    @Query('data_inicial') data_inicial: string,
    @Query('data_final') data_final: string,
    @Query('tipo') tipo: 'comFornecedor' | 'retornadas' | 'concluidas' = 'comFornecedor',
  ): Promise<DadoGrafico[]> {
    this.logger.log(`GET /grafico-fornecedor - Tipo: ${tipo}`);
    
    const filtros = {
      encomenda,
      op,
      fornecedor,
      data_inicial,
      data_final,
    };

    const dadosPainel = await this.ordensProducaoExternasService.getDadosPainel(filtros);
    
    let dadosParaGrafico;
    switch (tipo) {
      case 'comFornecedor':
        dadosParaGrafico = dadosPainel.comFornecedor;
        break;
      case 'retornadas':
        dadosParaGrafico = dadosPainel.retornadas;
        break;
      case 'concluidas':
        dadosParaGrafico = dadosPainel.concluidas;
        break;
      default:
        dadosParaGrafico = dadosPainel.comFornecedor;
    }

    return this.ordensProducaoExternasService.getDadosGrafico(dadosParaGrafico, 'fornecedor');
  }
  
}