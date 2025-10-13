import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { CotacaoService } from './cotacao.service';

@Controller('cotacao')
export class CotacaoController {
  constructor(private readonly cotacaoService: CotacaoService) {}

  @Get('items')
  async getItems(
    @Query('encomenda') encomenda: string,
    @Query('oc') oc: string,
    @Query('op') op: string,
  ) {
    const filters = { encomenda, oc, op };
    const items = await this.cotacaoService.fetchItems(filters);
    return items;
  }

  @Get('saved-items')
  async getSavedItems(
    @Query('encomenda') encomenda: string,
    @Query('oc') oc: string,
    @Query('op') op: string,
  ) {
    return this.cotacaoService.getSavedItems({ encomenda, oc, op });
  }

  @Get('suppliers')
  async searchSuppliers(@Query('termo') termo: string) {
    return this.cotacaoService.searchSuppliers(termo);
  }

  @Post('save-item')
  async saveItem(@Body() body: { apiData: any; userInput: { codFornecedor?: number; nomeFornecedor?: string; precoUnit?: number; projeto?: string; tag?: string; usuarioCotacao: string } }) {
    return this.cotacaoService.saveItem(body.apiData, body.userInput);
  }
}