import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { EmissaoNFService } from './emissao-nf.service';
import { ItemEmissaoNF, SolicitacaoAguardando, RespostaEmissaoNF } from './emissao-nf.types';

@Controller('emissao-nf')
export class EmissaoNFController {
  private readonly logger = new Logger(EmissaoNFController.name);

  constructor(private readonly emissaoNFService: EmissaoNFService) {}

  @Get('itens-aguardando-emissao')
  async getItensAguardandoEmissao(
    @Query('encomenda') encomenda: string,
    @Query('op') op: string,
    @Query('oc') oc: string,
  ): Promise<ItemEmissaoNF[]> {
    this.logger.log('GET /itens-aguardando-emissao - Buscando itens para emissão de NF');
    const filters = { encomenda, op, oc };
    return this.emissaoNFService.getItensAguardandoEmissao(filters);
  }

  @Get('solicitacoes-aguardando')
  async getSolicitacoesAguardando(): Promise<SolicitacaoAguardando[]> {
    this.logger.log('GET /solicitacoes-aguardando - Buscando solicitações aguardando emissão');
    return this.emissaoNFService.getSolicitacoesAguardando();
  }

  @Post('emitir-nf')
  async emitirNotaFiscal(@Body() body: { 
    itens: { codItemReserva: number }[]; 
    usuario: string;
    codSolicitacao: number;
  }): Promise<RespostaEmissaoNF> {
    this.logger.log(`POST /emitir-nf - Emitindo NF para ${body.itens.length} itens, solicitação: ${body.codSolicitacao}`);
    
    if (!body.itens || body.itens.length === 0) {
      throw new Error('Nenhum item selecionado para emissão de NF');
    }

    if (!body.usuario) {
      throw new Error('Usuário não informado');
    }

    if (!body.codSolicitacao) {
      throw new Error('Código da solicitação não informado');
    }

    return this.emissaoNFService.emitirNotaFiscal(body.itens, body.usuario, body.codSolicitacao);
  }
}