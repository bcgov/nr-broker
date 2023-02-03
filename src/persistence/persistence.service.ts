import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionDto } from '../intention/dto/action.dto';
import { IntentionDto } from '../intention/dto/intention.dto';

@Injectable()
export class PersistenceService {
  constructor(
    @InjectRepository(IntentionDto)
    private intentionRepository: Repository<IntentionDto>,
  ) {}

  public async addIntention(intention: IntentionDto): Promise<any> {
    return await this.intentionRepository.save(intention);
  }

  public async findAllIntention(): Promise<IntentionDto[]> {
    return this.intentionRepository.find();
  }

  public async findExpiredIntentions(): Promise<IntentionDto[]> {
    const currentTime = new Date().valueOf();
    return this.intentionRepository.find({
      where: { expiry: { $lt: currentTime } } as any,
    });
  }

  public async getIntentionByToken(
    token: string,
  ): Promise<IntentionDto | null> {
    return await this.intentionRepository.findOne({
      where: { 'transaction.token': token } as any,
    });
  }

  public async getIntentionActionByToken(
    token: string,
  ): Promise<ActionDto | null> {
    const action = await this.intentionRepository
      .findOne({
        where: { 'actions.trace.token': token } as any,
      })
      .then((intention) =>
        intention.actions.find((action) => action.trace.token === token),
      );
    console.log(action);
    return action;
  }

  public async closeIntentionByToken(token: string): Promise<boolean> {
    const intention = await this.getIntentionByToken(token);
    return this.closeIntention(intention);
  }

  public async closeIntention(intention: IntentionDto): Promise<boolean> {
    if (intention) {
      await this.intentionRepository.delete(intention.id);
      return true;
    }
    return false;
  }
}
