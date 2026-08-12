import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { taka } from '../../core/models/common';
import { Payslip } from '../../core/models/hr';
import { employeeCode, employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  payrollBatchesFeature,
  payslipsFeature,
} from '../../core/store/features';
import { Column, DataTable } from '../../shared/ui/data-table';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';

@Component({
  selector: 'app-payslip-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiTile, SectionCard, DataTable],
  template: `
    <ui-page-header
      eyebrow="Payroll"
      [title]="isSelfService() ? 'My payslips' : 'Payslips'"
      subtitle="Earnings, deductions and net pay per employee per cycle"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Payslips" [value]="rows().length" hint="All cycles on record" />
      <ui-kpi-tile label="Gross" [value]="grossTotal()" hint="Before deductions" />
      <ui-kpi-tile label="Deductions" [value]="deductionTotal()" hint="Tax, PF and loans" />
      <ui-kpi-tile label="Net" [value]="netTotal()" hint="Take-home pay" tone="ok" />
    </div>

    <div class="mt-6">
      <ui-section-card heading="Payslips" [padded]="false">
        <ui-data-table
          [columns]="columns"
          [rows]="rows()"
          [loading]="loading()"
          [rowLink]="link"
          searchPlaceholder="Search employee or code"
          emptyTitle="No payslip yet"
        />
      </ui-section-card>
    </div>
  `,
})
export class PayslipListPage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly isSelfService = computed(() => this.session.role() === 'Employee');
  protected readonly link = (row: Payslip) => ['/payslips', row.id];

  private readonly batches = this.store.selectSignal(payrollBatchesFeature.selectors.all);
  private readonly all = this.store.selectSignal(payslipsFeature.selectors.all);
  protected readonly loading = this.store.selectSignal(payslipsFeature.selectors.loading);

  protected readonly columns: Column<Payslip>[] = [
    { key: 'batch', label: 'Batch', mono: true, value: (row) => this.batchRef(row.batchId) },
    { key: 'code', label: 'Code', mono: true, value: (row) => employeeCode(row.employeeId) },
    { key: 'name', label: 'Employee', value: (row) => employeeName(row.employeeId) },
    { key: 'hours', label: 'Hours', align: 'right', mono: true, value: (row) => row.workedHours.toFixed(1), sortValue: (row) => row.workedHours },
    { key: 'ot', label: 'OT hrs', align: 'right', mono: true, value: (row) => row.overtimeHours.toFixed(1), sortValue: (row) => row.overtimeHours },
    { key: 'gross', label: 'Gross', align: 'right', mono: true, value: (row) => taka(row.grossSalary), sortValue: (row) => row.grossSalary },
    { key: 'ded', label: 'Deductions', align: 'right', mono: true, value: (row) => taka(row.totalDeductions), sortValue: (row) => row.totalDeductions },
    { key: 'net', label: 'Net', align: 'right', mono: true, value: (row) => taka(row.netSalary), sortValue: (row) => row.netSalary },
  ];

  protected readonly rows = computed(() =>
    this.isSelfService()
      ? this.all().filter((row) => row.employeeId === this.session.employeeId())
      : this.all(),
  );

  protected readonly grossTotal = computed(() =>
    taka(this.rows().reduce((sum, row) => sum + row.grossSalary, 0)),
  );
  protected readonly deductionTotal = computed(() =>
    taka(this.rows().reduce((sum, row) => sum + row.totalDeductions, 0)),
  );
  protected readonly netTotal = computed(() =>
    taka(this.rows().reduce((sum, row) => sum + row.netSalary, 0)),
  );

  protected batchRef(batchId: string): string {
    return this.batches().find((batch) => batch.id === batchId)?.batchRef ?? batchId;
  }

  constructor() {
    for (const feature of [
      payslipsFeature,
      payrollBatchesFeature,
      employeesFeature,
      departmentsFeature,
      designationsFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
