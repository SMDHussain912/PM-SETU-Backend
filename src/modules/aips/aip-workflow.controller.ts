import type {Request,Response} from "express";
import {getValidated} from "../../middleware/validate.middleware";
import {sendSuccess} from "../../utils/response";
import * as service from "./aip-workflow.service";
import type {CreateAipActivity,CreateAipReport} from "./aip-workflow.schema";
const ctx=(r:Request)=>({ipAddress:r.ip,userAgent:r.get("user-agent"),path:r.originalUrl});
export async function activities(_q:Request,res:Response){const {params}=getValidated<unknown,unknown,{id:number}>(res);return sendSuccess(res,await service.activities(params.id));}
export async function addActivity(req:Request,res:Response){const {params,body}=getValidated<CreateAipActivity,unknown,{id:number}>(res);return sendSuccess(res,await service.addActivity(params.id,Number(req.user!.id),body,ctx(req)),undefined,201);}
export async function reports(_q:Request,res:Response){const {params}=getValidated<unknown,unknown,{id:number}>(res);return sendSuccess(res,await service.reports(params.id));}
export async function createReport(req:Request,res:Response){const {params,body}=getValidated<CreateAipReport,unknown,{id:number}>(res);return sendSuccess(res,await service.createReport(params.id,Number(req.user!.id),body,ctx(req)),undefined,201);}
export async function updateReport(req:Request,res:Response){const {params,body}=getValidated<{title?:string;report_period?:string;payload?:Record<string,unknown>},unknown,{id:number;submissionId:number}>(res);return sendSuccess(res,await service.updateReport(params.id,params.submissionId,Number(req.user!.id),body,ctx(req)));}
export async function submitReport(req:Request,res:Response){const {params}=getValidated<unknown,unknown,{id:number;submissionId:number}>(res);return sendSuccess(res,await service.submitReport(params.id,params.submissionId,Number(req.user!.id),ctx(req)));}
export async function reviewReport(req:Request,res:Response){const {params,body}=getValidated<{decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED";remarks:string},unknown,{id:number;submissionId:number}>(res);return sendSuccess(res,await service.reviewReport(params.id,params.submissionId,Number(req.user!.id),body.decision,body.remarks,ctx(req)));}
