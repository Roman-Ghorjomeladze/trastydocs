import { Module, Global } from '@nestjs/common';
import { NbgService } from './nbg.service.js';

@Global()
@Module({
  providers: [NbgService],
  exports: [NbgService],
})
export class NbgModule {}
