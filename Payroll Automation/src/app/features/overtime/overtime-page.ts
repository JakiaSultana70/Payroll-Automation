import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { APPROVAL_TONE, hours, taka } from '../../core/models/common';
import { Overtime } from '../../core/models/hr';
import { employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  overtimeFeature,
} from '../../core/store/features';
import { Column, DataTable } from '../../shared/ui/data-table';
import { EmptyState } from '../../shared/ui/empty-state';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';

/**
  * Overtime is generated from the attendance system instead of being manually
  * filed, and the resulting records are read-only. The detail page is review
  * only, not a workflow for approval or rejection.
  */
@Component({
  selector: 'app-overtime-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, KpiTile, SectionCard, DataTable, EmptyState],
  template: `
    <ui-page-header
      eyebrow="Time & Attendance"
      [title]="isSelfService() ? 'My overtime' : 'Overtime'"
      subtitle="System-generated from attendance and kept read-only"
    />

    <p class="mb-4 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
      Overtime is auto-recorded when attendance checks out beyond the rostered shift.
    </p>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile
        label="Pending"
        [value]="pending().length"
        hint="Awaiting approval"
        [tone]="pending().length ? 'warn' : 'ok'"
      />
      <ui-kpi-tile label="Eligible hours" [value]="eligibleHours()" hint="Counted in payroll" tone="brand" />
      <ui-kpi-tile label="Eligible amount" [value]="eligibleAmount()" hint="Added to gross pay" tone="ok" />
      <ui-kpi-tile label="Rejected" [value]="rejected().length" hint="Not paid" />
    </div>

    <div class="mt-4">
      <ui-section-card heading="Overtime claims" [note]="rows().length + ' records'" [padded]="false">
        <ui-data-table
          [columns]="columns"
          [rows]="rows()"
          [loading]="loading()"
          [rowLink]="link"
          searchPlaceholder="Search employee or date"
          emptyTitle="No overtime recorded"
        />
      </ui-section-card>
    </div>
  `,
})
export class OvertimePage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly money = taka;
  protected readonly name = employeeName;
  protected readonly isSelfService = computed(() => this.session.role() === 'Employee');
  protected readonly myEmployeeId = this.session.employeeId;
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly link = (row: Overtime) => ['/overtime', row.id];

  protected readonly columns: Column<Overtime>[] = [
    { key: 'date', label: 'Date', mono: true, value: (row) => row.date },
    { key: 'name', label: 'Employee', value: (row) => employeeName(row.employeeId) },
    { key: 'hours', label: 'Hours', align: 'right', mono: true, value: (row) => row.hours },
    { key: 'rate', label: 'Rate', align: 'right', mono: true, value: (row) => taka(row.rate) },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      mono: true,
      value: (row) => taka(row.amount),
      sortValue: (row) => row.amount,
    },
    {
      key: 'status',
      label: 'Status',
      value: (row) => row.status,
      badge: (row) => ({ label: row.status, tone: APPROVAL_TONE[row.status] }),
    },
    {
      key: 'eligible',
      label: 'Payroll',
      value: (row) => (row.payrollEligible ? 'eligible' : 'not counted'),
      badge: (row) => ({
        label: row.payrollEligible ? 'eligible' : 'not counted',
        tone: row.payrollEligible ? 'ok' : 'neutral',
      }),
    },
  ];

  protected readonly all = this.store.selectSignal(overtimeFeature.selectors.all);
  protected readonly employees = this.store.selectSignal(employeesFeature.selectors.all);
  protected readonly loading = this.store.selectSignal(overtimeFeature.selectors.loading);

  protected readonly rows = computed(() =>
    this.isSelfService()
      ? this.all().filter((row) => row.employeeId === this.session.employeeId())
      : this.all(),
  );

  protected readonly pending = computed(() =>
    this.rows()
      .filter((row) => row.status === 'pending')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date)),
  );
  protected readonly rejected = computed(() =>
    this.rows().filter((row) => row.status === 'rejected'),
  );
  private readonly eligible = computed(() => this.rows().filter((row) => row.payrollEligible));
  protected readonly eligibleHours = computed(() =>
    hours(this.eligible().reduce((sum, row) => sum + row.hours, 0)),
  );
  protected readonly eligibleAmount = computed(() =>
    taka(this.eligible().reduce((sum, row) => sum + row.amount, 0)),
  );

  constructor() {
    for (const feature of [
      overtimeFeature,
      employeesFeature,
      departmentsFeature,
      designationsFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
