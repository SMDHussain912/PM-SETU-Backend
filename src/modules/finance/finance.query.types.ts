export interface FinanceLedgerQuery {
    financial_year: string;
    cluster_id?: number;
    iti_id?: number;
    project_reference?: string;
    as_of_date?: Date;
    page: number;
    page_size: number;
}

export interface FinanceLedgerPage<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}
