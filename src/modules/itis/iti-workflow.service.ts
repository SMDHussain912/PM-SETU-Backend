import { ApiError } from "../../utils/response";
import * as repo from "./iti-workflow.repository";
import * as audit from "../audit/audit.service";
import type { UpdateItiProfile, CreateItiSubmission } from "./iti-workflow.schema";

type Context={userId:string;ipAddress?:string;userAgent?:string;path?:string};
const missing=()=>new ApiError({statusCode:404,code:"RECORD_NOT_FOUND",message:"Record not found or no longer editable"});
async function log(context:Context, action:string, entity:string, id:number, oldValue:unknown, newValue:unknown) {
  await audit.recordAuditEntry({userId:context.userId,action,entity,entityId:id,oldValue,newValue,approvalStatus:null,context});
}
export async function updateProfile(id:number, data:UpdateItiProfile, context:Context) {
  const updated=await repo.updateItiProfile(id,data);
  if(!updated) throw missing();
  await log(context,"UPDATE","ITI",id,null,{changed_fields:Object.keys(data)});
  return {id,updated_fields:Object.keys(data)};
}
export async function create(id:number,userId:number,data:CreateItiSubmission,context:Context) {
  const item=await repo.createSubmission(id,userId,data);
  await log(context,"CREATE","ITI_SUBMISSION",item.id,null,{iti_id:id,report_type:item.report_type,status:item.status});
  return item;
}
export async function list(id:number) { return repo.listSubmissions(id); }
export async function update(id:number,submissionId:number,userId:number,data:{title?:string;payload?:Record<string,unknown>},context:Context) {
  const old=await repo.getSubmission(submissionId,id);
  if(!old || old.created_by!==userId || !["DRAFT","REVISION_REQUESTED"].includes(old.status)) throw missing();
  const item=await repo.updateDraft(submissionId,id,userId,data);
  if(!item) throw missing();
  await log(context,"UPDATE","ITI_SUBMISSION",submissionId,{status:old.status},{status:item.status,changed_fields:Object.keys(data)});
  return item;
}
export async function submit(id:number,submissionId:number,userId:number,context:Context) {
  const old=await repo.getSubmission(submissionId,id);
  if(!old || old.created_by!==userId) throw missing();
  const item=await repo.submitDraft(submissionId,id,userId);
  if(!item) throw new ApiError({statusCode:422,code:"INVALID_SUBMISSION_STATE",message:"Only your draft or returned submission can be submitted"});
  await log(context,"SUBMIT","ITI_SUBMISSION",submissionId,{status:old.status},{status:item.status});
  return item;
}
export async function review(id:number,submissionId:number,reviewerId:number,decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED",remarks:string,context:Context) {
  const old=await repo.getSubmission(submissionId,id);
  if(!old) throw missing();
  const item=await repo.reviewSubmission(submissionId,id,reviewerId,decision,remarks);
  if(!item) throw new ApiError({statusCode:422,code:"INVALID_SUBMISSION_STATE",message:"Only submitted reports can be reviewed"});
  await log(context,decision==="APPROVED"?"APPROVE":decision==="REJECTED"?"REJECT":"REQUEST_REVISION","ITI_SUBMISSION",submissionId,{status:old.status},{status:item.status,remarks});
  return item;
}
