import type {Request,Response} from "express";
import {getValidated} from "../../middleware/validate.middleware";
import {sendSuccess} from "../../utils/response";
import * as service from "./iti-workflow.service";
import type {UpdateItiProfile,CreateItiSubmission} from "./iti-workflow.schema";
const context=(req:Request)=>({userId:req.user!.id,ipAddress:req.ip,userAgent:req.get("user-agent"),path:req.originalUrl});
export async function updateProfile(req:Request,res:Response){const {params,body}=getValidated<UpdateItiProfile,unknown,{id:number}>(res);return sendSuccess(res,await service.updateProfile(params.id,body,context(req)));}
export async function list(req:Request,res:Response){const {params}=getValidated<unknown,unknown,{id:number}>(res);return sendSuccess(res,await service.list(params.id));}
export async function create(req:Request,res:Response){const {params,body}=getValidated<CreateItiSubmission,unknown,{id:number}>(res);return sendSuccess(res,await service.create(params.id,Number(req.user!.id),body,context(req)),undefined,201);}
export async function update(req:Request,res:Response){const {params,body}=getValidated<{title?:string;payload?:Record<string,unknown>},unknown,{id:number;submissionId:number}>(res);return sendSuccess(res,await service.update(params.id,params.submissionId,Number(req.user!.id),body,context(req)));}
export async function submit(req:Request,res:Response){const {params}=getValidated<unknown,unknown,{id:number;submissionId:number}>(res);return sendSuccess(res,await service.submit(params.id,params.submissionId,Number(req.user!.id),context(req)));}
export async function review(req:Request,res:Response){const {params,body}=getValidated<{decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED";remarks:string},unknown,{id:number;submissionId:number}>(res);return sendSuccess(res,await service.review(params.id,params.submissionId,Number(req.user!.id),body.decision,body.remarks,context(req)));}
