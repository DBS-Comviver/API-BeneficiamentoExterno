import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Backend Beneficiamento OP1 E OP2!';
  }
}
