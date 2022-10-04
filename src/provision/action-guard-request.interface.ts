import { Request } from 'express';
import { ActionDto } from '../intention/dto/action.dto';

export interface ActionGuardRequest extends Request {
  brokerActionDto?: ActionDto;
}
