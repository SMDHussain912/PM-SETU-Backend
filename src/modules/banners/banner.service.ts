import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type {
    BannerListQuery,
    CreateBannerBody,
    UpdateBannerBody,
} from "./banner.schema";
import * as bannerRepository from "./banner.repository";
import type { Banner } from "./banner.types";

/**
 * Banner Management module — service layer (RoadMap.md §15 "BANNER APIs").
 *
 * Owns business rules (pagination composition, not-found handling, publish /
 * archive transition guards) and delegates all data access to the repository.
 * Lifecycle is owned here (SIP precedent) — the approvals module is a future
 * integration point, not a gate.
 */

export interface BannerListResult {
    items: Banner[];
    meta: PaginationMeta;
}

export async function listBanners(query: BannerListQuery): Promise<BannerListResult> {
    const filters = { page: query.page, pageSize: query.pageSize };
    const [items, total] = await Promise.all([
        bannerRepository.listBanners(filters),
        bannerRepository.countBanners(),
    ]);
    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function listActiveBanners(query: BannerListQuery): Promise<BannerListResult> {
    const filters = { page: query.page, pageSize: query.pageSize };
    const [items, total] = await Promise.all([
        bannerRepository.listActiveBanners(filters),
        bannerRepository.countActiveBanners(),
    ]);
    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

async function requireBanner(id: number): Promise<Banner> {
    const banner = await bannerRepository.getBannerById(id);
    if (!banner) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Banner not found",
        });
    }
    return banner;
}

export async function createBanner(body: CreateBannerBody): Promise<Banner> {
    const id = await bannerRepository.createBanner({
        title: body.title,
        desktop_image_url: body.desktop_image_url ?? null,
        mobile_image_url: body.mobile_image_url ?? null,
        cta_text: body.cta_text ?? null,
        cta_url: body.cta_url ?? null,
        display_order: body.display_order,
        start_date: body.start_date ?? null,
        end_date: body.end_date ?? null,
    });
    return requireBanner(id);
}

export async function updateBanner(id: number, body: UpdateBannerBody): Promise<Banner> {
    await requireBanner(id);
    await bannerRepository.updateBanner(id, {
        title: body.title,
        desktop_image_url: body.desktop_image_url,
        mobile_image_url: body.mobile_image_url,
        cta_text: body.cta_text,
        cta_url: body.cta_url,
        display_order: body.display_order,
        start_date: body.start_date,
        end_date: body.end_date,
    });
    return requireBanner(id);
}

export async function deleteBanner(id: number): Promise<void> {
    await requireBanner(id);
    await bannerRepository.deleteBanner(id);
}

export async function publishBanner(id: number): Promise<Banner> {
    const banner = await requireBanner(id);
    if (banner.is_archived === true) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_TRANSITION",
            message: "Archived banners cannot be published",
        });
    }
    await bannerRepository.publishBanner(id);
    return requireBanner(id);
}

export async function archiveBanner(id: number): Promise<Banner> {
    await requireBanner(id);
    await bannerRepository.archiveBanner(id);
    return requireBanner(id);
}

export async function updateBannerImages(
    id: number,
    input: { desktop_image_url?: string | null; mobile_image_url?: string | null },
): Promise<Banner> {
    await requireBanner(id);
    await bannerRepository.updateBannerImages(id, input);
    return requireBanner(id);
}

