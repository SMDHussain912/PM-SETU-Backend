import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { ContactListFilters, ContactMessage } from "./contact.types";

/**
 * Contact module — database access layer.
 *
 * The statements below mirror sql/contact/contact_queries.sql, the
 * DBA-maintained copy. If a query changes, update BOTH files. All user input
 * is passed through tagged-template interpolation (bound parameters) — never
 * string-concatenate values, never use $queryRawUnsafe.
 *
 * STATUS (full details in sql/contact/contact_queries.sql):
 *   The PM SETU tables do not exist yet. Until the DBA creates the real
 *   schema, these queries fail at runtime and the endpoints return a 500
 *   error envelope. That is intentional: no fake contact records.
 */

interface ContactMessageRow {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    subject: string | null;
    message: string | null;
    status: string | null;
    created_at: Date | null;
    updated_at: Date | null;
}

const CONTACT_SELECT = Prisma.sql`
    SELECT
        contact_messages.id            AS id,
        contact_messages.name          AS name,
        contact_messages.email         AS email,
        contact_messages.phone         AS phone,
        contact_messages.subject       AS subject,
        contact_messages.message       AS message,
        contact_messages.status        AS status,
        contact_messages.created_at    AS created_at,
        contact_messages.updated_at    AS updated_at
    FROM contact_messages`;

function mapContactMessageRow(row: ContactMessageRow): ContactMessage {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        subject: row.subject,
        message: row.message,
        status: row.status,
        created_at: row.created_at ? row.created_at.toISOString() : null,
        updated_at: row.updated_at ? row.updated_at.toISOString() : null,
    };
}


/** POST /contact — public form submission (sql/contact #1). */
export async function createContactMessage(input: {
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
}): Promise<number> {
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        INSERT INTO contact_messages (name, email, phone, subject, message, status)
        VALUES (${input.name}, ${input.email}, ${input.phone}, ${input.subject}, ${input.message}, 'NEW')
        RETURNING id`);
    return rows[0].id;
}

/** GET /admin/contact/messages — paginated, newest first (sql/contact #2). */
export async function listContactMessages(
    filters: ContactListFilters,
): Promise<ContactMessage[]> {
    const rows = await prisma.$queryRaw<ContactMessageRow[]>(
        Prisma.sql`${CONTACT_SELECT} ORDER BY contact_messages.created_at DESC NULLS LAST, contact_messages.id DESC LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapContactMessageRow);
}

/** GET /admin/contact/messages — count (sql/contact #3). */
export async function countContactMessages(): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM contact_messages`,
    );
    return Number(rows[0]?.count ?? 0);
}

/** GET /admin/contact/messages/:id (sql/contact #4). */
export async function getContactMessageById(id: number): Promise<ContactMessage | null> {
    const rows = await prisma.$queryRaw<ContactMessageRow[]>(
        Prisma.sql`${CONTACT_SELECT} WHERE contact_messages.id = ${id}`,
    );
    return rows[0] ? mapContactMessageRow(rows[0]) : null;
}

/** PATCH /admin/contact/messages/:id — status only (sql/contact #5). */
export async function updateContactMessageStatus(id: number, status: string): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE contact_messages
        SET status = ${status}, updated_at = now()
        WHERE id = ${id}`);
}
