import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { SolicitacaoNF } from '../entities/solicitacao-nf';
import { ItemBeReserva } from '../entities/item-be-reservas';
import { ItemBe } from '../entities/item-be.entity';

@Injectable()
export class SolicitacaoNFService {
  private readonly logger = new Logger(SolicitacaoNFService.name);

  constructor(
    @InjectRepository(SolicitacaoNF)
    private solicitacaoNFRepository: Repository<SolicitacaoNF>,
    @InjectRepository(ItemBeReserva)
    private itemBeReservaRepository: Repository<ItemBeReserva>,
    @InjectRepository(ItemBe) 
    private itemBeRepository: Repository<ItemBe>,
  ) {}

  async getOrdensProducao(): Promise<{ op: number; quantidadeItens: number }[]> {
    try {
      this.logger.log('Buscando ordens de produção com reservas expedidas');
      
      const result = await this.itemBeReservaRepository
        .createQueryBuilder('reserva')
        .select('reserva.nrOrdProd', 'op')
        .addSelect('COUNT(reserva.codItemReserva)', 'quantidadeItens')
        .where('reserva.dataExpedicao IS NOT NULL')
        .andWhere('reserva.codSolicitacao IS NULL')
        .groupBy('reserva.nrOrdProd')
        .getRawMany();

      this.logger.log(`Encontradas ${result.length} ordens de produção`);
      return result;
    } catch (error) {
      this.logger.error('Erro ao buscar ordens de produção:', error);
      throw error;
    }
  }

  async getReservasByOP(op: number): Promise<ItemBeReserva[]> {
    try {
      this.logger.log(`Buscando reservas para OP: ${op}`);
      
      const reservas = await this.itemBeReservaRepository.find({
        where: {
          nrOrdProd: op,
          dataExpedicao: Not(IsNull()),
          codSolicitacao: IsNull() 
        }
      });

      this.logger.log(`Encontradas ${reservas.length} reservas para OP ${op}`);
      return reservas;
    } catch (error) {
      this.logger.error(`Erro ao buscar reservas para OP ${op}:`, error);
      throw error;
    }
  }

  async getSolicitacoes(): Promise<SolicitacaoNF[]> {
    try {
      this.logger.log('Buscando solicitações de NF existentes');
      
      const solicitacoes = await this.solicitacaoNFRepository.find({
        order: { dataSolicitacao: 'DESC' }
      });

      this.logger.log(`Encontradas ${solicitacoes.length} solicitações de NF`);
      return solicitacoes;
    } catch (error) {
      this.logger.error('Erro ao buscar solicitações de NF:', error);
      throw error;
    }
  }

  async getReservasBySolicitacao(codSolicitacao: number): Promise<ItemBeReserva[]> {
    try {
      this.logger.log(`Buscando reservas para solicitação: ${codSolicitacao}`);
      
      const reservas = await this.itemBeReservaRepository.find({
        where: { codSolicitacao }
      });

      this.logger.log(`Encontradas ${reservas.length} reservas para solicitação ${codSolicitacao}`);
      return reservas;
    } catch (error) {
      this.logger.error(`Erro ao buscar reservas para solicitação ${codSolicitacao}:`, error);
      throw error;
    }
  }

  async criarSolicitacao(itens: { codItemReserva: number }[], usuario: string): Promise<{ solicitacao: SolicitacaoNF; itensVinculados: number }> {
    try {
      this.logger.log(`Criando solicitação de NF para ${itens.length} itens, usuário: ${usuario}`);

      for (const item of itens) {
        const reserva = await this.itemBeReservaRepository.findOne({
          where: { 
            codItemReserva: item.codItemReserva,
            dataExpedicao: Not(IsNull()),
            codSolicitacao: IsNull()
          }
        });

        if (!reserva) {
          throw new Error(`Reserva ${item.codItemReserva} não encontrada ou já vinculada`);
        }
      }

      const solicitacao = this.solicitacaoNFRepository.create({
        dataSolicitacao: new Date(),
        situacao: 1, 
        usuarioSolicitacao: usuario
      });

      const solicitacaoSalva = await this.solicitacaoNFRepository.save(solicitacao);
      this.logger.log(`Solicitação criada: ${solicitacaoSalva.codSolicitacao}`);

      let itensVinculados = 0;
      for (const item of itens) {
        const updateResult = await this.itemBeReservaRepository.update(
          { codItemReserva: item.codItemReserva },
          { 
            codSolicitacao: solicitacaoSalva.codSolicitacao,
            situacao: 3 
          }
        );

        if (updateResult.affected && updateResult.affected > 0) {
          itensVinculados++;
          
          try {
            const reserva = await this.itemBeReservaRepository.findOne({
              where: { codItemReserva: item.codItemReserva }
            });
            
            if (reserva && reserva.codItemBe) {
              await this.itemBeRepository.update(
                { codItemBe: reserva.codItemBe },
                { situacao: 3 } 
              );
              this.logger.log(`ItemBe ${reserva.codItemBe} atualizado para situação 3 (NF Solicitada)`);
            }
          } catch (itemBeError) {
            this.logger.warn(`Não foi possível atualizar ItemBe para reserva ${item.codItemReserva}:`, itemBeError);
          }
        }
      }

      this.logger.log(`${itensVinculados} itens vinculados à solicitação ${solicitacaoSalva.codSolicitacao} e atualizados para situação 3`);

      return {
        solicitacao: solicitacaoSalva,
        itensVinculados
      };
    } catch (error) {
      this.logger.error('Erro ao criar solicitação de NF:', error);
      throw new InternalServerErrorException(`Erro ao criar solicitação de NF: ${error.message}`);
    }
  }

  async removerItemSolicitacao(codItemReserva: number): Promise<void> {
    try {
      this.logger.log(`Removendo item ${codItemReserva} da solicitação`);

      const updateResult = await this.itemBeReservaRepository.update(
        { codItemReserva },
        { 
          codSolicitacao: null,
          situacao: 2 
        }
      );

      if (updateResult.affected === 0) {
        throw new Error(`Item ${codItemReserva} não encontrado`);
      }

      try {
        const reserva = await this.itemBeReservaRepository.findOne({
          where: { codItemReserva }
        });
        
        if (reserva && reserva.codItemBe) {
          await this.itemBeRepository.update(
            { codItemBe: reserva.codItemBe },
            { situacao: 2 }
          );
          this.logger.log(`ItemBe ${reserva.codItemBe} atualizado para situação 2 (Expedido)`);
        }
      } catch (itemBeError) {
        this.logger.warn(`Não foi possível atualizar ItemBe para reserva ${codItemReserva}:`, itemBeError);
      }

      this.logger.log(`Item ${codItemReserva} removido da solicitação`);
    } catch (error) {
      this.logger.error(`Erro ao remover item ${codItemReserva} da solicitação:`, error);
      throw error;
    }
  }

  async getSolicitacaoById(codSolicitacao: number): Promise<SolicitacaoNF> {
    try {
      const solicitacao = await this.solicitacaoNFRepository.findOne({
        where: { codSolicitacao }
      });

      if (!solicitacao) {
        throw new Error(`Solicitação ${codSolicitacao} não encontrada`);
      }

      return solicitacao;
    } catch (error) {
      this.logger.error(`Erro ao buscar solicitação ${codSolicitacao}:`, error);
      throw error;
    }
  }
}