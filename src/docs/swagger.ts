import { Router } from "express";
import swaggerUi from "swagger-ui-express";

/**
 * Basic OpenAPI configuration. Module routes must document themselves here as
 * they are implemented — do not add paths for endpoints that do not exist.
 * The spec is served raw at /api/v1/openapi.json and the interactive UI at
 * /api/v1/docs (bundled swagger-ui-dist assets, works offline/intranet).
 */
export const openApiSpec = {
    openapi: "3.0.3",
    info: {
        title: "PM SETU AP Backend API",
        version: "0.1.0",
        description:
            "REST API for the PM SETU Andhra Pradesh portal. Endpoints are added to this document as modules are implemented.",
    },
    servers: [{ url: "/api/v1" }],
    tags: [
        { name: "Health", description: "Service health checks" },
        { name: "Home", description: "Public homepage content and KPI counters" },
        {
            name: "ITI",
            description:
                "Public Industrial Training Institute registry (RoadMap.md §7)",
        },
        {
            name: "Cluster",
            description: "Public industry skill cluster registry (RoadMap.md §6)",
        },
        {
            name: "AIP",
            description:
                "Public Anchor Industry Partner registry (RoadMap.md §8)",
        },
        {
            name: "SPV",
            description: "Public Special Purpose Vehicle registry (RoadMap.md §9)",
        },
        {
            name: "SIP",
            description: "Public Strategic Investment Plan registry (RoadMap.md §10)",
        },
        {
            name: "Governance",
            description: "Public governance directory (RoadMap.md §11)",
        },
        {
            name: "Document",
            description: "Public document repository (RoadMap.md §12)",
        },
        {
            name: "News",
            description: "Public news management (RoadMap.md §13)",
        },
        {
            name: "Gallery",
            description: "Public gallery management (RoadMap.md §14)",
        },
        {
            name: "Search",
            description: "Portal-wide search (RoadMap.md §17)",
        },
        {
            name: "Dashboard",
            description: "Management dashboard (RoadMap.md §16)",
        },
        {
            name: "Auth",
            description: "Administrative authentication (RoadMap.md §18)",
        },
        {
            name: "Users",
            description: "Administrative user management (RoadMap.md §19)",
        },
        {
            name: "Roles",
            description: "Role and permission management / RBAC (RoadMap.md §20)",
        },
        {
            name: "Approvals",
            description:
                "Approval workflow: list/detail + 5 transitions submit/review/approve/reject/request-revision (RoadMap.md §21). STATUS vocab INFERRED / TO CONFIRM.",
        },
        {
            name: "Audit Logs",
            description:
                "Append-only audit log: list/detail. Entries written internally by trusted services only (RoadMap.md §22).",
        },
        {
            name: "Banners",
            description:
                "CMS-managed homepage banners: public published/active lists + admin CRUD, publish/archive, image upload (RoadMap.md §15 + §24). All banner fields INFERRED / TO CONFIRM.",
        },
        {
            name: "Contact",
            description:
                "Public contact form submission + admin message triage (RoadMap.md §23). All message fields INFERRED / TO CONFIRM.",
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
        schemas: {
            PaginationMeta: {
                type: "object",
                description: "Pagination metadata for list endpoints.",
                properties: {
                    page: { type: "integer", minimum: 1 },
                    pageSize: { type: "integer", minimum: 1, maximum: 100 },
                    total: { type: "integer", minimum: 0 },
                    totalPages: { type: "integer", minimum: 1 },
                    hasNextPage: { type: "boolean" },
                    hasPreviousPage: { type: "boolean" },
                },
            },
            Cluster: {
                type: "object",
                description:
                    "Cluster master data (RoadMap.md §6: map/list/district/sector views). Spec-grounded fields only; related data (ITIs, AIP, SPV, SIP, summary, map) lives behind dedicated endpoints.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    district: { type: "string" },
                    sector: { type: "string" },
                },
            },
            ItiClusterSummary: {
                type: "object",
                description: "Cluster reference embedded in an ITI record.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
            },
            Iti: {
                type: "object",
                description:
                    "ITI profile (RoadMap.md §7 / NIC field requirements). All values come from the database; the backing schema is still pending (see sql/itis/iti_queries.sql).",
                properties: {
                    id: { type: "integer" },
                    iti_code: { type: "string", description: "NIC: ITI code" },
                    iti_name: { type: "string", description: "NIC: ITI name" },
                    type: { type: "string", enum: ["HUB", "SPOKE"] },
                    cluster: {
                        oneOf: [
                            { $ref: "#/components/schemas/ItiClusterSummary" },
                            { type: "null" },
                        ],
                        description: "Cluster the ITI belongs to (null when not yet assigned)",
                    },
                    district: { type: "string" },
                    address: { type: "string", nullable: true },
                    principal: { type: "string", nullable: true },
                    contact: { type: "string", nullable: true },
                    email: { type: "string", nullable: true },
                    existing_trades: {
                        type: "array",
                        items: { type: "string" },
                        description: "Trades already offered",
                    },
                    proposed_trades: {
                        type: "array",
                        items: { type: "string" },
                        description: "Trades proposed under PM SETU",
                    },
                    student_strength: { type: "integer", nullable: true },
                    infrastructure: { type: "string", nullable: true },
                    lab_details: { type: "string", nullable: true },
                    latitude: { type: "number", nullable: true },
                    longitude: { type: "number", nullable: true },
                    photos: {
                        type: "array",
                        items: { type: "string" },
                        description: "Photo URLs",
                    },
                    status: { type: "string", description: "Lifecycle status (vocabulary pending)" },
                },
            },
            AipClusterSummary: {
                type: "object",
                description: "Cluster reference embedded in an AIP record.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
            },
            Aip: {
                type: "object",
                description:
                    "AIP registry record (RoadMap.md §8). All values come from the database; the backing schema is still pending (see sql/aips/aip_queries.sql). SIP/SPV relationships are deferred to their own modules.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string", description: "AIP / company name" },
                    logo_url: { type: "string", nullable: true },
                    cluster: {
                        oneOf: [
                            { $ref: "#/components/schemas/AipClusterSummary" },
                            { type: "null" },
                        ],
                        description: "Cluster the AIP belongs to (null when not yet assigned)",
                    },
                    sector: { type: "string" },
                    status: {
                        type: "string",
                        description: "Partnership status (vocabulary TO CONFIRM)",
                    },
                    investment_amount: {
                        type: "number",
                        nullable: true,
                        description: "Investment mobilised (INR)",
                    },
                    academic_partner: {
                        type: "string",
                        nullable: true,
                        description: "Academic/technology partner (storage TO CONFIRM)",
                    },
                    contact: { type: "string", nullable: true },
                    website: { type: "string", nullable: true },
                },
            },
            SpvClusterSummary: {
                type: "object",
                description: "Cluster reference embedded in an SPV record.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
            },
            SpvAipSummary: {
                type: "object",
                description: "AIP reference embedded in an SPV record.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
            },
            Spv: {
                type: "object",
                description:
                    "SPV registry record (RoadMap.md §9). All values come from the database; the backing schema is still pending (see sql/spvs/spv_queries.sql). The SIP relationship is deferred to its own module.",
                properties: {
                    id: { type: "integer" },
                    name: {
                        type: "string",
                        description: "SPV name (spec-implied registry identifier; field list TO CONFIRM)",
                    },
                    status: {
                        type: "string",
                        description:
                            "Lifecycle state (§9: Proposed, Under Formation, Incorporated, Operational — 'such as', storage values TO CONFIRM)",
                    },
                    cluster: {
                        oneOf: [
                            { $ref: "#/components/schemas/SpvClusterSummary" },
                            { type: "null" },
                        ],
                        description: "Cluster the SPV belongs to (null when not yet assigned)",
                    },
                    aip: {
                        oneOf: [
                            { $ref: "#/components/schemas/SpvAipSummary" },
                            { type: "null" },
                        ],
                        description: "AIP the SPV belongs to (null when not yet assigned)",
                    },
                },
            },
            SipClusterSummary: {
                type: "object",
                description: "Cluster reference embedded in a SIP record.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
            },
            SipAipSummary: {
                type: "object",
                description: "AIP reference embedded in a SIP record.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
            },
            Sip: {
                type: "object",
                description:
                    "SIP record (RoadMap.md §10). The workflow status uses the canonical §10 values; the remaining fields are task-brief fields NOT present in RoadMap.md and are TO CONFIRM (see sql/sips/sip_queries.sql). All values come from the database; the backing schema is still pending.",
                properties: {
                    id: { type: "integer" },
                    status: {
                        type: "string",
                        enum: [
                            "DRAFT",
                            "SUBMITTED",
                            "UNDER_SCRUTINY",
                            "REVISION_REQUESTED",
                            "RECOMMENDED",
                            "APPROVED",
                            "IMPLEMENTATION",
                        ],
                        description: "Canonical §10 workflow state",
                    },
                    cluster: {
                        oneOf: [
                            { $ref: "#/components/schemas/SipClusterSummary" },
                            { type: "null" },
                        ],
                        description: "Cluster the SIP belongs to (null when not yet assigned)",
                    },
                    aip: {
                        oneOf: [
                            { $ref: "#/components/schemas/SipAipSummary" },
                            { type: "null" },
                        ],
                        description: "AIP the SIP belongs to (null when not yet assigned)",
                    },
                    submission_date: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (task-brief field, not in RoadMap §10)",
                    },
                    version: {
                        type: "integer",
                        nullable: true,
                        description: "TO CONFIRM (revision number vs document versioning)",
                    },
                    proposed_investment: {
                        type: "number",
                        nullable: true,
                        description: "TO CONFIRM (assumed INR)",
                    },
                    infrastructure_contribution: {
                        type: "number",
                        nullable: true,
                        description: "TO CONFIRM (assumed INR)",
                    },
                    equipment_contribution: {
                        type: "number",
                        nullable: true,
                        description: "TO CONFIRM (assumed INR)",
                    },
                    training_contribution: {
                        type: "number",
                        nullable: true,
                        description: "TO CONFIRM (assumed INR)",
                    },
                    industry_contribution: {
                        type: "number",
                        nullable: true,
                        description: "TO CONFIRM (assumed INR)",
                    },
                    government_contribution: {
                        type: "number",
                        nullable: true,
                        description: "TO CONFIRM (assumed INR)",
                    },
                    approval_date: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (only meaningful from APPROVED onwards)",
                    },
                    remarks: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (free text)",
                    },
                },
            },
            HomeKpis: {
                type: "object",
                description:
                    "Homepage KPI/counter data (RoadMap.md §5). Every value is aggregated from the database — never hard-coded.",
                properties: {
                    clusters: {
                        type: "integer",
                        description: "Total registered industry skill clusters",
                    },
                    hub_itis: {
                        type: "integer",
                        description: "ITIs with type HUB",
                    },
                    spoke_itis: {
                        type: "integer",
                        description: "ITIs with type SPOKE",
                    },
                    aips: {
                        type: "integer",
                        description: "Registered AIPs",
                    },
                    spvs: {
                        type: "integer",
                        description: "Registered SPVs",
                    },
                    sip_submitted: {
                        type: "integer",
                        description: "SIPs in SUBMITTED status",
                    },
                    sip_approved: {
                        type: "integer",
                        description: "SIPs in APPROVED status",
                    },
                    investment: {
                        type: "number",
                        description:
                            "Total investment mobilised (INR), aggregated from the AIP registry",
                    },
                    trainees: {
                        type: "number",
                        nullable: true,
                        description:
                            "Total trainees — null until the database source is defined (see sql/home/home_kpis.sql)",
                    },
                    industries_engaged: {
                        type: "number",
                        nullable: true,
                        description:
                            "Industries engaged — null until the database source is defined (see sql/home/home_kpis.sql)",
                    },
                },
            },
            GovernanceMember: {
                type: "object",
                description:
                    "Governance directory entry (RoadMap.md §11). All fields except id are sourced from the task brief and are NOT verifiable in RoadMap.md — marked TO CONFIRM pending NIC-document verification.",
                properties: {
                    id: { type: "integer" },
                    name: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (task-brief field, not in RoadMap §11)",
                    },
                    designation: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (task-brief field, not in RoadMap §11)",
                    },
                    organisation: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (task-brief field, not in RoadMap §11)",
                    },
                    role: {
                        type: "string",
                        nullable: true,
                        description:
                            "TO CONFIRM (task-brief field, not in RoadMap §11; would back deferred subgroup endpoints)",
                    },
                    photograph: {
                        type: "string",
                        nullable: true,
                        description:
                            "TO CONFIRM (URL vs file reference vs §24 upload metadata)",
                    },
                    email: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (format)",
                    },
                    contact: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (task-brief field, not in RoadMap §11)",
                    },
                    display_order: {
                        type: "integer",
                        nullable: true,
                        description:
                            "TO CONFIRM (intended display ordering; RoadMap does not document ordering)",
                    },
                    effective_date: {
                        type: "string",
                        format: "date",
                        nullable: true,
                        description:
                            "TO CONFIRM (tenure/effective date; single date vs range is unresolved)",
                    },
                },
            },
            DocumentClusterSummary: {
                type: "object",
                description: "Cluster reference embedded in a document record.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
            },
            Document: {
                type: "object",
                description:
                    "Document record (RoadMap.md §12). All fields except id are sourced from the task brief and are NOT verifiable in RoadMap.md — marked TO CONFIRM pending NIC-document verification.",
                properties: {
                    id: { type: "integer" },
                    title: { type: "string", nullable: true, description: "TO CONFIRM" },
                    document_number: { type: "string", nullable: true, description: "TO CONFIRM" },
                    type: { type: "string", nullable: true, description: "TO CONFIRM (vocabulary TO CONFIRM)" },
                    department: { type: "string", nullable: true, description: "TO CONFIRM" },
                    issue_date: { type: "string", format: "date", nullable: true, description: "TO CONFIRM" },
                    financial_year: { type: "string", nullable: true, description: "TO CONFIRM (format TO CONFIRM)" },
                    cluster: {
                        oneOf: [{ $ref: "#/components/schemas/DocumentClusterSummary" }, { type: "null" }],
                        description: "Cluster (null when not assigned)",
                    },
                    keywords: { type: "string", nullable: true, description: "TO CONFIRM" },
                    publish_status: { type: "string", nullable: true, description: "TO CONFIRM" },
                    version: { type: "integer", nullable: true, description: "TO CONFIRM" },
                    file_path: { type: "string", nullable: true, description: "TO CONFIRM" },
                    file_size: { type: "integer", nullable: true, description: "TO CONFIRM" },
                    mime_type: { type: "string", nullable: true, description: "TO CONFIRM" },
                    original_name: { type: "string", nullable: true, description: "TO CONFIRM" },
                    language: { type: "string", nullable: true, description: "TO CONFIRM" },
                    created_at: { type: "string", format: "date-time", nullable: true },
                    updated_at: { type: "string", format: "date-time", nullable: true },
                },
            },
            DocumentVersion: {
                type: "object",
                description: "Document version history entry (RoadMap.md §12). All fields TO CONFIRM.",
                properties: {
                    id: { type: "integer" },
                    document_id: { type: "integer" },
                    version: { type: "integer", description: "TO CONFIRM" },
                    file_path: { type: "string", nullable: true, description: "TO CONFIRM" },
                    file_size: { type: "integer", nullable: true, description: "TO CONFIRM" },
                    mime_type: { type: "string", nullable: true, description: "TO CONFIRM" },
                    original_name: { type: "string", nullable: true, description: "TO CONFIRM" },
                    created_by: { type: "string", nullable: true, description: "TO CONFIRM" },
                    created_at: { type: "string", format: "date-time", nullable: true },
                },
            },
            NewsClusterSummary: {
                type: "object",
                description: "Cluster reference embedded in a news record.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
            },
            NewsAttachment: {
                type: "object",
                description: "News attachment metadata (RoadMap.md §13). All fields TO CONFIRM.",
                properties: {
                    id: { type: "integer" },
                    file_path: { type: "string", nullable: true, description: "TO CONFIRM" },
                    file_name: { type: "string", nullable: true, description: "TO CONFIRM" },
                    mime_type: { type: "string", nullable: true, description: "TO CONFIRM" },
                    file_size: { type: "integer", nullable: true, description: "TO CONFIRM" },
                    created_at: { type: "string", format: "date-time", nullable: true },
                },
            },
            News: {
                type: "object",
                description:
                    "News record (RoadMap.md §13). All fields except id are sourced from the task brief and are NOT verifiable in RoadMap.md — marked TO CONFIRM pending NIC-document verification.",
                properties: {
                    id: { type: "integer" },
                    title: { type: "string", nullable: true, description: "TO CONFIRM" },
                    summary: { type: "string", nullable: true, description: "TO CONFIRM" },
                    content: { type: "string", nullable: true, description: "TO CONFIRM" },
                    published_date: { type: "string", format: "date-time", nullable: true, description: "TO CONFIRM" },
                    expiry_date: { type: "string", format: "date-time", nullable: true, description: "TO CONFIRM" },
                    category: { type: "string", nullable: true, description: "TO CONFIRM (vocabulary TO CONFIRM)" },
                    cluster: {
                        oneOf: [{ $ref: "#/components/schemas/NewsClusterSummary" }, { type: "null" }],
                        description: "Cluster (null when not assigned; §25 shows no relationship for News)",
                    },
                    thumbnail_url: { type: "string", nullable: true, description: "TO CONFIRM" },
                    is_published: { type: "boolean", nullable: true, description: "TO CONFIRM" },
                    attachments: {
                        type: "array",
                        items: { $ref: "#/components/schemas/NewsAttachment" },
                        description: "Loaded on detail view only",
                    },
                    created_at: { type: "string", format: "date-time", nullable: true },
                    updated_at: { type: "string", format: "date-time", nullable: true },
                },
            },
            GalleryItem: {
                type: "object",
                description:
                    "Gallery item (RoadMap.md §14). All fields except id are sourced from the task brief and are NOT verifiable in RoadMap.md — marked TO CONFIRM pending NIC-document verification.",
                properties: {
                    id: { type: "integer" },
                    title: { type: "string", nullable: true, description: "TO CONFIRM" },
                    description: { type: "string", nullable: true, description: "TO CONFIRM" },
                    type: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (PHOTO | VIDEO | PRESS_RELEASE; vocabulary TO CONFIRM)",
                    },
                    media_url: { type: "string", nullable: true, description: "TO CONFIRM" },
                    thumbnail_url: { type: "string", nullable: true, description: "TO CONFIRM" },
                    published_date: { type: "string", format: "date-time", nullable: true, description: "TO CONFIRM" },
                    category: { type: "string", nullable: true, description: "TO CONFIRM (vocabulary TO CONFIRM)" },
                    is_published: { type: "boolean", nullable: true, description: "TO CONFIRM" },
                    display_order: { type: "integer", nullable: true, description: "TO CONFIRM" },
                    created_at: { type: "string", format: "date-time", nullable: true },
                    updated_at: { type: "string", format: "date-time", nullable: true },
                },
            },
            ContactMessage: {
                type: "object",
                description:
                    "Contact form message (RoadMap.md §23). §23 defines no field list; §25 lists only the ContactMessage concept — every field except id is INFERRED / TO CONFIRM.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string", nullable: true, description: "TO CONFIRM" },
                    email: { type: "string", nullable: true, description: "TO CONFIRM" },
                    phone: { type: "string", nullable: true, description: "TO CONFIRM" },
                    subject: { type: "string", nullable: true, description: "TO CONFIRM" },
                    message: { type: "string", nullable: true, description: "TO CONFIRM" },
                    status: {
                        type: "string",
                        nullable: true,
                        description: "TO CONFIRM (INFERRED vocabulary: NEW | READ | REPLIED | ARCHIVED)",
                    },
                    created_at: { type: "string", format: "date-time", nullable: true },
                    updated_at: { type: "string", format: "date-time", nullable: true },
                },
            },
            Banner: {
                type: "object",
                description:
                    "CMS-managed banner (RoadMap.md §15). §15 defines field concepts only (desktop/mobile image, title, dates, CTA, ordering, approval information); §25 lists only the Banner concept — every field except id is INFERRED / TO CONFIRM.",
                properties: {
                    id: { type: "integer" },
                    title: { type: "string", nullable: true, description: "TO CONFIRM" },
                    desktop_image_url: { type: "string", nullable: true, description: "TO CONFIRM" },
                    mobile_image_url: { type: "string", nullable: true, description: "TO CONFIRM" },
                    cta_text: { type: "string", nullable: true, description: "TO CONFIRM" },
                    cta_url: { type: "string", nullable: true, description: "TO CONFIRM" },
                    display_order: { type: "integer", nullable: true, description: "TO CONFIRM" },
                    start_date: { type: "string", format: "date-time", nullable: true, description: "TO CONFIRM" },
                    end_date: { type: "string", format: "date-time", nullable: true, description: "TO CONFIRM" },
                    is_published: { type: "boolean", nullable: true, description: "TO CONFIRM" },
                    is_archived: { type: "boolean", nullable: true, description: "TO CONFIRM" },
                    created_at: { type: "string", format: "date-time", nullable: true },
                    updated_at: { type: "string", format: "date-time", nullable: true },
                },
            },
            SearchResultItem: {
                type: "object",
                description: "Individual search result item (RoadMap.md §17). Fields are INFERRED from existing entity SQL contracts and are TO CONFIRM.",
                properties: {
                    id: { type: "integer" },
                    type: { type: "string", description: "Entity type (cluster, iti, aip, spv, sip, document, news)" },
                    title: { type: "string", nullable: true },
                    summary: { type: "string", nullable: true },
                    url: { type: "string", description: "Relative URL to the entity detail page" },
                    metadata: { type: "object", description: "Entity-specific metadata" },
                },
            },
            SearchResponse: {
                type: "object",
                description: "Search response containing results and pagination metadata.",
                properties: {
                    results: { type: "array", items: { $ref: "#/components/schemas/SearchResultItem" } },
                    total: { type: "integer", description: "Total number of matching results" },
                    page: { type: "integer", description: "Current page number" },
                    pageSize: { type: "integer", description: "Records per page" },
                    totalPages: { type: "integer", description: "Total number of pages" },
                },
            },
            StateMetrics: {
                type: "object",
                description: "State-level dashboard metrics (RoadMap.md §16). Response shape INFERRED from existing data contracts — TO CONFIRM.",
                properties: {
                    clusters: { type: "integer" },
                    hub_itis: { type: "integer" },
                    spoke_itis: { type: "integer" },
                    aips: { type: "integer" },
                    spvs: { type: "integer" },
                    sips_submitted: { type: "integer" },
                    sips_approved: { type: "integer" },
                    investment: { type: "number" },
                    trainees: { type: "integer", nullable: true, description: "No source table established yet" },
                    industries_engaged: { type: "integer", nullable: true, description: "No source table established yet" },
                },
            },
            ClusterSummary: {
                type: "object",
                description: "Cluster summary with aggregate metrics (RoadMap.md §16). Response shape INFERRED — TO CONFIRM.",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                    district: { type: "string" },
                    sector: { type: "string" },
                    hub_itis: { type: "integer" },
                    spoke_itis: { type: "integer" },
                    aips: { type: "integer" },
                    spvs: { type: "integer" },
                    investment: { type: "number" },
                },
            },
            ClusterDashboardResponse: {
                type: "object",
                description: "Single cluster dashboard (RoadMap.md §16). Response shape INFERRED — TO CONFIRM.",
                properties: {
                    cluster: { type: "object", properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                        district: { type: "string" },
                        sector: { type: "string" },
                    } },
                    metrics: { type: "object", properties: {
                        hub_itis: { type: "integer" },
                        spoke_itis: { type: "integer" },
                        total_itis: { type: "integer" },
                        aips: { type: "integer" },
                        spvs: { type: "integer" },
                        sips_submitted: { type: "integer" },
                        sips_approved: { type: "integer" },
                        investment: { type: "number" },
                    } },
                    itis: { type: "array", items: { type: "object", properties: {
                        id: { type: "integer" },
                        iti_code: { type: "string" },
                        iti_name: { type: "string" },
                        type: { type: "string" },
                        district: { type: "string" },
                    } } },
                    aips: { type: "array", items: { type: "object", properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                        sector: { type: "string" },
                        status: { type: "string" },
                        investment_amount: { type: "number", nullable: true },
                    } } },
                },
            },
            FinanceMetrics: {
                type: "object",
                description: "Finance dashboard (RoadMap.md §16). SIP contribution fields are task-brief fields NOT in RoadMap §10 — TO CONFIRM.",
                properties: {
                    total_investment: { type: "number" },
                    total_sip_proposed: { type: "number" },
                    total_sip_infrastructure: { type: "number" },
                    total_sip_equipment: { type: "number" },
                    total_sip_training: { type: "number" },
                    total_sip_industry: { type: "number" },
                    total_sip_government: { type: "number" },
                    by_cluster: { type: "array", items: { type: "object", properties: {
                        cluster_id: { type: "integer" },
                        cluster_name: { type: "string" },
                        investment: { type: "number" },
                        sip_proposed: { type: "number" },
                    } } },
                },
            },
            TrainingMetrics: {
                type: "object",
                description: "Training dashboard (RoadMap.md §16). Only student capacity available — full training metrics require a future data source.",
                properties: {
                    total_student_capacity: { type: "integer" },
                    by_cluster: { type: "array", items: { type: "object", properties: {
                        cluster_id: { type: "integer" },
                        cluster_name: { type: "string" },
                        student_capacity: { type: "integer" },
                        iti_count: { type: "integer" },
                    } } },
                    by_iti_type: { type: "object", properties: {
                        hub_capacity: { type: "integer" },
                        spoke_capacity: { type: "integer" },
                    } },
                },
            },
            PlacementMetrics: {
                type: "object",
                description: "Placements dashboard (RoadMap.md §16). No source table established — returns informative message.",
                properties: {
                    message: { type: "string" },
                },
            },
            LoginRequest: {
                type: "object",
                description: "POST /auth/login body (RoadMap.md §18).",
                required: ["username", "password"],
                properties: {
                    username: { type: "string" },
                    password: { type: "string", format: "password" },
                },
            },
            AuthUserProfile: {
                type: "object",
                description:
                    "Authenticated admin profile (RoadMap.md §18). Field set/roles/permissions INFERRED, TO CONFIRM. Never contains credentials.",
                properties: {
                    id: { type: "integer" },
                    username: { type: "string" },
                    full_name: { type: "string" },
                    email: { type: "string", nullable: true },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
                    roles: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                code: { type: "string" },
                                name: { type: "string" },
                            },
                        },
                    },
                    permissions: { type: "array", items: { type: "string" } },
                },
            },
            LoginResponse: {
                type: "object",
                description: "Successful login envelope data. The JWT is never logged and never returned anywhere else.",
                properties: {
                    token: { type: "string", description: "JWT access token" },
                    token_type: { type: "string", example: "Bearer" },
                    expires_in: { type: "integer", description: "Seconds until expiry (from the signed exp claim)" },
                    user: { $ref: "#/components/schemas/AuthUserProfile" },
                },
            },
            User: {
                type: "object",
                description:
                    "Administrative user (RoadMap.md §19). Profile fields INFERRED / TO CONFIRM. password_hash is never returned.",
                properties: {
                    id: { type: "integer" },
                    username: { type: "string" },
                    full_name: { type: "string" },
                    email: { type: "string", nullable: true },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
                    created_at: { type: "string", format: "date-time" },
                    roles: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "integer" },
                                code: { type: "string" },
                                name: { type: "string" },
                            },
                        },
                    },
                },
            },
            Role: {
                type: "object",
                description:
                    "RBAC role (RoadMap.md §20). `code` is the database slug (INFERRED mapping, TO CONFIRM); `name` stores the documented title verbatim.",
                properties: {
                    id: { type: "integer" },
                    code: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string", nullable: true },
                    is_system: { type: "boolean" },
                    permissions: {
                        type: "array",
                        items: { type: "string" },
                        description: "Permission codes.",
                    },
                },
            },
            Permission: {
                type: "object",
                description: "RBAC permission (RoadMap.md §20 GET /admin/permissions).",
                properties: {
                    id: { type: "integer" },
                    code: { type: "string" },
                    name: { type: "string", nullable: true },
                },
            },
            Approval: {
                type: "object",
                description:
                    "Approval record (RoadMap.md §21). Status/entity vocab and inferred columns INFERRED / TO CONFIRM with DBA. Approval status is separate from sips.status.",
                properties: {
                    id: { type: "integer" },
                    entity_type: {
                        type: "string",
                        enum: ["DOCUMENT", "NEWS", "GALLERY", "SIP", "BANNER"],
                    },
                    entity_id: { type: "integer" },
                    status: {
                        type: "string",
                        enum: [
                            "PENDING",
                            "SUBMITTED",
                            "UNDER_REVIEW",
                            "REVISION_REQUESTED",
                            "RECOMMENDED",
                            "APPROVED",
                            "REJECTED",
                        ],
                    },
                    submitted_by: {
                        type: "object",
                        nullable: true,
                        properties: {
                            id: { type: "string" },
                            name: { type: "string", nullable: true },
                        },
                    },
                    reviewed_by: {
                        type: "object",
                        nullable: true,
                        properties: {
                            id: { type: "string" },
                            name: { type: "string", nullable: true },
                        },
                    },
                    approved_by: {
                        type: "object",
                        nullable: true,
                        properties: {
                            id: { type: "string" },
                            name: { type: "string", nullable: true },
                        },
                    },
                    remarks: { type: "string", nullable: true },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
            },
            ApprovalTransitionRequest: {
                type: "object",
                description:
                    "Optional body for the 5 approval transitions (INFERRED / TO CONFIRM whether remarks is required).",
                properties: {
                    remarks: { type: "string", maxLength: 2000 },
                },
            },
            AuditEntry: {
                type: "object",
                description:
                    "Audit log entry (RoadMap.md §22 example shape). user_id type and action/entity vocab INFERRED / TO CONFIRM with DBA. old_value/new_value never contain credentials.",
                properties: {
                    id: { type: "integer" },
                    user_id: { type: "string" },
                    action: { type: "string" },
                    entity: { type: "string" },
                    entity_id: { type: "integer" },
                    old_value: { type: "object", nullable: true },
                    new_value: { type: "object", nullable: true },
                    approval_status: { type: "string", nullable: true },
                    timestamp: { type: "string", format: "date-time" },
                },
            },
        },
    },
    paths: {
        "/health": {
            get: {
                tags: ["Health"],
                summary: "Health check",
                description:
                    "Confirms that the backend is running and reports database reachability.",
                security: [],
                responses: {
                    "200": { description: "Service is running" },
                    "429": { description: "Rate limit exceeded" },
                },
            },
        },
        "/home/kpis": {
            get: {
                tags: ["Home"],
                summary: "Homepage KPI counters",
                description:
                    "Returns the homepage KPI/counter data. All values come from database aggregates; the endpoint responds 500 until the PM SETU tables exist (see sql/home/home_kpis.sql).",
                security: [],
                responses: {
                    "200": {
                        description: "KPI counters",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/HomeKpis" },
                                    },
                                },
                            },
                        },
                    },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/sips": {
            get: {
                tags: ["SIP"],
                summary: "List SIPs",
                description:
                    "Returns a paginated list of SIPs (RoadMap.md §10). §10 documents no list filters, so none are supported. All records come from the database; the endpoint responds 500 until the PM SETU tables exist (see sql/sips/sip_queries.sql).",
                security: [],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, default: 1 },
                        description: "Page number",
                    },
                    {
                        name: "pageSize",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                        description: "Records per page",
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated SIP list",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Sip" },
                                        },
                                        meta: {
                                            $ref: "#/components/schemas/PaginationMeta",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid query parameters)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/sips/{id}": {
            get: {
                tags: ["SIP"],
                summary: "Get one SIP",
                description:
                    "Returns a single SIP by id (RoadMap.md §10). Responds 404 when the id does not exist.",
                security: [],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "integer", minimum: 1 },
                        description: "SIP id",
                    },
                ],
                responses: {
                    "200": {
                        description: "SIP record",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/Sip" },
                                    },
                                },
                            },
                        },
                    },
                    "404": { description: "SIP not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/clusters/{clusterId}/sip": {
            get: {
                tags: ["SIP"],
                summary: "List SIPs of a cluster",
                description:
                    "Returns all SIPs belonging to one cluster (RoadMap.md §10 — the spec uses the SINGULAR 'sip' path segment). This route is owned by the SIP module.",
                security: [],
                parameters: [
                    {
                        name: "clusterId",
                        in: "path",
                        required: true,
                        schema: { type: "integer", minimum: 1 },
                        description: "Cluster id",
                    },
                ],
                responses: {
                    "200": {
                        description: "SIPs belonging to the cluster (possibly empty)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Sip" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid clusterId)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/spvs": {
            get: {
                tags: ["SPV"],
                summary: "List SPVs",
                description:
                    "Returns a paginated list of SPVs (RoadMap.md §9). §9 documents no list filters, so none are supported. All records come from the database; the endpoint responds 500 until the PM SETU tables exist (see sql/spvs/spv_queries.sql).",
                security: [],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, default: 1 },
                        description: "Page number",
                    },
                    {
                        name: "pageSize",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                        description: "Records per page",
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated SPV list",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Spv" },
                                        },
                                        meta: {
                                            $ref: "#/components/schemas/PaginationMeta",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid query parameters)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/spvs/{id}": {
            get: {
                tags: ["SPV"],
                summary: "Get one SPV",
                description:
                    "Returns a single SPV by id (RoadMap.md §9). Responds 404 when the id does not exist.",
                security: [],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "integer", minimum: 1 },
                        description: "SPV id",
                    },
                ],
                responses: {
                    "200": {
                        description: "SPV registry record",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/Spv" },
                                    },
                                },
                            },
                        },
                    },
                    "404": { description: "SPV not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/clusters/{clusterId}/spv": {
            get: {
                tags: ["SPV"],
                summary: "List SPVs of a cluster",
                description:
                    "Returns all SPVs belonging to one cluster (RoadMap.md §9 — the spec uses the SINGULAR 'spv' path segment). This route is owned by the SPV module.",
                security: [],
                parameters: [
                    {
                        name: "clusterId",
                        in: "path",
                        required: true,
                        schema: { type: "integer", minimum: 1 },
                        description: "Cluster id",
                    },
                ],
                responses: {
                    "200": {
                        description: "SPVs belonging to the cluster (possibly empty)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Spv" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid clusterId)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/aips": {
            get: {
                tags: ["AIP"],
                summary: "List AIPs",
                description:
                    "Returns a filterable, paginated list of AIPs (RoadMap.md §8). All records come from the database; the endpoint responds 500 until the PM SETU tables exist (see sql/aips/aip_queries.sql).",
                security: [],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, default: 1 },
                        description: "Page number",
                    },
                    {
                        name: "pageSize",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                        description: "Records per page",
                    },
                    {
                        name: "sector",
                        in: "query",
                        required: false,
                        schema: { type: "string", maxLength: 100 },
                        description: "Filter by exact sector",
                    },
                    {
                        name: "cluster_id",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1 },
                        description: "Filter by cluster id",
                    },
                    {
                        name: "status",
                        in: "query",
                        required: false,
                        schema: { type: "string", maxLength: 100 },
                        description:
                            "Filter by exact partnership status (vocabulary TO CONFIRM)",
                    },
                    {
                        name: "search",
                        in: "query",
                        required: false,
                        schema: { type: "string", maxLength: 100 },
                        description: "Case-insensitive search on AIP name",
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated AIP list",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Aip" },
                                        },
                                        meta: {
                                            $ref: "#/components/schemas/PaginationMeta",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid query parameters)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/aips/{id}": {
            get: {
                tags: ["AIP"],
                summary: "Get one AIP",
                description:
                    "Returns a single AIP by id (RoadMap.md §8). Responds 404 when the id does not exist.",
                security: [],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "integer", minimum: 1 },
                        description: "AIP id",
                    },
                ],
                responses: {
                    "200": {
                        description: "AIP registry record",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/Aip" },
                                    },
                                },
                            },
                        },
                    },
                    "404": { description: "AIP not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/clusters": {
            get: {
                tags: ["Cluster"],
                summary: "List clusters",
                description:
                    "Returns a filterable, paginated list of clusters (RoadMap.md §6). All records come from the database; the endpoint responds 500 until the PM SETU tables exist (see sql/clusters/cluster_queries.sql).",
                security: [],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, default: 1 },
                        description: "Page number",
                    },
                    {
                        name: "pageSize",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                        description: "Records per page",
                    },
                    {
                        name: "district",
                        in: "query",
                        required: false,
                        schema: { type: "string", maxLength: 100 },
                        description: "Filter by exact district",
                    },
                    {
                        name: "sector",
                        in: "query",
                        required: false,
                        schema: { type: "string", maxLength: 100 },
                        description: "Filter by exact sector",
                    },
                    {
                        name: "search",
                        in: "query",
                        required: false,
                        schema: { type: "string", maxLength: 100 },
                        description: "Case-insensitive search on cluster name",
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated cluster list",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Cluster" },
                                        },
                                        meta: {
                                            $ref: "#/components/schemas/PaginationMeta",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid query parameters)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/clusters/{id}": {
            get: {
                tags: ["Cluster"],
                summary: "Get one cluster",
                description:
                    "Returns a single cluster by id (RoadMap.md §6). Responds 404 when the id does not exist.",
                security: [],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "integer", minimum: 1 },
                        description: "Cluster id",
                    },
                ],
                responses: {
                    "200": {
                        description: "Cluster master data",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/Cluster" },
                                    },
                                },
                            },
                        },
                    },
                    "404": { description: "Cluster not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/itis": {
            get: {
                tags: ["ITI"],
                summary: "List ITIs",
                description:
                    "Returns a filterable, paginated list of ITIs (RoadMap.md §7). All records come from the database; the endpoint responds 500 until the PM SETU tables exist (see sql/itis/iti_queries.sql).",
                security: [],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, default: 1 },
                        description: "Page number",
                    },
                    {
                        name: "pageSize",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                        description: "Records per page",
                    },
                    {
                        name: "district",
                        in: "query",
                        required: false,
                        schema: { type: "string", maxLength: 100 },
                        description: "Filter by exact district",
                    },
                    {
                        name: "type",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["HUB", "SPOKE"] },
                        description: "Filter by hub/spoke type",
                    },
                    {
                        name: "cluster_id",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1 },
                        description: "Filter by cluster id",
                    },
                    {
                        name: "search",
                        in: "query",
                        required: false,
                        schema: { type: "string", maxLength: 100 },
                        description: "Case-insensitive search on ITI name and code",
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated ITI list",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Iti" },
                                        },
                                        meta: {
                                            $ref: "#/components/schemas/PaginationMeta",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid query parameters)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/itis/{id}": {
            get: {
                tags: ["ITI"],
                summary: "Get one ITI",
                description:
                    "Returns a single ITI by id (RoadMap.md §7). Responds 404 when the id does not exist.",
                security: [],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "integer", minimum: 1 },
                        description: "ITI id",
                    },
                ],
                responses: {
                    "200": {
                        description: "ITI profile",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/Iti" },
                                    },
                                },
                            },
                        },
                    },
                    "404": { description: "ITI not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/clusters/{clusterId}/itis": {
            get: {
                tags: ["ITI"],
                summary: "List ITIs of a cluster",
                description:
                    "Returns all ITIs belonging to one cluster (RoadMap.md §7). This route is owned by the ITI module; no separate cluster module is required for it.",
                security: [],
                parameters: [
                    {
                        name: "clusterId",
                        in: "path",
                        required: true,
                        schema: { type: "integer", minimum: 1 },
                        description: "Cluster id",
                    },
                ],
                responses: {
                    "200": {
                        description: "ITIs belonging to the cluster (possibly empty)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Iti" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid clusterId)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/governance": {
            get: {
                tags: ["Governance"],
                summary: "Get governance directory",
                description:
                    "Returns the full governance directory. Currently an alias for GET /governance/members with identical response shape. May later become a grouped overview (TO CONFIRM).",
                security: [],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, default: 1 },
                        description: "Page number",
                    },
                    {
                        name: "pageSize",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                        description: "Records per page",
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated governance directory",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/GovernanceMember",
                                            },
                                        },
                                        meta: {
                                            $ref: "#/components/schemas/PaginationMeta",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid query parameter)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/governance/members": {
            get: {
                tags: ["Governance"],
                summary: "List governance directory members",
                description:
                    "Returns a paginated list of governance directory members (RoadMap.md §11). All records come from the database; the endpoint responds 500 until the governance tables exist (see sql/governance/governance_queries.sql).",
                security: [],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, default: 1 },
                        description: "Page number",
                    },
                    {
                        name: "pageSize",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                        description: "Records per page",
                    },
                ],
                responses: {
                    "200": {
                        description: "Paginated governance directory",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            type: "array",
                                            items: {
                                                $ref: "#/components/schemas/GovernanceMember",
                                            },
                                        },
                                        meta: {
                                            $ref: "#/components/schemas/PaginationMeta",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed (invalid query parameter)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/governance/members/{id}": {
            get: {
                tags: ["Governance"],
                summary: "Get governance member by ID",
                description:
                    "Returns a single governance directory member by id (RoadMap.md §11). Responds 404 when the id does not exist.",
                security: [],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "integer", minimum: 1 },
                        description: "Governance member id",
                    },
                ],
                responses: {
                    "200": {
                        description: "Governance member details",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: {
                                            $ref: "#/components/schemas/GovernanceMember",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    "404": { description: "Governance member not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/documents": {
            get: {
                tags: ["Document"],
                summary: "List documents",
                description:
                    "Returns a paginated list of documents (RoadMap.md §12). All records come from the database; the endpoint responds 500 until the document tables exist (see sql/documents/document_queries.sql).",
                security: [],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 }, description: "Page number" },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }, description: "Records per page" },
                    { name: "type", in: "query", required: false, schema: { type: "string" }, description: "Filter by document type (TO CONFIRM vocabulary)" },
                    { name: "cluster_id", in: "query", required: false, schema: { type: "integer", minimum: 1 }, description: "Filter by cluster" },
                    { name: "year", in: "query", required: false, schema: { type: "string", pattern: "^\\d{4}$" }, description: "Filter by financial year (format TO CONFIRM)" },
                    { name: "department", in: "query", required: false, schema: { type: "string" }, description: "Filter by department" },
                    { name: "keyword", in: "query", required: false, schema: { type: "string" }, description: "Search in title/keywords" },
                    { name: "from", in: "query", required: false, schema: { type: "string", format: "date" }, description: "Issue date range start (YYYY-MM-DD)" },
                    { name: "to", in: "query", required: false, schema: { type: "string", format: "date" }, description: "Issue date range end (YYYY-MM-DD)" },
                ],
                responses: {
                    "200": {
                        description: "Paginated document list",
                        content: { "application/json": { schema: { type: "object", properties: {
                            success: { type: "boolean", example: true },
                            data: { type: "array", items: { $ref: "#/components/schemas/Document" } },
                            meta: { $ref: "#/components/schemas/PaginationMeta" },
                        }}}},
                    },
                    "422": { description: "Validation failed (invalid query parameter)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/documents/{id}": {
            get: {
                tags: ["Document"],
                summary: "Get document by ID",
                description: "Returns a single document by id (RoadMap.md §12). Responds 404 when the id does not exist.",
                security: [],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 }, description: "Document id" }],
                responses: {
                    "200": { description: "Document details", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Document" },
                    }}}},
                    },
                    "404": { description: "Document not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/documents/{id}/download": {
            get: {
                tags: ["Document"],
                summary: "Download document file",
                description: "Streams the document file (RoadMap.md §12). Responds 404 when the document or file does not exist.",
                security: [],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 }, description: "Document id" }],
                responses: {
                    "200": { description: "File stream" },
                    "404": { description: "Document or file not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/documents/{id}/versions": {
            get: {
                tags: ["Document"],
                summary: "Get document version history",
                description: "Returns the version history of a document (RoadMap.md §12). Responds 404 when the document does not exist.",
                security: [],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 }, description: "Document id" }],
                responses: {
                    "200": { description: "Document version history", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { type: "array", items: { $ref: "#/components/schemas/DocumentVersion" } },
                    }}}},
                    },
                    "404": { description: "Document not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/news": {
            get: {
                tags: ["News"],
                summary: "List news",
                description:
                    "Returns a paginated list of news items (RoadMap.md §13). All records come from the database; the endpoint responds 500 until the news tables exist (see sql/news/news_queries.sql).",
                security: [],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 }, description: "Page number" },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }, description: "Records per page" },
                ],
                responses: {
                    "200": {
                        description: "Paginated news list",
                        content: { "application/json": { schema: { type: "object", properties: {
                            success: { type: "boolean", example: true },
                            data: { type: "array", items: { $ref: "#/components/schemas/News" } },
                            meta: { $ref: "#/components/schemas/PaginationMeta" },
                        }}}},
                    },
                    "422": { description: "Validation failed (invalid query parameter)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/news/latest": {
            get: {
                tags: ["News"],
                summary: "Get latest news",
                description: "Returns the latest news items (RoadMap.md §13). No pagination.",
                security: [],
                responses: {
                    "200": {
                        description: "Latest news list",
                        content: { "application/json": { schema: { type: "object", properties: {
                            success: { type: "boolean", example: true },
                            data: { type: "array", items: { $ref: "#/components/schemas/News" } },
                        }}}},
                    },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/news/{id}": {
            get: {
                tags: ["News"],
                summary: "Get news by ID",
                description: "Returns a single news item by id (RoadMap.md §13). Responds 404 when the id does not exist.",
                security: [],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 }, description: "News id" }],
                responses: {
                    "200": { description: "News details", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/News" },
                    }}}},
                    },
                    "404": { description: "News not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/gallery": {
            get: {
                tags: ["Gallery"],
                summary: "List gallery items",
                description:
                    "Returns a paginated list of all gallery items (RoadMap.md §14). All records come from the database; the endpoint responds 500 until the gallery tables exist (see sql/gallery/gallery_queries.sql).",
                security: [],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 }, description: "Page number" },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }, description: "Records per page" },
                ],
                responses: {
                    "200": {
                        description: "Paginated gallery list",
                        content: { "application/json": { schema: { type: "object", properties: {
                            success: { type: "boolean", example: true },
                            data: { type: "array", items: { $ref: "#/components/schemas/GalleryItem" } },
                            meta: { $ref: "#/components/schemas/PaginationMeta" },
                        }}}},
                    },
                    "422": { description: "Validation failed (invalid query parameter)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/gallery/photos": {
            get: {
                tags: ["Gallery"],
                summary: "List photo gallery",
                description: "Returns a paginated list of photo gallery items (RoadMap.md §14).",
                security: [],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 }, description: "Page number" },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }, description: "Records per page" },
                ],
                responses: {
                    "200": {
                        description: "Paginated photo gallery list",
                        content: { "application/json": { schema: { type: "object", properties: {
                            success: { type: "boolean", example: true },
                            data: { type: "array", items: { $ref: "#/components/schemas/GalleryItem" } },
                            meta: { $ref: "#/components/schemas/PaginationMeta" },
                        }}}},
                    },
                    "422": { description: "Validation failed (invalid query parameter)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/gallery/videos": {
            get: {
                tags: ["Gallery"],
                summary: "List video gallery",
                description: "Returns a paginated list of video gallery items (RoadMap.md §14).",
                security: [],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 }, description: "Page number" },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }, description: "Records per page" },
                ],
                responses: {
                    "200": {
                        description: "Paginated video gallery list",
                        content: { "application/json": { schema: { type: "object", properties: {
                            success: { type: "boolean", example: true },
                            data: { type: "array", items: { $ref: "#/components/schemas/GalleryItem" } },
                            meta: { $ref: "#/components/schemas/PaginationMeta" },
                        }}}},
                    },
                    "422": { description: "Validation failed (invalid query parameter)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/gallery/{id}": {
            get: {
                tags: ["Gallery"],
                summary: "Get gallery item by ID",
                description: "Returns a single gallery item by id (RoadMap.md §14). Responds 404 when the id does not exist.",
                security: [],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 }, description: "Gallery item id" }],
                responses: {
                    "200": { description: "Gallery item details", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/GalleryItem" },
                    }}}},
                    },
                    "404": { description: "Gallery item not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/search": {
            get: {
                tags: ["Search"],
                summary: "Portal-wide search",
                description: "Search across all searchable entities (RoadMap.md §17). All results come from the database; the endpoint responds 500 until the PM SETU tables exist (see sql/search/search_queries.sql).",
                security: [],
                parameters: [
                    { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search query string" },
                    { name: "type", in: "query", required: false, schema: { type: "string", enum: ["cluster", "iti", "aip", "spv", "sip", "document", "news"] }, description: "Filter by entity type" },
                    { name: "district", in: "query", required: false, schema: { type: "string" }, description: "Filter by district" },
                    { name: "year", in: "query", required: false, schema: { type: "string", pattern: "^\\d{4}$" }, description: "Filter by year (YYYY)" },
                    { name: "category", in: "query", required: false, schema: { type: "string" }, description: "Filter by category" },
                    { name: "date", in: "query", required: false, schema: { type: "string", format: "date" }, description: "Filter by date (YYYY-MM-DD)" },
                    { name: "document_type", in: "query", required: false, schema: { type: "string" }, description: "Filter by document type" },
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 }, description: "Page number" },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }, description: "Records per page" },
                ],
                responses: {
                    "200": { description: "Search results", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/SearchResponse" },
                    }}}}},
                    "422": { description: "Validation failed (invalid query or parameters)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/dashboard/state": {
            get: {
                tags: ["Dashboard"],
                summary: "State-level dashboard",
                description: "State-level PM SETU overview (RoadMap.md §16). Aggregated from the database; responds 500 until tables exist.",
                security: [],
                responses: {
                    "200": { description: "State metrics", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/StateMetrics" },
                    }}}},},
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/dashboard/clusters": {
            get: {
                tags: ["Dashboard"],
                summary: "Cluster list dashboard",
                description: "List of all clusters with aggregate metrics (RoadMap.md §16).",
                security: [],
                responses: {
                    "200": { description: "Cluster summaries", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/ClusterSummary" },
                    }}}},},
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/dashboard/clusters/{id}": {
            get: {
                tags: ["Dashboard"],
                summary: "Single cluster dashboard",
                description: "Dashboard for a single cluster (RoadMap.md §16).",
                security: [],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 }, description: "Cluster id" }],
                responses: {
                    "200": { description: "Cluster dashboard", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/ClusterDashboardResponse" },
                    }}}},},
                    "404": { description: "Cluster not found" },
                    "422": { description: "Validation failed (invalid id)" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/dashboard/finance": {
            get: {
                tags: ["Dashboard"],
                summary: "Finance dashboard",
                description: "Financial overview (RoadMap.md §16). SIP contribution fields TO CONFIRM.",
                security: [],
                responses: {
                    "200": { description: "Finance metrics", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/FinanceMetrics" },
                    }}}},},
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/dashboard/training": {
            get: {
                tags: ["Dashboard"],
                summary: "Training dashboard",
                description: "Training overview (RoadMap.md §16). Only student capacity available — full training metrics require a future data source.",
                security: [],
                responses: {
                    "200": { description: "Training metrics", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/TrainingMetrics" },
                    }}}},},
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/dashboard/placements": {
            get: {
                tags: ["Dashboard"],
                summary: "Placements dashboard",
                description: "Placements overview (RoadMap.md §16). No source table established — returns informative message until a placement data source is defined.",
                security: [],
                responses: {
                    "200": { description: "Placement metrics", content: { "application/json": { schema: { type: "object", properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/PlacementMetrics" },
                    }}}},},
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Login (administrative)",
                description:
                    "Verifies admin credentials and returns a JWT access token (RoadMap.md §18). Public endpoint, but IP-rate-limited and subject to account lockout (NIC §27). The limited set of implemented auth endpoints (login/me/change-password) is INFERRED; logout/refresh/forgot/reset are deferred (TO CONFIRM).",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LoginRequest" },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Successful login — JWT + profile",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/LoginResponse" },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed" },
                    "401": { description: "Invalid credentials" },
                    "403": { description: "Account inactive (ACCOUNT_INACTIVE, INFERRED)" },
                    "423": { description: "Account locked (ACCOUNT_LOCKED, INFERRED)" },
                    "429": { description: "Rate limit exceeded (authLimiter)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/auth/me": {
            get: {
                tags: ["Auth"],
                summary: "Get authenticated user profile",
                description:
                    "Returns the authenticated admin's fresh profile from the database (RoadMap.md §18).",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Active profile",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/AuthUserProfile" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid/expired token" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/auth/change-password": {
            post: {
                tags: ["Auth"],
                summary: "Change own password",
                description:
                    "Verifies the current password and replaces it with a new bcrypt hash (RoadMap.md §18). Password policy (min 8) is INFERRED / TO CONFIRM.",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["current_password", "new_password"],
                                properties: {
                                    current_password: { type: "string", format: "password" },
                                    new_password: { type: "string", format: "password", minLength: 8 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Password updated" },
                    "401": { description: "Invalid current password or missing token" },
                    "404": { description: "User not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
"/admin/permissions": {
            get: {
                tags: ["Roles"],
                summary: "List permissions",
                description: "Returns all RBAC permission codes (RoadMap.md §20).",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Permissions",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { $ref: "#/components/schemas/Permission" } },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
"/admin/roles/{id}": {
            get: {
                tags: ["Roles"],
                summary: "Get role",
                description: "Returns one role with its permission codes (RoadMap.md §20).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Role with permissions" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Role not found" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            patch: {
                tags: ["Roles"],
                summary: "Update role",
                description: "Updates role name/description and optionally replaces permissions. `code`/`is_system` are immutable (RoadMap.md §20).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string", nullable: true },
                                    permission_ids: { type: "array", uniqueItems: true, items: { type: "integer" } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated role" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Role not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            delete: {
                tags: ["Roles"],
                summary: "Delete role",
                description: "Deletes a custom role. System roles are protected (RoadMap.md §20).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Deleted role" },
                    "400": { description: "System role cannot be deleted" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Role not found" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
"/admin/roles": {
            get: {
                tags: ["Roles"],
                summary: "List roles",
                description: "Returns all RBAC roles (RoadMap.md §20). The ten documented roles are DBA-seeded.",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Roles",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { $ref: "#/components/schemas/Role" } },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            post: {
                tags: ["Roles"],
                summary: "Create role",
                description: "Creates a custom (non-system) role with permissions (RoadMap.md §20).",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["code", "name"],
                                properties: {
                                    code: { type: "string", description: "lower_snake_case slug (INFERRED)" },
                                    name: { type: "string" },
                                    description: { type: "string", nullable: true },
                                    permission_ids: { type: "array", uniqueItems: true, items: { type: "integer" } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Created role" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "409": { description: "Duplicate role code" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
"/admin/users/{id}/status": {
            patch: {
                tags: ["Users"],
                summary: "Activate/deactivate user",
                description: "Changes the user status (RoadMap.md §19).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["status"],
                                properties: { status: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated user status" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "User not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/users/{id}/roles": {
            patch: {
                tags: ["Users"],
                summary: "Replace user roles",
                description: "Atomically replaces all role assignments for a user (RoadMap.md §19).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["role_ids"],
                                properties: { role_ids: { type: "array", minItems: 1, uniqueItems: true, items: { type: "integer" } } },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated user with new roles" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "User not found" },
                    "409": { description: "Unknown role id (relation constraint)" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
"/admin/users/{id}": {
            get: {
                tags: ["Users"],
                summary: "Get user",
                description: "Returns one admin user with assigned roles (RoadMap.md §19).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "User with roles" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "User not found" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            patch: {
                tags: ["Users"],
                summary: "Update user profile",
                description: "Updates profile fields only (full_name/email) — passwords are handled by POST /auth/change-password (RoadMap.md §19).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    full_name: { type: "string", minLength: 1, maxLength: 200 },
                                    email: { type: "string", format: "email", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated user" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "User not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            delete: {
                tags: ["Users"],
                summary: "Delete user (soft)",
                description:
                    "Soft-deletes a user by deactivating (RoadMap.md §19). Hard delete is TO CONFIRM.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Deactivated user" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "User not found" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
"/admin/users": {
            get: {
                tags: ["Users"],
                summary: "List users",
                description:
                    "Paginated admin user list with optional filters (RoadMap.md §19). Filters (status/role/search) are INFERRED / TO CONFIRM.",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
                    { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
                    { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } },
                    { name: "role", in: "query", schema: { type: "string" }, description: "Role code (INFERRED)" },
                    { name: "search", in: "query", schema: { type: "string" }, description: "Username/name match (INFERRED)" },
                ],
                responses: {
                    "200": {
                        description: "Paginated users",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { $ref: "#/components/schemas/User" } },
                                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            post: {
                tags: ["Users"],
                summary: "Create user",
                description:
                    "Administrative user creation (RoadMap.md §19). Password is bcrypt-hashed server-side and never returned. No self-registration exists.",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["username", "full_name", "password", "role_ids"],
                                properties: {
                                    username: { type: "string", minLength: 3, maxLength: 50 },
                                    full_name: { type: "string", minLength: 1, maxLength: 200 },
                                    email: { type: "string", format: "email", nullable: true },
                                    password: { type: "string", format: "password", minLength: 8 },
                                    role_ids: { type: "array", minItems: 1, uniqueItems: true, items: { type: "integer" } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Created user (no credentials)",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/User" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "409": { description: "Duplicate username/email" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/approvals": {
            get: {
                tags: ["Approvals"],
                summary: "List approval records",
                description:
                    "Paginated approval list with optional filters entity_type/entity_id/status/submitted_by/reviewed_by/approved_by/from/to. Filters are INFERRED value-add (§21 documents no filters). Status vocab INFERRED / TO CONFIRM, separate from sips.status.",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                    { name: "entity_type", in: "query", required: false, schema: { type: "string", enum: ["DOCUMENT", "NEWS", "GALLERY", "SIP", "BANNER"] } },
                    { name: "entity_id", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
                    { name: "status", in: "query", required: false, schema: { type: "string", enum: ["PENDING", "SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED", "RECOMMENDED", "APPROVED", "REJECTED"] } },
                    { name: "submitted_by", in: "query", required: false, schema: { type: "string" } },
                    { name: "reviewed_by", in: "query", required: false, schema: { type: "string" } },
                    { name: "approved_by", in: "query", required: false, schema: { type: "string" } },
                    { name: "from", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "to", in: "query", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: {
                    "200": {
                        description: "Paginated approval records",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { $ref: "#/components/schemas/Approval" } },
                                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/approvals/{id}": {
            get: {
                tags: ["Approvals"],
                summary: "Get approval record",
                description: "Returns one approval record (RoadMap.md §21).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": {
                        description: "Approval record",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/Approval" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Approval not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/approvals/{id}/submit": {
            post: {
                tags: ["Approvals"],
                summary: "Submit approval for review",
                description:
                    "Transitions PENDING -> SUBMITTED (RoadMap.md §21). Records acting user + remarks and writes an internal audit entry. Status vocab INFERRED / TO CONFIRM.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApprovalTransitionRequest" },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated approval record" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Approval not found" },
                    "422": { description: "Validation failed or invalid transition (INVALID_APPROVAL_TRANSITION)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/approvals/{id}/review": {
            post: {
                tags: ["Approvals"],
                summary: "Department reviewer review",
                description:
                    "Transitions SUBMITTED -> UNDER_REVIEW (RoadMap.md §21). Records acting user + remarks and writes an internal audit entry.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApprovalTransitionRequest" },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated approval record" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Approval not found" },
                    "422": { description: "Validation failed or invalid transition (INVALID_APPROVAL_TRANSITION)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/approvals/{id}/approve": {
            post: {
                tags: ["Approvals"],
                summary: "Approving officer approval",
                description:
                    "Transitions UNDER_REVIEW -> APPROVED (RoadMap.md §21). Records acting user + remarks and writes an internal audit entry.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApprovalTransitionRequest" },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated approval record" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Approval not found" },
                    "422": { description: "Validation failed or invalid transition (INVALID_APPROVAL_TRANSITION)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/approvals/{id}/reject": {
            post: {
                tags: ["Approvals"],
                summary: "Reject approval",
                description:
                    "Transitions UNDER_REVIEW -> REJECTED (RoadMap.md §21). Records acting user + remarks and writes an internal audit entry.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApprovalTransitionRequest" },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated approval record" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Approval not found" },
                    "422": { description: "Validation failed or invalid transition (INVALID_APPROVAL_TRANSITION)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/approvals/{id}/request-revision": {
            post: {
                tags: ["Approvals"],
                summary: "Request revision",
                description:
                    "Transitions UNDER_REVIEW -> REVISION_REQUESTED (RoadMap.md §21). Records acting user + remarks and writes an internal audit entry.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ApprovalTransitionRequest" },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated approval record" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Approval not found" },
                    "422": { description: "Validation failed or invalid transition (INVALID_APPROVAL_TRANSITION)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/audit-logs": {
            get: {
                tags: ["Audit Logs"],
                summary: "List audit log entries",
                description:
                    "Paginated audit log list with optional filters entity/entity_id/action/user_id/approval_status/from/to. Filters INFERRED value-add (§22 documents no filters). Append-only: no public write endpoints.",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                    { name: "entity", in: "query", required: false, schema: { type: "string" } },
                    { name: "entity_id", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
                    { name: "action", in: "query", required: false, schema: { type: "string" } },
                    { name: "user_id", in: "query", required: false, schema: { type: "string" } },
                    { name: "approval_status", in: "query", required: false, schema: { type: "string" } },
                    { name: "from", in: "query", required: false, schema: { type: "string", format: "date" } },
                    { name: "to", in: "query", required: false, schema: { type: "string", format: "date" } },
                ],
                responses: {
                    "200": {
                        description: "Paginated audit log entries",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { $ref: "#/components/schemas/AuditEntry" } },
                                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/audit-logs/{id}": {
            get: {
                tags: ["Audit Logs"],
                summary: "Get audit log entry",
                description: "Returns one audit log entry (RoadMap.md §22).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": {
                        description: "Audit log entry",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/AuditEntry" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Audit log entry not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/contact": {
            post: {
                tags: ["Contact"],
                summary: "Submit contact message",
                description:
                    "Public contact/support form submission (RoadMap.md §23). Rate-limited per the §23 public-form security note. CAPTCHA required in words by §23 but no provider exists — TO CONFIRM.",
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "email", "message"],
                                properties: {
                                    name: { type: "string", minLength: 1, maxLength: 100 },
                                    email: { type: "string", format: "email" },
                                    phone: { type: "string", minLength: 6, maxLength: 20 },
                                    subject: { type: "string", maxLength: 200 },
                                    message: { type: "string", minLength: 1, maxLength: 2000 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Submitted contact message id" },
                    "422": { description: "Validation failed" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/contact/messages": {
            get: {
                tags: ["Contact"],
                summary: "List contact messages",
                description:
                    "Paginated admin contact-message list, newest first (RoadMap.md §23). Pagination only — §23 documents no filters.",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                ],
                responses: {
                    "200": {
                        description: "Paginated contact messages",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { $ref: "#/components/schemas/ContactMessage" } },
                                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/contact/messages/{id}": {
            get: {
                tags: ["Contact"],
                summary: "Get contact message",
                description: "Returns one contact message (RoadMap.md §23).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": {
                        description: "Contact message",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { $ref: "#/components/schemas/ContactMessage" },
                                    },
                                },
                            },
                        },
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Contact message not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            patch: {
                tags: ["Contact"],
                summary: "Triage contact message",
                description:
                    "Updates triage status only (RoadMap.md §23). Status-only write and vocabulary NEW | READ | REPLIED | ARCHIVED are INFERRED / TO CONFIRM.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["status"],
                                properties: {
                                    status: { type: "string", enum: ["NEW", "READ", "REPLIED", "ARCHIVED"] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated contact message" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Contact message not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/banners": {
            get: {
                tags: ["Banners"],
                summary: "List published banners",
                description:
                    "Paginated published, non-archived banner list (RoadMap.md §15). Pagination only — §15 documents no filters. All banner fields INFERRED / TO CONFIRM.",
                security: [],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                ],
                responses: {
                    "200": {
                        description: "Paginated banners",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { $ref: "#/components/schemas/Banner" } },
                                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/banners/active": {
            get: {
                tags: ["Banners"],
                summary: "List active banners",
                description:
                    "Paginated published + date-window aware banner list (RoadMap.md §15). Active predicate INFERRED / TO CONFIRM (see sql/banners/banner_queries.sql).",
                security: [],
                parameters: [
                    { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
                    { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
                ],
                responses: {
                    "200": {
                        description: "Paginated active banners",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean", example: true },
                                        data: { type: "array", items: { $ref: "#/components/schemas/Banner" } },
                                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                                    },
                                },
                            },
                        },
                    },
                    "422": { description: "Validation failed" },
                    "429": { description: "Rate limit exceeded" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/banners": {
            post: {
                tags: ["Banners"],
                summary: "Create banner",
                description:
                    "Administrative banner creation (RoadMap.md §15). New rows start unpublished + unarchived. All fields INFERRED / TO CONFIRM.",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["title"],
                                properties: {
                                    title: { type: "string", minLength: 1, maxLength: 255 },
                                    desktop_image_url: { type: "string", format: "uri" },
                                    mobile_image_url: { type: "string", format: "uri" },
                                    cta_text: { type: "string", maxLength: 255 },
                                    cta_url: { type: "string", format: "uri" },
                                    display_order: { type: "integer", minimum: 0, default: 0 },
                                    start_date: { type: "string", format: "date-time" },
                                    end_date: { type: "string", format: "date-time" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Created banner" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/banners/{id}": {
            patch: {
                tags: ["Banners"],
                summary: "Update banner",
                description:
                    "Updates supplied banner columns only (RoadMap.md §15). Status changes go through publish/archive, not this endpoint.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    title: { type: "string", minLength: 1, maxLength: 255 },
                                    desktop_image_url: { type: "string", format: "uri" },
                                    mobile_image_url: { type: "string", format: "uri" },
                                    cta_text: { type: "string", maxLength: 255 },
                                    cta_url: { type: "string", format: "uri" },
                                    display_order: { type: "integer", minimum: 0 },
                                    start_date: { type: "string", format: "date-time" },
                                    end_date: { type: "string", format: "date-time" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated banner" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Banner not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            delete: {
                tags: ["Banners"],
                summary: "Delete banner",
                description: "Deletes a banner (RoadMap.md §15).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Deleted banner id" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Banner not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/banners/{id}/publish": {
            post: {
                tags: ["Banners"],
                summary: "Publish banner",
                description:
                    "Publishes a banner (RoadMap.md §15). INFERRED guard: archived banners cannot be published (422 INVALID_TRANSITION) — TO CONFIRM.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Published banner" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Banner not found" },
                    "422": { description: "Validation failed or invalid transition" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/banners/{id}/archive": {
            post: {
                tags: ["Banners"],
                summary: "Archive banner",
                description: "Archives a banner (RoadMap.md §15).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Archived banner" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Banner not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/banners/{id}/images": {
            post: {
                tags: ["Banners"],
                summary: "Upload banner images",
                description:
                    "Uploads banner images (multipart/form-data, field 'images', up to 5 files; RoadMap.md §24). Files land in uploads/banners/ and the banner row image columns are updated (INFERRED / TO CONFIRM).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    images: { type: "array", items: { type: "string", format: "binary" } },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated banner with new image URLs" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Banner not found" },
                    "413": { description: "Uploaded file too large" },
                    "415": { description: "Unsupported file type" },
                    "422": { description: "Validation failed (no files / invalid id)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/documents": {
            post: {
                tags: ["Documents"],
                summary: "Create document (admin)",
                description:
                    "Administrative document creation (RoadMap.md §12 admin CRUD, INFERRED). Starts as DRAFT with version 1 (INFERRED / TO CONFIRM). Requires auth + DOCUMENT_WRITE_ROLES (INFERRED / TO CONFIRM).",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["title", "type"],
                                properties: {
                                    title: { type: "string", minLength: 1, maxLength: 500 },
                                    document_number: { type: "string", nullable: true },
                                    type: { type: "string" },
                                    department: { type: "string", nullable: true },
                                    issue_date: { type: "string", format: "date", nullable: true },
                                    financial_year: { type: "string", nullable: true },
                                    cluster_id: { type: "integer", nullable: true },
                                    keywords: { type: "string", nullable: true },
                                    language: { type: "string", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Created document" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "409": { description: "Duplicate document" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/documents/{id}": {
            patch: {
                tags: ["Documents"],
                summary: "Update document (admin)",
                description:
                    "Updates the supplied columns of a document (RoadMap.md §12 admin CRUD, INFERRED / TO CONFIRM).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    document_number: { type: "string", nullable: true },
                                    type: { type: "string" },
                                    department: { type: "string", nullable: true },
                                    issue_date: { type: "string", format: "date", nullable: true },
                                    financial_year: { type: "string", nullable: true },
                                    cluster_id: { type: "integer", nullable: true },
                                    keywords: { type: "string", nullable: true },
                                    language: { type: "string", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated document" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Document not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            delete: {
                tags: ["Documents"],
                summary: "Delete document (admin)",
                description:
                    "Deletes a document (RoadMap.md §12 admin CRUD, INFERRED / TO CONFIRM soft vs hard).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Deleted document" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Document not found" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/documents/{id}/publish": {
            post: {
                tags: ["Documents"],
                summary: "Publish document (admin)",
                description:
                    "Publishes a DRAFT document (RoadMap.md §12 workflow, INFERRED behavior / TO CONFIRM). Archived documents cannot be published (INFERRED / TO CONFIRM).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Published document" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Document not found" },
                    "409": { description: "Invalid current status (e.g. archived)" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/documents/{id}/archive": {
            post: {
                tags: ["Documents"],
                summary: "Archive document (admin)",
                description:
                    "Archives a document (RoadMap.md §12 workflow, INFERRED / TO CONFIRM).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Archived document" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Document not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/documents/{id}/version": {
            post: {
                tags: ["Documents"],
                summary: "Create document version snapshot (admin)",
                description:
                    "Copies the current file into a new version row and increments version (INFERRED behavior / TO CONFIRM; §12 documents version history).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "201": { description: "New version created" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Document not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/documents/{id}/file": {
            post: {
                tags: ["Documents"],
                summary: "Upload document file (admin)",
                description:
                    "Uploads a document file (multipart/form-data, field 'file') and attaches it to the document row (RoadMap.md §24; route shape INFERRED / TO CONFIRM). Files land in uploads/documents/.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    file: { type: "string", format: "binary" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated document with file metadata" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Document not found" },
                    "413": { description: "Uploaded file too large" },
                    "415": { description: "Unsupported file type" },
                    "422": { description: "Validation failed (no file / invalid id)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/news": {
            post: {
                tags: ["News"],
                summary: "Create news item (admin)",
                description:
                    "Administrative news creation (RoadMap.md §13). Inserted as DRAFT (is_published = FALSE, INFERRED). Requires auth + NEWS_WRITE_ROLES (INFERRED / TO CONFIRM).",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["title"],
                                properties: {
                                    title: { type: "string", minLength: 1, maxLength: 500 },
                                    summary: { type: "string", nullable: true },
                                    content: { type: "string", nullable: true },
                                    published_date: { type: "string", format: "date-time", nullable: true },
                                    expiry_date: { type: "string", format: "date-time", nullable: true },
                                    category: { type: "string", nullable: true },
                                    cluster_id: { type: "integer", nullable: true },
                                    thumbnail_url: { type: "string", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Created news item" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "409": { description: "Duplicate news" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/news/{id}": {
            patch: {
                tags: ["News"],
                summary: "Update news item (admin)",
                description:
                    "Updates the supplied columns of a news item (RoadMap.md §13, INFERRED / TO CONFIRM).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    summary: { type: "string", nullable: true },
                                    content: { type: "string", nullable: true },
                                    published_date: { type: "string", format: "date-time", nullable: true },
                                    expiry_date: { type: "string", format: "date-time", nullable: true },
                                    category: { type: "string", nullable: true },
                                    cluster_id: { type: "integer", nullable: true },
                                    thumbnail_url: { type: "string", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated news item" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "News not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            delete: {
                tags: ["News"],
                summary: "Delete news item (admin)",
                description:
                    "Deletes a news item (RoadMap.md §13, INFERRED / TO CONFIRM soft vs hard).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Deleted news item" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "News not found" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/news/{id}/publish": {
            post: {
                tags: ["News"],
                summary: "Publish news item (admin)",
                description:
                    "Publishes a news item (RoadMap.md §13). INFERRED: is_published = TRUE (the news contract has no is_archived column).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Published news item" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "News not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/news/{id}/archive": {
            post: {
                tags: ["News"],
                summary: "Archive news item (admin)",
                description:
                    "Archives a news item (RoadMap.md §13). INFERRED: is_published = FALSE (archive = unpublish; TO CONFIRM if a dedicated is_archived column is wanted).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Archived news item" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "News not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/news/{id}/attachments": {
            post: {
                tags: ["News"],
                summary: "Upload news attachment (admin)",
                description:
                    "Uploads an attachment (multipart/form-data, field 'file') and stores its metadata (RoadMap.md §24 — POST /admin/news/:id/attachments is the NIC-listed example). Files land in uploads/news/.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    file: { type: "string", format: "binary" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "News item with new attachment" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "News not found" },
                    "413": { description: "Uploaded file too large" },
                    "415": { description: "Unsupported file type" },
                    "422": { description: "Validation failed (no file / invalid id)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/gallery": {
            post: {
                tags: ["Gallery"],
                summary: "Create gallery item (admin)",
                description:
                    "Administrative gallery item creation (RoadMap.md §14). Inserted as DRAFT (is_published = FALSE, INFERRED). type vocabulary PHOTO | VIDEO | PRESS_RELEASE is TO CONFIRM with DBA.",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["title", "type"],
                                properties: {
                                    title: { type: "string", minLength: 1, maxLength: 500 },
                                    description: { type: "string", nullable: true },
                                    type: { type: "string", description: "PHOTO | VIDEO | PRESS_RELEASE (TO CONFIRM)" },
                                    media_url: { type: "string", nullable: true },
                                    thumbnail_url: { type: "string", nullable: true },
                                    published_date: { type: "string", format: "date-time", nullable: true },
                                    category: { type: "string", nullable: true },
                                    display_order: { type: "integer", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Created gallery item" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "409": { description: "Duplicate gallery item" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/gallery/{id}": {
            patch: {
                tags: ["Gallery"],
                summary: "Update gallery item (admin)",
                description:
                    "Updates the supplied columns of a gallery item (RoadMap.md §14, INFERRED / TO CONFIRM). is_published can be flipped directly here.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    description: { type: "string", nullable: true },
                                    type: { type: "string" },
                                    media_url: { type: "string", nullable: true },
                                    thumbnail_url: { type: "string", nullable: true },
                                    published_date: { type: "string", format: "date-time", nullable: true },
                                    category: { type: "string", nullable: true },
                                    is_published: { type: "boolean", nullable: true },
                                    display_order: { type: "integer", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Updated gallery item" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Gallery item not found" },
                    "422": { description: "Validation failed" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
            delete: {
                tags: ["Gallery"],
                summary: "Delete gallery item (admin)",
                description:
                    "Deletes a gallery item (RoadMap.md §14, INFERRED / TO CONFIRM soft vs hard).",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }],
                responses: {
                    "200": { description: "Deleted gallery item" },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "404": { description: "Gallery item not found" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
        "/admin/gallery/upload": {
            post: {
                tags: ["Gallery"],
                summary: "Upload gallery media (admin)",
                description:
                    "Row-less media upload (multipart/form-data, field 'media'). Returns stored-file metadata; the client persists the returned path/URL via POST /admin/gallery or PATCH /admin/gallery/:id (media_url / thumbnail_url). RoadMap.md §24 lists POST /admin/gallery/upload explicitly. Files land in uploads/gallery/. Image-only (videos reference external URLs; TO CONFIRM if a dedicated video upload is wanted).",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    media: { type: "string", format: "binary" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Stored-file metadata { file_path, file_name, mime_type, file_size }",
                    },
                    "401": { description: "Missing/invalid token" },
                    "403": { description: "Insufficient role" },
                    "413": { description: "Uploaded file too large" },
                    "415": { description: "Unsupported file type" },
                    "422": { description: "Validation failed (no file)" },
                    "500": { description: "PM SETU database schema not created yet" },
                },
            },
        },
    },
};

export const docsRouter = Router();

// Raw spec (for clients, Postman, CI)
docsRouter.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
});

// Interactive UI
docsRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
