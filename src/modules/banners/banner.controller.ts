import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type {
    BannerIdParams,
    BannerListQuery,
    CreateBannerBody,
    UpdateBannerBody,
} from "./banner.schema";
import * as bannerService from "./banner.service";

/**
 * Banner Management module — controller layer (RoadMap.md §15 "BANNER APIs").
 *
 * Thin HTTP adapters: parse validated input, delegate to the service, return
 * the standard envelope. No SQL, no business logic. No try/catch — Express 5
 * forwards rejected async handlers to the central error middleware.
 *
 * Image upload: req.files comes from the banner.storage.ts multer uploader
 * (RoadMap §24); public URL paths are INFERRED / TO CONFIRM.
 */

export async function listBanners(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, BannerListQuery>(res);
    const { items, meta } = await bannerService.listBanners(query);
    return sendSuccess(res, items, meta);
}

export async function listActiveBanners(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, BannerListQuery>(res);
    const { items, meta } = await bannerService.listActiveBanners(query);
    return sendSuccess(res, items, meta);
}

export async function createBanner(_req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateBannerBody>(res);
    const banner = await bannerService.createBanner(body);
    return sendCreated(res, banner);
}

export async function updateBanner(_req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UpdateBannerBody, unknown, BannerIdParams>(res);
    const banner = await bannerService.updateBanner(params.id, body);
    return sendSuccess(res, banner);
}

export async function deleteBanner(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, BannerIdParams>(res);
    await bannerService.deleteBanner(params.id);
    return sendSuccess(res, { id: params.id });
}

export async function publishBanner(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, BannerIdParams>(res);
    const banner = await bannerService.publishBanner(params.id);
    return sendSuccess(res, banner);
}

export async function archiveBanner(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, BannerIdParams>(res);
    const banner = await bannerService.archiveBanner(params.id);
    return sendSuccess(res, banner);
}

export async function uploadBannerImagesController(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, BannerIdParams>(res);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
        throw new ApiError({
            statusCode: 422,
            code: "VALIDATION_ERROR",
            message: "At least one image file is required",
        });
    }
    const [first, second] = files;
    const banner = await bannerService.updateBannerImages(params.id, {
        desktop_image_url: first ? `/uploads/banners/${first.filename}` : undefined,
        mobile_image_url: second ? `/uploads/banners/${second.filename}` : undefined,
    });
    return sendSuccess(res, banner);
}

