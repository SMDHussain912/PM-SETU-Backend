import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type {
    ContactMessageListQuery,
    CreateContactMessageBody,
    UpdateContactMessageStatusBody,
} from "./contact.schema";
import * as contactRepository from "./contact.repository";
import type { ContactMessage } from "./contact.types";

/**
 * Contact module — service layer (RoadMap.md §23 "CONTACT API").
 *
 * Owns business rules (pagination composition, not-found handling) and
 * delegates all data access to the repository. The public submission path
 * stores the message with INFERRED status 'NEW'; triage PATCH writes status
 * only (INFERRED / TO CONFIRM).
 */

export interface ContactListResult {
    items: ContactMessage[];
    meta: PaginationMeta;
}

export async function submitContactMessage(
    body: CreateContactMessageBody,
): Promise<{ id: number }> {
    const id = await contactRepository.createContactMessage({
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        subject: body.subject ?? null,
        message: body.message,
    });
    return { id };
}

export async function listContactMessages(
    query: ContactMessageListQuery,
): Promise<ContactListResult> {
    const filters = { page: query.page, pageSize: query.pageSize };
    const [items, total] = await Promise.all([
        contactRepository.listContactMessages(filters),
        contactRepository.countContactMessages(),
    ]);
    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getContactMessageById(id: number): Promise<ContactMessage> {
    const message = await contactRepository.getContactMessageById(id);
    if (!message) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Contact message not found",
        });
    }
    return message;
}

export async function updateContactMessageStatus(
    id: number,
    body: UpdateContactMessageStatusBody,
): Promise<ContactMessage> {
    const existing = await contactRepository.getContactMessageById(id);
    if (!existing) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Contact message not found",
        });
    }
    await contactRepository.updateContactMessageStatus(id, body.status);
    const updated = await contactRepository.getContactMessageById(id);
    if (!updated) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Contact message not found",
        });
    }
    return updated;
}

