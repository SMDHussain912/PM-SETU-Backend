import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { SearchFilters, SearchResultItem } from "./search.types";

/**
 * Search module — database access layer.
 *
 * Queries multiple existing entity tables using UNION ALL to produce a
 * normalized search result set. Only entities with established tables are
 * included: clusters, itis, aips, spvs, sips, documents, news.
 *
 * GO, RFP, Circular, and District are NOT included because their tables do not
 * exist yet. They are documented as future integration points in
 * sql/search/search_queries.sql.
 *
 * The statements below mirror sql/search/search_queries.sql, the
 * DBA-maintained copy. If a query changes, update BOTH files. All user input
 * is passed through tagged-template interpolation (bound parameters) — never
 * string-concatenate values, never use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/search/search_queries.sql):
 *   The PM SETU tables do not exist yet. Until the DBA creates the real
 *   schema, these queries fail at runtime and the endpoints return a 500
 *   error envelope. That is intentional: no fake search results.
 */

interface SearchRow {
    id: number;
    type: string;
    title: string | null;
    summary: string | null;
    url: string;
    metadata: Record<string, string | number | null>;
}

/**
 * Builds the UNION ALL subqueries for each searchable entity.
 * Each subquery returns a normalized shape for consistent result handling.
 */
function buildSearchSubqueries(filters: SearchFilters): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [];
    const q = `%${filters.q}%`;

    // Type filter: if specified, only include that entity type
    const includeCluster = !filters.type || filters.type === "cluster";
    const includeIti = !filters.type || filters.type === "iti";
    const includeAip = !filters.type || filters.type === "aip";
    const includeSpv = !filters.type || filters.type === "spv";
    const includeSip = !filters.type || filters.type === "sip";
    const includeDocument = !filters.type || filters.type === "document";
    const includeNews = !filters.type || filters.type === "news";

    if (includeCluster) {
        const clusterConditions: Prisma.Sql[] = [
            Prisma.sql`clusters.name ILIKE ${q}`,
            Prisma.sql`clusters.district ILIKE ${q}`,
            Prisma.sql`clusters.sector ILIKE ${q}`,
        ];
        if (filters.district) {
            clusterConditions.push(Prisma.sql`clusters.district = ${filters.district}`);
        }
        conditions.push(Prisma.sql`
            SELECT
                clusters.id AS id,
                'cluster' AS type,
                clusters.name AS title,
                clusters.district AS summary,
                '/clusters/' || clusters.id AS url,
                jsonb_build_object('district', clusters.district, 'sector', clusters.sector) AS metadata
            FROM clusters
            WHERE ${Prisma.join(clusterConditions, " OR ")}
        `);
    }

    if (includeIti) {
        const itiConditions: Prisma.Sql[] = [
            Prisma.sql`itis.iti_name ILIKE ${q}`,
            Prisma.sql`itis.iti_code ILIKE ${q}`,
            Prisma.sql`itis.district ILIKE ${q}`,
        ];
        if (filters.district) {
            itiConditions.push(Prisma.sql`itis.district = ${filters.district}`);
        }
        conditions.push(Prisma.sql`
            SELECT
                itis.id AS id,
                'iti' AS type,
                itis.iti_name AS title,
                itis.district AS summary,
                '/itis/' || itis.id AS url,
                jsonb_build_object('district', itis.district, 'type', itis.type) AS metadata
            FROM itis
            WHERE ${Prisma.join(itiConditions, " OR ")}
        `);
    }

    if (includeAip) {
        const aipConditions: Prisma.Sql[] = [
            Prisma.sql`aips.name ILIKE ${q}`,
            Prisma.sql`aips.sector ILIKE ${q}`,
        ];
        conditions.push(Prisma.sql`
            SELECT
                aips.id AS id,
                'aip' AS type,
                aips.name AS title,
                aips.sector AS summary,
                '/aips/' || aips.id AS url,
                jsonb_build_object('sector', aips.sector, 'status', aips.status) AS metadata
            FROM aips
            WHERE ${Prisma.join(aipConditions, " OR ")}
        `);
    }

    if (includeSpv) {
        conditions.push(Prisma.sql`
            SELECT
                spvs.id AS id,
                'spv' AS type,
                spvs.name AS title,
                spvs.status AS summary,
                '/spvs/' || spvs.id AS url,
                jsonb_build_object('status', spvs.status) AS metadata
            FROM spvs
            WHERE spvs.name ILIKE ${q}
        `);
    }

    if (includeSip) {
        conditions.push(Prisma.sql`
            SELECT
                sips.id AS id,
                'sip' AS type,
                sips.status AS title,
                NULL AS summary,
                '/sips/' || sips.id AS url,
                jsonb_build_object('status', sips.status) AS metadata
            FROM sips
            WHERE sips.status ILIKE ${q}
        `);
    }

    if (includeDocument) {
        const docConditions: Prisma.Sql[] = [
            Prisma.sql`documents.title ILIKE ${q}`,
            Prisma.sql`documents.document_number ILIKE ${q}`,
            Prisma.sql`documents.keywords ILIKE ${q}`,
        ];
        if (filters.year) {
            docConditions.push(Prisma.sql`documents.financial_year = ${filters.year}`);
        }
        if (filters.category) {
            docConditions.push(Prisma.sql`documents.type = ${filters.category}`);
        }
        if (filters.date) {
            docConditions.push(Prisma.sql`documents.issue_date = ${filters.date}::date`);
        }
        if (filters.document_type) {
            docConditions.push(Prisma.sql`documents.type = ${filters.document_type}`);
        }
        conditions.push(Prisma.sql`
            SELECT
                documents.id AS id,
                'document' AS type,
                documents.title AS title,
                documents.document_number AS summary,
                '/documents/' || documents.id AS url,
                jsonb_build_object('type', documents.type, 'issue_date', documents.issue_date) AS metadata
            FROM documents
            WHERE ${Prisma.join(docConditions, " OR ")}
        `);
    }

    if (includeNews) {
        const newsConditions: Prisma.Sql[] = [
            Prisma.sql`news.title ILIKE ${q}`,
            Prisma.sql`news.summary ILIKE ${q}`,
            Prisma.sql`news.content ILIKE ${q}`,
        ];
        if (filters.category) {
            newsConditions.push(Prisma.sql`news.category = ${filters.category}`);
        }
        if (filters.date) {
            newsConditions.push(Prisma.sql`news.published_date = ${filters.date}::date`);
        }
        conditions.push(Prisma.sql`
            SELECT
                news.id AS id,
                'news' AS type,
                news.title AS title,
                news.summary AS summary,
                '/news/' || news.id AS url,
                jsonb_build_object('published_date', news.published_date, 'category', news.category) AS metadata
            FROM news
            WHERE ${Prisma.join(newsConditions, " OR ")}
        `);
    }

    return conditions;
}

export async function search(filters: SearchFilters): Promise<SearchResultItem[]> {
    const subqueries = buildSearchSubqueries(filters);
    if (subqueries.length === 0) {
        return [];
    }
    const rows = await prisma.$queryRaw<SearchRow[]>(
        Prisma.sql`SELECT * FROM (${Prisma.join(subqueries, " UNION ALL ")}) AS search_results ORDER BY type, id LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        summary: row.summary,
        url: row.url,
        metadata: row.metadata,
    }));
}

export async function countSearchResults(filters: SearchFilters): Promise<number> {
    const subqueries = buildSearchSubqueries(filters);
    if (subqueries.length === 0) {
        return 0;
    }
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM (${Prisma.join(subqueries, " UNION ALL ")}) AS search_results`,
    );
    return Number(rows[0]?.count ?? 0);
}
