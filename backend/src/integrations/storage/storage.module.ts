import { Global, Module } from '@nestjs/common';
import { LocalStorageProvider } from './local-storage.provider.js';
import { S3StorageProvider } from './s3-storage.provider.js';

@Global()
@Module({
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: () => {
        if (process.env.STORAGE_PROVIDER === 's3') {
          return new S3StorageProvider();
        }
        return new LocalStorageProvider();
      },
    },
  ],
  exports: ['STORAGE_PROVIDER'],
})
export class StorageModule {}
