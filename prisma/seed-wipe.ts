/* eslint-disable no-console */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import 'dotenv/config'

/**
 * Removes every row created by prisma/seed.ts.
 *
 * Safe by construction: it only ever matches `is_sample = TRUE`, which nothing
 * the admin console or the public API can set. It will never touch real
 * departmental content, so it is safe to run against a shared environment.
 *
 * Run:  npm run db:seed:wipe
 */

// Child tables (document_versions, news_attachments) are deliberately absent:
// they have no is_sample column of their own and are removed by ON DELETE
// CASCADE from their parent rows.
const TABLES = [
  'news',
  'documents',
  'gallery_items',
  'contact_messages',
  'banners',
  'governance_members',
  'sips',
  'spvs',
  'aips',
  'itis',
  'clusters',
] as const

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('✖ DATABASE_URL is not set (see .env.example).')
    process.exit(1)
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

  console.log('\n🧹 Removing demo data (is_sample = TRUE only)…\n')

  let total = 0
  for (const table of TABLES) {
    const res = await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE is_sample`)
    total += res
    if (res > 0) console.log(`  ${table.padEnd(20)} ${res} removed`)
  }

  console.log(`\n✅ ${total} demo row(s) removed. Real content was not touched.\n`)
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error('✖ Wipe failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
