# Payroll Automation — How the app works
*A page-by-page, role-by-role walkthrough for review*

## 1. What this is

A frontend-only Angular app (no real backend — data lives in the browser via a mock
API layer that behaves like a real REST API, so every screen works exactly like the
finished product will once a backend is wired in). It implements the payroll workflow
diagram: four roles — **Admin, HR, Accountant, Employee** — each with their own
dashboard and a set of pages gated to what that role is allowed to do.

Every page a role *can't* open simply doesn't appear in their sidebar, and the router
blocks the URL directly too — this is enforced centrally in one file
(`core/module-registry.ts` + `core/auth/auth-guard.ts`), not scattered per-page, so the
access rules are easy to audit in one place.

## 2. Role access matrix

| Module / Page | Admin | HR | Accountant | Employee |
|---|---|---|---|---|
| Employees (register) | ✅ full | ✅ full | — | own record only, via **My profile** |
| Organisation (Dept/Designation/Shift/Holiday) | ✅ full | 👁 view only | — | — |
| Users & Roles | ✅ | — | — | — |
| Attendance | ✅ view all | ✅ view all | — | 👁 own record only |
| Leave | ✅ approve | ✅ approve | — | ✅ apply, own record |
| Overtime | ✅ approve | ✅ approve | — | ✅ apply, own record |
| Payroll Batches | ✅ | 👁 view | ✅ run/approve/pay | — |
| Payslips | ✅ | ✅ | ✅ | 👁 own payslips |
| Salary & Rules | ✅ | — | 👁 view only | — |
| Loans & Bonuses | ✅ | ✅ | ✅ | — |
| Final Settlement | ✅ | ✅ | ✅ settle | — |
| Change Requests | ✅ decide | ✅ decide | — | 👁 own requests (can't create yet — see §4) |
| Audit Log | ✅ only | — | — | — |
| My profile (view/edit/photo/password) | ✅ | ✅ | ✅ | ✅ |

*(✅ = can act, 👁 = read-only for that role, — = page not shown to that role)*

## 3. Page-by-page — what it does, mapped to the diagram

### Admin
- **Admin dashboard** — headcount, pending items, shortcuts to every module. One
  dashboard component that reshapes itself per role (`dashboard-page.ts`), rather than
  four separate files.
- **Employees** — the master employee register. *(This session's work: Add / Edit /
  Delete now functional — see §4 for the bug you hit.)*
- **Organisation** — Department / Designation / Shift / Holiday **CRUD**, added this
  session. Tabs, each with Add/Edit/Delete.
- **Users & Roles** — currently a **read-only permission matrix** (who can approve
  what, per role). There is no "create a login" or "assign a role to a person" form
  yet — see gap list.
- **Salary & Rules** — salary structures, tax slabs, PF rules. Currently
  **read-only** — the diagram's "Configure Payroll Rules" isn't editable yet.
- **Audit Log** — a read-only feed of who did what, when. This is intentionally
  read-only everywhere; it's the system's paper trail.

### HR
- **Attendance** — daily register for everyone. Currently **read-only** — no
  correction form yet, even though the diagram calls for "HR: Review Attendance /
  correction." See gap list.
- **Leave** — pending queue with **Approve / Reject**, and each decision updates the
  employee's leave balance automatically.
- **Overtime** — same approve/reject pattern, feeds the "OT payroll-eligible" flag.
- **Employees / Organisation** — same pages Admin uses, HR's view is slightly
  narrower (e.g., HR can add/edit an employee record but not delete it, and can't
  change organisation master data).
- **Payroll Batches** — HR can watch a batch move through the pipeline but the
  run/approve/pay actions belong to the Accountant (matches the diagram: HR triggers
  the *first* payroll run in the source flow — in this build that trigger currently
  lives on the batch itself rather than a dedicated "Request Payroll Run" button; worth
  flagging if that distinction matters to you).

### Accountant
- **Payroll Batches → batch detail** is the real engine room: **Run calculation →
  Submit for approval → Approve → Pay**, with a **Return with remarks** branch if
  something's wrong — this matches the diagram's Accountant swimlane exactly, including
  the reject-and-return-to-HR loop.
- **Payslips** — generated once a batch is paid; downloadable per employee.
- **Salary & Rules** — read-only reference while working a batch.
- **Loans & Bonuses / Final Settlement** — ledgers Accountant works from; settlement
  has a **Settle** action for closing out a leaver's dues.

### Employee (self-service)
- **My profile** *(added this session)* — view profile, edit phone/email/address/
  emergency contact, upload a photo, change password. Diagram's shared "View profile /
  Update profile / Change password" box.
- **Attendance** — read-only view of their own record. **No Check-in/Check-out button
  yet** — see gap list, this is the biggest miss against the diagram for this role.
- **Leave** — apply for leave, see their own request history and balance.
- **Overtime** — claim overtime, see status.
- **Payslips** — view/download their own payslips only.
- **Change Requests** — can see their own request history, but there's currently no
  "propose a change" button to actually create one (see gap list).

## 4. This session's bug — status

You reported: **Add employee works, Edit/Update doesn't.**

What I found and fixed: the edit form reads three *required* Angular inputs
(department/designation/shift lists) inside the component constructor. Angular's
compiler correctly flagged this (`NG8118`) because required inputs aren't guaranteed to
be bound yet at that exact moment — I moved that part into an `effect()`, which Angular
runs once the inputs are actually available, and kept the "pre-fill the form from the
record being edited" logic running immediately in the constructor (safe, since that
input has a default value). This mirrors how `departments`/`designations`/`shifts` are
already required elsewhere in the app.

I reviewed the rest of the edit path line by line (submit handler → the `upsert`
action → the store reducer → the mock API) and didn't find another defect — the
`upsert` codepath is the same one the existing "Activate account" button already used
successfully before this session's changes. **If Edit still doesn't work after this
fix, I need the exact symptom** to pin it down further, since I can't run a browser
here:
- Does clicking **Edit** open the form with fields already filled in, or empty?
- Does clicking **Save changes** do nothing, show an error, or close the form without
  saving?
- Anything in the browser console (F12 → Console tab) when you click Save?

## 5. Gaps found in this audit (things that look like list/view screens but should be
   interactive, per the diagram) — ranked by how central they are to the workflow

1. **Employee Check-in / Check-out is missing.** The Attendance page is read-only for
   everyone, including the Employee. This is a core box in the diagram
   ("Employee: Check In/Out") with nothing built yet.
2. **HR attendance correction is missing.** Same page — no way to edit a punch with a
   reason, even though the subtitle text says "corrections are recorded with a reason."
3. **Users & Roles is read-only.** No "create a user account" or "assign a role" form —
   this is the diagram's "Admin: Manage Users."
4. **Salary & Rules is read-only.** No way to actually edit a tax slab, PF rule, or
   salary structure — the diagram's "Admin: Configure Payroll Rules."
5. **Change Requests has no "propose a change" form for Employees.** HR can approve/
   reject, but nothing creates a pending request in the first place. Worth noting: the
   **My profile** page I built this session lets an Employee edit their own address/
   phone directly (no approval step) — which is a *different, faster* path than this
   Change Request module's approve-first design. Both now exist; you may want to pick
   one so employees and HR aren't confused by two ways to change the same data.
6. **HR "Request Payroll Run" isn't a separate step** — the Accountant's batch screen
   effectively covers the whole pipeline; there's no distinct "HR clicks a button to
   kick off a new cycle" moment as a standalone action.

None of these are broken — they're screens that were built as read-only reference
views and haven't had their write/edit half built yet. Happy to take these in order,
or whichever matters most for your demo to the consultant.
