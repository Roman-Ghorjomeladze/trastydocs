-- Reorganize file paths from {type}/{companyId}/ to users/{userId}/{type}/
-- This migration updates the DB URLs; a companion script moves physical files.

-- Stamps: /api/files/stamps/{companyId}/{file} → /api/files/users/{userId}/stamps/{file}
UPDATE "stamp_assets"
SET "imageUrl" = '/api/files/users/' || "userId" || '/stamps/' ||
  SUBSTRING("imageUrl" FROM '/api/files/stamps/[^/]+/(.+)$')
WHERE "imageUrl" LIKE '/api/files/stamps/%';

-- Company signatures: /api/files/company-signatures/{companyId}/{file} → /api/files/users/{userId}/company-signatures/{file}
UPDATE "company_signatures"
SET "imageUrl" = '/api/files/users/' || "userId" || '/company-signatures/' ||
  SUBSTRING("imageUrl" FROM '/api/files/company-signatures/[^/]+/(.+)$')
WHERE "imageUrl" LIKE '/api/files/company-signatures/%';

-- User signatures: /api/files/signatures/{userId}/{file} → /api/files/users/{userId}/signatures/{file}
UPDATE "signature_assets"
SET "imageUrl" = '/api/files/users/' || "userId" || '/signatures/' ||
  SUBSTRING("imageUrl" FROM '/api/files/signatures/[^/]+/(.+)$')
WHERE "imageUrl" LIKE '/api/files/signatures/%';

-- Documents: /api/files/documents/{companyId}/{file} → /api/files/users/{createdById}/documents/{year}/{file}
-- Extract year from createdAt for folder grouping
UPDATE "documents"
SET "pdfUrl" = '/api/files/users/' || "createdById" || '/documents/' ||
  EXTRACT(YEAR FROM "createdAt")::text || '/' ||
  SUBSTRING("pdfUrl" FROM '/api/files/documents/[^/]+/(.+)$')
WHERE "pdfUrl" LIKE '/api/files/documents/%';
