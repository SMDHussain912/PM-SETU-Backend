import {Prisma} from "../../generated/prisma/client";
import {prisma} from "../../config/database";
import type {CreateAipActivity,CreateAipReport} from "./aip-workflow.schema";
export async function instituteBelongsToAipCluster(aipId:number,instituteId:number, db: Prisma.TransactionClient = prisma){
 const rows=await db.$queryRaw<{allowed:boolean}[]>(Prisma.sql`SELECT EXISTS(SELECT 1 FROM aips a JOIN itis i ON i.cluster_id=a.cluster_id WHERE a.id=${aipId} AND i.id=${instituteId}) AS allowed`);
 return rows[0]?.allowed===true;
}
export async function listActivities(aipId:number, db: Prisma.TransactionClient = prisma){
 return db.$queryRaw<any[]>(Prisma.sql`SELECT a.id,a.aip_id,a.created_by,u.full_name AS creator_name,a.activity_type,a.title,a.description,a.quantity,a.activity_date,a.institute_id,i.iti_name AS institute_name,a.evidence_url,a.created_at,a.updated_at FROM aip_activity_records a JOIN users u ON u.id=a.created_by LEFT JOIN itis i ON i.id=a.institute_id WHERE a.aip_id=${aipId} ORDER BY a.activity_date DESC NULLS LAST,a.id DESC`);
}
export async function createActivity(aipId:number,userId:number,d:CreateAipActivity, db: Prisma.TransactionClient = prisma){
 const rows=await db.$queryRaw<any[]>(Prisma.sql`INSERT INTO aip_activity_records(aip_id,created_by,activity_type,title,description,quantity,activity_date,institute_id,evidence_url,updated_at) VALUES(${aipId},${userId},${d.activity_type},${d.title},${d.description??null},${d.quantity??null},${d.activity_date??null},${d.institute_id??null},${d.evidence_url??null},NOW()) RETURNING *`);
 return rows[0];
}
export async function createReport(aipId:number,userId:number,d:CreateAipReport, db: Prisma.TransactionClient = prisma){
 const rows=await db.$queryRaw<any[]>(Prisma.sql`INSERT INTO aip_submissions(aip_id,created_by,title,report_period,payload,status,updated_at) VALUES(${aipId},${userId},${d.title},${d.report_period},${JSON.stringify(d.payload)}::jsonb,'DRAFT',NOW()) RETURNING *`);
 return rows[0];
}
export async function listReports(aipId:number, db: Prisma.TransactionClient = prisma){
 return db.$queryRaw<any[]>(Prisma.sql`SELECT s.*,u.full_name AS creator_name,r.full_name AS reviewer_name FROM aip_submissions s JOIN users u ON u.id=s.created_by LEFT JOIN users r ON r.id=s.reviewed_by WHERE s.aip_id=${aipId} ORDER BY s.updated_at DESC,s.id DESC`);
}
export async function getReport(id:number,aipId:number, db: Prisma.TransactionClient = prisma){
 const rows=await db.$queryRaw<any[]>(Prisma.sql`SELECT * FROM aip_submissions WHERE id=${id} AND aip_id=${aipId}`);return rows[0]??null;
}
export async function updateReport(id:number,aipId:number,userId:number,d:{title?:string;report_period?:string;payload?:Record<string,unknown>}, db: Prisma.TransactionClient = prisma){
 const rows=await db.$queryRaw<any[]>(Prisma.sql`UPDATE aip_submissions SET title=COALESCE(${d.title??null},title),report_period=COALESCE(${d.report_period??null},report_period),payload=COALESCE(${d.payload===undefined?null:JSON.stringify(d.payload)}::jsonb,payload),updated_at=NOW() WHERE id=${id} AND aip_id=${aipId} AND created_by=${userId} AND status IN ('DRAFT','REVISION_REQUESTED') RETURNING *`);return rows[0]??null;
}
export async function submitReport(id:number,aipId:number,userId:number, db: Prisma.TransactionClient = prisma){
 const rows=await db.$queryRaw<any[]>(Prisma.sql`UPDATE aip_submissions SET status='SUBMITTED',submitted_at=NOW(),reviewed_by=NULL,reviewed_at=NULL,review_remarks=NULL,updated_at=NOW() WHERE id=${id} AND aip_id=${aipId} AND created_by=${userId} AND status IN ('DRAFT','REVISION_REQUESTED') RETURNING *`);return rows[0]??null;
}
export async function reviewReport(id:number,aipId:number,userId:number,decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED",remarks:string, db: Prisma.TransactionClient = prisma){
 const rows=await db.$queryRaw<any[]>(Prisma.sql`UPDATE aip_submissions SET status=${decision},reviewed_by=${userId},reviewed_at=NOW(),review_remarks=${remarks},updated_at=NOW() WHERE id=${id} AND aip_id=${aipId} AND status='SUBMITTED' RETURNING *`);return rows[0]??null;
}
