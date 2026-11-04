import {ApiError} from "../../utils/response";
import * as repo from "./aip-workflow.repository";
import * as audit from "../audit/audit.service";
import type {CreateAipActivity,CreateAipReport} from "./aip-workflow.schema";
type Ctx={ipAddress?:string;userAgent?:string;path?:string};
async function log(userId:number,action:string,entity:string,id:number,oldValue:unknown,newValue:unknown,ctx:Ctx){
 await audit.recordAuditEntry({userId:String(userId),action,entity,entityId:id,oldValue,newValue,approvalStatus:null,context:{userId:String(userId),...ctx}});
}
const missing=()=>new ApiError({statusCode:404,code:"RECORD_NOT_FOUND",message:"AIP report not found or not editable"});
export async function activities(id:number){return repo.listActivities(id);}
export async function addActivity(id:number,userId:number,d:CreateAipActivity,ctx:Ctx){if(d.institute_id!==undefined&&!await repo.instituteBelongsToAipCluster(id,d.institute_id))throw new ApiError({statusCode:422,code:"INSTITUTE_OUTSIDE_AIP_CLUSTER",message:"The selected institute is not in this AIP’s cluster"});const a=await repo.createActivity(id,userId,d);await log(userId,"CREATE","AIP_ACTIVITY",a.id,null,{aip_id:id,activity_type:d.activity_type,title:d.title},ctx);return a;}
export async function reports(id:number){return repo.listReports(id);}
export async function createReport(id:number,userId:number,d:CreateAipReport,ctx:Ctx){const r=await repo.createReport(id,userId,d);await log(userId,"CREATE","AIP_SUBMISSION",r.id,null,{aip_id:id,status:r.status},ctx);return r;}
export async function updateReport(id:number,rid:number,userId:number,d:{title?:string;report_period?:string;payload?:Record<string,unknown>},ctx:Ctx){const old=await repo.getReport(rid,id);if(!old||old.created_by!==userId||!["DRAFT","REVISION_REQUESTED"].includes(old.status))throw missing();const r=await repo.updateReport(rid,id,userId,d);if(!r)throw missing();await log(userId,"UPDATE","AIP_SUBMISSION",rid,{status:old.status},{status:r.status,fields:Object.keys(d)},ctx);return r;}
export async function submitReport(id:number,rid:number,userId:number,ctx:Ctx){const r=await repo.submitReport(rid,id,userId);if(!r)throw new ApiError({statusCode:422,code:"INVALID_SUBMISSION_STATE",message:"Only your draft or returned report can be submitted"});await log(userId,"SUBMIT","AIP_SUBMISSION",rid,{status:"DRAFT"},{status:r.status},ctx);return r;}
export async function reviewReport(id:number,rid:number,userId:number,decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED",remarks:string,ctx:Ctx){const old=await repo.getReport(rid,id);if(!old)throw missing();const r=await repo.reviewReport(rid,id,userId,decision,remarks);if(!r)throw new ApiError({statusCode:422,code:"INVALID_SUBMISSION_STATE",message:"Only submitted reports can be reviewed"});await log(userId,decision,"AIP_SUBMISSION",rid,{status:old.status},{status:r.status,remarks},ctx);return r;}
