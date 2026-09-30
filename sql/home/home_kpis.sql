-- ============================================================================
-- PM SETU — Home module · sql/home/home_kpis.sql
-- Endpoint : GET /api/v1/home/kpis
-- Spec     : RoadMap.md §5 "HOME APIs"
-- ============================================================================
--
-- PURPOSE
--   Canonical PostgreSQL source of the homepage KPI counters. The backend
--   executes the same statement in src/modules/home/home.repository.ts via
--   Prisma $queryRaw. If the query changes here, mirror the change there
--   (and vice versa).
--
-- STATUS  ⚠ READ FIRST
--   The PM SETU schema does NOT exist yet:
--     - prisma/schema.prisma defines no models
--     - prisma/migrations/ does not exist
--   This file therefore documents the PLANNED query and the contract of what
--   must be created. NOTHING here creates tables — schema creation is owned
--   by the database developer (via Prisma models or raw SQL, their choice).
--   Until the schema exists the KPI query fails at runtime and
--   GET /api/v1/home/kpis returns a 500 error envelope. That is intentional:
--   KPI values must come from the database, never from hard-coded numbers.
--
-- REQUIRED DATABASE OBJECTS (final names/types to be confirmed by the DBA;
-- names below follow the RoadMap.md §25 entities in snake_case)
--
--   Table      Columns needed by this query
--   ---------- ------------------------------------------------------------------
--   clusters   (any PK — only COUNT(*) is used)
--   itis       type              discriminator with values 'HUB' | 'SPOKE'
--   aips       investment_amount NUMERIC — investment mobilised, in INR
--   spvs       (any PK — only COUNT(*) is used)
--   sips       status            workflow status including 'SUBMITTED' and
--                                'APPROVED' (RoadMap §21 approval workflow)
--
--   ⚠ trainees / industries_engaged: RoadMap.md §25 defines NO source table
--     or column for these two KPIs, so this draft returns NULL for them.
--     The DBA must define the real source (e.g. yearly intake/completion
--     metrics per ITI, and a count of distinct industry partners) and replace
--     the two NULL placeholders below. Do NOT ship with permanent NULLs and
--     do NOT substitute fake numbers.
--
-- CASTING NOTES
--   - COUNT(*) is cast to ::int so Prisma returns JS numbers (not bigint).
--   - investment is cast to ::double precision so it serialises as a JSON
--     number (values can exceed the int4 range, e.g. 12,450,000,000).
--
-- ============================================================================

SELECT
    -- Registered industry skill clusters.
    (SELECT COUNT(*)::int
       FROM clusters)                                            AS clusters,

    -- ITIs split by hub/spoke discriminator.
    (SELECT COUNT(*)::int
       FROM itis
      WHERE itis.type = 'HUB')                                   AS hub_itis,
    (SELECT COUNT(*)::int
       FROM itis
      WHERE itis.type = 'SPOKE')                                 AS spoke_itis,

    -- Partner registries.
    (SELECT COUNT(*)::int
       FROM aips)                                                AS aips,
    (SELECT COUNT(*)::int
       FROM spvs)                                                AS spvs,

    -- SIP pipeline by approval status (exact status vocabulary per §21).
    (SELECT COUNT(*)::int
       FROM sips
      WHERE sips.status = 'SUBMITTED')                           AS sip_submitted,
    (SELECT COUNT(*)::int
       FROM sips
      WHERE sips.status = 'APPROVED')                            AS sip_approved,

    -- Investment mobilised from the AIP registry (0 when no AIPs yet).
    COALESCE(
        (SELECT SUM(aips.investment_amount)::double precision
           FROM aips),
        0
    )                                                            AS investment,

    -- TODO(DBA): no source table/column defined yet (see header) — replace
    -- these two NULL placeholders with the real aggregates.
    NULL::double precision                                       AS trainees,
    NULL::double precision                                       AS industries_engaged;
