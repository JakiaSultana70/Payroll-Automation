# Module recipe — copy Leave

**Leave is the reference module**, and **Overtime is the worked second example**
that proves the recipe transfers. Every other module should be brought up to the
same shape. Read this with `src/app/features/leave/` and
`src/app/features/overtime/` open beside you.

Overtime is the more instructive of the two if your module differs from Leave:
it adds an on-behalf-of picker (HR files claims for workers), enforces a
regulatory ceiling, and its approval is what unlocks money downstream.

The other twelve modules currently implement only the *approval* half of their
flow. Completing one means adding the *submission* half and a detail page.

---

## What "complete" means

A module is complete when it has all seven of these. Leave has all seven; use it
as the checklist.

| # | Piece | Leave's version |
|---|---|---|
| 1 | Pure rules file, no Angular imports | `leave-rules.ts` |
| 2 | Unit tests for those rules | `leave-rules.spec.ts` (15 tests) |
| 3 | List page: KPI row, table, role-gated queue | `leave-page.ts` |
| 4 | Detail page: full record + the decision | `leave-detail.ts` |
| 5 | Write form in a modal | `leave-form.ts` |
| 6 | Audit entry on every write | `AuditLogService.record(...)` |
| 7 | Both routes registered with scoped state | `app.routes.ts`, `path: 'leave'` |

---

## 1. Rules go in a pure file, never in a component

`leave-rules.ts` exports plain functions over plain data: `countDays`,
`validateLeaveRequest`, `applyApproval`, `reverseApproval`. No `inject`, no
signals, no store.

This is the single most important rule in this codebase. It is why the leave
logic has 15 tests that run in milliseconds with no TestBed, and why the
component is just markup. Put the equivalent for your module in
`features/<module>/<module>-rules.ts`.

Validation returns `Record<string, string>` keyed by field name — the form looks
up `errors['startDate']` and the wrapper renders it. An empty object means valid.

```ts
export function validateLeaveRequest(draft, context): Record<string, string>
```

Pass everything the rules need through `context` (balances, existing rows).
Never reach into the store from a rules file.

## 2. Test the rules, not the template

`leave-rules.spec.ts` covers: the happy path, each individual rejection, the
exemption (unpaid leave ignores the balance), the overlap rule including the
"rejected requests free their dates again" case, and that approve/reverse is
symmetric. Aim for that shape — one test per rule, plus the inverse.

## 3. The write form

`leave-form.ts` is a `ui-modal` wrapping a reactive form:

- inputs are the data the rules need (`employeeId`, `balances`, `existing`)
- outputs are `submitted` (the finished record) and `cancelled`
- `toSignal(form.valueChanges)` feeds a `draft()` computed, which feeds
  `errors()` — so validation is live without a single manual subscription
- errors only render after a submit attempt (`attempted` signal); the form does
  not scold someone mid-typing
- the form shows the consequence before you commit ("3 day(s) requested. Balance
  after approval: 4")

Shared pieces it uses, already built for you: `shared/ui/modal.ts` (focus trap,
Escape, backdrop dismiss) and `shared/ui/form-field.ts` (label, required marker,
hint/error).

**New records must be dispatched with `upsertMany`, not `upsert`.** `upsert`
calls `MockApiService.update()`, which throws for an id the database has never
seen. `upsertMany` calls `putMany()`, which inserts or replaces.

```ts
this.store.dispatch(leaveRequestsFeature.actions.upsertMany({ items: [request] }));
```

## 4. Decisions live on the detail page, not in the table

The list's queue links to the detail page rather than approving inline. A
one-click approve in a table row cannot capture a rejection reason and hides the
consequence of the decision. On the detail page you can show the balance impact
before and after, require a reason to reject, and keep the whole record in view.

Approval in `leave-detail.ts` does three things, in order:

1. upsert the record with its new status and `approvedBy`
2. move the related data (`applyApproval` on the balance)
3. write the audit entry

If your decision can be reversed, implement the inverse too — leave's reject path
calls `reverseApproval` when the request had already been approved, so the days
go back.

## 5. Audit every write

```ts
this.audit.record({
  actorRole: this.session.role(),
  actorName: this.session.currentUser()?.username ?? 'system',
  action: 'Approved leave request',
  moduleName: 'Leave',
  details: '…who and what…',
});
```

`AuditLogService` is fire-and-forget by design — an audit write must never block
or fail the user's action.

## 6. Routes

Turn the module's single route into a parent with two children, keeping the
`providers` on the parent so both pages share one state registration:

```ts
{
  path: 'leave',
  providers: [...PEOPLE_STATE, ...provideCollection(leaveRequestsFeature), ...],
  children: [
    { path: '',    title: 'Leave · PayFlow',         loadComponent: … LeavePage },
    { path: ':id', title: 'Leave request · PayFlow', loadComponent: … LeaveDetailPage },
  ],
}
```

`roleGuard` already runs on every child, so no extra guard wiring is needed.

## 7. Role gating

Read the module's `roles` from `core/module-registry.ts` and gate **actions**
with the session's capability signals (`canApproveLeave`, `canApproveBatch`,
`canRequestPayroll`) — never by checking the role name inline in a template.

Self-service pages filter their rows to the signed-in employee:

```ts
protected readonly rows = computed(() =>
  this.isSelfService()
    ? this.all().filter((row) => row.employeeId === this.session.employeeId())
    : this.all(),
);
```

**Never render a link a role cannot follow.** This bit us three times: the
header's "My profile", a back link and a breadcrumb all pointed into a module the
viewer was not allowed to open, and `roleGuard` bounced them silently. Either
make the target reachable or do not render the control.

---

## Suggested order for the remaining modules

Each is "add the submission half plus a detail page". Rough effort assumes the
shared modal and form-field are already in place, which they are.

| Module | Missing submission action | Notes |
|---|---|---|
| ~~Overtime~~ | ~~Submit an overtime claim~~ | **Done** — use as the second worked example |
| Change Requests | Raise a request | Simplest; model is already complete |
| Attendance | Check in / check out, HR correction | Needs a "today" concept — the seed is a fixed July 2026 cycle |
| Employees | Onboard (create draft profile) | Pairs with the existing Admin activation |
| Loans & Bonuses | Raise a loan or bonus record | Feeds the engine, so verify a payslip after |
| Settlements | Initiate a settlement | Triggered by setting a last working day |
| Payroll | — | Already complete; it has the engine, approval and payment |
| Payslips | — | Read-only by nature |
| Salary & Rules, Organisation, Users & Roles | Master-data CRUD | Same form pattern, no workflow |
| Audit | — | Read-only by nature |

## Traps that already cost time here

**A required `input()` is not readable in a field initializer.** This fails to
compile with `NG8118: employeeId is a required input and does not have a value
in this context`:

```ts
protected readonly form = this.fb.nonNullable.group({ employeeId: this.employeeId() });
```

Initialise the control empty and set it in `ngOnInit`, where inputs are bound —
see `overtime-form.ts`.

**A select bound to a value that is not in its option list renders blank.** The
overtime picker defaulted to the signed-in user, but HR is not overtime-eligible
and so was absent from the list of eligible workers, leaving an empty control
with a confusing error underneath. When a picker is filtered, check the default
survives the filter and fall back to the first valid option.

**`??` does not fall back on an empty string.** After moving the form default to
`ngOnInit`, `raw.employeeId ?? this.employeeId()` kept the `''` initial value.
Use `||` when the empty string is also a missing value.

## Before you call a module done

- `ng build` clean, no warnings
- `ng test --watch=false` green, including new rules tests
- Walked the whole loop in a browser: submit → appears in the approver's queue
  → decide → related data moved → audit row written
- Checked at 1440 px and 390 px
- **Deleted the verification screenshots** (`rm -rf .playwright-mcp`) — last step,
  every time
