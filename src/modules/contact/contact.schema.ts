import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import { CONTACT_MESSAGE_STATUS } from "./contact.types";

/**
 * Contact module — request validation (RoadMap.md §23 "CONTACT API").
 *
 * POST /contact is a public form write: strict body limits (no CAPTCHA
 * provider exists yet — TO CONFIRM). PATCH /messages/:id writes status
 * only (INFERRED / TO CONFIRM). List queries are pagination-only; §23
 * documents no filters so none are invented.
 */

export const createContactMessageSchema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    phone: z
        .string()
        .trim()
        .min(6)
        .max(20)
        .optional(),
    subject: z.string().trim().max(200).optional(),
    message: z.string().trim().min(1).max(2000),
});

export const contactMessageIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const contactMessageListQuerySchema = paginationQuerySchema;

export const updateContactMessageStatusSchema = z.object({
    status: z.enum([
        CONTACT_MESSAGE_STATUS.NEW,
        CONTACT_MESSAGE_STATUS.READ,
        CONTACT_MESSAGE_STATUS.REPLIED,
        CONTACT_MESSAGE_STATUS.ARCHIVED,
    ]),
});

export type CreateContactMessageBody = z.infer<typeof createContactMessageSchema>;
export type ContactMessageIdParams = z.infer<typeof contactMessageIdParamsSchema>;
export type ContactMessageListQuery = z.infer<typeof contactMessageListQuerySchema>;
export type UpdateContactMessageStatusBody = z.infer<typeof updateContactMessageStatusSchema>;

