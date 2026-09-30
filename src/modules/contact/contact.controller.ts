import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendCreated, sendSuccess } from "../../utils/response";
import type {
    ContactMessageIdParams,
    ContactMessageListQuery,
    CreateContactMessageBody,
    UpdateContactMessageStatusBody,
} from "./contact.schema";
import * as contactService from "./contact.service";

/**
 * Contact module — controller layer (RoadMap.md §23 "CONTACT API").
 *
 * Thin HTTP adapters: parse validated input, delegate to the service, return
 * the standard envelope. No SQL, no business logic. No try/catch — Express 5
 * forwards rejected async handlers to the central error middleware.
 */

export async function submitContactMessage(_req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateContactMessageBody>(res);
    const result = await contactService.submitContactMessage(body);
    return sendCreated(res, result);
}

export async function listContactMessages(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, ContactMessageListQuery>(res);
    const { items, meta } = await contactService.listContactMessages(query);
    return sendSuccess(res, items, meta);
}

export async function getContactMessageById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ContactMessageIdParams>(res);
    const message = await contactService.getContactMessageById(params.id);
    return sendSuccess(res, message);
}

export async function updateContactMessageStatus(
    _req: Request,
    res: Response,
): Promise<Response> {
    const { params, body } = getValidated<
        UpdateContactMessageStatusBody,
        unknown,
        ContactMessageIdParams
    >(res);
    const message = await contactService.updateContactMessageStatus(params.id, body);
    return sendSuccess(res, message);
}

