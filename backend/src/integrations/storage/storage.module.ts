import { Global, Module } from '@nestjs/common';
import { LocalStorageProvider } from './local-storage.provider.js';
import { S3StorageProvider } from './s3-storage.provider.js';

/**
 * Returns the environment-based folder prefix for all stored files.
 * Keeps local / prod / staging files separated in storage.
 *
 *   production  → "prod"
 *   development → "local"
 *   <other>     → used as-is (e.g. "staging")
 *   unset       → "local"
 */
export function getStoragePrefix(): string {
  const env = process.env.NODE_ENV;
  if (env === 'production') return 'prod';
  return env || 'local';
}

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
