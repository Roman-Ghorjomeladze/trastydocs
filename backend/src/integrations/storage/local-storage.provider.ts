import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { StorageProvider } from './storage.interface.js';

const FILE_URL_PREFIX = '/api/files/';

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
    return `${FILE_URL_PREFIX}${filePath}`;
  }

  async delete(fileUrl: string): Promise<void> {
    // Support both old /uploads/ and new /api/files/ prefixes for backwards compat
    const filePath = fileUrl.replace(FILE_URL_PREFIX, '').replace('/uploads/', '');
    const fullPath = path.join(this.uploadDir, filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  getUrl(key: string): string {
    return `${FILE_URL_PREFIX}${key}`;
  }

  resolveFilePath(fileUrl: string): string | null {
    // Support both old /uploads/ and new /api/files/ prefixes
    const filePath = fileUrl.replace(FILE_URL_PREFIX, '').replace('/uploads/', '');
    const fullPath = path.resolve(this.uploadDir, filePath);

    // Prevent directory traversal attacks
    const resolvedUploadDir = path.resolve(this.uploadDir);
    if (!fullPath.startsWith(resolvedUploadDir)) {
      return null;
    }

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    return fullPath;
  }
}
