/**
 * Contact module — public + admin types (RoadMap.md §23 "CONTACT API").
 *
 * §23 defines NO field list; §25 lists only the ContactMessage concept.
 * Every field below except `id` is INFERRED / TO CONFIRM pending
 * NIC-document verification and DBA confirmation.
 */

export const CONTACT_MESSAGE_STATUS = {
    NEW: "NEW",
    READ: "READ",
    REPLIED: "REPLIED",
    ARCHIVED: "ARCHIVED",
} as const;

export type ContactMessageStatus =
    (typeof CONTACT_MESSAGE_STATUS)[keyof typeof CONTACT_MESSAGE_STATUS];

export interface ContactMessage {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    subject: string | null;
    message: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface ContactListFilters {
    page: number;
    pageSize: number;
}

