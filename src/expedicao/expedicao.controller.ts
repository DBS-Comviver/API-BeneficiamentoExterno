import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ExpedicaoService } from './expedicao.service';

@Controller('expedicao')
export class ExpedicaoController {
  constructor(private readonly expedicaoService: ExpedicaoService) {}

  @Get('items')
  async getItems(
    @Query('encomenda') encomenda: string,
    @Query('oc') oc: string,
    @Query('op') op: string,
  ) {
    const filters = { encomenda, oc, op };
    const items = await this.expedicaoService.fetchItems(filters);
    return items;
  }

  @Get('saved-reservas')
  async getSavedReservas(
    @Query('encomenda') encomenda: string,
    @Query('oc') oc: string,
    @Query('op') op: string,
  ) {
    return this.expedicaoService.getSavedReservas({ encomenda, oc, op });
  }

  @Get('liberated-items')
  async getLiberatedItems(
    @Query('encomenda') encomenda: string,
    @Query('oc') oc: string,
    @Query('op') op: string,
  ) {
    return this.expedicaoService.getLiberatedItems({ encomenda, oc, op });
  }

  @Post('save-reserva')
  async saveReserva(@Body() body: { apiData: any; userInput: { qtdForn?: number; situacao?: number; usuario: string } }) {
    return this.expedicaoService.saveReserva(body.apiData, body.userInput);
  }
}