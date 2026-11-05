export interface FinanceCsvParseOptions {
    requiredHeaders: string[];
    maxRows?: number;
    maxBytes?: number;
}

export interface FinanceCsvParseResult {
    headers: string[];
    rows: Array<{ row_number: number; values: Record<string, string> }>;
}

/**
 * Parses RFC-4180-style CSV text for internal finance import preparation.
 * This function does not persist records or decide accounting policy.
 */
export function parseFinanceCsv(
    input: string,
    options: FinanceCsvParseOptions,
): FinanceCsvParseResult {
    const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
    const maxRows = options.maxRows ?? 10_000;

    if (Buffer.byteLength(input, "utf8") > maxBytes) {
        throw new Error("FINANCE_CSV_TOO_LARGE");
    }
    if (input.includes("\u0000")) throw new Error("FINANCE_CSV_INVALID_CHARACTER");

    const matrix: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];

        if (quoted) {
            if (char === '"') {
                if (input[i + 1] === '"') {
                    cell += '"';
                    i += 1;
                } else {
                    quoted = false;
                }
            } else {
                cell += char;
            }
            continue;
        }

        if (char === '"' && cell.length === 0) {
            quoted = true;
        } else if (char === ",") {
            row.push(cell);
            cell = "";
        } else if (char === "\n" || char === "\r") {
            row.push(cell);
            cell = "";
            if (char === "\r" && input[i + 1] === "\n") i += 1;
            if (row.some((value) => value.length > 0)) matrix.push(row);
            row = [];
            if (matrix.length > maxRows + 1) throw new Error("FINANCE_CSV_TOO_MANY_ROWS");
        } else if (char === '"') {
            throw new Error("FINANCE_CSV_MALFORMED_QUOTE");
        } else {
            cell += char;
        }
    }

    if (quoted) throw new Error("FINANCE_CSV_UNCLOSED_QUOTE");
    row.push(cell);
    if (row.some((value) => value.length > 0)) matrix.push(row);
    if (matrix.length === 0) throw new Error("FINANCE_CSV_EMPTY");
    if (matrix.length - 1 > maxRows) throw new Error("FINANCE_CSV_TOO_MANY_ROWS");

    const headers = matrix[0].map((header, index) =>
        (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim(),
    );
    if (headers.some((header) => !header)) throw new Error("FINANCE_CSV_EMPTY_HEADER");
    if (new Set(headers).size !== headers.length) throw new Error("FINANCE_CSV_DUPLICATE_HEADER");

    const missing = options.requiredHeaders.filter((header) => !headers.includes(header));
    if (missing.length) throw new Error(`FINANCE_CSV_MISSING_HEADERS:${missing.join(",")}`);

    const rows = matrix.slice(1).map((values, index) => {
        if (values.length !== headers.length) {
            throw new Error(`FINANCE_CSV_COLUMN_COUNT_MISMATCH:${index + 2}`);
        }
        return {
            row_number: index + 2,
            values: Object.fromEntries(headers.map((header, column) => [header, values[column]])),
        };
    });

    return { headers, rows };
}
