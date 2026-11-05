import { ApiError } from "../../utils/response";
import * as repo from "./cluster-workflow.repository";
import * as audit from "../audit/audit.service";
import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import type { CreateClusterReport } from "./cluster-workflow.schema";
type Ctx={ipAddress?:string;userAgent?:string;path?:string};
const notFound=()=>new ApiError({statusCode:404,code:"RECORD_NOT_FOUND",message:"Cluster report not found or is not editable"});
async function log(tx:Prisma.TransactionClient,userId:number,action:string,id:number,oldValue:unknown,newValue:unknown,ctx:Ctx){
 await audit.recordAuditEntry({userId:String(userId),action,entity:"CLUSTER_SUBMISSION",entityId:id,oldValue,newValue,approvalStatus:null,context:{userId:String(userId),...ctx}},tx);
}
export async function overview(id:number){const v=await repo.getOverview(id);if(!v)throw new ApiError({statusCode:404,code:"RECORD_NOT_FOUND",message:"Cluster not found"});return v;}
export async function instituteReports(id:number){return repo.listInstituteReports(id);}
export async function reports(id:number){return repo.listReports(id);}
export async function create(id:number,userId:number,data:CreateClusterReport,ctx:Ctx){return prisma.$transaction(async tx=>{const v=await repo.createReport(id,userId,data,tx);await log(tx,userId,"CREATE",v.id,null,{cluster_id:id,status:v.status},ctx);return v;});}
export async function update(id:number,reportId:number,userId:number,data:{title?:string;report_period?:string;payload?:Record<string,unknown>},ctx:Ctx){return prisma.$transaction(async tx=>{const old=await repo.getReport(reportId,id,tx);if(!old||old.created_by!==userId||!["DRAFT","REVISION_REQUESTED"].includes(old.status))throw notFound();const v=await repo.updateDraft(reportId,id,userId,data,tx);if(!v)throw notFound();await log(tx,userId,"UPDATE",reportId,{status:old.status},{status:v.status,fields:Object.keys(data)},ctx);return v;});}
export async function submit(id:number,reportId:number,userId:number,ctx:Ctx){return prisma.$transaction(async tx=>{const old=await repo.getReport(reportId,id,tx);if(!old||old.created_by!==userId)throw notFound();const v=await repo.submitReport(reportId,id,userId,tx);if(!v)throw new ApiError({statusCode:422,code:"INVALID_SUBMISSION_STATE",message:"Only your draft or returned report can be submitted"});await log(tx,userId,"SUBMIT",reportId,{status:old.status},{status:v.status},ctx);return v;});}
export async function review(id:number,reportId:number,userId:number,decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED",remarks:string,ctx:Ctx){return prisma.$transaction(async tx=>{const old=await repo.getReport(reportId,id,tx);if(!old)throw notFound();const v=await repo.reviewReport(reportId,id,userId,decision,remarks,tx);if(!v)throw new ApiError({statusCode:422,code:"INVALID_SUBMISSION_STATE",message:"Only submitted cluster reports can be reviewed"});await log(tx,userId,decision,reportId,{status:old.status},{status:v.status,remarks},ctx);return v;});}
