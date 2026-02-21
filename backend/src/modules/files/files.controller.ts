import {
  Controller,
  Get,
  Req,
  Res,
  Inject,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as path from 'path';
import { createReadStream, statSync } from 'fs';
import { JwtGuard } from '../../common/guards/jwt.guard.js';
import type { StorageProvider } from '../../integrations/storage/storage.interface.js';

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

@Controller('files')
@UseGuards(JwtGuard)
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly storage: StorageProvider,
  ) {}

  /**
   * Resolve a file URL (from DB) to a downloadable response.
   *
   * POST /api/files/resolve  { url: "s3://..." | "/api/files/..." }
   *
   * - S3 URLs  → returns JSON with a presigned URL for direct download
   * - Local URLs → returns JSON with the /api/files/... path (frontend uses it as-is)
   */
  @Get('resolve')
  async resolveUrl(@Req() req: Request, @Res() res: Response): Promise<void> {
    const fileUrl = req.query.url as string;
    if (!fileUrl) {
      res.status(400).json({ message: 'Missing url query parameter' });
      return;
    }

    // S3 URL → generate presigned URL
    if (fileUrl.startsWith('s3://') && this.storage.getSignedUrl) {
      const signedUrl = await this.storage.getSignedUrl(fileUrl);
      if (!signedUrl) {
        res.status(404).json({ message: 'File not found' });
        return;
      }
      res.json({ url: signedUrl, type: 's3' });
      return;
    }

    // Local URL → return as-is (frontend fetches via /api/files/*)
    res.json({ url: fileUrl, type: 'local' });
  }

  /**
   * Serve a file from disk (local storage) or proxy from S3.
   *
   * Local storage: resolves the path on disk and streams the file.
   * S3 storage: generates a presigned URL, fetches the object, and
   *             streams it back to the client — avoids browser CORS
   *             issues when the frontend needs raw bytes (e.g. PDF embedding).
   */
  @Get('*path')
  async serveFile(@Req() req: Request, @Res() res: Response): Promise<void> {
    const rawPath = req.params['path'] ?? req.params[0] ?? '';
    // Express 5 returns wildcard params as an array with a leading empty string: ["", "prod", ...]
    // Filter out empty segments and join to get a clean path without leading slashes.
    const filePath = Array.isArray(rawPath)
      ? rawPath.filter(Boolean).join('/')
      : String(rawPath);
    // Fallback: parse from URL if params extraction fails (strips leading slash and query string)
    const fromUrl = req.url.replace(/^\//, '').split('?')[0];
    const finalPath = (filePath || fromUrl).replace(/^\/+/, '');

    this.logger.log(
      `[serveFile] rawPath=${JSON.stringify(rawPath)} filePath="${filePath}" fromUrl="${fromUrl}" finalPath="${finalPath}"`,
    );

    if (!finalPath) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // ── Try local storage first ──
    if (this.storage.resolveFilePath) {
      const fullPath = this.storage.resolveFilePath(`/api/files/${finalPath}`);
      if (fullPath) {
        try {
          const stat = statSync(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';

          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'private, no-cache');
          res.setHeader('ETag', `"${stat.size}-${stat.mtimeMs}"`);
          res.setHeader('Last-Modified', stat.mtime.toUTCString());
          res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

          if (contentType === 'application/pdf') {
            res.setHeader('Content-Disposition', 'inline');
          }

          const stream = createReadStream(fullPath);
          stream.pipe(res);
          stream.on('error', () => {
            if (!res.headersSent) {
              res.status(404).json({ message: 'File not found' });
            }
          });
          return;
        } catch {
          // fall through to S3 proxy
        }
      }
    }

    // ── Try S3 proxy ──
    if (this.storage.getSignedUrl) {
      try {
        const s3Url = `s3://${finalPath}`;
        this.logger.log(`[serveFile] Trying S3 proxy for: ${s3Url}`);
        const signedUrl = await this.storage.getSignedUrl(s3Url);
        if (!signedUrl) {
          this.logger.warn(
            `[serveFile] getSignedUrl returned null for: ${s3Url}`,
          );
          res.status(404).json({ message: 'File not found in S3' });
          return;
        }
        this.logger.log(`[serveFile] Got presigned URL, fetching from S3...`);

        // Fetch from S3 and stream back to client
        const s3Response = await fetch(signedUrl);
        if (!s3Response.ok || !s3Response.body) {
          res
            .status(502)
            .json({ message: 'Failed to fetch file from storage' });
          return;
        }

        const ext = path.extname(finalPath).toLowerCase();
        const contentType =
          s3Response.headers.get('content-type') ||
          MIME_TYPES[ext] ||
          'application/octet-stream';
        const contentLength = s3Response.headers.get('content-length');

        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Cache-Control', 'private, no-cache');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

        if (contentType === 'application/pdf') {
          res.setHeader('Content-Disposition', 'inline');
        }

        // Stream the S3 response body to the client
        const reader = s3Response.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (!res.write(value)) {
              await new Promise<void>((resolve) => res.once('drain', resolve));
            }
          }
        };
        await pump();
        return;
      } catch (err) {
        this.logger.error('Failed to proxy S3 file:', err);
        if (!res.headersSent) {
          res
            .status(502)
            .json({ message: 'Failed to proxy file from storage' });
        }
        return;
      }
    }

    res.status(404).json({ message: 'File not found' });
  }
}
