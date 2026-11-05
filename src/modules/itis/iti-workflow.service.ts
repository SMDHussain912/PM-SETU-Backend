import { ApiError } from "../../utils/response";
import * as repo from "./iti-workflow.repository";
import * as audit from "../audit/audit.service";
import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import type { UpdateItiProfile, CreateItiSubmission } from "./iti-workflow.schema";

type Context={userId:string;ipAddress?:string;userAgent?:string;path?:string};
const missing=()=>new ApiError({statusCode:404,code:"RECORD_NOT_FOUND",message:"Record not found or no longer editable"});
async function log(tx:Prisma.TransactionClient,context:Context,action:string,entity:string,id:number,oldValue:unknown,newValue:unknown) {
  await audit.recordAuditEntry({userId:context.userId,action,entity,entityId:id,oldValue,newValue,approvalStatus:null,context},tx);
}
export async function updateProfile(id:number,data:UpdateItiProfile,context:Context) {
  return prisma.$transaction(async tx=>{
    const updated=await repo.updateItiProfile(id,data,tx);
    if(!updated) throw missing();
    await log(tx,context,"UPDATE","ITI",id,null,{changed_fields:Object.keys(data)});
    return {id,updated_fields:Object.keys(data)};
  });
}
export async function create(id:number,userId:number,data:CreateItiSubmission,context:Context) {
  return prisma.$transaction(async tx=>{
    const item=await repo.createSubmission(id,userId,data,tx);
    await log(tx,context,"CREATE","ITI_SUBMISSION",item.id,null,{iti_id:id,report_type:item.report_type,status:item.status});
    return item;
  });
}
export async function list(id:number) { return repo.listSubmissions(id); }
export async function update(id:number,submissionId:number,userId:number,data:{title?:string;payload?:Record<string,unknown>},context:Context) {
  return prisma.$transaction(async tx=>{
    const old=await repo.getSubmission(submissionId,id,tx);
    if(!old||old.created_by!==userId||!["DRAFT","REVISION_REQUESTED"].includes(old.status)) throw missing();
    const item=await repo.updateDraft(submissionId,id,userId,data,tx);
    if(!item) throw missing();
    await log(tx,context,"UPDATE","ITI_SUBMISSION",submissionId,{status:old.status},{status:item.status,changed_fields:Object.keys(data)});
    return item;
  });
}
export async function submit(id:number,submissionId:number,userId:number,context:Context) {
  return prisma.$transaction(async tx=>{
    const old=await repo.getSubmission(submissionId,id,tx);
    if(!old||old.created_by!==userId) throw missing();
    const item=await repo.submitDraft(submissionId,id,userId,tx);
    if(!item) throw new ApiError({statusCode:422,code:"INVALID_SUBMISSION_STATE",message:"Only your draft or returned submission can be submitted"});
    await log(tx,context,"SUBMIT","ITI_SUBMISSION",submissionId,{status:old.status},{status:item.status});
    return item;
  });
}
export async function review(id:number,submissionId:number,reviewerId:number,decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED",remarks:string,context:Context) {
  return prisma.$transaction(async tx=>{
    const old=await repo.getSubmission(submissionId,id,tx);
    if(!old) throw missing();
    const item=await repo.reviewSubmission(submissionId,id,reviewerId,decision,remarks,tx);
    if(!item) throw new ApiError({statusCode:422,code:"INVALID_SUBMISSION_STATE",message:"Only submitted reports can be reviewed"});
    await log(tx,context,decision==="APPROVED"?"APPROVE":decision==="REJECTED"?"REJECT":"REQUEST_REVISION","ITI_SUBMISSION",submissionId,{status:old.status},{status:item.status,remarks});
    return item;
  });
}
