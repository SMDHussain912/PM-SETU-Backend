import { z } from "zod";

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationParams extends PaginationQuery {
    /** Prisma offset-style value derived from page/pageSize. */
    skip: number;
    /** Prisma limit-style value derived from page/pageSize. */
    take: number;
}

/** Parses raw query input into Prisma-ready pagination parameters. */
export function parsePagination(query: unknown): PaginationParams {
    const { page, pageSize } = paginationQuerySchema.parse(query);
    return {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
    };
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

/** Builds response metadata for paginated list endpoints. */
export function buildPaginationMeta(
    total: number,
    page: number,
    pageSize: number,
): PaginationMeta {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
}
