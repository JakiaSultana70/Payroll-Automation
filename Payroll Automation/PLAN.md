# PayFlow — HR & Payroll mock application

An Angular mock (no backend) built from `../Payroll Automotion Application (8) (2).drawio`.
That file carries a class diagram (25 entities with typed attributes) plus the
role and payroll-run flows; both are implemented here.

Sibling project: `../../garments/erp-app` (the 13-module garments ERP). Same
stack and conventions; separate application.

## Stack

Carried over from the garments ERP, for the reasons proven there.

| Concern | Choice |
|---|---|
| Framework | Angular 21.2, standalone + signals, **zoneless** |
| State | `@ngrx/store` + `effects` + `entity` (+ devtools) |
| Styling | Tailwind CSS v4 (`ng new --style=tailwind`), hand-rolled components |
| A11y primitives | `@angular/cdk` |
| Dates | `date-fns` |
| Tests | Vitest |

Angular 21 rather than 22: NgRx's stable major is 21 and peers on
`@angular/core: ^21.0.0`.

## Authentication

The diagram opens with `User Login → Valid Credentials? → [no] Show Error /
[yes] Determine Role`, and that is implemented as a real flow:

- **Sign-in screen** at `/login`, outside the application shell. Reactive form,
  show/hide password, inline error, and one-click fill for each demo account.
- **Static credentials**, one per role, in `core/auth/demo-credentials.ts`. They
  resolve to a seeded `AppUser`, which resolves to an `Employee` and a `Role` —
  **the role comes from the account, never from the form**.
- **Rejections are specific**: unknown user and wrong password share one message
  (so the form does not disclose which usernames exist), while
  `pending-activation`, `disabled` and separated-employee accounts each get
  their own. The draft employee genuinely cannot sign in, which is the other
  half of the "Notify Admin to Activate Account" branch.
- **Guards**: `authGuard` protects the shell and remembers the attempted URL as
  `?next=`; `guestGuard` keeps a signed-in user off `/login`; `roleGuard` runs on
  every child route, so a module your role cannot see in the sidebar is also
  unreachable by typing its URL.
- **Session** persists in `sessionStorage`, so a page reload keeps you signed in
  but a new browser session does not.
- **Sign-in and sign-out are written to the audit trail**, under an
  `Authentication` module.

| Role | Username | Password |
|---|---|---|
| Admin | `farhana.islam` | `Admin@2026` |
| HR | `nasrin.akter` | `Hr@2026` |
| Accountant | `rakib.hasan` | `Accounts@2026` |
| Employee | `tanvir.ahmed` | `Staff@2026` |

Passwords are in clear text in the bundle and printed on the sign-in screen.
That is correct for a mock with no backend and wrong for anything else — a real
build stores the salted hash the class diagram already models
(`User.passwordHash`).

## The four roles

Role drives three things:

- which dashboard view renders (`features/dashboard`, one component, four views)
- which modules appear in the sidebar (`roles` on each `ModuleMeta`)
- which action buttons exist (approve leave, approve a batch, activate an account)

| Role | Sees | Can approve |
|---|---|---|
| Admin | every module | everything, plus account activation |
| HR | Employees, Organisation, Attendance, Leave, Overtime, Payroll Batches, Payslips, Loans & Bonuses, Final Settlement, Change Requests | leave, overtime, change requests |
| Accountant | Payroll Batches, Payslips, Salary & Rules, Loans & Bonuses, Final Settlement | payroll batches, settlements |
| Employee | own attendance, leave, overtime, payslips, change requests, and own profile | nothing |

Two boundaries worth stating precisely, because they are easy to get wrong:

- **HR writes to payroll but cannot approve it.** HR locks the cycle, runs the
  engine and submits for verification; only the Accountant (or Admin) approves,
  returns or pays a batch. That separation is the point of the flow.
- **Account activation is Admin-only**, not HR. HR creates the draft profile;
  an administrator turns it into a working account.

## Modules

| Path | Entities | Notes |
|---|---|---|
| `employees` | Employee (+ Department, Designation, Shift) | list + detail; draft profiles activate from the detail page |
| `organisation` | Department, Designation, Shift, Holiday | tabbed master data |
| `users` | AppUser, Role, Permission | accounts, roles, permission matrix |
| `attendance` | Attendance | daily register, late flags, HR corrections |
| `leave` | LeaveRequest, LeaveBalance | approval queue; approving moves the balance |
| `overtime` | Overtime | approval sets `payrollEligible` |
| `payroll` | PayrollBatch, Payslip, Payment | list + detail; the engine lives here |
| `payslips` | Payslip | list + detail with earnings/deductions breakdown |
| `salary-rules` | SalaryStructure, TaxRule, PFRule | tabbed; what the engine reads |
| `loans-bonuses` | LoanRecord, BonusRecord | recovery schedules and bonuses |
| `settlements` | FinalSettlement | gratuity, encashment, dues |
| `change-requests` | ChangeRequest | proposed profile edits, old vs new |
| `audit` | AuditLog, Notification | who did what, and system messages |

## The payroll engine

`core/payroll-engine.ts` is a pure function implementing the diagram's sequence:

```
lock attendance and leave
  → working hours / late / overtime
  → gross salary
  → tax, PF, loan, bonus
  → net salary
  → payslips
```

It is **the same code the seed uses and the in-app "run engine" button uses**,
so a batch calculated in the browser agrees with the seeded history exactly.
Rules it encodes:

- only overtime that is **both** `status: 'approved'` and `payrollEligible` is
  counted — the flag alone is not trusted, so a stale one cannot pay out
- tax slabs are annual; the rate applies to the month's gross
- PF is a percentage of basic, and only for permanent employees
- loan recovery is capped at the outstanding balance
- bonuses count only when approved and dated inside the cycle

Batch lifecycle, matching the swimlanes:
`draft → calculated → pending-approval → approved → paid`, with `returned`
as the accountant's reject path back to HR.

## Mock database

`core/mock-db/mock-db.ts` aggregates 25 collections. `MockApiService` fakes HTTP
with a 250 ms delay over a `structuredClone` working copy, so edits survive
navigation and reset on reload.

Seed shape: 1 company, 6 departments, 7 designations, 3 shifts, 6 holidays,
15 employees (13 active, 1 separated, 1 draft awaiting activation), a full July
2026 attendance month, leave/overtime/loans/bonuses, and four payroll cycles
(May and June paid, July awaiting verification, August still draft).

Everything keys off employee ids `e1`–`e15`, so attendance, leave, overtime,
payslips and settlements all describe the same people.

## Design system

Slate neutrals with a deep teal primary (`#115E59`), deliberately distinct from
the garments ERP's indigo. One status vocabulary (`ok` / `warn` / `bad`) across
every module. `.tnum` gives tabular figures so money and hours align down a
column. Persistent left sidebar; off-canvas drawer below `md`.

## Non-goals

- Credentials are static and in the bundle; there is no password hashing, no
  token, no expiry, no lockout after repeated failures
- No persistence of data; reload resets the mock database to the seed (the
  signed-in session does survive, in `sessionStorage`)
- No PDF generation — "Download payslip PDF" confirms and shows the mock path
- August's engine run reuses the July cycle's attendance, since no August
  attendance is seeded; the point is to show the calculation, not a time machine
