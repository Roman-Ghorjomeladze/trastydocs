/**
 * Companion script for the 20260217200000_reorganize_file_paths migration.
 * Moves physical files on disk from old folder structure to new userId-based structure.
 *
 * Run AFTER the DB migration:
 *   npx ts-node scripts/migrate-file-paths.ts
 *
 * Old structure:
 *   uploads/stamps/{companyId}/{file}
 *   uploads/company-signatures/{companyId}/{file}
 *   uploads/signatures/{userId}/{file}
 *   uploads/documents/{companyId}/{file}
 *
 * New structure:
 *   uploads/users/{userId}/stamps/{file}
 *   uploads/users/{userId}/company-signatures/{file}
 *   uploads/users/{userId}/signatures/{file}
 *   uploads/users/{userId}/documents/{year}/{file}
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function moveFile(oldPath: string, newPath: string) {
  if (!fs.existsSync(oldPath)) {
    console.log(`  SKIP (not found): ${oldPath}`);
    return false;
  }
  ensureDir(path.dirname(newPath));
  fs.renameSync(oldPath, newPath);
  console.log(`  MOVED: ${oldPath} → ${newPath}`);
  return true;
}

async function main() {
  console.log('=== Migrating file paths ===\n');

  // 1. Stamps
  console.log('--- Stamps ---');
  const stamps = await prisma.stampAsset.findMany({ select: { id: true, userId: true, imageUrl: true } });
  for (const stamp of stamps) {
    const match = stamp.imageUrl.match(/\/api\/files\/stamps\/([^/]+)\/(.+)$/);
    if (!match) continue;
    const [, , fileName] = match;
    const oldFile = path.join(UPLOAD_DIR, 'stamps', match[1], fileName);
    const newFile = path.join(UPLOAD_DIR, 'users', stamp.userId, 'stamps', fileName);
    moveFile(oldFile, newFile);
  }

  // 2. Company signatures
  console.log('\n--- Company Signatures ---');
  const compSigs = await prisma.companySignature.findMany({ select: { id: true, userId: true, imageUrl: true } });
  for (const sig of compSigs) {
    const match = sig.imageUrl.match(/\/api\/files\/company-signatures\/([^/]+)\/(.+)$/);
    if (!match) continue;
    const [, , fileName] = match;
    const oldFile = path.join(UPLOAD_DIR, 'company-signatures', match[1], fileName);
    const newFile = path.join(UPLOAD_DIR, 'users', sig.userId, 'company-signatures', fileName);
    moveFile(oldFile, newFile);
  }

  // 3. User signatures
  console.log('\n--- User Signatures ---');
  const userSigs = await prisma.signatureAsset.findMany({ select: { id: true, userId: true, imageUrl: true } });
  for (const sig of userSigs) {
    const match = sig.imageUrl.match(/\/api\/files\/signatures\/([^/]+)\/(.+)$/);
    if (!match) continue;
    const [, , fileName] = match;
    const oldFile = path.join(UPLOAD_DIR, 'signatures', match[1], fileName);
    const newFile = path.join(UPLOAD_DIR, 'users', sig.userId, 'signatures', fileName);
    moveFile(oldFile, newFile);
  }

  // 4. Documents
  console.log('\n--- Documents ---');
  const docs = await prisma.document.findMany({
    where: { pdfUrl: { not: null } },
    select: { id: true, createdById: true, pdfUrl: true, createdAt: true },
  });
  for (const doc of docs) {
    if (!doc.pdfUrl) continue;
    const match = doc.pdfUrl.match(/\/api\/files\/documents\/([^/]+)\/(.+)$/);
    if (!match) continue;
    const [, , fileName] = match;
    const year = doc.createdAt.getFullYear().toString();
    const oldFile = path.join(UPLOAD_DIR, 'documents', match[1], fileName);
    const newFile = path.join(UPLOAD_DIR, 'users', doc.createdById, 'documents', year, fileName);
    moveFile(oldFile, newFile);
  }

  console.log('\n=== Migration complete ===');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
