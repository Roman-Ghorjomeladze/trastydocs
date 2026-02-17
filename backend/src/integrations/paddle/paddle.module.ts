import { Module, Global } from '@nestjs/common';
import { PaddleService } from './paddle.service.js';

@Global()
@Module({
  providers: [PaddleService],
  exports: [PaddleService],
})
export class PaddleModule {}
