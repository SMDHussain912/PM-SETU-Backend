import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type {
    CreateNewsBody,
    NewsIdParams,
    NewsListQuery,
    UpdateNewsBody,
} from "./news.schema";
import * as newsService from "./news.service";
import { toPublicNews } from "./news.public";
import { discardDocumentUpload, validateDocumentUpload } from "../documents/document.file-validation";

/**
 * News Management module — controller layer.
 *
 * Thin HTTP adapters: parse validated input, delegate to the service, return
 * the standard envelope. No SQL, no business logic. No try/catch — Express 5
 * forwards rejected async handlers to the central error middleware.
 */

export async function listNews(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, NewsListQuery>(res);
    const { items, meta } = await newsService.listNews(query);
    return sendSuccess(res, items.map(toPublicNews), meta);
}

export async function getNewsById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, NewsIdParams>(res);
    const news = await newsService.getNewsById(params.id);
    return sendSuccess(res, toPublicNews(news));
}

export async function getLatestNews(_req: Request, res: Response): Promise<Response> {
    const news = await newsService.getLatestNews();
    return sendSuccess(res, news.map(toPublicNews));
}

export async function createNews(_req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateNewsBody>(res);
    const news = await newsService.createNews(body);
    return sendCreated(res, news);
}

export async function updateNews(_req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UpdateNewsBody, unknown, NewsIdParams>(res);
    const news = await newsService.updateNews(params.id, body);
    return sendSuccess(res, news);
}

export async function deleteNews(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, NewsIdParams>(res);
    await newsService.deleteNews(params.id);
    return sendSuccess(res, { id: params.id });
}

export async function publishNews(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, NewsIdParams>(res);
    const news = await newsService.publishNews(params.id);
    return sendSuccess(res, news);
}

export async function archiveNews(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, NewsIdParams>(res);
    const news = await newsService.archiveNews(params.id);
    return sendSuccess(res, news);
}

export async function attachNewsFile(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, NewsIdParams>(res);
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
        throw new ApiError({
            statusCode: 422,
            code: "VALIDATION_ERROR",
            message: "An attachment file is required",
        });
    }
    let safeFileName: string;
    try {
        safeFileName = await validateDocumentUpload(file);
    } catch (error) {
        // Multer has already written the file. Remove rejected content.
        await discardDocumentUpload(file.path).catch(() => undefined);
        throw error;
    }

    try {
        const news = await newsService.attachNewsFile(params.id, {
            file_path: file.path,
            file_name: safeFileName,
            mime_type: file.mimetype,
            file_size: file.size,
        });
        return sendSuccess(res, news);
    } catch (error) {
        // Do not orphan a file when the metadata write fails.
        await discardDocumentUpload(file.path).catch(() => undefined);
        throw error;
    }
}
