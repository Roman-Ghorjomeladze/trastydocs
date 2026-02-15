import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { StorageProvider } from './storage.interface.js';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  async upload(file: Buffer, filePath: string, _mimetype: string): Promise<string> {
    const fullPath = path.join(this.uploadDir, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, file);
    return `/uploads/${filePath}`;
  }

  async delete(fileUrl: string): Promise<void> {
    const filePath = fileUrl.replace('/uploads/', '');
    const fullPath = path.join(this.uploadDir, filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}
