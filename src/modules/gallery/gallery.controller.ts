import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type {
    CreateGalleryItemBody,
    GalleryIdParams,
    GalleryListQuery,
    UpdateGalleryItemBody,
} from "./gallery.schema";
import * as galleryService from "./gallery.service";

/**
 * Gallery Management module — controller layer.
 *
 * Thin HTTP adapters: parse validated input, delegate to the service, return
 * the standard envelope. No SQL, no business logic. No try/catch — Express 5
 * forwards rejected async handlers to the central error middleware.
 */

export async function listGalleryItems(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, GalleryListQuery>(res);
    const { items, meta } = await galleryService.listGalleryItems(query);
    return sendSuccess(res, items, meta);
}

export async function getGalleryItemById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, GalleryIdParams>(res);
    const item = await galleryService.getGalleryItemById(params.id);
    return sendSuccess(res, item);
}

export async function listGalleryPhotos(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, GalleryListQuery>(res);
    const { items, meta } = await galleryService.listGalleryPhotos(query);
    return sendSuccess(res, items, meta);
}

export async function listGalleryVideos(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, GalleryListQuery>(res);
    const { items, meta } = await galleryService.listGalleryVideos(query);
    return sendSuccess(res, items, meta);
}

export async function createGalleryItem(_req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateGalleryItemBody>(res);
    const item = await galleryService.createGalleryItem(body);
    return sendCreated(res, item);
}

export async function updateGalleryItem(_req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UpdateGalleryItemBody, unknown, GalleryIdParams>(res);
    const item = await galleryService.updateGalleryItem(params.id, body);
    return sendSuccess(res, item);
}

export async function deleteGalleryItem(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, GalleryIdParams>(res);
    await galleryService.deleteGalleryItem(params.id);
    return sendSuccess(res, { id: params.id });
}

/**
 * POST /admin/gallery/upload — row-less media upload (RoadMap §24).
 * Returns stored-file metadata; the client persists the URL via POST/PATCH
 * (media_url / thumbnail_url). No DB write happens here — the file is stored
 * on disk and metadata is returned for the caller to bind.
 */
export async function uploadGalleryMedia(req: Request, res: Response): Promise<Response> {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
        throw new ApiError({
            statusCode: 422,
            code: "VALIDATION_ERROR",
            message: "A media file is required",
        });
    }
    return sendSuccess(res, {
        file_path: file.path,
        file_name: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
    });
}
