-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TRUCK', 'TRAILER');

-- AlterTable: Add missing columns to companies
ALTER TABLE "companies"
ADD COLUMN     "bankAccounts" JSONB,
ADD COLUMN     "nameTranslations" JSONB,
ADD COLUMN     "addressTranslations" JSONB;

-- AlterTable: Add missing columns to contacts, remove old type column and index
DROP INDEX IF EXISTS "contacts_companyId_type_idx";
ALTER TABLE "contacts"
DROP COLUMN IF EXISTS "type",
ADD COLUMN IF NOT EXISTS "nameTranslations" JSONB,
ADD COLUMN IF NOT EXISTS "addressTranslations" JSONB;

-- AlterTable: Make documents.templateId nullable, fix unique constraint
ALTER TABLE "documents" ALTER COLUMN "templateId" DROP NOT NULL;

-- Drop old unique index on documentNumber (replaced with compound)
DROP INDEX IF EXISTS "documents_documentNumber_key";

-- Drop old foreign key on documents.templateId and recreate with SET NULL
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_templateId_fkey";
ALTER TABLE "documents" ADD CONSTRAINT "documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add compound unique index on documents
CREATE UNIQUE INDEX IF NOT EXISTS "documents_companyId_documentNumber_key" ON "documents"("companyId", "documentNumber");

-- CreateTable: company_signatures
CREATE TABLE IF NOT EXISTS "company_signatures" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Company Signature',
    "imageUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "company_signatures_companyId_idx" ON "company_signatures"("companyId");

-- AddForeignKey
ALTER TABLE "company_signatures" DROP CONSTRAINT IF EXISTS "company_signatures_companyId_fkey";
ALTER TABLE "company_signatures" ADD CONSTRAINT "company_signatures_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_signatures" DROP CONSTRAINT IF EXISTS "company_signatures_userId_fkey";
ALTER TABLE "company_signatures" ADD CONSTRAINT "company_signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: vehicles
CREATE TABLE IF NOT EXISTS "vehicles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultTrailerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_companyId_licensePlate_key" ON "vehicles"("companyId", "licensePlate");
CREATE INDEX IF NOT EXISTS "vehicles_companyId_type_idx" ON "vehicles"("companyId", "type");

-- AddForeignKey
ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "vehicles_companyId_fkey";
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "vehicles_defaultTrailerId_fkey";
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_defaultTrailerId_fkey" FOREIGN KEY ("defaultTrailerId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop ContactType enum (no longer used)
DROP TYPE IF EXISTS "ContactType";
