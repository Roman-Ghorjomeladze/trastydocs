-- AlterEnum: Add new values to DocumentStatus
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'VIEWED';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';

-- AlterTable: Add baseCurrency to companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT NOT NULL DEFAULT 'GEL';

-- AlterTable: Add currency conversion and status tracking fields to documents
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "baseCurrencyAmount" DOUBLE PRECISION;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "exchangeRate" DOUBLE PRECISION;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "viewedAt" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
