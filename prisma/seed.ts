/* eslint-disable no-console */
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import 'dotenv/config'

/**
 * ============================================================================
 * DEMO / TEST DATA SEED — DEVELOPMENT ONLY
 * ============================================================================
 *
 * ⚠ EVERY ROW CREATED HERE IS FICTIONAL AND MUST NEVER REACH PRODUCTION.
 *   Every record is flagged `is_sample = TRUE` and every title carries a
 *   "(DEMO)" prefix, so the data is obvious in the UI, greppable in the
 *   database, and removable with a single statement:
 *
 *       DELETE FROM clusters     WHERE is_sample;
 *       DELETE FROM itis          WHERE is_sample;
 *       ... (one line per table — see wipeDemoData below)
 *
 * WHY THIS FILE LOOKS DIFFERENT FROM THE REST OF THE PROJECT
 *   The approved specification (MASTER_PLAN.md §5.2, and the SQL contracts in
 *   sql/**) forbids publishing invented clusters, partners, investment figures
 *   or officer names as if they were departmental records. That rule is why
 *   the tables sat empty. This seed exists purely so the API and the frontend
 *   can be exercised locally, and it is guarded accordingly:
 *
 *     · refuses to run when NODE_ENV === 'production'
 *     · uses obviously-fictional organisations, districts and amounts
 *     · never fabricates `trainees` or `industries_engaged`, which have NO
 *       source column anywhere in the specification — those two KPIs stay NULL
 *       and the portal renders an em dash for them
 *
 * Run:  npm run db:seed:demo
 * Wipe: npm run db:seed:wipe
 * ============================================================================
 */

if (process.env.NODE_ENV === 'production') {
  console.error('\n✖ REFUSING TO SEED: NODE_ENV is "production".')
  console.error('  Demo data must never be loaded into a production database.\n')
  process.exit(1)
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('✖ DATABASE_URL is not set (see .env.example).')
  process.exit(1)
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const MARK = 'DEMO'
const S = true // is_sample

/** Tables that can hold demo rows, in dependency order for the wipe. */
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

async function wipeDemoData() {
  let total = 0
  for (const table of TABLES) {
    const res = await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE is_sample`)
    total += res
  }
  return total
}

async function seed() {
  console.log('\n🌱 Seeding PM SETU demo data (DEVELOPMENT ONLY)…\n')

  await wipeDemoData()

  // ── Clusters (§9) ────────────────────────────────────────────────────────
  const clusterSeeds = [
    { name: `${MARK} Cluster 01 — Coastal Electronics`, district: 'Visakhapatnam', sector: 'Electronics Manufacturing' },
    { name: `${MARK} Cluster 02 — Pharma & Life Sciences`, district: 'Hyderabad', sector: 'Pharmaceuticals' },
    { name: `${MARK} Cluster 03 — Agri-Tech & Food Processing`, district: 'Anantapur', sector: 'Agro & Food Processing' },
  ]
  const clusters = []
  for (const c of clusterSeeds) {
    clusters.push(await prisma.cluster.create({ data: { ...c, isSample: S } }))
  }
  console.log(`  clusters            ${clusters.length}`)

  // ── Hub & Spoke ITIs (§10) ───────────────────────────────────────────────
  // `type` MUST be exactly 'HUB' | 'SPOKE' — the CHECK constraint enforces it
  // and home_kpis.sql filters on those literals.
  const itiSeeds = [
    { itiCode: 'DEMO-ITI-001', itiName: `${MARK} Govt ITI Visakhapatnam`, type: 'HUB', district: 'Visakhapatnam', clusterId: clusters[0].id, studentStrength: 640, principal: 'R. Demo Rao', contact: '9000000001', email: 'iti001.demo@example.invalid', existingTrades: ['Electronic Mechanic', 'Welding Technician'], proposedTrades: ['Industrial Robotics', 'Solar PV Technician'], infrastructure: 'Demo: 6 workshops, 4 labs', labDetails: 'Demo: PCB lab, CNC lab' },
    { itiCode: 'DEMO-ITI-002', itiName: `${MARK} Govt ITI Anakapalle`, type: 'SPOKE', district: 'Visakhapatnam', clusterId: clusters[0].id, studentStrength: 310, principal: 'K. Demo Kumar', contact: '9000000002', email: 'iti002.demo@example.invalid', existingTrades: ['Electrician'], proposedTrades: ['EV Technician'], infrastructure: 'Demo: 3 workshops' },
    { itiCode: 'DEMO-ITI-003', itiName: `${MARK} Govt ITI Hyderabad`, type: 'HUB', district: 'Hyderabad', clusterId: clusters[1].id, studentStrength: 820, principal: 'S. Demo Reddy', contact: '9000000003', email: 'iti003.demo@example.invalid', existingTrades: ['Instrument Mechanic', 'Lab Technician'], proposedTrades: ['Pharma Packaging Tech', 'Quality Inspector'], infrastructure: 'Demo: 9 workshops, 6 labs', labDetails: 'Demo: pharma QC lab' },
    { itiCode: 'DEMO-ITI-004', itiName: `${MARK} Govt ITI Sangareddy`, type: 'SPOKE', district: 'Sangareddy', clusterId: clusters[1].id, studentStrength: 275, principal: 'M. Demo Naik', contact: '9000000004', email: 'iti004.demo@example.invalid', existingTrades: ['Fitter'], proposedTrades: ['Pharma QC Assistant'], infrastructure: 'Demo: 2 workshops' },
    { itiCode: 'DEMO-ITI-005', itiName: `${MARK} Govt ITI Anantapur`, type: 'HUB', district: 'Anantapur', clusterId: clusters[2].id, studentStrength: 455, principal: 'D. Demo Naik', contact: '9000000005', email: 'iti005.demo@example.invalid', existingTrades: ['Agricultural Mechanic'], proposedTrades: ['Food Processing Tech', 'Cold Chain Tech'], infrastructure: 'Demo: 4 workshops, 2 labs' },
    { itiCode: 'DEMO-ITI-006', itiName: `${MARK} Govt ITI Kadapa`, type: 'SPOKE', district: 'Kadapa', clusterId: clusters[2].id, studentStrength: 190, principal: 'V. Demo Reddy', contact: '9000000006', email: 'iti006.demo@example.invalid', existingTrades: ['Plumber'], proposedTrades: ['Irrigation Tech'], infrastructure: 'Demo: 2 workshops' },
  ]
  const itis = []
  for (const i of itiSeeds) {
    itis.push(await prisma.iti.create({ data: { ...i, status: 'ACTIVE', isSample: S } }))
  }
  console.log(`  itis                ${itis.length} (${itis.filter((i) => i.type === 'HUB').length} HUB / ${itis.filter((i) => i.type === 'SPOKE').length} SPOKE)`)

  // ── AIPs (§11) ──────────────────────────────────────────────────────────
  const aipSeeds = [
    { name: `${MARK} Electronics Pvt Ltd`, sector: 'Electronics Manufacturing', status: 'ACTIVE', investmentAmount: 12500000, clusterId: clusters[0].id, academicPartner: true, contact: 'demo.electronics@example.invalid', website: 'https://example.invalid' },
    { name: `${MARK} Pharma Solutions Ltd`, sector: 'Pharmaceuticals', status: 'ACTIVE', investmentAmount: 24000000, clusterId: clusters[1].id, academicPartner: false, contact: 'demo.pharma@example.invalid', website: 'https://example.invalid' },
    { name: `${MARK} Agri Processing Co-op`, sector: 'Agro & Food Processing', status: 'MOU_SIGNED', investmentAmount: 8000000, clusterId: clusters[2].id, academicPartner: false, contact: 'demo.agri@example.invalid', website: 'https://example.invalid' },
  ]
  const aips = []
  for (const a of aipSeeds) aips.push(await prisma.aip.create({ data: { ...a, isSample: S } }))
  const investmentTotal = aipSeeds.reduce((s, a) => s + a.investmentAmount, 0)
  console.log(
    `  aips                ${aips.length}  (investment total INR ${investmentTotal.toLocaleString('en-IN')})`,
  )

  // ── SPVs (§12) — lifecycle: PROPOSED / UNDER_FORMATION / INCORPORATED / OPERATIONAL
  const spvSeeds = [
    { name: `${MARK} Coastal Skills SPV`, status: 'OPERATIONAL', clusterId: clusters[0].id, aipId: aips[0].id },
    { name: `${MARK} Pharma Skills SPV`, status: 'UNDER_FORMATION', clusterId: clusters[1].id, aipId: aips[1].id },
  ]
  const spvs = []
  for (const s of spvSeeds) spvs.push(await prisma.spv.create({ data: { ...s, isSample: S } }))
  console.log(`  spvs                ${spvs.length}`)

  // ── SIPs (§13) — status must be one of the 7 canonical workflow values
  const sipSeeds = [
    { status: 'APPROVED', clusterId: clusters[0].id, aipId: aips[0].id, submissionDate: new Date('2026-01-15'), version: 2, proposedInvestment: 18000000, infrastructureContribution: 9000000, equipmentContribution: 5000000, trainingContribution: 2000000, industryContribution: 12000000, governmentContribution: 6000000, approvalDate: new Date('2026-03-10'), remarks: `${MARK} approved by the demo workflow` },
    { status: 'SUBMITTED', clusterId: clusters[1].id, aipId: aips[1].id, submissionDate: new Date('2026-05-02'), version: 1, proposedInvestment: 30000000, infrastructureContribution: 14000000, equipmentContribution: 9000000, trainingContribution: 3000000, industryContribution: 22000000, governmentContribution: 8000000, remarks: `${MARK} awaiting review` },
    { status: 'DRAFT', clusterId: clusters[2].id, aipId: aips[2].id, version: 1, proposedInvestment: 9000000, remarks: `${MARK} draft — not yet submitted` },
  ]
  const sips = []
  for (const s of sipSeeds) sips.push(await prisma.sip.create({ data: { ...s, isSample: S } }))
  console.log(`  sips                ${sips.length}`)

  // ── Governance (§14) — one member per §14 section, so the grouping is visible
  const govSeeds = [
    { name: `${MARK} Chair, State Steering Committee`, designation: 'Principal Secretary', organisation: 'Government of Andhra Pradesh', role: 'Steering Committee Chair', email: 'demo.ssc@example.invalid', contact: '9000000010', displayOrder: 1, effectiveDate: new Date('2025-06-01') },
    { name: `${MARK} State PMU Lead`, designation: 'Programme Manager', organisation: 'PM SETU State PMU', role: 'State PMU', email: 'demo.pmu@example.invalid', contact: '9000000011', displayOrder: 2, effectiveDate: new Date('2025-07-01') },
    { name: `${MARK} Joint Director`, designation: 'Joint Director', organisation: 'Dept. of Employment & Training', role: 'Department Officer', email: 'demo.dept@example.invalid', contact: '9000000012', displayOrder: 3, effectiveDate: new Date('2025-06-15') },
    { name: `${MARK} Cluster Coordinator 01`, designation: 'Cluster Coordinator', organisation: `${MARK} Cluster 01 — Coastal Electronics`, role: 'Cluster Officer', email: 'demo.cluster1@example.invalid', contact: '9000000013', displayOrder: 4, effectiveDate: new Date('2025-08-01') },
    { name: `${MARK} SPV Director`, designation: 'Director', organisation: `${MARK} Coastal Skills SPV`, role: 'SPV Board', email: 'demo.spv@example.invalid', contact: '9000000014', displayOrder: 5, effectiveDate: new Date('2025-09-01') },
    { name: `${MARK} Liaison Officer`, designation: 'Liaison Officer', organisation: 'PM SETU Cell', role: 'Contact Directory', email: 'demo.contact@example.invalid', contact: '9000000015', displayOrder: 6, effectiveDate: new Date('2025-06-01') },
  ]
  let govCount = 0
  for (const g of govSeeds) { await prisma.governanceMember.create({ data: { ...g, isSample: S } }); govCount++ }
  console.log(`  governance_members  ${govCount}  (one per §14 section)`)

  // ── Documents (§15) ──────────────────────────────────────────────────────
  const docSeeds = [
    { title: `${MARK} PM SETU Guidelines — Andhra Pradesh`, documentNumber: 'DEMO/GO/2026/001', type: 'Guidelines', department: 'Dept. of Employment & Training', issueDate: new Date('2026-02-01'), financialYear: '2026-27', keywords: 'demo,guidelines,pm-setu', publishStatus: 'PUBLISHED', version: 1, clusterId: clusters[0].id, fileName: 'demo-guidelines.pdf', mimeType: 'application/pdf', fileSize: 245000, originalName: 'demo-guidelines.pdf' },
    { title: `${MARK} Expression of Interest — Coastal Electronics`, documentNumber: 'DEMO/EOI/2026/002', type: 'EOI', department: 'PM SETU State PMU', issueDate: new Date('2026-04-12'), financialYear: '2026-27', keywords: 'demo,eoi,electronics', publishStatus: 'PUBLISHED', version: 1, clusterId: clusters[0].id, fileName: 'demo-eoi.pdf', mimeType: 'application/pdf', fileSize: 312000, originalName: 'demo-eoi.pdf' },
    { title: `${MARK} Request for Proposals — Pharma Lab Upgradation`, documentNumber: 'DEMO/RFP/2026/003', type: 'RFP', department: 'PM SETU State PMU', issueDate: new Date('2026-05-20'), financialYear: '2026-27', keywords: 'demo,rfp,pharma,lab', publishStatus: 'PUBLISHED', version: 1, clusterId: clusters[1].id, fileName: 'demo-rfp.pdf', mimeType: 'application/pdf', fileSize: 189000, originalName: 'demo-rfp.pdf' },
    { title: `${MARK} State Steering Committee Minutes — Demo`, documentNumber: 'DEMO/MIN/2026/004', type: 'Minutes', department: 'PM SETU State PMU', issueDate: new Date('2026-06-18'), financialYear: '2026-27', keywords: 'demo,minutes', publishStatus: 'PUBLISHED', version: 1, fileName: 'demo-minutes.pdf', mimeType: 'application/pdf', fileSize: 96000, originalName: 'demo-minutes.pdf' },
  ]
  let docCount = 0
  for (const d of docSeeds) {
    const doc = await prisma.document.create({
      data: {
        title: d.title, documentNumber: d.documentNumber, type: d.type,
        department: d.department, issueDate: d.issueDate, financialYear: d.financialYear,
        keywords: d.keywords, publishStatus: d.publishStatus, version: d.version,
        clusterId: d.clusterId, mimeType: d.mimeType, fileSize: d.fileSize,
        originalName: d.originalName, filePath: `uploads/documents/${d.fileName}`,
        language: 'en', isSample: S,
      },
    })
    await prisma.documentVersion.create({
      data: {
        documentId: doc.id, version: 1,
        filePath: `uploads/documents/${d.fileName}`, fileSize: d.fileSize,
        mimeType: d.mimeType, originalName: d.originalName, createdBy: 'demo-seed',
      },
    })
    docCount++
  }
  console.log(`  documents           ${docCount} (+1 version each)`)

  // ── News (§16) — 25 rows so pagination is genuinely exercised ───────────
  const CATEGORIES = ['PM SETU Meetings', 'Industry Consultations', 'Workshops', 'MoUs', 'Training Programmes', 'Inaugurations', 'Reviews', 'Cluster Activities']
  let newsCount = 0
  for (let i = 1; i <= 25; i++) {
    const cat = CATEGORIES[i % CATEGORIES.length]
    const published = new Date(2026, (i % 9), ((i * 3) % 27) + 1)
    const item = await prisma.news.create({
      data: {
        title: `${MARK} News Item ${String(i).padStart(2, '0')} — ${cat}`,
        summary: `Fictional demonstration item ${i} under the "${cat}" category. Presented to exercise list, category filter, search and pagination.`,
        content: `This is DEMO content created by the development seed script (prisma/seed.ts).\n\nIt exists only to exercise GET /api/v1/news, the category filter and pagination in the frontend. It is not departmental information and must be removed with: npm run db:seed:wipe`,
        publishedDate: published,
        category: cat,
        clusterId: clusters[i % clusters.length].id,
        isPublished: true,
        isSample: S,
      },
    })
    if (i <= 2) {
      await prisma.newsAttachment.create({
        data: { newsId: item.id, fileName: `demo-attachment-${i}.pdf`, filePath: `uploads/news/demo-attachment-${i}.pdf`, mimeType: 'application/pdf', fileSize: 45000 * i },
      })
    }
    newsCount++
  }
  console.log(`  news                ${newsCount} (+2 attachments)`)

  // ── Gallery (§16) ────────────────────────────────────────────────────────
  const gallerySeeds = [
    { title: `${MARK} Inauguration — Coastal Electronics ITI`, type: 'PHOTO', category: 'Inaugurations', publishedDate: new Date('2026-03-12') },
    { title: `${MARK} Workshop — Industry Consultation`, type: 'PHOTO', category: 'Workshops', publishedDate: new Date('2026-04-05') },
    { title: `${MARK} Training Programme — Batch 1`, type: 'VIDEO', category: 'Training Programmes', publishedDate: new Date('2026-05-22') },
    { title: `${MARK} Cluster Review Meeting`, type: 'PHOTO', category: 'Reviews', publishedDate: new Date('2026-06-20') },
  ]
  let galCount = 0
  for (let i = 0; i < gallerySeeds.length; i++) {
    const g = gallerySeeds[i]
    await prisma.galleryItem.create({
      data: { ...g, description: `${MARK} description`, displayOrder: i + 1, isPublished: true, isSample: S },
    })
    galCount++
  }
  console.log(`  gallery_items       ${galCount}`)

  // ── Banner (§5) — proves the CMS-driven banner path is exercised ─────────
  await prisma.banner.create({
    data: {
      title: `${MARK} Banner — PM SETU Andhra Pradesh`,
      ctaText: 'Explore AP Clusters',
      ctaUrl: '/clusters',
      displayOrder: 1,
      startDate: new Date('2020-01-01'),
      endDate: new Date('2030-01-01'),
      isPublished: true,
      isArchived: false,
      isSample: S,
    },
  })
  console.log('  banners             1 (published, active window)')

  // ── Contact (§23) ────────────────────────────────────────────────────────
  await prisma.contactMessage.create({
    data: {
      name: `${MARK} Visitor`, email: 'demo.visitor@example.invalid',
      phone: '9000000099', subject: `${MARK} contact form test`,
      message: 'Fictional contact message created by the development seed script. Safe to delete.',
      status: 'NEW', isSample: S,
    },
  })
  console.log('  contact_messages    1')

  console.log('\n✅ Demo data seeded.')
  console.log('   All rows are flagged is_sample = TRUE and every title carries "(DEMO)".')
  console.log('   Remove with:  npm run db:seed:wipe\n')
}

seed()
  .catch((error) => {
    console.error('\n✖ Seed failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
