Absolutely bro 😎. Let’s make this **exactly like a Cline implementation specification**: every API, what it does, which file owns it, and the order you should build it.

One important distinction first:

> The NIC document explicitly specifies only some endpoint names (`/home/kpis`, ITI APIs, and dashboard APIs). For the other modules, the document specifies the required functionality/data, but **not exact endpoint names**. So below I’m giving you a consistent REST API design for those modules rather than pretending NIC mandated those exact URLs.  

---

# PM SETU AP — BACKEND API + FILE STRUCTURE

## 1. Recommended backend stack

For the backend, use:

```text
Node.js
Express.js
TypeScript
PostgreSQL
Prisma ORM
JWT authentication
Zod validation
Multer / object-storage SDK for files
Swagger / OpenAPI
```

The NIC architecture calls for a REST API/JSON backend, PostgreSQL or an approved equivalent, CMS/RBAC/workflow/versioning/audit logging, and object/file storage with database metadata. 

---

# 2. FINAL PROJECT STRUCTURE

Create your backend like this:

```text
PM-SETU/
│
├── backend/
│   │
│   ├── src/
│   │   │
│   │   ├── app.ts
│   │   ├── server.ts
│   │   │
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── database.ts
│   │   │   └── storage.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rbac.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   ├── upload.middleware.ts
│   │   │   └── rateLimit.middleware.ts
│   │   │
│   │   ├── modules/
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.schema.ts
│   │   │   │   └── auth.types.ts
│   │   │   │
│   │   │   ├── home/
│   │   │   │   ├── home.controller.ts
│   │   │   │   ├── home.service.ts
│   │   │   │   ├── home.routes.ts
│   │   │   │   └── home.schema.ts
│   │   │   │
│   │   │   ├── clusters/
│   │   │   │   ├── cluster.controller.ts
│   │   │   │   ├── cluster.service.ts
│   │   │   │   ├── cluster.routes.ts
│   │   │   │   ├── cluster.schema.ts
│   │   │   │   └── cluster.types.ts
│   │   │   │
│   │   │   ├── itis/
│   │   │   │   ├── iti.controller.ts
│   │   │   │   ├── iti.service.ts
│   │   │   │   ├── iti.routes.ts
│   │   │   │   ├── iti.schema.ts
│   │   │   │   └── iti.types.ts
│   │   │   │
│   │   │   ├── aips/
│   │   │   ├── spvs/
│   │   │   ├── sips/
│   │   │   ├── governance/
│   │   │   ├── documents/
│   │   │   ├── news/
│   │   │   ├── gallery/
│   │   │   ├── dashboard/
│   │   │   ├── search/
│   │   │   ├── banners/
│   │   │   ├── contact/
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   ├── approvals/
│   │   │   └── audit/
│   │   │
│   │   ├── routes/
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── pagination.ts
│   │   │   ├── response.ts
│   │   │   ├── password.ts
│   │   │   └── logger.ts
│   │   │
│   │   └── docs/
│   │       └── swagger.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── tests/
│   │
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
```

---

# 3. HOW EVERY REQUEST FLOWS

This is the pattern you should use **for every module**:

```text
HTTP Request
     ↓
routes.ts
     ↓
middleware
     ↓
controller.ts
     ↓
service.ts
     ↓
Prisma
     ↓
PostgreSQL
     ↓
service
     ↓
controller
     ↓
JSON Response
```

For example:

```text
GET /api/v1/clusters/1
          ↓
cluster.routes.ts
          ↓
cluster.controller.ts
          ↓
cluster.service.ts
          ↓
Prisma
          ↓
PostgreSQL
```

### Don't do this ❌

```text
routes.ts
   ↓
SQL query
   ↓
response
```

Keep business logic out of routes.

---

# 4. API BASE URL

Everything should use:

```text
/api/v1
```

So:

```text
/api/v1/clusters
/api/v1/itis
/api/v1/aips
/api/v1/spvs
```

---

# 🏠 5. HOME APIs

NIC explicitly requires:

```http
GET /api/v1/home/kpis
```

The homepage counters must be database/API driven rather than hard-coded. 

### Files

```text
modules/home/
├── home.controller.ts
├── home.service.ts
├── home.routes.ts
└── home.schema.ts
```

### APIs

```http
GET /api/v1/home
GET /api/v1/home/kpis
GET /api/v1/home/banners
GET /api/v1/home/milestones
```

### `home.routes.ts`

```text
GET /             → getHomeData()
GET /kpis         → getHomeKPIs()
GET /banners      → getHomeBanners()
GET /milestones   → getMilestones()
```

### KPI response

```json
{
  "clusters": 16,
  "hub_itis": 16,
  "spoke_itis": 189,
  "aips": 12,
  "spvs": 10,
  "sip_submitted": 6,
  "sip_approved": 4,
  "investment": 12450000000,
  "trainees": 28540,
  "industries_engaged": 12
}
```

Don't use the screenshot numbers as permanent data. Those should come from the actual database/MIS.

---

# 🗺️ 6. CLUSTER APIs

This is one of the **core modules**. NIC specifies map/list/district/sector views and the cluster master data. 

Create:

```text
modules/clusters/
├── cluster.controller.ts
├── cluster.service.ts
├── cluster.routes.ts
├── cluster.schema.ts
└── cluster.types.ts
```

## Public APIs

```http
GET    /api/v1/clusters
GET    /api/v1/clusters/:id
GET    /api/v1/clusters/:id/summary
GET    /api/v1/clusters/:id/itis
GET    /api/v1/clusters/:id/aip
GET    /api/v1/clusters/:id/spv
GET    /api/v1/clusters/:id/sip
GET    /api/v1/clusters/:id/documents
GET    /api/v1/clusters/:id/gallery
GET    /api/v1/clusters/map
```

## Filtering

```http
GET /api/v1/clusters?district=Visakhapatnam
GET /api/v1/clusters?sector=Manufacturing
GET /api/v1/clusters?status=approved
GET /api/v1/clusters?search=Visakhapatnam
```

## Admin APIs

```http
POST   /api/v1/admin/clusters
PATCH  /api/v1/admin/clusters/:id
DELETE /api/v1/admin/clusters/:id
```

### `cluster.routes.ts`

```text
GET /
GET /map
GET /:id
GET /:id/summary
GET /:id/itis
GET /:id/aip
GET /:id/spv
GET /:id/sip
GET /:id/documents
GET /:id/gallery

POST /
PATCH /:id
DELETE /:id
```

---

# 🎓 7. ITI APIs

NIC explicitly specifies these three:

```http
GET /api/v1/itis
GET /api/v1/itis/{id}
GET /api/v1/clusters/{clusterId}/itis
```



Create:

```text
modules/itis/
├── iti.controller.ts
├── iti.service.ts
├── iti.routes.ts
├── iti.schema.ts
└── iti.types.ts
```

## Public

```http
GET /api/v1/itis
GET /api/v1/itis/:id
GET /api/v1/clusters/:clusterId/itis
```

## Filtering

```http
GET /api/v1/itis?district=Kakinada
GET /api/v1/itis?type=HUB
GET /api/v1/itis?type=SPOKE
GET /api/v1/itis?cluster_id=1
GET /api/v1/itis?search=Government ITI
```

## Admin

```http
POST   /api/v1/admin/itis
PATCH  /api/v1/admin/itis/:id
DELETE /api/v1/admin/itis/:id
```

---

# 🏭 8. AIP APIs

The AIP registry is required to contain company, sector, cluster, partnership, investment, SIP/SPV information, etc. 

Create:

```text
modules/aips/
├── aip.controller.ts
├── aip.service.ts
├── aip.routes.ts
├── aip.schema.ts
└── aip.types.ts
```

## Public

```http
GET /api/v1/aips
GET /api/v1/aips/:id
GET /api/v1/clusters/:clusterId/aips
```

## Admin

```http
POST   /api/v1/admin/aips
PATCH  /api/v1/admin/aips/:id
DELETE /api/v1/admin/aips/:id
```

## Search/filter

```http
GET /api/v1/aips?sector=Manufacturing
GET /api/v1/aips?cluster_id=1
GET /api/v1/aips?status=approved
GET /api/v1/aips?search=Jindal
```

---

# 🏢 9. SPV APIs

SPV must be separate from AIP and support lifecycle states such as:

```text
Proposed
Under Formation
Incorporated
Operational
```



Create:

```text
modules/spvs/
├── spv.controller.ts
├── spv.service.ts
├── spv.routes.ts
├── spv.schema.ts
└── spv.types.ts
```

## Public

```http
GET /api/v1/spvs
GET /api/v1/spvs/:id
GET /api/v1/clusters/:clusterId/spv
```

## Admin

```http
POST   /api/v1/admin/spvs
PATCH  /api/v1/admin/spvs/:id
DELETE /api/v1/admin/spvs/:id
```

## Status

```http
PATCH /api/v1/admin/spvs/:id/status
```

---

# 📋 10. SIP APIs

SIP is a separate system entity with submission and approval workflow. 

Create:

```text
modules/sips/
├── sip.controller.ts
├── sip.service.ts
├── sip.routes.ts
├── sip.schema.ts
└── sip.types.ts
```

## Public

```http
GET /api/v1/sips
GET /api/v1/sips/:id
GET /api/v1/clusters/:clusterId/sip
```

## Admin

```http
POST   /api/v1/admin/sips
GET    /api/v1/admin/sips
GET    /api/v1/admin/sips/:id
PATCH  /api/v1/admin/sips/:id
DELETE /api/v1/admin/sips/:id
```

## Workflow APIs

```http
POST /api/v1/admin/sips/:id/submit
POST /api/v1/admin/sips/:id/review
POST /api/v1/admin/sips/:id/request-revision
POST /api/v1/admin/sips/:id/recommend
POST /api/v1/admin/sips/:id/approve
POST /api/v1/admin/sips/:id/reject
POST /api/v1/admin/sips/:id/implement
```

Workflow:

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_SCRUTINY
  ↓
REVISION_REQUESTED
  ↓
RECOMMENDED
  ↓
APPROVED
  ↓
IMPLEMENTATION
```

This workflow comes directly from the NIC specification. 

---

# 👥 11. GOVERNANCE APIs

The governance directory should be dynamic so personnel changes don't require source-code changes. 

Create:

```text
modules/governance/
├── governance.controller.ts
├── governance.service.ts
├── governance.routes.ts
├── governance.schema.ts
└── governance.types.ts
```

## Public

```http
GET /api/v1/governance
GET /api/v1/governance/members
GET /api/v1/governance/members/:id
GET /api/v1/governance/steering-committee
GET /api/v1/governance/pmu
GET /api/v1/governance/officers
GET /api/v1/governance/cluster-officers
GET /api/v1/governance/spv
GET /api/v1/governance/contacts
```

## Admin

```http
POST   /api/v1/admin/governance/members
PATCH  /api/v1/admin/governance/members/:id
DELETE /api/v1/admin/governance/members/:id
```

---

# 📄 12. DOCUMENT APIs

NIC calls for a proper DMS/document repository with metadata, filtering, download, archive and version history. 

Create:

```text
modules/documents/
├── document.controller.ts
├── document.service.ts
├── document.routes.ts
├── document.schema.ts
├── document.types.ts
└── document.storage.ts
```

## Public

```http
GET /api/v1/documents
GET /api/v1/documents/:id
GET /api/v1/documents/:id/download
GET /api/v1/documents/:id/versions
```

## Filters

```http
GET /api/v1/documents?type=GO
GET /api/v1/documents?cluster_id=1
GET /api/v1/documents?year=2026
GET /api/v1/documents?department=DET
GET /api/v1/documents?keyword=PMSETU
GET /api/v1/documents?from=2026-01-01&to=2026-09-01
```

## Admin

```http
POST   /api/v1/admin/documents
PATCH  /api/v1/admin/documents/:id
DELETE /api/v1/admin/documents/:id

POST /api/v1/admin/documents/:id/publish
POST /api/v1/admin/documents/:id/archive
POST /api/v1/admin/documents/:id/version
```

---

# 📰 13. NEWS APIs

NIC defines news fields such as title, summary, full content, date, category, cluster, thumbnail, attachments and publish/expiry dates. 

Create:

```text
modules/news/
├── news.controller.ts
├── news.service.ts
├── news.routes.ts
├── news.schema.ts
└── news.types.ts
```

## Public

```http
GET /api/v1/news
GET /api/v1/news/:id
GET /api/v1/news/latest
```

## Admin

```http
POST   /api/v1/admin/news
PATCH  /api/v1/admin/news/:id
DELETE /api/v1/admin/news/:id

POST /api/v1/admin/news/:id/publish
POST /api/v1/admin/news/:id/archive
```

---

# 🖼️ 14. GALLERY APIs

The specification calls for photo gallery, video gallery and press releases. 

Create:

```text
modules/gallery/
├── gallery.controller.ts
├── gallery.service.ts
├── gallery.routes.ts
├── gallery.schema.ts
└── gallery.types.ts
```

## Public

```http
GET /api/v1/gallery
GET /api/v1/gallery/:id
GET /api/v1/gallery/photos
GET /api/v1/gallery/videos
```

## Admin

```http
POST   /api/v1/admin/gallery
PATCH  /api/v1/admin/gallery/:id
DELETE /api/v1/admin/gallery/:id
```

---

# 🎯 15. BANNER APIs

The homepage banner is supposed to be CMS managed, including desktop/mobile image, title, dates, CTA, ordering and approval information. 

Create:

```text
modules/banners/
├── banner.controller.ts
├── banner.service.ts
├── banner.routes.ts
└── banner.schema.ts
```

## Public

```http
GET /api/v1/banners
GET /api/v1/banners/active
```

## Admin

```http
POST   /api/v1/admin/banners
PATCH  /api/v1/admin/banners/:id
DELETE /api/v1/admin/banners/:id

POST /api/v1/admin/banners/:id/publish
POST /api/v1/admin/banners/:id/archive
```

---

# 📊 16. DASHBOARD APIs

**Do not make this your first task.**

The NIC document explicitly says the dashboard should be implemented after the source systems/reporting mechanism are established. 

But prepare these routes:

```http
GET /api/v1/dashboard/state
GET /api/v1/dashboard/clusters
GET /api/v1/dashboard/clusters/:id
GET /api/v1/dashboard/finance
GET /api/v1/dashboard/training
GET /api/v1/dashboard/placements
```

These endpoint names are explicitly specified by NIC. 

Create:

```text
modules/dashboard/
├── dashboard.controller.ts
├── dashboard.service.ts
├── dashboard.routes.ts
└── dashboard.schema.ts
```

Later add:

```http
GET /api/v1/dashboard/physical-progress
GET /api/v1/dashboard/academic-progress
GET /api/v1/dashboard/industry-outcomes
GET /api/v1/dashboard/financial-progress
GET /api/v1/dashboard/cluster/:id
GET /api/v1/dashboard/iti/:id
```

Dashboard hierarchy:

```text
State
 ↓
Cluster
 ↓
Hub ITI
 ↓
Spoke ITI
 ↓
Activity
```



---

# 🔎 17. SEARCH API

NIC requires one portal-wide search covering:

```text
Cluster
ITI
AIP
SPV
GO
RFP
SIP
News
Circular
District
```

with filters such as category, cluster, district, year, date and document type. 

Create:

```text
modules/search/
├── search.controller.ts
├── search.service.ts
├── search.routes.ts
└── search.schema.ts
```

API:

```http
GET /api/v1/search?q=visakhapatnam
```

Filters:

```http
GET /api/v1/search?q=ITI&type=iti
GET /api/v1/search?q=cluster&district=Visakhapatnam
GET /api/v1/search?q=PMSETU&year=2026
```

---

# 🔐 18. AUTH APIs

Public users don't need accounts for general information. Administrative access requires RBAC. 

Create:

```text
modules/auth/
├── auth.controller.ts
├── auth.service.ts
├── auth.routes.ts
├── auth.schema.ts
└── auth.types.ts
```

## APIs

```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
POST /api/v1/auth/change-password
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

---

# 👮 19. USER APIs

Create:

```text
modules/users/
├── user.controller.ts
├── user.service.ts
├── user.routes.ts
└── user.schema.ts
```

```http
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
POST   /api/v1/admin/users
PATCH  /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id

PATCH /api/v1/admin/users/:id/status
PATCH /api/v1/admin/users/:id/roles
```

---

# 🛂 20. ROLE / PERMISSION APIs

NIC specifies RBAC roles including:

```text
Super Administrator
State PMU Admin
DET Content Admin
Cluster Admin
Hub ITI User
Spoke ITI User
AIP User
SPV User
Dashboard Viewer
Approving Authority
```

 

Create:

```text
modules/roles/
├── role.controller.ts
├── role.service.ts
├── role.routes.ts
└── role.schema.ts
```

```http
GET    /api/v1/admin/roles
GET    /api/v1/admin/roles/:id
POST   /api/v1/admin/roles
PATCH  /api/v1/admin/roles/:id
DELETE /api/v1/admin/roles/:id

GET /api/v1/admin/permissions
```

---

# 🔄 21. APPROVAL APIs

Government content follows:

```text
Content Creator
      ↓
Department Reviewer
      ↓
Approving Officer
      ↓
Publish
      ↓
Archive / Version
```

And transactions need user, time, old value, new value, approval status and audit metadata. 

Create:

```text
modules/approvals/
├── approval.controller.ts
├── approval.service.ts
├── approval.routes.ts
└── approval.schema.ts
```

APIs:

```http
GET /api/v1/admin/approvals
GET /api/v1/admin/approvals/:id

POST /api/v1/admin/approvals/:id/submit
POST /api/v1/admin/approvals/:id/review
POST /api/v1/admin/approvals/:id/approve
POST /api/v1/admin/approvals/:id/reject
POST /api/v1/admin/approvals/:id/request-revision
```

---

# 📝 22. AUDIT APIs

Create:

```text
modules/audit/
├── audit.controller.ts
├── audit.service.ts
└── audit.routes.ts
```

```http
GET /api/v1/admin/audit-logs
GET /api/v1/admin/audit-logs/:id
```

Example:

```json
{
  "user_id": 12,
  "action": "UPDATE",
  "entity": "CLUSTER",
  "entity_id": 4,
  "old_value": {},
  "new_value": {},
  "timestamp": "2026-09-05T10:30:00Z",
  "approval_status": "PENDING"
}
```

---

# 📬 23. CONTACT API

The public portal has a contact/support section.

Create:

```text
modules/contact/
├── contact.controller.ts
├── contact.service.ts
├── contact.routes.ts
└── contact.schema.ts
```

```http
POST /api/v1/contact
```

Admin:

```http
GET    /api/v1/admin/contact/messages
GET    /api/v1/admin/contact/messages/:id
PATCH  /api/v1/admin/contact/messages/:id
```

Since this is a public form, apply validation/rate limiting/CAPTCHA as required. NIC specifically calls for CAPTCHA on public forms and security controls around the portal. 

---

# 📁 24. FILE UPLOAD API

Don't make a giant generic:

```text
POST /upload
```

Instead keep file handling behind the relevant module.

For example:

```http
POST /api/v1/admin/documents/upload
POST /api/v1/admin/gallery/upload
POST /api/v1/admin/news/:id/attachments
POST /api/v1/admin/banners/:id/images
```

Files:

```text
config/storage.ts
middleware/upload.middleware.ts

modules/documents/document.storage.ts
modules/gallery/gallery.storage.ts
modules/news/news.storage.ts
modules/banners/banner.storage.ts
```

NIC requires object/file storage plus database metadata. 

---

# 🗃️ 25. DATABASE MODELS

Your `prisma/schema.prisma` should eventually contain roughly:

```text
User
Role
Permission
UserRole
RolePermission

Banner

Cluster
ITI

AIP
SPV
SIP

GovernanceMember

Document
DocumentVersion

News
GalleryItem

Approval
AuditLog

ContactMessage

DashboardMetric
```

Relationships:

```text
Cluster
 ├── ITIs
 ├── AIP
 ├── SPV
 └── SIP

AIP
 ├── Cluster
 ├── SPV
 └── SIP

SPV
 ├── Cluster
 └── SIP

SIP
 ├── Cluster
 └── AIP
```

---

# 🧩 26. ROUTE REGISTRATION

All those individual routes eventually connect here:

### `src/routes/index.ts`

```text
/api/v1/auth
/api/v1/home
/api/v1/clusters
/api/v1/itis
/api/v1/aips
/api/v1/spvs
/api/v1/sips
/api/v1/governance
/api/v1/documents
/api/v1/news
/api/v1/gallery
/api/v1/banners
/api/v1/dashboard
/api/v1/search
/api/v1/contact

/api/v1/admin/users
/api/v1/admin/roles
/api/v1/admin/approvals
/api/v1/admin/audit-logs
```

Then:

```text
src/app.ts
      ↓
src/routes/index.ts
```

---

# 🧱 27. MIDDLEWARE ORDER

Your `app.ts` should conceptually work like:

```text
Request
 ↓
Helmet / security headers
 ↓
CORS
 ↓
Rate limiter
 ↓
Body parser
 ↓
Logger
 ↓
Routes
 ↓
Authentication
 ↓
RBAC
 ↓
Validation
 ↓
Controller
 ↓
Service
 ↓
Database
 ↓
Error Handler
```

Security is explicitly required by the NIC specification, including HTTPS/TLS, WAF, secure API authentication, OWASP controls, SQL injection/XSS/CSRF protection, file restrictions, audit logging, account lockout and privileged-user MFA where supported.  

---

# 🚦 28. BUT DON'T BUILD ALL OF THIS AT ONCE

This is the part I **really** want you to follow.

NIC's actual release order is:

```text
RELEASE 1
Website Launch
        ↓
RELEASE 2
Dynamic Registers
        ↓
RELEASE 3
Management Dashboard
        ↓
RELEASE 4
External Integration
        ↓
RELEASE 5
Enhanced Analytics
```



So your coding order should be:

---

## 🔵 BACKEND PHASE 1 — FOUNDATION

```text
[ ] Create backend/
[ ] TypeScript
[ ] Express
[ ] PostgreSQL
[ ] Prisma
[ ] Environment config
[ ] Logger
[ ] Error handler
[ ] Validation
[ ] API versioning
[ ] Swagger
[ ] Git setup
```

---

# 🟢 BACKEND PHASE 2 — CORE DATA

Build in this order:

```text
[ ] Cluster
      ↓
[ ] ITI
      ↓
[ ] AIP
      ↓
[ ] SPV
      ↓
[ ] SIP
```

Because they depend on each other.

---

# 🟡 BACKEND PHASE 3 — PUBLIC CONTENT

```text
[ ] Home
[ ] Banner
[ ] Governance
[ ] Documents
[ ] News
[ ] Gallery
[ ] Contact
```

---

# 🟠 BACKEND PHASE 4 — ADMIN

```text
[ ] Auth
[ ] Users
[ ] Roles
[ ] Permissions
[ ] RBAC
[ ] CMS CRUD
[ ] Approval workflow
[ ] Audit logs
```

---

# 🔴 BACKEND PHASE 5 — SEARCH

```text
[ ] Global search
[ ] Filters
[ ] Pagination
[ ] Sorting
```

---

# 🟣 BACKEND PHASE 6 — DASHBOARD

```text
[ ] Dashboard repository
[ ] State metrics
[ ] Cluster metrics
[ ] Physical progress
[ ] Training
[ ] Apprenticeship
[ ] Placement
[ ] Finance
```

Only after the source/reporting mechanism is established. 

---

# ⚫ BACKEND PHASE 7 — INTEGRATIONS

Later:

```text
DET MIS
ITI Management Systems
Student/Training MIS
Apprenticeship
Placement MIS
Financial Management
AP Government systems
DGT/MSDE
SMS
Email
GIS
```

The integration layer should communicate through APIs, **not give external systems direct database access**. 

---

# 🧠 YOUR BACKEND ARCHITECTURE IN ONE IMAGE

```text
                         PM SETU BACKEND
                              │
                    ┌─────────┴─────────┐
                    │    REST API       │
                    │    /api/v1        │
                    └─────────┬─────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
    PUBLIC                  ADMIN                DASHBOARD
       │                      │                      │
       ↓                      ↓                      ↓
   Home                  Authentication         Metrics
   Clusters              Users                  Finance
   ITIs                  Roles                  Training
   AIPs                  Permissions            Placement
   SPVs                  CMS                    Progress
   SIPs                  Approval
   Docs                  Audit
   News
   Gallery
       │                      │                      │
       └──────────────────────┼──────────────────────┘
                              ↓
                         SERVICE LAYER
                              ↓
                           PRISMA
                              ↓
                         PostgreSQL
                              │
                 ┌────────────┴────────────┐
                 ↓                         ↓
           File Storage              Future MIS Layer
                                           ↓
                         DET / ITI / Finance /
                         Apprenticeship / GIS
```

---

## 🔥 And your first coding target

**Do NOT start by creating 100 route files.**

Start here:

```text
backend/
└── src/
    ├── app.ts
    ├── server.ts
    │
    ├── config/
    │   ├── env.ts
    │   └── database.ts
    │
    ├── middleware/
    │   ├── error.middleware.ts
    │   └── validate.middleware.ts
    │
    └── modules/
        ├── clusters/
        ├── itis/
        ├── aips/
        ├── spvs/
        └── sips/
```

Then make **this first API actually work**:

```http
GET /api/v1/clusters
```

Then:

```http
GET /api/v1/clusters/:id
```

Then:

```http
GET /api/v1/clusters/:clusterId/itis
```

Then ITI:

```http
GET /api/v1/itis
GET /api/v1/itis/:id
```

Then continue AIP → SPV → SIP.

That gives you the **actual backbone of the PM SETU portal** before you drown yourself in CMS, RBAC, dashboards and 47 different kinds of government PDFs. 😂
