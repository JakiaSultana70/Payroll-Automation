import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { APPROVAL_TONE } from '../../core/models/common';
import { LeaveRequest } from '../../core/models/hr';
import { AuditLogService } from '../../core/audit-log';
import { employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  leaveBalancesFeature,
  leaveRequestsFeature,
} from '../../core/store/features';
import { Column, DataTable } from '../../shared/ui/data-table';
import { EmptyState } from '../../shared/ui/empty-state';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { LeaveForm } from './leave-form';

/**
 * Leave list: apply, review, and the running balances.
 *
 * Decisions are not taken here — the queue links through to the detail page,
 * because a rejection needs a reason and an approval moves a balance.
 */
@Component({
  selector: 'app-leave-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, KpiTile, SectionCard, DataTable, EmptyState, LeaveForm],
  template: `
    <ui-page-header
      eyebrow="Time & Attendance"
      [title]="isSelfService() ? 'My leave' : 'Leave management'"
      subtitle="Applications, the approval queue and running balances"
    >
      <button
        type="button"
        (click)="formOpen.set(true)"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Apply for leave
      </button>
    </ui-page-header>

    @if (formOpen()) {
      <app-leave-form
        [employeeId]="myEmployeeId()"
        [balances]="allBalances()"
        [existing]="all()"
        (submitted)="onSubmitted($event)"
        (cancelled)="formOpen.set(false)"
      />
    }

    @if (justSubmitted()) {
      <p class="mb-4 rounded-md border border-ok-600 bg-ok-100 px-3 py-2 text-sm text-ok-700">
        Request submitted and sent to HR for approval.
      </p>
    }

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile
        label="Pending"
        [value]="pending().length"
        hint="Awaiting an HR decision"
        [tone]="pending().length ? 'warn' : 'ok'"
      />
      <ui-kpi-tile label="Approved" [value]="approved().length" hint="This year" tone="ok" />
      <ui-kpi-tile label="Rejected" [value]="rejected().length" hint="With a recorded reason" />
      <ui-kpi-tile label="Days requested" [value]="totalDays()" hint="Across all applications" />
    </div>

    @if (canApprove()) {
      <div class="mt-6">
        <ui-section-card heading="Approval queue" note="Oldest application first" [padded]="false">
          @if (pending().length) {
            <ul class="divide-y divide-ink-100">
              @for (row of pending(); track row.id) {
                <li class="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span class="text-sm font-medium text-ink-900">{{ name(row.employeeId) }}</span>
                  <span class="text-sm text-ink-600">
                    {{ row.leaveType }} · {{ row.days }} day(s) · {{ row.startDate }} →
                    {{ row.endDate }}
                  </span>
                  <span class="w-full text-xs text-ink-500 sm:w-auto">{{ row.reason }}</span>
                  <a
                    [routerLink]="['/leave', row.id]"
                    class="ml-auto rounded-md border border-brand-600 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                  >
                    Review
                  </a>
                </li>
              }
            </ul>
          } @else {
            <ui-empty-state
              icon="calendar"
              title="Queue is clear"
              hint="No leave application is waiting for a decision."
            />
          }
        </ui-section-card>
      </div>
    }

    <div class="mt-4">
      <ui-section-card heading="Applications" [note]="rows().length + ' records'" [padded]="false">
        <ui-data-table
          [columns]="columns"
          [rows]="rows()"
          [loading]="loading()"
          [rowLink]="link"
          searchPlaceholder="Search employee, type or reason"
          emptyTitle="No leave application"
        />
      </ui-section-card>
    </div>

    <div class="mt-4">
      <ui-section-card heading="Leave balances" note="2026 cycle" [padded]="false">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
                <th scope="col" class="px-4 py-2 font-medium">Employee</th>
                <th scope="col" class="px-4 py-2 font-medium">Type</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">Accrued</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">Taken</th>
                <th scope="col" class="px-4 py-2 text-right font-medium">Remaining</th>
              </tr>
            </thead>
            <tbody>
              @for (bal of balances(); track bal.id) {
                <tr class="border-b border-ink-100 last:border-0">
                  <td class="px-4 py-2">{{ name(bal.employeeId) }}</td>
                  <td class="px-4 py-2">{{ bal.leaveType }}</td>
                  <td class="tnum px-4 py-2 text-right">{{ bal.accrued }}</td>
                  <td class="tnum px-4 py-2 text-right">{{ bal.taken }}</td>
                  <td class="tnum px-4 py-2 text-right font-medium">{{ bal.remaining }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-4 py-6 text-center text-ink-500">Loading…</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </ui-section-card>
    </div>
  `,
})
export class LeavePage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);
  private readonly audit = inject(AuditLogService);

  protected readonly canApprove = this.session.canApproveLeave;
  protected readonly isSelfService = computed(() => this.session.role() === 'Employee');
  protected readonly myEmployeeId = this.session.employeeId;
  protected readonly name = employeeName;

  protected readonly formOpen = signal(false);
  protected readonly justSubmitted = signal(false);

  protected readonly link = (row: LeaveRequest) => ['/leave', row.id];

  protected readonly columns: Column<LeaveRequest>[] = [
    { key: 'name', label: 'Employee', value: (row) => employeeName(row.employeeId) },
    { key: 'type', label: 'Type', value: (row) => row.leaveType },
    { key: 'from', label: 'From', mono: true, value: (row) => row.startDate },
    { key: 'to', label: 'To', mono: true, value: (row) => row.endDate },
    { key: 'days', label: 'Days', align: 'right', mono: true, value: (row) => row.days },
    { key: 'applied', label: 'Applied', mono: true, value: (row) => row.appliedAt },
    { key: 'reason', label: 'Reason', value: (row) => row.reason },
    {
      key: 'status',
      label: 'Status',
      value: (row) => row.status,
      badge: (row) => ({ label: row.status, tone: APPROVAL_TONE[row.status] }),
    },
  ];

  protected readonly all = this.store.selectSignal(leaveRequestsFeature.selectors.all);
  protected readonly allBalances = this.store.selectSignal(leaveBalancesFeature.selectors.all);
  protected readonly loading = this.store.selectSignal(leaveRequestsFeature.selectors.loading);

  protected readonly rows = computed(() =>
    this.isSelfService()
      ? this.all().filter((row) => row.employeeId === this.session.employeeId())
      : this.all(),
  );
  protected readonly balances = computed(() =>
    this.isSelfService()
      ? this.allBalances().filter((row) => row.employeeId === this.session.employeeId())
      : this.allBalances(),
  );

  protected readonly pending = computed(() =>
    this.rows()
      .filter((row) => row.status === 'pending')
      .slice()
      .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt)),
  );
  protected readonly approved = computed(() =>
    this.rows().filter((row) => row.status === 'approved'),
  );
  protected readonly rejected = computed(() =>
    this.rows().filter((row) => row.status === 'rejected'),
  );
  protected readonly totalDays = computed(() =>
    this.rows().reduce((sum, row) => sum + row.days, 0),
  );

  /** New rows go through `upsertMany`, which inserts; `upsert` only updates and
   *  would fail for a record the mock database has never seen. */
  protected onSubmitted(request: LeaveRequest): void {
    this.store.dispatch(leaveRequestsFeature.actions.upsertMany({ items: [request] }));
    this.audit.record({
      actorRole: this.session.role(),
      actorName: this.session.currentUser()?.username ?? 'system',
      action: 'Submitted leave request',
      moduleName: 'Leave',
      details: `${request.leaveType} · ${request.days} day(s) from ${request.startDate}`,
    });
    this.formOpen.set(false);
    this.justSubmitted.set(true);
  }

  constructor() {
    for (const feature of [
      leaveRequestsFeature,
      leaveBalancesFeature,
      employeesFeature,
      departmentsFeature,
      designationsFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
