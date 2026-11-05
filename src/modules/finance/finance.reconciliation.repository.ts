import { prisma } from "../../config/database";
import type { FinanceLedgerQuery } from "./finance.query.types";

export function buildFinanceReleaseReconciliationWhere(query: FinanceLedgerQuery) {
    return {
        OR: [
            { financialYear: query.financial_year },
            { outlay: { financialYear: query.financial_year } },
        ],
        outlay: {
            ...(query.cluster_id === undefined ? {} : { clusterId: query.cluster_id }),
            ...(query.iti_id === undefined ? {} : { itiId: query.iti_id }),
            ...(query.project_reference === undefined ? {} : { projectReference: query.project_reference }),
        },
        ...(query.as_of_date === undefined ? {} : { releaseDate: { lte: query.as_of_date } }),
    };
}

export function buildFinanceExpenditureReconciliationWhere(query: FinanceLedgerQuery) {
    return {
        OR: [
            { financialYear: query.financial_year },
            { outlay: { financialYear: query.financial_year } },
            { release: { financialYear: query.financial_year } },
        ],
        outlay: {
            ...(query.cluster_id === undefined ? {} : { clusterId: query.cluster_id }),
            ...(query.iti_id === undefined ? {} : { itiId: query.iti_id }),
            ...(query.project_reference === undefined ? {} : { projectReference: query.project_reference }),
        },
        ...(query.as_of_date === undefined ? {} : { transactionDate: { lte: query.as_of_date } }),
    };
}

export async function loadReconciliationRecords(query: FinanceLedgerQuery) {
    const [outlays, releases, expenditures] = await Promise.all([
        prisma.financeApprovedOutlay.findMany({
            where: {
                financialYear: query.financial_year,
                ...(query.cluster_id === undefined ? {} : { clusterId: query.cluster_id }),
                ...(query.iti_id === undefined ? {} : { itiId: query.iti_id }),
                ...(query.project_reference === undefined ? {} : { projectReference: query.project_reference }),
                ...(query.as_of_date === undefined ? {} : { sanctionDate: { lte: query.as_of_date } }),
            },
            include: { iti: { select: { id: true, clusterId: true } } },
            orderBy: { id: "asc" },
        }),
        prisma.financeFundRelease.findMany({
            where: buildFinanceReleaseReconciliationWhere(query),
            include: { outlay: { select: { id: true, financialYear: true, sanctionDate: true } } },
            orderBy: { id: "asc" },
        }),
        prisma.financeExpenditure.findMany({
            where: buildFinanceExpenditureReconciliationWhere(query),
            include: {
                outlay: { select: { id: true, financialYear: true, sanctionDate: true } },
                release: { select: { id: true, financialYear: true, releaseDate: true } },
            },
            orderBy: { id: "asc" },
        }),
    ]);
    return { outlays, releases, expenditures };
}
