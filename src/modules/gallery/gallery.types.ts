/**
 * Gallery Management module — public types.
 *
 * All fields except `id` are sourced from the task brief and are NOT verifiable
 * in RoadMap.md §14 (which defines no field list). They are marked TO CONFIRM
 * pending NIC-document verification. The 4 public endpoints (gallery, gallery/:id,
 * gallery/photos, gallery/videos) are explicitly supported by §14.
 */

export interface GalleryItem {
    id: number;
    title: string | null;
    description: string | null;
    type: string | null;        // PHOTO | VIDEO | PRESS_RELEASE (vocabulary TO CONFIRM)
    media_url: string | null;
    thumbnail_url: string | null;
    published_date: string | null;
    category: string | null;
    is_published: boolean | null;
    display_order: number | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface GalleryListFilters {
    page: number;
    pageSize: number;
}

/**
 * Admin create/update inputs (RoadMap §14). Field list is the existing public
 * contract — INFERRED / TO CONFIRM with DBA. Admin reads (GET /admin/gallery)
 * are NOT implemented (§14 defines none).
 */
export interface CreateGalleryItemInput {
    title: string;
    description: string | null;
    type: string; // PHOTO | VIDEO | PRESS_RELEASE (vocabulary TO CONFIRM)
    media_url: string | null;
    thumbnail_url: string | null;
    published_date: Date | null;
    category: string | null;
    display_order: number | null;
}

export interface UpdateGalleryItemInput {
    title?: string;
    description?: string | null;
    type?: string;
    media_url?: string | null;
    thumbnail_url?: string | null;
    published_date?: Date | null;
    category?: string | null;
    is_published?: boolean | null;
    display_order?: number | null;
}

