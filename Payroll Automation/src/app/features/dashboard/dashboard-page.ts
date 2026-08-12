import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { APPROVAL_TONE, BATCH_TONE, hours, taka } from '../../core/models/common';
import { employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  attendanceFeature,
  employeesFeature,
  leaveRequestsFeature,
  notificationsFeature,
  overtimeFeature,
  payrollBatchesFeature,
  payslipsFeature,
} from '../../core/store/features';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';

/**
 * "Determine Role → one of four dashboards" from the activity diagram.
 * One component, four views — each role sees the work it actually owns.
 */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, KpiTile, SectionCard, StatusBadge],
  template: `
    <ui-page-header
      [eyebrow]="role()"
      [title]="role() + ' dashboard'"
      [subtitle]="subtitle()"
    >
      @if (role() === 'HR') {
        <a
          routerLink="/payroll"
          class="rounded-md bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
        >
          Request payroll run
        </a>
      }
      @if (role() === 'Accountant') {
        <a
          routerLink="/payroll"
          class="rounded-md bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
        >
          Verify pending batch
        </a>
      }
    </ui-page-header>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      @switch (role()) {
        @case ('Employee') {
          <ui-kpi-tile label="Days present" [value]="myPresent()" [hint]="cycleLabel" />
          <ui-kpi-tile label="Hours worked" [value]="myHours()" [hint]="cycleLabel" />
          <ui-kpi-tile
            label="Overtime approved"
            [value]="myOtHours()"
            hint="Counted in this cycle's pay"
            tone="brand"
          />
          <ui-kpi-tile
            label="Latest net pay"
            [value]="myNetPay()"
            hint="Most recent payslip"
            tone="ok"
          />
        }
        @case ('Accountant') {
          <ui-kpi-tile
            label="Batches to verify"
            [value]="toVerify().length"
            hint="Waiting on your approval"
            [tone]="toVerify().length ? 'warn' : 'ok'"
          />
          <ui-kpi-tile label="Net payable" [value]="netPayable()" hint="Across open batches" tone="brand" />
          <ui-kpi-tile label="Total deductions" [value]="deductions()" hint="Tax, PF and loan recovery" />
          <ui-kpi-tile label="Employees in cycle" [value]="headcountInCycle()" hint="On the open batch" />
        }
        @default {
          <ui-kpi-tile label="Active employees" [value]="activeCount()" [hint]="draftCount() + ' draft profile(s)'" />
          <ui-kpi-tile
            label="Leave to approve"
            [value]="pendingLeave().length"
            hint="Applications in the queue"
            [tone]="pendingLeave().length ? 'warn' : 'ok'"
          />
          <ui-kpi-tile
            label="Overtime to approve"
            [value]="pendingOt().length"
            hint="Claims awaiting sign-off"
            [tone]="pendingOt().length ? 'warn' : 'ok'"
          />
        }
      }
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ui-section-card heading="Payroll cycles" note="Newest first" [padded]="false">
        <ul class="divide-y divide-ink-100">
          @for (batch of batches(); track batch.id) {
            <li class="flex flex-wrap items-center gap-3 px-4 py-3">
              <a
                [routerLink]="['/payroll', batch.id]"
                class="tnum text-sm font-medium text-brand-600 hover:underline"
              >
                {{ batch.batchRef }}
              </a>
              <span class="text-sm text-ink-600">{{ batch.month }}</span>
              <ui-status-badge [label]="batch.status" [tone]="batchTone(batch.status)" />
              <span class="tnum ml-auto text-sm text-ink-800">{{ money(batch.netTotal) }}</span>
            </li>
          } @empty {
            <li class="px-4 py-6 text-center text-sm text-ink-500">Loading…</li>
          }
        </ul>
      </ui-section-card>

      @if (role() === 'Employee') {
        <ui-section-card heading="My recent payslips" [padded]="false">
          <ul class="divide-y divide-ink-100">
            @for (slip of mySlips(); track slip.id) {
              <li class="flex items-center gap-3 px-4 py-3">
                <a
                  [routerLink]="['/payslips', slip.id]"
                  class="text-sm font-medium text-brand-600 hover:underline"
                >
                  {{ batchRef(slip.batchId) }}
                </a>
                <span class="tnum ml-auto text-sm">{{ money(slip.netSalary) }}</span>
              </li>
            } @empty {
              <li class="px-4 py-6 text-center text-sm text-ink-500">No payslip yet.</li>
            }
          </ul>
        </ui-section-card>
      } @else {
        <ui-section-card heading="Approval queue" note="Oldest first" [padded]="false">
          <ul class="divide-y divide-ink-100">
            @for (item of queue(); track item.id) {
              <li class="flex flex-wrap items-center gap-3 px-4 py-3">
                <span class="text-sm text-ink-900">{{ item.who }}</span>
                <span class="text-xs text-ink-500">{{ item.what }}</span>
                <ui-status-badge label="pending" tone="warn" />
                <a
                  [routerLink]="item.link"
                  class="ml-auto text-sm text-brand-600 hover:underline"
                >
                  Open
                </a>
              </li>
            } @empty {
              <li class="px-4 py-6 text-center text-sm text-ink-500">Nothing waiting on you.</li>
            }
          </ul>
        </ui-section-card>
      }
    </div>
  `,
})
export class DashboardPage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly role = this.session.role;
  protected readonly cycleLabel = 'July 2026 cycle';
  protected readonly money = taka;
  protected readonly batchTone = (status: keyof typeof BATCH_TONE) => BATCH_TONE[status];
  protected readonly approvalTone = (status: keyof typeof APPROVAL_TONE) => APPROVAL_TONE[status];

  private readonly employees = this.store.selectSignal(employeesFeature.selectors.all);
  private readonly attendance = this.store.selectSignal(attendanceFeature.selectors.all);
  private readonly leave = this.store.selectSignal(leaveRequestsFeature.selectors.all);
  private readonly overtime = this.store.selectSignal(overtimeFeature.selectors.all);
  private readonly slips = this.store.selectSignal(payslipsFeature.selectors.all);
  protected readonly batches = this.store.selectSignal(payrollBatchesFeature.selectors.all);

  protected readonly subtitle = computed(() => {
    switch (this.role()) {
      case 'Admin':
        return 'System-wide view: people, approvals and payroll health';
      case 'HR':
        return 'People, time and the payroll run request';
      case 'Accountant':
        return 'Verify, approve and pay the payroll batches';
      default:
        return 'Your attendance, leave, overtime and payslips';
    }
  });

  protected readonly activeCount = computed(
    () => this.employees().filter((emp) => emp.status === 'active').length,
  );
  protected readonly draftCount = computed(
    () => this.employees().filter((emp) => emp.status === 'draft').length,
  );
  protected readonly pendingLeave = computed(() =>
    this.leave().filter((row) => row.status === 'pending'),
  );
  protected readonly pendingOt = computed(() =>
    this.overtime().filter((row) => row.status === 'pending'),
  );

  protected readonly toVerify = computed(() =>
    this.batches().filter((batch) => batch.status === 'pending-approval'),
  );
  protected readonly netPayable = computed(() =>
    taka(this.toVerify().reduce((sum, batch) => sum + batch.netTotal, 0)),
  );
  protected readonly deductions = computed(() =>
    taka(this.toVerify().reduce((sum, batch) => sum + batch.deductionTotal, 0)),
  );
  protected readonly headcountInCycle = computed(
    () => this.toVerify()[0]?.employeeCount ?? 0,
  );

  private readonly myAttendance = computed(() =>
    this.attendance().filter((row) => row.employeeId === this.session.employeeId()),
  );
  protected readonly myPresent = computed(
    () => this.myAttendance().filter((row) => row.status === 'present').length,
  );
  protected readonly myHours = computed(() =>
    hours(this.myAttendance().reduce((sum, row) => sum + row.workedHours, 0)),
  );
  protected readonly myOtHours = computed(() =>
    hours(
      this.overtime()
        .filter((row) => row.employeeId === this.session.employeeId() && row.payrollEligible)
        .reduce((sum, row) => sum + row.hours, 0),
    ),
  );
  protected readonly mySlips = computed(() =>
    this.slips()
      .filter((slip) => slip.employeeId === this.session.employeeId())
      .slice()
      .sort((a, b) => b.batchId.localeCompare(a.batchId)),
  );
  protected readonly myNetPay = computed(() => {
    const slip = this.mySlips()[0];
    return slip ? taka(slip.netSalary) : '—';
  });

  protected readonly queue = computed(() => [
    ...this.pendingLeave().map((row) => ({
      id: row.id,
      who: employeeName(row.employeeId),
      what: `${row.leaveType} leave, ${row.days} day(s) from ${row.startDate}`,
      link: '/leave',
    })),
    ...this.pendingOt().map((row) => ({
      id: row.id,
      who: employeeName(row.employeeId),
      what: `Overtime ${row.hours} h on ${row.date}`,
      link: '/overtime',
    })),
  ]);

  protected batchRef(batchId: string): string {
    return this.batches().find((batch) => batch.id === batchId)?.batchRef ?? batchId;
  }

  constructor() {
    for (const feature of [
      employeesFeature,
      attendanceFeature,
      leaveRequestsFeature,
      overtimeFeature,
      payrollBatchesFeature,
      payslipsFeature,
      notificationsFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
