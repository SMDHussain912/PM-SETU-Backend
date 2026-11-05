import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import type { FinanceLedgerQuery } from "./finance.query.types";

function outlayWhere(query: FinanceLedgerQuery): Prisma.FinanceApprovedOutlayWhereInput {
    return {
        financialYear: query.financial_year,
        ...(query.cluster_id === undefined ? {} : { clusterId: query.cluster_id }),
        ...(query.iti_id === undefined ? {} : { itiId: query.iti_id }),
        ...(query.project_reference === undefined ? {} : { projectReference: query.project_reference }),
        ...(query.as_of_date === undefined ? {} : { sanctionDate: { lte: query.as_of_date } }),
    };
}

function releaseWhere(query: FinanceLedgerQuery): Prisma.FinanceFundReleaseWhereInput {
    return {
        financialYear: query.financial_year,
        ...(query.as_of_date === undefined ? {} : { releaseDate: { lte: query.as_of_date } }),
        outlay: {
            ...(query.cluster_id === undefined ? {} : { clusterId: query.cluster_id }),
            ...(query.iti_id === undefined ? {} : { itiId: query.iti_id }),
            ...(query.project_reference === undefined ? {} : { projectReference: query.project_reference }),
        },
    };
}

function expenditureWhere(query: FinanceLedgerQuery): Prisma.FinanceExpenditureWhereInput {
    return {
        financialYear: query.financial_year,
        ...(query.as_of_date === undefined ? {} : { transactionDate: { lte: query.as_of_date } }),
        outlay: {
            ...(query.cluster_id === undefined ? {} : { clusterId: query.cluster_id }),
            ...(query.iti_id === undefined ? {} : { itiId: query.iti_id }),
            ...(query.project_reference === undefined ? {} : { projectReference: query.project_reference }),
        },
    };
}

export async function listOutlays(query: FinanceLedgerQuery) {
    const where = outlayWhere(query);
    const [items, total] = await Promise.all([
        prisma.financeApprovedOutlay.findMany({
            where,
            orderBy: [{ sanctionDate: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * query.page_size,
            take: query.page_size,
        }),
        prisma.financeApprovedOutlay.count({ where }),
    ]);
    return { items, total };
}

export async function listReleases(query: FinanceLedgerQuery) {
    const where = releaseWhere(query);
    const [items, total] = await Promise.all([
        prisma.financeFundRelease.findMany({
            where,
            include: { outlay: { select: { id: true, sanctionReference: true, clusterId: true, itiId: true, projectReference: true } } },
            orderBy: [{ releaseDate: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * query.page_size,
            take: query.page_size,
        }),
        prisma.financeFundRelease.count({ where }),
    ]);
    return { items, total };
}

export async function listExpenditures(query: FinanceLedgerQuery) {
    const where = expenditureWhere(query);
    const [items, total] = await Promise.all([
        prisma.financeExpenditure.findMany({
            where,
            include: {
                outlay: { select: { id: true, sanctionReference: true, clusterId: true, itiId: true, projectReference: true } },
                release: { select: { id: true, releaseReference: true } },
            },
            orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * query.page_size,
            take: query.page_size,
        }),
        prisma.financeExpenditure.count({ where }),
    ]);
    return { items, total };
}
