# Payroll Automation — Project Plan

Cross-checked against `Final-Payroll-Automotion-Application.drawio` (activity
diagram) and current code in `Payroll Automation/`. Two parts: Frontend
(Angular, mostly done, currently mock-backed) and Backend (Spring Boot + local
PostgreSQL, not started).

---

## Part 1 — Frontend (Angular 21, standalone + signals, zoneless, NgRx, Tailwind v4)

### 1.1 Foundation
- ✅ Done — Project scaffold, design tokens, app shell, sidebar nav, routing
- ✅ Done — Mock DB (`mock-db.ts`, 25 collections) + `MockApiService` (fake HTTP, 250ms delay)
- ✅ Done — NgRx store/effects/entity generic `createCollectionFeature` factory
- ✅ Done — Role-based module registry (`core/module-registry.ts`)

### 1.2 Auth & role flow (diagram: `Login → Valid Credentials? → Determine Role`)
- ✅ Done — Sign-in screen, reactive form, show/hide password, one-click demo fill
- ✅ Done — Static demo credentials per role (Admin/HR/Accountant/Employee)
- ✅ Done — `authGuard`, `guestGuard`, `roleGuard` (blocks unreachable modules by URL too)
- ✅ Done — Session in `sessionStorage`, survives reload
- ✅ Done — Sign-in/out written to audit trail
- ⬜ Not done — Real authentication (hashing, JWT/session token, expiry, lockout) — deferred to backend integration

### 1.3 Admin flow (diagram: Master Data / User Mgmt / Payroll Config / Reports)
- ✅ Done — Employees CRUD (list + detail), draft profile activation (Admin-only)
- ✅ Done — Organisation master data: Department, Designation, Shift, Holiday (tabbed CRUD)
- ✅ Done — Users & Roles: accounts, roles, permission matrix
- ✅ Done — Salary & Rules: Salary Structure, Tax Rule, PF Rule (tabbed)
- ⬜ Not done — "System-wide Reports" screen (diagram node `AdminReports`) — no reporting/analytics page exists yet

### 1.4 HR flow (diagram: Attendance / Leave / Overtime / Onboard / Trigger Payroll)
- ✅ Done — Attendance register, late flags, HR correction form
- ✅ Done — Leave: apply, validate, approve/reject with reason, balance movement, audit — **reference module, full submission + approval loop**
- ✅ Done — Overtime: file claim (self + on-behalf via HR), Labour-Act ceiling rules, approve/reject unlocks payroll eligibility — **second complete module**
- ✅ Done — Onboard employee (create draft profile) → notify-admin-to-activate half implemented via draft employee state
- ✅ Done — Trigger payroll cycle (lock + run engine) from HR side of Payroll Batches

### 1.5 System automation — Payroll Engine (diagram: Lock data → Calc hours → Calc leave → Gross → Deductions → Net → Generate batch)
- ✅ Done — `core/payroll-engine.ts`, pure function, matches diagram sequence exactly
- ✅ Done — Batch lifecycle: `draft → calculated → pending-approval → approved → paid`, `returned` reject path
- ✅ Done — Verified live: engine run produces payslips, gross/deductions/net totals correct

### 1.6 Accountant flow (diagram: Verify batch → Approve/Reject → Generate bank file → Process payment → Payslips → Notify)
- ✅ Done — Verify Payroll Batch, Approve/Reject with remarks, return-to-HR path
- ✅ Done — Mark batch approved/paid, generate payslips
- ⬜ Not done — "Generate Bank Transfer File" (diagram node `GenBankFile`) — no bank-file export exists
- ⬜ Not done — Real payslip PDF generation (diagram `GenPayslip`) — currently confirms + shows a mock path only
- ⬜ Not done — Real notification delivery (diagram `SendNotify`) — Notification records exist in mock DB but no actual dispatch (email/SMS/push)

### 1.7 Employee flow (diagram: Check in/out → Apply leave → View payslip)
- ✅ Done — Apply leave (see 1.4)
- ✅ Done — View/download payslip (mock PDF path)
- ⬜ Not done — Check In/Out (diagram node `CheckInOut`) — attendance page is HR-register + correction only; no self-service check-in/out exists yet (noted in PROGRESS.md as relying on a fixed seeded July 2026 cycle, no "today" concept)

### 1.8 Cross-cutting modules
- ✅ Done — Loans & Bonuses (records, recovery schedules) — **submission half (raise a loan/bonus) still missing**, see MODULE_RECIPE.md
- ✅ Done — Final Settlement (gratuity, encashment, dues) — **submission half (initiate settlement) still missing**
- ✅ Done — Change Requests model + approval — **submission half (raise a request) still missing**
- ✅ Done — Audit Log (read-only, correctly Admin-only per corrected plan)

### 1.9 Remaining frontend work (per `MODULE_RECIPE.md`, mock-data phase)
These 12 modules currently implement only the *approval* half of their flow;
completing each means adding rules file + tests + write-form modal + detail
page + audit entry, following the Leave/Overtime recipe:

| Module | Missing piece | Priority |
|---|---|---|
| Change Requests | Raise a request (simplest, model already complete) | High |
| Attendance | Employee check-in/check-out self-service + "today" concept | High |
| Employees | Onboard flow as a proper submission form (currently partial) | Medium |
| Loans & Bonuses | Raise a loan or bonus record | Medium |
| Settlements | Initiate a settlement (trigger via last-working-day) | Medium |
| Salary & Rules, Organisation, Users & Roles | Full master-data CRUD forms (create/edit, not just view) | Medium |
| Admin Reports | New page — system-wide reports (not in MODULE_RECIPE, but required by diagram) | Low (can wait for backend data) |
| Bank transfer file export | New feature off Accountant's approve-batch flow | Low |
| Real PDF generation for payslips | Needs backend or client PDF lib | Low |
| Notification dispatch | Needs backend (email/SMS) | Low |

### 1.10 Known frontend limitations (by design, mock phase)
- No real backend — `MockApiService` simulates HTTP over an in-memory `structuredClone`; all data resets on page reload
- Credentials are static, shipped in the JS bundle, no hashing
- August payroll batch reuses July's attendance (no August data seeded)
- These are expected to be resolved once backend integration (Part 2) replaces the mock layer

---

## Part 2 — Backend (Spring Boot + local PostgreSQL) — Not started

Goal: replace `MockApiService`/`mock-db.ts` with real REST endpoints backed by
PostgreSQL, running locally, while keeping the Angular app's NgRx store/effects
shape (minimal frontend rewrite — mostly swap the API layer).

### 2.1 Environment & project setup
- ⬜ Not done — Install/verify local PostgreSQL, create `payroll_db` database
- ⬜ Not done — Spring Boot project init (Spring Initializr): Web, Data JPA, Validation, Security, PostgreSQL Driver, Lombok
- ⬜ Not done — `application.yml` — local datasource config, profiles (`dev`/`local`)
- ⬜ Not done — Flyway or Liquibase for schema migrations (recommended over `ddl-auto`)

### 2.2 Data modeling (mirror the 25 mock collections)
- ⬜ Not done — Entities: Company, Department, Designation, Shift, Holiday, Employee, AppUser, Role, Permission, Attendance, LeaveRequest, LeaveBalance, Overtime, PayrollBatch, Payslip, Payment, SalaryStructure, TaxRule, PFRule, LoanRecord, BonusRecord, FinalSettlement, ChangeRequest, AuditLog, Notification
- ⬜ Not done — JPA relationships matching the class diagram (Employee ↔ Department/Designation/Shift, PayrollBatch ↔ Payslip ↔ Payment, etc.)
- ⬜ Not done — DB migration scripts (Flyway `V1__init.sql` etc.)
- ⬜ Not done — Seed data script mirroring `mock-db/seed/*.ts` (org, pay, time, governance) for local dev/testing

### 2.3 Authentication & authorization
- ⬜ Not done — Real login endpoint, password hashing (BCrypt), replace static demo credentials
- ⬜ Not done — Session or JWT-based auth (decide token strategy)
- ⬜ Not done — Role-based access control on API endpoints matching `roleGuard` rules already defined in frontend (Admin/HR/Accountant/Employee)
- ⬜ Not done — Account activation endpoint (Admin-only, draft → active)

### 2.4 Core REST APIs (one controller/service/repo set per module)
- ⬜ Not done — Employees API (CRUD, draft/activate)
- ⬜ Not done — Organisation API (Department/Designation/Shift/Holiday CRUD)
- ⬜ Not done — Users & Roles API (accounts, roles, permission matrix)
- ⬜ Not done — Attendance API (register, HR correction, employee check-in/out)
- ⬜ Not done — Leave API (apply, approve/reject, balance calc — port `leave-rules.ts` logic to backend service)
- ⬜ Not done — Overtime API (claim, approve/reject, ceiling validation — port `overtime-rules.ts`)
- ⬜ Not done — Payroll Batch API + **Payroll Engine service** (port `payroll-engine.ts` calculation logic to Java: lock → hours → leave impact → gross → deductions → net → generate batch)
- ⬜ Not done — Payslips API (list/detail, PDF generation — real, e.g. via OpenPDF/iText)
- ⬜ Not done — Salary & Rules API (Salary Structure, Tax Rule, PF Rule CRUD)
- ⬜ Not done — Loans & Bonuses API
- ⬜ Not done — Settlements API
- ⬜ Not done — Change Requests API
- ⬜ Not done — Audit Log API (write on every mutating action, matching frontend's `AuditLogService` pattern)
- ⬜ Not done — Notifications API + real dispatch (email at minimum)
- ⬜ Not done — Bank transfer file generation endpoint (diagram `GenBankFile`)
- ⬜ Not done — Admin reports/analytics endpoints (diagram `AdminReports`)

### 2.5 Frontend–backend integration
- ⬜ Not done — Replace `MockApiService` calls with real `HttpClient` calls to Spring Boot endpoints
- ⬜ Not done — Environment config (`environment.ts`) pointing to `http://localhost:<port>/api`
- ⬜ Not done — Replace `sessionStorage` demo session with real token/session handling
- ⬜ Not done — CORS config on Spring Boot for local Angular dev server
- ⬜ Not done — Error handling / loading states aligned with real network latency (vs fixed 250ms mock delay)

### 2.6 Testing & quality (backend)
- ⬜ Not done — Unit tests for payroll engine logic (JUnit) — mirror the 15+13 rules tests already proven on the frontend
- ⬜ Not done — Integration tests (Spring Boot Test + Testcontainers or local Postgres) for API endpoints
- ⬜ Not done — API documentation (springdoc-openapi / Swagger UI)

---

## Suggested order of work

1. Finish frontend submission-half modules (§1.9) while still on mock data — cheap to iterate, no backend dependency
2. Stand up Spring Boot + local PostgreSQL skeleton, schema + seed (§2.1–2.2)
3. Auth API first (§2.3) — unblocks everything else needing role context
4. Port Leave + Overtime (already fully modeled on frontend, rules are pure functions — straightforward to port) as the first vertical slice proving frontend↔backend wiring
5. Payroll Engine port (§2.4, highest complexity — reuse the exact sequence already implemented and verified in `payroll-engine.ts`)
6. Remaining CRUD modules
7. Reports, bank file export, real PDF/notification dispatch (lowest priority, diagram-complete items)
