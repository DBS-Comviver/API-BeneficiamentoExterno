import { Controller, Get, Post, Delete, Param, Body, ParseIntPipe, Logger } from '@nestjs/common';
import { SolicitacaoNFService } from './solicitacao-nf.service';

@Controller('solicitacao-nf')
export class SolicitacaoNFController {
  private readonly logger = new Logger(SolicitacaoNFController.name);

  constructor(private readonly solicitacaoNFService: SolicitacaoNFService) {}

  @Get('ordens-producao')
  async getOrdensProducao() {
    this.logger.log('GET /ordens-producao - Buscando ordens de produção');
    return this.solicitacaoNFService.getOrdensProducao();
  }

  @Get('reservas/:op')
  async getReservasByOP(@Param('op', ParseIntPipe) op: number) {
    this.logger.log(`GET /reservas/${op} - Buscando reservas por OP`);
    return this.solicitacaoNFService.getReservasByOP(op);
  }

  @Get('solicitacoes')
  async getSolicitacoes() {
    this.logger.log('GET /solicitacoes - Buscando solicitações existentes');
    return this.solicitacaoNFService.getSolicitacoes();
  }

  @Get('reservas-solicitacao/:codSolicitacao')
  async getReservasBySolicitacao(@Param('codSolicitacao', ParseIntPipe) codSolicitacao: number) {
    this.logger.log(`GET /reservas-solicitacao/${codSolicitacao} - Buscando reservas por solicitação`);
    return this.solicitacaoNFService.getReservasBySolicitacao(codSolicitacao);
  }

  @Post('criar')
  async criarSolicitacao(@Body() body: { itens: { codItemReserva: number }[]; usuario: string }) {
    this.logger.log(`POST /criar - Criando solicitação para ${body.itens.length} itens`);
    
    if (!body.itens || body.itens.length === 0) {
      throw new Error('Nenhum item selecionado para solicitação de NF');
    }

    if (!body.usuario) {
      throw new Error('Usuário não informado');
    }

    return this.solicitacaoNFService.criarSolicitacao(body.itens, body.usuario);
  }

  @Delete('remover-item/:codItemReserva')
  async removerItemSolicitacao(@Param('codItemReserva', ParseIntPipe) codItemReserva: number) {
    this.logger.log(`DELETE /remover-item/${codItemReserva} - Removendo item da solicitação`);
    await this.solicitacaoNFService.removerItemSolicitacao(codItemReserva);
    return { 
      success: true, 
      message: `Item ${codItemReserva} removido da solicitação com sucesso` 
    };
  }

  @Get(':codSolicitacao')
  async getSolicitacao(@Param('codSolicitacao', ParseIntPipe) codSolicitacao: number) {
    this.logger.log(`GET /${codSolicitacao} - Buscando solicitação específica`);
    return this.solicitacaoNFService.getSolicitacaoById(codSolicitacao);
  }
}