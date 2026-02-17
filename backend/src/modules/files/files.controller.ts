import {
  Controller,
  Get,
  Req,
  Res,
  Inject,
  UseGuards,
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
  async resolveUrl(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
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
   * Serve a local file from disk.
   * Only works when STORAGE_PROVIDER=local.
   * S3 files are served directly from Hetzner via presigned URLs.
   */
  @Get('*path')
  serveFile(@Req() req: Request, @Res() res: Response): void {
    const rawPath = req.params['path'] ?? req.params[0] ?? '';
    const filePath = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath);
    const finalPath = filePath || req.url.replace(/^\/?/, '').split('?')[0];

    if (!finalPath || !this.storage.resolveFilePath) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    const fullPath = this.storage.resolveFilePath(`/api/files/${finalPath}`);
    if (!fullPath) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    try {
      const stat = statSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      // no-cache: browser must revalidate with the server each time.
      // This ensures regenerated PDFs (same path, new content) are always fresh.
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
    } catch {
      res.status(404).json({ message: 'File not found' });
    }
  }
}
