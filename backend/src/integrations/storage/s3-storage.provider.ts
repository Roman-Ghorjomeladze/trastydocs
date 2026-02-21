import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider } from './storage.interface.js';

/**
 * S3-compatible storage provider.
 * Works with AWS S3, Hetzner Object Storage, MinIO, etc.
 *
 * Environment variables:
 *   S3_BUCKET       – bucket name (required)
 *   S3_REGION       – region, e.g. "fsn1" for Hetzner (default: "us-east-1")
 *   S3_ENDPOINT     – custom endpoint for non-AWS providers
 *                     e.g. "https://fsn1.your-objectstorage.com"
 *   S3_ACCESS_KEY   – access key ID
 *   S3_SECRET_KEY   – secret access key
 *   S3_SIGNED_URL_EXPIRES – presigned URL lifetime in seconds (default: 3600)
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string | undefined;
  private readonly signedUrlExpires: number;

  constructor() {
    this.bucket = process.env.S3_BUCKET || '';
    this.region = process.env.S3_REGION || 'us-east-1';
    this.endpoint = process.env.S3_ENDPOINT || undefined;
    this.signedUrlExpires = parseInt(process.env.S3_SIGNED_URL_EXPIRES || '3600', 10);

    this.s3Client = new S3Client({
      region: this.region,
      ...(this.endpoint && { endpoint: this.endpoint }),
      ...(process.env.S3_ACCESS_KEY &&
        process.env.S3_SECRET_KEY && {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_KEY,
          },
        }),
      // Hetzner and other S3-compatible providers require path-style access
      forcePathStyle: !!this.endpoint,
    });

    if (!this.bucket) {
      this.logger.warn('S3_BUCKET is not set — S3 uploads will fail');
    }
  }

  async upload(file: Buffer, path: string, mimetype: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: file,
      ContentType: mimetype,
    });

    await this.s3Client.send(command);

    // Store the S3 key prefixed with s3:// so we can distinguish from local URLs
    return `s3://${path}`;
  }

  async read(fileUrl: string): Promise<Buffer> {
    const key = this.extractKey(fileUrl);
    if (!key) throw new Error('Invalid file URL');

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(fileUrl: string): Promise<void> {
    const key = this.extractKey(fileUrl);
    if (!key) return;

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (err) {
      this.logger.warn(`Failed to delete S3 object: ${key}`, err);
    }
  }

  getUrl(key: string): string {
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(fileUrl: string, expiresInSec?: number): Promise<string | null> {
    const key = this.extractKey(fileUrl);
    if (!key) return null;

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSec ?? this.signedUrlExpires,
    });
  }

  /**
   * Extract the S3 object key from a stored URL.
   * Supports:
   *   - "s3://users/abc/stamps/123.png"  (new format)
   *   - "https://bucket.s3.region.amazonaws.com/key" (legacy AWS format)
   *   - "/api/files/key" (legacy local format, for migration compat)
   */
  private extractKey(fileUrl: string): string | null {
    if (!fileUrl) return null;

    if (fileUrl.startsWith('s3://')) {
      return fileUrl.slice(5);
    }

    if (fileUrl.startsWith('https://')) {
      if (this.endpoint) {
        const prefix = `${this.endpoint}/${this.bucket}/`;
        if (fileUrl.startsWith(prefix)) {
          return fileUrl.slice(prefix.length);
        }
      }
      const awsPrefix = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;
      if (fileUrl.startsWith(awsPrefix)) {
        return fileUrl.slice(awsPrefix.length);
      }
    }

    if (fileUrl.startsWith('/api/files/')) {
      return fileUrl.slice('/api/files/'.length);
    }

    return fileUrl;
  }
}
