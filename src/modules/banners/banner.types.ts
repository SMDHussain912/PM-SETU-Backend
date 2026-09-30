/**
 * Banner Management module — public + admin types (RoadMap.md §15).
 *
 * §15 defines field CONCEPTS only (desktop/mobile image, title, dates, CTA,
 * ordering, approval information); §25 lists only the Banner concept. Every
 * field below except `id` is INFERRED / TO CONFIRM pending NIC-document
 * verification and DBA confirmation.
 */

export interface Banner {
    id: number;
    title: string | null;
    desktop_image_url: string | null;
    mobile_image_url: string | null;
    cta_text: string | null;
    cta_url: string | null;
    display_order: number | null;
    start_date: string | null;
    end_date: string | null;
    is_published: boolean | null;
    is_archived: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface BannerListFilters {
    page: number;
    pageSize: number;
}

export interface CreateBannerInput {
    title: string;
    desktop_image_url: string | null;
    mobile_image_url: string | null;
    cta_text: string | null;
    cta_url: string | null;
    display_order: number;
    start_date: Date | null;
    end_date: Date | null;
}

export interface UpdateBannerInput {
    title?: string;
    desktop_image_url?: string | null;
    mobile_image_url?: string | null;
    cta_text?: string | null;
    cta_url?: string | null;
    display_order?: number;
    start_date?: Date | null;
    end_date?: Date | null;
}

