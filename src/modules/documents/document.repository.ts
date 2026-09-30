import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Document, DocumentListFilters, DocumentVersion } from "./document.types";

/**
 * Document Management module — database access layer.
 *
 * The statements below mirror sql/documents/document_queries.sql, the
 * DBA-maintained copy. If a query changes, update BOTH files. All user input
 * is passed through tagged-template interpolation (bound parameters) — never
 * string-concatenate values, never use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/documents/document_queries.sql):
 *   The PM SETU tables do not exist yet. Until the DBA creates the real
 *   schema, these queries fail at runtime and the endpoints return a 500
 *   error envelope. That is intentional: no fake document records.
 */

interface DocumentRow {
    id: number;
    title: string | null;
    document_number: string | null;
    type: string | null;
    department: string | null;
    issue_date: Date | null;
    financial_year: string | null;
    cluster_id: number | null;
    cluster_name: string | null;
    keywords: string | null;
    publish_status: string | null;
    version: number | null;
    file_path: string | null;
    file_size: number | null;
    mime_type: string | null;
    original_name: string | null;
    language: string | null;
    created_at: Date | null;
    updated_at: Date | null;
}

interface DocumentVersionRow {
    id: number;
    document_id: number;
    version: number;
    file_path: string | null;
    file_size: number | null;
    mime_type: string | null;
    original_name: string | null;
    created_by: string | null;
    created_at: Date | null;
}

const DOCUMENT_SELECT = Prisma.sql`
    SELECT
        documents.id                    AS id,
        documents.title                 AS title,
        documents.document_number       AS document_number,
        documents.type                  AS type,
        documents.department            AS department,
        documents.issue_date            AS issue_date,
        documents.financial_year        AS financial_year,
        clusters.id                     AS cluster_id,
        clusters.name                   AS cluster_name,
        documents.keywords              AS keywords,
        documents.publish_status        AS publish_status,
        documents.version               AS version,
        documents.file_path             AS file_path,
        documents.file_size             AS file_size,
        documents.mime_type             AS mime_type,
        documents.original_name         AS original_name,
        documents.language              AS language,
        documents.created_at            AS created_at,
        documents.updated_at            AS updated_at
    FROM documents
    LEFT JOIN clusters ON clusters.id = documents.cluster_id`;

function mapDocumentRow(row: DocumentRow): Document {
    return {
        id: row.id,
        title: row.title,
        document_number: row.document_number,
        type: row.type,
        department: row.department,
        issue_date: row.issue_date ? row.issue_date.toISOString().slice(0, 10) : null,
        financial_year: row.financial_year,
        cluster:
            row.cluster_id === null
                ? null
                : { id: row.cluster_id, name: row.cluster_name ?? "" },
        keywords: row.keywords,
        publish_status: row.publish_status,
        version: row.version,
        file_path: row.file_path,
        file_size: row.file_size,
        mime_type: row.mime_type,
        original_name: row.original_name,
        language: row.language,
        created_at: row.created_at ? row.created_at.toISOString() : null,
        updated_at: row.updated_at ? row.updated_at.toISOString() : null,
    };
}

function mapVersionRow(row: DocumentVersionRow): DocumentVersion {
    return {
        id: row.id,
        document_id: row.document_id,
        version: row.version,
        file_path: row.file_path,
        file_size: row.file_size,
        mime_type: row.mime_type,
        original_name: row.original_name,
        created_by: row.created_by,
        created_at: row.created_at ? row.created_at.toISOString() : null,
    };
}

function buildFilters(filters: DocumentListFilters): Prisma.Sql {
    const conditions: Prisma.Sql[] = [];

    if (filters.type !== undefined) {
        conditions.push(Prisma.sql`documents.type = ${filters.type}`);
    }
    if (filters.cluster_id !== undefined) {
        conditions.push(Prisma.sql`documents.cluster_id = ${filters.cluster_id}`);
    }
    if (filters.year !== undefined) {
        conditions.push(Prisma.sql`documents.financial_year = ${filters.year}`);
    }
    if (filters.department !== undefined) {
        conditions.push(Prisma.sql`documents.department = ${filters.department}`);
    }
    if (filters.keyword !== undefined) {
        conditions.push(
            Prisma.sql`(documents.keywords ILIKE ${`%${filters.keyword}%`} OR documents.title ILIKE ${`%${filters.keyword}%`})`,
        );
    }
    if (filters.from !== undefined) {
        conditions.push(Prisma.sql`documents.issue_date >= ${filters.from}::date`);
    }
    if (filters.to !== undefined) {
        conditions.push(Prisma.sql`documents.issue_date <= ${filters.to}::date`);
    }

    if (conditions.length === 0) {
        return Prisma.empty;
    }
    return Prisma.sql` WHERE ${Prisma.join(conditions, " AND ")}`;
}

export async function listDocuments(filters: DocumentListFilters): Promise<Document[]> {
    const where = buildFilters(filters);
    const rows = await prisma.$queryRaw<DocumentRow[]>(
        Prisma.sql`${DOCUMENT_SELECT}${where} ORDER BY documents.created_at DESC, documents.id DESC LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapDocumentRow);
}

export async function countDocuments(filters: DocumentListFilters): Promise<number> {
    const where = buildFilters(filters);
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM documents${where}`,
    );
    return Number(rows[0]?.count ?? 0);
}

export async function getDocumentById(id: number): Promise<Document | null> {
    const rows = await prisma.$queryRaw<DocumentRow[]>(
        Prisma.sql`${DOCUMENT_SELECT} WHERE documents.id = ${id}`,
    );
    return rows[0] ? mapDocumentRow(rows[0]) : null;
}

export async function getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    const rows = await prisma.$queryRaw<DocumentVersionRow[]>(
        Prisma.sql`
            SELECT
                id,
                document_id,
                version,
                file_path,
                file_size,
                mime_type,
                original_name,
                created_by,
                created_at
            FROM document_versions
            WHERE document_id = ${documentId}
            ORDER BY version DESC`,
    );
    return rows.map(mapVersionRow);
}

export interface CreateDocumentInput {
    title: string | null;
    document_number: string | null;
    type: string | null;
    department: string | null;
    issue_date: Date | null;
    financial_year: string | null;
    cluster_id: number | null;
    keywords: string | null;
    language: string | null;
}

export interface UpdateDocumentInput {
    title?: string | null;
    document_number?: string | null;
    type?: string | null;
    department?: string | null;
    issue_date?: Date | null;
    financial_year?: string | null;
    cluster_id?: number | null;
    keywords?: string | null;
    language?: string | null;
}

/** POST /admin/documents — new rows start DRAFT + version 1 (sql/documents #5). */
export async function createDocument(input: CreateDocumentInput): Promise<number> {
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        INSERT INTO documents (title, document_number, type, department, issue_date, financial_year, cluster_id, keywords, publish_status, version, language)
        VALUES (${input.title}, ${input.document_number}, ${input.type}, ${input.department}, ${input.issue_date}, ${input.financial_year}, ${input.cluster_id}, ${input.keywords}, 'DRAFT', 1, ${input.language})
        RETURNING id`);
    return rows[0].id;
}

/** PATCH /admin/documents/:id — only supplied columns (sql/documents #6). */
export async function updateDocument(id: number, input: UpdateDocumentInput): Promise<void> {
    const updates: Prisma.Sql[] = [];
    if (input.title !== undefined) {
        updates.push(Prisma.sql`title = ${input.title}`);
    }
    if (input.document_number !== undefined) {
        updates.push(Prisma.sql`document_number = ${input.document_number}`);
    }
    if (input.type !== undefined) {
        updates.push(Prisma.sql`type = ${input.type}`);
    }
    if (input.department !== undefined) {
        updates.push(Prisma.sql`department = ${input.department}`);
    }
    if (input.issue_date !== undefined) {
        updates.push(Prisma.sql`issue_date = ${input.issue_date}`);
    }
    if (input.financial_year !== undefined) {
        updates.push(Prisma.sql`financial_year = ${input.financial_year}`);
    }
    if (input.cluster_id !== undefined) {
        updates.push(Prisma.sql`cluster_id = ${input.cluster_id}`);
    }
    if (input.keywords !== undefined) {
        updates.push(Prisma.sql`keywords = ${input.keywords}`);
    }
    if (input.language !== undefined) {
        updates.push(Prisma.sql`language = ${input.language}`);
    }
    if (updates.length === 0) {
        return;
    }
    await prisma.$executeRaw(Prisma.sql`
        UPDATE documents
        SET ${Prisma.join(updates, ", ")}, updated_at = now()
        WHERE id = ${id}`);
}

/** DELETE /admin/documents/:id (sql/documents #7). */
export async function deleteDocument(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`DELETE FROM documents WHERE id = ${id}`);
}

/** POST /admin/documents/:id/publish (sql/documents #8). */
export async function publishDocument(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE documents
        SET publish_status = 'PUBLISHED', updated_at = now()
        WHERE id = ${id}`);
}

/** POST /admin/documents/:id/archive (sql/documents #9). */
export async function archiveDocument(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE documents
        SET publish_status = 'ARCHIVED', updated_at = now()
        WHERE id = ${id}`);
}

/**
 * POST /admin/documents/:id/version — snapshot current row, bump version
 * (sql/documents #10). created_by is INFERRED / TO CONFIRM (may reference
 * users; pass-through string accepted until the DBA confirms the column).
 */
export async function createDocumentVersion(id: number, createdBy: string | null): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        INSERT INTO document_versions (document_id, version, file_path, file_size, mime_type, original_name, created_by)
        SELECT id, version, file_path, file_size, mime_type, original_name, ${createdBy}
        FROM documents
        WHERE id = ${id}`);
    await prisma.$executeRaw(Prisma.sql`
        UPDATE documents
        SET version = version + 1, updated_at = now()
        WHERE id = ${id}`);
}

/** File metadata update after upload (sql/documents #11). */
export async function updateDocumentFile(
    id: number,
    input: { file_path: string; file_size: number; mime_type: string; original_name: string },
): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE documents
        SET file_path = ${input.file_path}, file_size = ${input.file_size},
            mime_type = ${input.mime_type}, original_name = ${input.original_name},
            updated_at = now()
        WHERE id = ${id}`);
}
