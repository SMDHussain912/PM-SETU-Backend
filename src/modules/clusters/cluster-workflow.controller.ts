import type {Request,Response} from "express";
import {getValidated} from "../../middleware/validate.middleware";
import {sendSuccess} from "../../utils/response";
import * as service from "./cluster-workflow.service";
import type {CreateClusterReport} from "./cluster-workflow.schema";
const ctx=(req:Request)=>({ipAddress:req.ip,userAgent:req.get("user-agent"),path:req.originalUrl});
export async function overview(req:Request,res:Response){const {params}=getValidated<unknown,unknown,{id:number}>(res);return sendSuccess(res,await service.overview(params.id));}
export async function instituteReports(req:Request,res:Response){const {params}=getValidated<unknown,unknown,{id:number}>(res);return sendSuccess(res,await service.instituteReports(params.id));}
export async function reports(req:Request,res:Response){const {params}=getValidated<unknown,unknown,{id:number}>(res);return sendSuccess(res,await service.reports(params.id));}
export async function create(req:Request,res:Response){const {params,body}=getValidated<CreateClusterReport,unknown,{id:number}>(res);return sendSuccess(res,await service.create(params.id,Number(req.user!.id),body,ctx(req)),undefined,201);}
export async function update(req:Request,res:Response){const {params,body}=getValidated<{title?:string;report_period?:string;payload?:Record<string,unknown>},unknown,{id:number;submissionId:number}>(res);return sendSuccess(res,await service.update(params.id,params.submissionId,Number(req.user!.id),body,ctx(req)));}
export async function submit(req:Request,res:Response){const {params}=getValidated<unknown,unknown,{id:number;submissionId:number}>(res);return sendSuccess(res,await service.submit(params.id,params.submissionId,Number(req.user!.id),ctx(req)));}
export async function review(req:Request,res:Response){const {params,body}=getValidated<{decision:"APPROVED"|"REVISION_REQUESTED"|"REJECTED";remarks:string},unknown,{id:number;submissionId:number}>(res);return sendSuccess(res,await service.review(params.id,params.submissionId,Number(req.user!.id),body.decision,body.remarks,ctx(req)));}
