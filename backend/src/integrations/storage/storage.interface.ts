export interface StorageProvider {
  upload(file: Buffer, path: string, mimetype: string): Promise<string>;
  delete(fileUrl: string): Promise<void>;
  getUrl(key: string): string;
}
