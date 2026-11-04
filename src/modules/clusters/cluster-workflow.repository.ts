import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { CreateClusterReport } from "./cluster-workflow.schema";

export async function getOverview(clusterId:number) {
  const rows=await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT c.id,c.name,c.district,c.sector,
      COUNT(i.id)::int AS total_itis,
      COUNT(i.id) FILTER (WHERE i.type='HUB')::int AS hub_itis,
      COUNT(i.id) FILTER (WHERE i.type='SPOKE')::int AS spoke_itis,
      COUNT(i.id) FILTER (WHERE i.status='ACTIVE')::int AS active_itis,
      (SELECT COUNT(*)::int FROM iti_submissions s JOIN itis si ON si.id=s.iti_id WHERE si.cluster_id=c.id AND s.status='SUBMITTED') AS pending_iti_reports,
      (SELECT COUNT(*)::int FROM cluster_submissions cs WHERE cs.cluster_id=c.id AND cs.status='SUBMITTED') AS pending_cluster_reports
    FROM clusters c LEFT JOIN itis i ON i.cluster_id=c.id
    WHERE c.id=${clusterId} GROUP BY c.id
  `);
  return rows[0] ?? null;
}
export async function listInstituteReports(clusterId:number) {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT s.id,s.iti_id,i.iti_name,i.type,s.created_by,u.full_name AS creator_name,
      s.report_type,s.title,s.status,s.submitted_at,s.reviewed_at,s.review_remarks,s.updated_at
    FROM iti_submissions s JOIN itis i ON i.id=s.iti_id
    JOIN users u ON u.id=s.created_by
    WHERE i.cluster_id=${clusterId}
    ORDER BY CASE s.status WHEN 'SUBMITTED' THEN 0 WHEN 'REVISION_REQUESTED' THEN 1 ELSE 2 END,
      s.updated_at DESC
  `);
}
export async function createReport(clusterId:number,userId:number,data:CreateClusterReport) {
  const rows=await prisma.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO cluster_submissions(cluster_id,created_by,title,report_period,payload,status,updated_at)
    VALUES(${clusterId},${userId},${data.title},${data.report_period},${JSON.stringify(data.payload)}::jsonb,'DRAFT',NOW())
    RETURNING *
  `);
  return rows[0];
}
export async function listReports(clusterId:number) {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT s.id,s.cluster_id,s.created_by,u.full_name AS creator_name,s.title,s.report_period,
      s.payload,s.status,s.submitted_at,s.reviewed_by,s.reviewed_at,s.review_remarks,s.created_at,s.updated_at
    FROM cluster_submissions s JOIN users u ON u.id=s.created_by
    WHERE s.cluster_id=${clusterId} ORDER BY s.updated_at DESC,s.id DESC
  `);
}
export async function getReport(id:number,clusterId:number) {
  const rows=await prisma.$queryRaw<any[]>(Prisma.sql`SELECT * FROM cluster_submissions WHERE id=${id} AND cluster_id=${clusterId}`);
  return rows[0] ?? null;
}
export async function updateDraft(id:number,clusterId:number,userId:number,data:{title?:string;report_period?:string;payload?:Record<string,unknown>}) {
  const rows=await prisma.$queryRaw<any[]>(Prisma.sql`
    UPDATE cluster_submissions SET title=COALESCE(${data.title??null},title),
      report_period=COALESCE(${data.report_period??null},report_period),
      payload=COALESCE(${data.payload===undefined?null:JSON.stringify(data.payload)}::jsonb,payload),updated_at=NOW()
    WHERE id=${id} AND cluster_id=${clusterId} AND created_by=${userId} AND status IN ('DRAFT','REVISION_REQUESTED')
    RETURNING *
  `);
  return rows[0] ?? null;
}
export async function submitReport(id:number,clusterId:number,userId:number) {
  const rows=await prisma.$queryRaw<any[]>(Prisma.sql`
    UPDATE cluster_submissions SET status='SUBMITTED',submitted_at=NOW(),reviewed_by=NULL,reviewed_at=NULL,review_remarks=NULL,updated_at=NOW()
    WHERE id=${id} AND cluster_id=${clusterId} AND created_by=${userId} AND status IN ('DRAFT','REVISION_REQUESTED')
    RETURNING *
  `);
  return rows[0] ?? null;
}
export async function reviewReport(id:number,clusterId:number,reviewerId:number,decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED",remarks:string) {
  const rows=await prisma.$queryRaw<any[]>(Prisma.sql`
    UPDATE cluster_submissions SET status=${decision},reviewed_by=${reviewerId},reviewed_at=NOW(),review_remarks=${remarks},updated_at=NOW()
    WHERE id=${id} AND cluster_id=${clusterId} AND status='SUBMITTED' RETURNING *
  `);
  return rows[0] ?? null;
}
