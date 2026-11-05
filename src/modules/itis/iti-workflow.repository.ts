import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { UpdateItiProfile, CreateItiSubmission } from "./iti-workflow.schema";

export async function updateItiProfile(id: number, data: UpdateItiProfile, db: Prisma.TransactionClient = prisma) {
  const columns: Record<string, (value: never) => Prisma.Sql> = {
    address: value => Prisma.sql`address = ${value}`,
    principal: value => Prisma.sql`principal = ${value}`,
    contact: value => Prisma.sql`contact = ${value}`,
    email: value => Prisma.sql`email = ${value}`,
    existing_trades: value => Prisma.sql`existing_trades = ${value}`,
    proposed_trades: value => Prisma.sql`proposed_trades = ${value}`,
    student_strength: value => Prisma.sql`student_strength = ${value}`,
    infrastructure: value => Prisma.sql`infrastructure = ${value}`,
    lab_details: value => Prisma.sql`lab_details = ${value}`,
  };
  const sets = Object.entries(data).map(([key, value]) => columns[key](value as never));
  const rows = await db.$queryRaw<{id:number}[]>(Prisma.sql`UPDATE itis SET ${Prisma.join(sets, ", ")} WHERE id = ${id} RETURNING id`);
  return rows.length > 0;
}

export async function createSubmission(itiId:number, userId:number, data:CreateItiSubmission, db: Prisma.TransactionClient = prisma) {
  const rows = await db.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO iti_submissions (iti_id, created_by, report_type, title, payload, status, updated_at)
    VALUES (${itiId}, ${userId}, ${data.report_type}, ${data.title}, ${JSON.stringify(data.payload)}::jsonb, 'DRAFT', NOW())
    RETURNING id, iti_id, created_by, report_type, title, payload, status, submitted_at, reviewed_by, reviewed_at, review_remarks, created_at, updated_at
  `);
  return rows[0];
}
export async function listSubmissions(itiId:number) {
  return db.$queryRaw<any[]>(Prisma.sql`
    SELECT s.id, s.iti_id, s.created_by, u.full_name AS creator_name, s.report_type, s.title,
      s.payload, s.status, s.submitted_at, s.reviewed_by, reviewer.full_name AS reviewer_name,
      s.reviewed_at, s.review_remarks, s.created_at, s.updated_at
    FROM iti_submissions s
    JOIN users u ON u.id=s.created_by
    LEFT JOIN users reviewer ON reviewer.id=s.reviewed_by
    WHERE s.iti_id=${itiId} ORDER BY s.updated_at DESC, s.id DESC
  `);
}
export async function getSubmission(id:number, itiId:number, db: Prisma.TransactionClient = prisma) {
  const rows=await db.$queryRaw<any[]>(Prisma.sql`
    SELECT id, iti_id, created_by, report_type, title, payload, status, submitted_at,
      reviewed_by, reviewed_at, review_remarks, created_at, updated_at
    FROM iti_submissions WHERE id=${id} AND iti_id=${itiId}
  `);
  return rows[0] ?? null;
}
export async function updateDraft(id:number, itiId:number, userId:number, data:{title?:string;payload?:Record<string,unknown>}, db: Prisma.TransactionClient = prisma) {
  const rows=await db.$queryRaw<any[]>(Prisma.sql`
    UPDATE iti_submissions SET
      title=COALESCE(${data.title ?? null}, title),
      payload=COALESCE(${data.payload === undefined ? null : JSON.stringify(data.payload)}::jsonb, payload),
      updated_at=NOW()
    WHERE id=${id} AND iti_id=${itiId} AND created_by=${userId} AND status IN ('DRAFT','REVISION_REQUESTED')
    RETURNING id, iti_id, created_by, report_type, title, payload, status, submitted_at, reviewed_by, reviewed_at, review_remarks, created_at, updated_at
  `);
  return rows[0] ?? null;
}
export async function submitDraft(id:number, itiId:number, userId:number, db: Prisma.TransactionClient = prisma) {
  const rows=await db.$queryRaw<any[]>(Prisma.sql`
    UPDATE iti_submissions SET status='SUBMITTED', submitted_at=NOW(), reviewed_by=NULL,
      reviewed_at=NULL, review_remarks=NULL, updated_at=NOW()
    WHERE id=${id} AND iti_id=${itiId} AND created_by=${userId} AND status IN ('DRAFT','REVISION_REQUESTED')
    RETURNING id, iti_id, created_by, report_type, title, payload, status, submitted_at, reviewed_by, reviewed_at, review_remarks, created_at, updated_at
  `);
  return rows[0] ?? null;
}
export async function reviewSubmission(id:number, itiId:number, reviewerId:number, decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED", remarks:string, db: Prisma.TransactionClient = prisma) {
  const rows=await db.$queryRaw<any[]>(Prisma.sql`
    UPDATE iti_submissions SET status=${decision}, reviewed_by=${reviewerId},
      reviewed_at=NOW(), review_remarks=${remarks}, updated_at=NOW()
    WHERE id=${id} AND iti_id=${itiId} AND status='SUBMITTED'
    RETURNING id, iti_id, created_by, report_type, title, payload, status, submitted_at, reviewed_by, reviewed_at, review_remarks, created_at, updated_at
  `);
  return rows[0] ?? null;
}
