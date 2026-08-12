# Progress tracker — PayFlow (HR & Payroll)

Companion to `PLAN.md`. Last updated: 2026-08-08.

## Status

All 13 modules are navigable and implemented — there are no stub pages. Build
clean, 29 tests passing, verified in a browser at 1440 px and 390 px.

**Leave and Overtime are complete** — Leave is the reference, Overtime is the
worked second example proving the recipe transfers. See **`MODULE_RECIPE.md`**,
the handover document for finishing the remaining eleven.

The distinction: the other twelve implement the *approval* half of their flow but
not the *submission* half. Leave now has both — apply (with validation), review,
approve or reject with a reason, balance movement, and an audit entry per write.

| Area | State |
|---|---|
| Foundation: tokens, shell, routing, mock DB, NgRx factory | ✅ |
| Sign-in, guards, session, sign-out | ✅ verified live |
| Role resolution from the account (Admin / HR / Accountant / Employee) | ✅ verified live |
| Employees, Organisation, Users & Roles | ✅ |
| Attendance, Leave, Overtime | ✅ |
| Payroll batches + engine, Payslips | ✅ engine verified live |
| Salary & Rules, Loans & Bonuses, Final Settlement | ✅ |
| Change Requests, Audit Log | ✅ |

## Running it

nvm does not load in non-interactive shells, so pin PATH first:

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:/usr/bin:/bin:$PATH"
cd "/home/yasir-araphat/yasir/temp/cob/idb/M05_XML_UML_Analysis/Activity DIagrams/hr-payroll/payroll-app"

ng serve --port 4270
ng build                 # 94.16 kB initial transfer, per-page lazy chunks
ng test --watch=false    # 4 passing
```

The garments ERP uses port 4260, so both can run at once.

## Sign-in

| Role | Username | Password |
|---|---|---|
| Admin | `farhana.islam` | `Admin@2026` |
| HR | `nasrin.akter` | `Hr@2026` |
| Accountant | `rakib.hasan` | `Accounts@2026` |
| Employee | `tanvir.ahmed` | `Staff@2026` |

Also listed on the sign-in screen with one-click fill.

## What was verified in the browser

- Visiting any URL while signed out redirects to `/login?next=<url>`
- Wrong password → "Invalid username or password", password field cleared,
  username kept
- Valid HR sign-in → lands on the remembered `next` target, header shows the
  user menu, sidebar shows only HR's modules
- HR typing `/users` (Admin-only) → bounced back to `/dashboard` by `roleGuard`
- Session survived a full page reload (`sessionStorage`)
- Sign out → `/login`; signing back in and opening the audit log showed the
  new **Signed in** / **Signed out** rows under the Authentication module
  (10 seeded events → 12)
- HR dashboard: 4 payroll cycles with real totals, approval queue aggregating
  leave + overtime + change requests
- Draft batch PR-2026-08 → clicked **Lock cycle and run engine** → 13 payslips
  generated, gross ৳804,233, deductions ৳162,300, net ৳641,933, status advanced
  `draft → calculated`, engine checklist ticked, button became
  **Submit for verification**
- Role switch to Accountant: sidebar collapsed to the Payroll group only,
  dashboard swapped to accountant KPIs, header identity changed
- 390 px: hamburger with the word "Menu", search collapsed to an icon,
  KPI tiles 1-col, CTA full-width

## Bugs found and fixed during verification

1. **Night-shift hours went negative.** Shift 3 ends 23:00; overtime pushed
   check-out past midnight, `addMinutes` wrapped it to `00:30`, and
   `checkOut − checkIn` went negative — one employee showed 47 h against ~190 h
   for everyone else. Fixed in `seed/time.ts` by rolling the end time forward a
   day when it lands before the start.
2. **Role dropdown showed the wrong role.** `[value]` on a `<select>` whose
   `<option>`s come from `@for` loses to the options rendering afterwards, so it
   always displayed the first entry. Fixed with `[selected]="name === role()"`
   per option.
3. **Backticks inside a template literal.** An HTML comment I added inside a
   component's backtick template contained backticks, which terminated the
   string and produced a cascade of confusing TS errors. Never put a backtick in
   a comment inside an inline Angular template.

## Review pass (2026-08-09): implementation vs PLAN.md

Eleven findings. All code findings fixed; the plan was corrected where it
described behaviour the code did not have.

**Fixed in code**

1. **"My profile" was a dead link for Employee and Accountant.** The header links
   to `/employees/:id`, but that module is Admin/HR only, so `roleGuard` silently
   bounced it to the dashboard. `roleGuard` now permits anyone to open *their own*
   employee record — "view profile" in the diagram.
2. **Same defect class, two more places.** The detail page's "Employee register"
   back link and the breadcrumb's module crumb both pointed into a module the
   viewer might not be allowed to open. The back link is now conditional and the
   crumb renders as plain text when the role cannot follow it.
3. **The engine trusted `payrollEligible` alone.** A rejected overtime claim
   carrying a stale flag would have been paid. It now requires
   `status === 'approved'` as well, with a regression test that feeds the engine
   a contradictory row and asserts the payslip does not move.

**Corrected in PLAN.md** — the plan claimed 22 collections (there are 25), gave
HR "Payroll (read)" when HR actually locks, runs and submits a cycle, credited HR
with account activation that is Admin-only, put Audit Log in HR's reach when it
is Admin-only, and omitted Change Requests from the Employee row.

**Gap closed for one module** — the review found that the app implemented the
approval half of every flow and none of the submission half. Leave has since been
completed end to end as the reference implementation (see below); the remaining
twelve are listed with their missing action in `MODULE_RECIPE.md`.

## Leave: the complete reference module (2026-08-09)

Built to be copied. New files under `src/app/features/leave/`:

- `leave-rules.ts` — pure validation and balance arithmetic, no Angular imports
- `leave-rules.spec.ts` — 15 tests, no TestBed needed
- `leave-form.ts` — apply-for-leave modal, live day count and balance preview
- `leave-detail.ts` — the record plus the approve/reject decision

Plus three pieces the other modules inherit: `shared/ui/modal.ts` (CDK focus
trap, Escape, backdrop dismiss), `shared/ui/form-field.ts`, and
`core/audit-log.ts` (`AuditLogService`, now also used by sign-in/out).

Rules enforced: dates in order, reason at least 10 characters, request cannot
exceed the remaining balance, unpaid leave exempt from that check, no overlap
with a pending or approved request (rejected ones free their dates again),
rejection requires a reason, and approve/reverse is symmetric.

**Walked end to end in the browser:** signed in as `tanvir.ahmed` → applied for
20 days of Casual leave against a balance of 7 → blocked with "Only 7 day(s) …
this request is 20" → narrowed to 3 days → submitted → signed in as
`nasrin.akter` → the request appeared in HR's dashboard queue → opened it →
rejecting with an empty reason was blocked → approved → **balance moved from
taken 3 / remaining 7 to taken 6 / remaining 4**, decided-by stamped.

## Overtime: the second complete module (2026-08-09)

Built by following `MODULE_RECIPE.md`, which is how the recipe was validated.
New files under `src/app/features/overtime/`: `overtime-rules.ts`,
`overtime-rules.spec.ts` (13 tests), `overtime-form.ts`, `overtime-detail.ts`.
`Overtime` gained `reason` and `rejectionReason` fields for parity with leave.

Where it deliberately differs from Leave, and why that is useful to copy:

- **Files on behalf.** HR and Admin get an employee picker limited to
  overtime-eligible active staff; an employee can only claim for themselves.
- **A regulatory ceiling**, straight from the diagram's "Within the Labour Act
  overtime ceiling? → Block and escalate": 4 hours per claim, 60 hours per
  calendar month, with pending and approved claims counting and rejected ones
  not.
- **Approval unlocks money.** Approving sets `payrollEligible`; the payroll
  engine reads status plus that flag and nothing else, so this page is the only
  route by which overtime reaches a payslip.

**Walked end to end as `nasrin.akter`:** tried to claim for herself → "Nasrin
Akter is not eligible for overtime"; 5 hours → "A single day cannot exceed 4
overtime hours"; corrected to 2 hours for Tanvir Ahmed on 2026-07-27 → recorded
as pending / "not counted" → reviewed and approved → **eligible hours 26.00 →
28.00 and eligible amount ৳2,833 → ৳3,053**, so the engine will now pay it.

One UX bug was found and fixed during that walk: the employee picker rendered
blank because it defaulted to the signed-in user, who was filtered out of the
eligible list. Recorded in the recipe's traps section.

## Extensions made to the shared foundation

Copied from `garments/erp-app` and then extended:

- `MockApiService.putMany()` — insert-or-replace a set of rows in one call. The
  engine writes a whole cycle of payslips at once, and per-row `update()` would
  fail because new payslips do not exist yet.
- `createCollectionFeature` — added `upsertMany` / `upsertManySuccess` actions,
  reducer case (`adapter.upsertMany`) and effect to match.
- `Icon` — added shield, clock, calendar, timer, receipt, scale, gift, exit,
  edit, list.

If these are ported back to the garments app, the two foundations stay in sync.

## Known limitations (by design, see PLAN.md)

- Credentials are static and shipped in the bundle — no hashing, token, expiry
  or lockout
- Reload resets the mock database to the seed (audit rows written during the
  session are lost); the signed-in session itself survives
- Running the engine on the August batch reuses July's attendance
- "Download payslip PDF" confirms and shows a mock path; no file is produced
- The role dropdown is the entire auth story
