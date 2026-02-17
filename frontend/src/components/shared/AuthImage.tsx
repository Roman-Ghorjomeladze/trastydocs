import { useState, useEffect } from 'react';
import apiClient from '../../api/client.ts';

/**
 * Normalise a local file URL so it works with apiClient (which already has baseURL "/api").
 * - "/api/files/foo.png"  → "/files/foo.png"   (strip leading /api so we don't double-prefix)
 * - "/uploads/foo.png"    → "/files/foo.png"    (legacy URLs still in some records)
 * - "files/foo.png"       → "/files/foo.png"
 */
function normalizeLocalUrl(url: string): string {
  let u = url;
  if (u.startsWith('/api/')) u = u.slice(4);
  if (u.startsWith('/uploads/')) u = '/files' + u.slice(8);
  if (u.startsWith('uploads/')) u = '/files/' + u.slice(8);
  if (!u.startsWith('/')) u = '/' + u;
  return u;
}

/**
 * Resolve a file URL to a displayable URL.
 *
 * - "s3://..."        → call /api/files/resolve?url=... to get a presigned URL
 * - "/api/files/..."  → fetch via apiClient with Bearer token, return blob URL
 * - "http(s)://..."   → use directly (already public / presigned)
 * - "data:..." / "blob:..." → use directly
 */
async function resolveFileUrl(
  src: string,
  signal: AbortSignal,
): Promise<{ url: string; needsRevoke: boolean }> {
  // Already usable directly
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http')) {
    return { url: src, needsRevoke: false };
  }

  // S3 URL — ask backend for a presigned URL
  if (src.startsWith('s3://')) {
    const res = await apiClient.get('/files/resolve', {
      params: { url: src },
      signal,
    });
    return { url: res.data.url, needsRevoke: false };
  }

  // Local file — fetch as blob through authenticated proxy
  const apiPath = normalizeLocalUrl(src);
  const res = await apiClient.get(apiPath, { responseType: 'blob', signal });
  const objectUrl = URL.createObjectURL(res.data);
  return { url: objectUrl, needsRevoke: true };
}

/**
 * Hook that resolves any file URL (local, S3, external) to a displayable URL.
 * - Local files → fetched as blob via authenticated API
 * - S3 files → resolved to a presigned URL via /api/files/resolve
 * - External / data URLs → passed through directly
 *
 * @param version - Optional cache-busting key. Change this value to force a
 *   refetch even when the URL stays the same (e.g. after regenerating a PDF
 *   that overwrites the same file path).
 */
export function useAuthUrl(
  src: string | undefined | null,
  version?: string | number | null,
): string | null {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setResolvedUrl(null);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;

    resolveFileUrl(src, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.needsRevoke) objectUrl = result.url;
        setResolvedUrl(result.url);
      })
      .catch(() => {
        if (!controller.signal.aborted) setResolvedUrl(null);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, version]);

  return resolvedUrl;
}

interface AuthImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | undefined;
}

/**
 * Image component that loads images through authenticated API requests.
 * Drop-in replacement for <img> when the src points to /api/files/* or s3://*.
 */
export function AuthImage({ src, alt, ...props }: AuthImageProps) {
  const blobUrl = useAuthUrl(src);

  if (!blobUrl) return null;

  return <img src={blobUrl} alt={alt} {...props} />;
}
