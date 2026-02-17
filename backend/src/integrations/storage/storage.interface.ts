export interface StorageProvider {
  upload(file: Buffer, path: string, mimetype: string): Promise<string>;
  delete(fileUrl: string): Promise<void>;
  getUrl(key: string): string;

  /**
   * Resolve a stored URL back to the absolute file path on disk.
   * Only implemented by LocalStorageProvider.
   */
  resolveFilePath?(fileUrl: string): string | null;

  /**
   * Get a time-limited signed URL for reading a private object.
   * Only implemented by S3StorageProvider.
   * Returns null if not supported (local storage).
   */
  getSignedUrl?(fileUrl: string, expiresInSec?: number): Promise<string | null>;
}
