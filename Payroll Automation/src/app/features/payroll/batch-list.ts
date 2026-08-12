import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { BATCH_TONE, taka } from '../../core/models/common';
import { PayrollBatch } from '../../core/models/hr';
import {
  attendanceFeature,
  bonusesFeature,
  employeesFeature,
  loansFeature,
  overtimeFeature,
  paymentsFeature,
  payrollBatchesFeature,
  payslipsFeature,
  pfRulesFeature,
  salaryStructuresFeature,
  taxRulesFeature,
} from '../../core/store/features';
import { Column, DataTable } from '../../shared/ui/data-table';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';

@Component({
  selector: 'app-batch-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiTile, SectionCard, DataTable],
  template: `
    <ui-page-header
      eyebrow="Payroll"
      title="Payroll batches"
      subtitle="Request the run, calculate, verify, approve and pay"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Cycles on record" [value]="rows().length" hint="Newest first" />
      <ui-kpi-tile
        label="Awaiting verification"
        [value]="awaiting().length"
        hint="With the accountant"
        [tone]="awaiting().length ? 'warn' : 'ok'"
      />
      <ui-kpi-tile label="Paid to date" [value]="paidTotal()" hint="Net disbursed" tone="ok" />
      <ui-kpi-tile label="Open net payable" [value]="openTotal()" hint="Not yet disbursed" tone="brand" />
    </div>

    <div class="mt-6">
      <ui-section-card heading="Cycles" [padded]="false">
        <ui-data-table
          [columns]="columns"
          [rows]="rows()"
          [loading]="loading()"
          [rowLink]="link"
          searchPlaceholder="Search batch reference or month"
          emptyTitle="No payroll batch"
        />
      </ui-section-card>
    </div>
  `,
})
export class BatchListPage {
  private readonly store = inject(Store);

  protected readonly link = (row: PayrollBatch) => ['/payroll', row.id];

  protected readonly columns: Column<PayrollBatch>[] = [
    { key: 'ref', label: 'Batch', mono: true, value: (row) => row.batchRef },
    { key: 'month', label: 'Month', value: (row) => row.month },
    { key: 'cycle', label: 'Cycle', mono: true, value: (row) => `${row.cycleStart} → ${row.cycleEnd}` },
    { key: 'count', label: 'Staff', align: 'right', mono: true, value: (row) => row.employeeCount },
    { key: 'gross', label: 'Gross', align: 'right', mono: true, value: (row) => taka(row.grossTotal), sortValue: (row) => row.grossTotal },
    { key: 'ded', label: 'Deductions', align: 'right', mono: true, value: (row) => taka(row.deductionTotal), sortValue: (row) => row.deductionTotal },
    { key: 'net', label: 'Net', align: 'right', mono: true, value: (row) => taka(row.netTotal), sortValue: (row) => row.netTotal },
    {
      key: 'status',
      label: 'Status',
      value: (row) => row.status,
      badge: (row) => ({ label: row.status, tone: BATCH_TONE[row.status] }),
    },
  ];

  protected readonly rows = this.store.selectSignal(payrollBatchesFeature.selectors.all);
  protected readonly loading = this.store.selectSignal(payrollBatchesFeature.selectors.loading);

  protected readonly awaiting = computed(() =>
    this.rows().filter((row) => row.status === 'pending-approval'),
  );
  protected readonly paidTotal = computed(() =>
    taka(
      this.rows()
        .filter((row) => row.status === 'paid')
        .reduce((sum, row) => sum + row.netTotal, 0),
    ),
  );
  protected readonly openTotal = computed(() =>
    taka(
      this.rows()
        .filter((row) => row.status !== 'paid')
        .reduce((sum, row) => sum + row.netTotal, 0),
    ),
  );

  constructor() {
    for (const feature of [
      payrollBatchesFeature,
      payslipsFeature,
      paymentsFeature,
      employeesFeature,
      attendanceFeature,
      overtimeFeature,
      salaryStructuresFeature,
      taxRulesFeature,
      pfRulesFeature,
      loansFeature,
      bonusesFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
