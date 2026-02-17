-- Migrate file URLs from /uploads/ to /api/files/ for authenticated access

UPDATE "documents" SET "pdfUrl" = REPLACE("pdfUrl", '/uploads/', '/api/files/') WHERE "pdfUrl" LIKE '/uploads/%';
UPDATE "signature_assets" SET "imageUrl" = REPLACE("imageUrl", '/uploads/', '/api/files/') WHERE "imageUrl" LIKE '/uploads/%';
UPDATE "stamp_assets" SET "imageUrl" = REPLACE("imageUrl", '/uploads/', '/api/files/') WHERE "imageUrl" LIKE '/uploads/%';
UPDATE "company_signatures" SET "imageUrl" = REPLACE("imageUrl", '/uploads/', '/api/files/') WHERE "imageUrl" LIKE '/uploads/%';
