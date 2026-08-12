import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { APPROVAL_TONE, taka } from '../../core/models/common';
import { BonusRecord, LoanRecord } from '../../core/models/hr';
import { employeeName } from '../../core/mock-db/seed/org';
import {
  bonusesFeature,
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  loansFeature,
} from '../../core/store/features';
import { Column, DataTable } from '../../shared/ui/data-table';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';

@Component({
  selector: 'app-loans-bonuses-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiTile, SectionCard, DataTable],
  template: `
    <ui-page-header
      eyebrow="Payroll"
      title="Loans &amp; bonuses"
      subtitle="Recovery schedules deducted, approved bonuses added, by the engine"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Active loans" [value]="activeLoans().length" hint="Under recovery" />
      <ui-kpi-tile label="Outstanding" [value]="outstanding()" hint="Total still to recover" tone="warn" />
      <ui-kpi-tile label="Monthly EMI" [value]="monthlyEmi()" hint="Deducted each cycle" />
      <ui-kpi-tile
        label="Bonus approved"
        [value]="approvedBonus()"
        hint="Added to this cycle's pay"
        tone="ok"
      />
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4">
      <ui-section-card heading="Loan records" [padded]="false">
        <ui-data-table
          [columns]="loanColumns"
          [rows]="loans()"
          searchPlaceholder="Search employee"
          emptyTitle="No loan on record"
        />
      </ui-section-card>

      <ui-section-card heading="Bonus records" [padded]="false">
        <ui-data-table
          [columns]="bonusColumns"
          [rows]="bonuses()"
          searchPlaceholder="Search employee or type"
          emptyTitle="No bonus on record"
        />
      </ui-section-card>
    </div>
  `,
})
export class LoansBonusesPage {
  private readonly store = inject(Store);

  protected readonly loanColumns: Column<LoanRecord>[] = [
    { key: 'name', label: 'Employee', value: (row) => employeeName(row.employeeId) },
    { key: 'principal', label: 'Principal', align: 'right', mono: true, value: (row) => taka(row.principal), sortValue: (row) => row.principal },
    { key: 'emi', label: 'Monthly EMI', align: 'right', mono: true, value: (row) => taka(row.emiAmount), sortValue: (row) => row.emiAmount },
    { key: 'out', label: 'Outstanding', align: 'right', mono: true, value: (row) => taka(row.outstandingBalance), sortValue: (row) => row.outstandingBalance },
    { key: 'start', label: 'Started', mono: true, value: (row) => row.startDate },
    {
      key: 'status',
      label: 'Status',
      value: (row) => row.status,
      badge: (row) => ({ label: row.status, tone: row.status === 'active' ? 'warn' : 'ok' }),
    },
  ];

  protected readonly bonusColumns: Column<BonusRecord>[] = [
    { key: 'name', label: 'Employee', value: (row) => employeeName(row.employeeId) },
    { key: 'type', label: 'Type', value: (row) => row.type },
    { key: 'amount', label: 'Amount', align: 'right', mono: true, value: (row) => taka(row.amount), sortValue: (row) => row.amount },
    { key: 'date', label: 'Payment date', mono: true, value: (row) => row.paymentDate },
    {
      key: 'status',
      label: 'Status',
      value: (row) => row.status,
      badge: (row) => ({ label: row.status, tone: APPROVAL_TONE[row.status] }),
    },
  ];

  protected readonly loans = this.store.selectSignal(loansFeature.selectors.all);
  protected readonly bonuses = this.store.selectSignal(bonusesFeature.selectors.all);

  protected readonly activeLoans = computed(() =>
    this.loans().filter((row) => row.status === 'active'),
  );
  protected readonly outstanding = computed(() =>
    taka(this.activeLoans().reduce((sum, row) => sum + row.outstandingBalance, 0)),
  );
  protected readonly monthlyEmi = computed(() =>
    taka(this.activeLoans().reduce((sum, row) => sum + row.emiAmount, 0)),
  );
  protected readonly approvedBonus = computed(() =>
    taka(
      this.bonuses()
        .filter((row) => row.status === 'approved')
        .reduce((sum, row) => sum + row.amount, 0),
    ),
  );

  constructor() {
    for (const feature of [
      loansFeature,
      bonusesFeature,
      employeesFeature,
      departmentsFeature,
      designationsFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
