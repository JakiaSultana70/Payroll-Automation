import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { taka } from '../../core/models/common';
import { employeeCode, employeeName } from '../../core/mock-db/seed/org';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  payrollBatchesFeature,
  payslipsFeature,
} from '../../core/store/features';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';

@Component({
  selector: 'app-payslip-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, SectionCard],
  template: `
    @if (slip(); as slip) {
      <ui-page-header
        eyebrow="Payroll"
        [title]="name(slip.employeeId)"
        [subtitle]="batchLabel() + ' · ' + code(slip.employeeId)"
        backLink="/payslips"
        backLabel="Payslips"
      >
        <button
          type="button"
          (click)="download()"
          class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Download payslip PDF
        </button>
      </ui-page-header>

      @if (downloaded()) {
        <p class="mb-4 rounded-md border border-ok-600 bg-ok-100 px-3 py-2 text-sm text-ok-700">
          Payslip queued for download — <span class="tnum">{{ slip.pdfUrl }}</span>
          (mock: no file is written).
        </p>
      }

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ui-section-card heading="Earnings">
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-ink-500">Basic</dt>
              <dd class="tnum">{{ money(slip.basic) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-ink-500">House rent</dt>
              <dd class="tnum">{{ money(slip.hra) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-ink-500">Allowances</dt>
              <dd class="tnum">{{ money(slip.allowances) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-ink-500">Overtime ({{ slip.overtimeHours.toFixed(1) }} h)</dt>
              <dd class="tnum">{{ money(slip.overtimeAmount) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-ink-500">Bonus</dt>
              <dd class="tnum">{{ money(slip.bonus) }}</dd>
            </div>
            <div class="flex justify-between border-t border-ink-100 pt-2 font-medium">
              <dt>Gross earnings</dt>
              <dd class="tnum">{{ money(slip.grossSalary + slip.bonus) }}</dd>
            </div>
          </dl>
        </ui-section-card>

        <ui-section-card heading="Deductions">
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-ink-500">Income tax</dt>
              <dd class="tnum">{{ money(slip.tax) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-ink-500">Provident fund</dt>
              <dd class="tnum">{{ money(slip.pf) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-ink-500">Loan recovery</dt>
              <dd class="tnum">{{ money(slip.loanRecovery) }}</dd>
            </div>
            <div class="flex justify-between border-t border-ink-100 pt-2 font-medium">
              <dt>Total deductions</dt>
              <dd class="tnum">{{ money(slip.totalDeductions) }}</dd>
            </div>
            <div
              class="mt-3 flex justify-between rounded-md bg-brand-100 px-3 py-2 text-base font-semibold text-brand-800"
            >
              <dt>Net pay</dt>
              <dd class="tnum">{{ money(slip.netSalary) }}</dd>
            </div>
          </dl>
        </ui-section-card>
      </div>

      <div class="mt-4">
        <ui-section-card heading="Attendance basis">
          <dl class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs tracking-wide text-ink-500 uppercase">Hours worked</dt>
              <dd class="tnum mt-0.5">{{ slip.workedHours.toFixed(2) }} h</dd>
            </div>
            <div>
              <dt class="text-xs tracking-wide text-ink-500 uppercase">Overtime hours</dt>
              <dd class="tnum mt-0.5">{{ slip.overtimeHours.toFixed(2) }} h</dd>
            </div>
            <div>
              <dt class="text-xs tracking-wide text-ink-500 uppercase">Cycle</dt>
              <dd class="tnum mt-0.5">{{ cycle() }}</dd>
            </div>
          </dl>
        </ui-section-card>
      </div>
    } @else {
      <div class="rounded-lg border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
        Loading payslip…
      </div>
    }
  `,
})
export class PayslipDetailPage {
  readonly id = input.required<string>();

  private readonly store = inject(Store);

  protected readonly money = taka;
  protected readonly name = employeeName;
  protected readonly code = employeeCode;
  protected readonly downloaded = signal(false);

  private readonly slips = this.store.selectSignal(payslipsFeature.selectors.all);
  private readonly batches = this.store.selectSignal(payrollBatchesFeature.selectors.all);

  protected readonly slip = computed(() => this.slips().find((row) => row.id === this.id()));

  private readonly batch = computed(() =>
    this.batches().find((row) => row.id === this.slip()?.batchId),
  );
  protected readonly batchLabel = computed(() => this.batch()?.month ?? '—');
  protected readonly cycle = computed(() => {
    const batch = this.batch();
    return batch ? `${batch.cycleStart} → ${batch.cycleEnd}` : '—';
  });

  protected download(): void {
    this.downloaded.set(true);
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
