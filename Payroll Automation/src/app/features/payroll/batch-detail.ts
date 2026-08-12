import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { BATCH_TONE, taka } from '../../core/models/common';
import { PayrollBatch, Payslip } from '../../core/models/hr';
import { employeeCode, employeeName } from '../../core/mock-db/seed/org';
import { batchTotals, runPayroll } from '../../core/payroll-engine';
import { SessionService } from '../../core/session';
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
import { EmptyState } from '../../shared/ui/empty-state';
import { Field, FieldList } from '../../shared/ui/field-list';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';

/**
 * The payroll run, end to end. The buttons follow the diagram exactly:
 * HR locks and runs the engine, submits for verification; the Accountant
 * either returns the batch with remarks or approves it, then generates the
 * bank transfer file and marks it paid.
 */
@Component({
  selector: 'app-batch-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeader, SectionCard, StatusBadge, FieldList, EmptyState],
  template: `
    @if (batch(); as batch) {
      <ui-page-header
        eyebrow="Payroll"
        [title]="batch.batchRef"
        [subtitle]="batch.month + ' · ' + batch.cycleStart + ' → ' + batch.cycleEnd"
        backLink="/payroll"
        backLabel="Payroll batches"
      >
        <ui-status-badge [label]="batch.status" [tone]="tone(batch.status)" />

        @if (batch.status === 'draft' && canRun()) {
          <button
            type="button"
            (click)="runEngine(batch)"
            class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Lock cycle and run engine
          </button>
        }
        @if ((batch.status === 'calculated' || batch.status === 'returned') && canRun()) {
          <button
            type="button"
            (click)="submit(batch)"
            class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Submit for verification
          </button>
        }
        @if (batch.status === 'pending-approval' && canApprove()) {
          <button
            type="button"
            (click)="approve(batch)"
            class="rounded-md bg-ok-600 px-3 py-2 text-sm font-medium text-white hover:bg-ok-700"
          >
            Approve batch
          </button>
          <button
            type="button"
            (click)="returnBatch(batch)"
            class="rounded-md border border-bad-600 px-3 py-2 text-sm font-medium text-bad-700 hover:bg-bad-100"
          >
            Return with remarks
          </button>
        }
        @if (batch.status === 'approved' && canApprove()) {
          <button
            type="button"
            (click)="pay(batch)"
            class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Generate bank file and mark paid
          </button>
        }
      </ui-page-header>

      @if (batch.remarks) {
        <p class="mb-4 rounded-md border border-bad-600 bg-bad-100 px-3 py-2 text-sm text-bad-700">
          Returned by the accountant: {{ batch.remarks }}
        </p>
      }

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_18rem]">
        <ui-section-card heading="Batch summary">
          <ui-field-list [fields]="summary()" />
        </ui-section-card>

        <ui-section-card heading="Engine steps" note="In order">
          <ol class="space-y-2 text-sm">
            @for (step of steps(); track step.label) {
              <li class="flex items-start gap-2">
                <span
                  class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  [class.bg-ok-600]="step.done"
                  [class.bg-ink-300]="!step.done"
                ></span>
                <span [class.text-ink-900]="step.done" [class.text-ink-500]="!step.done">
                  {{ step.label }}
                </span>
              </li>
            }
          </ol>
        </ui-section-card>
      </div>

      <div class="mt-4">
        <ui-section-card
          heading="Payslips"
          [note]="slips().length + ' employees in this cycle'"
          [padded]="false"
        >
          @if (slips().length) {
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
                    <th scope="col" class="px-3 py-2 font-medium">Code</th>
                    <th scope="col" class="px-3 py-2 font-medium">Employee</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">Hours</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">OT</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">Gross</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">Tax</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">PF</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">Loan</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">Bonus</th>
                    <th scope="col" class="px-3 py-2 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  @for (slip of slips(); track slip.id) {
                    <tr class="border-b border-ink-100 last:border-0 hover:bg-brand-100/40">
                      <td class="tnum px-3 py-2">{{ code(slip.employeeId) }}</td>
                      <td class="px-3 py-2">
                        <a
                          [routerLink]="['/payslips', slip.id]"
                          class="font-medium text-brand-600 hover:underline"
                        >
                          {{ name(slip.employeeId) }}
                        </a>
                      </td>
                      <td class="tnum px-3 py-2 text-right">{{ slip.workedHours.toFixed(1) }}</td>
                      <td class="tnum px-3 py-2 text-right">{{ slip.overtimeHours.toFixed(1) }}</td>
                      <td class="tnum px-3 py-2 text-right">{{ money(slip.grossSalary) }}</td>
                      <td class="tnum px-3 py-2 text-right">{{ money(slip.tax) }}</td>
                      <td class="tnum px-3 py-2 text-right">{{ money(slip.pf) }}</td>
                      <td class="tnum px-3 py-2 text-right">{{ money(slip.loanRecovery) }}</td>
                      <td class="tnum px-3 py-2 text-right">{{ money(slip.bonus) }}</td>
                      <td class="tnum px-3 py-2 text-right font-medium">
                        {{ money(slip.netSalary) }}
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="border-t border-ink-200 bg-ink-50 font-medium">
                    <td colspan="4" class="px-3 py-2">Totals</td>
                    <td class="tnum px-3 py-2 text-right">{{ money(batch.grossTotal) }}</td>
                    <td colspan="3" class="tnum px-3 py-2 text-right">
                      {{ money(batch.deductionTotal) }}
                    </td>
                    <td class="px-3 py-2"></td>
                    <td class="tnum px-3 py-2 text-right">{{ money(batch.netTotal) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          } @else {
            <ui-empty-state
              icon="coins"
              title="Not calculated yet"
              hint="Lock the cycle and run the engine to produce payslips."
            />
          }
        </ui-section-card>
      </div>

      @if (payment(); as pay) {
        <div class="mt-4">
          <ui-section-card heading="Bank payment">
            <ui-field-list
              [fields]="[
                { label: 'Bank file reference', value: pay.bankFileRef, mono: true },
                { label: 'Payment date', value: pay.paymentDate, mono: true },
                { label: 'Amount', value: money(pay.amount), mono: true },
                { label: 'Status', value: pay.status },
              ]"
            />
          </ui-section-card>
        </div>
      }
    } @else {
      <div class="rounded-lg border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
        Loading batch…
      </div>
    }
  `,
})
export class BatchDetailPage {
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly money = taka;
  protected readonly name = employeeName;
  protected readonly code = employeeCode;
  protected readonly tone = (status: PayrollBatch['status']) => BATCH_TONE[status];
  protected readonly canRun = this.session.canRequestPayroll;
  protected readonly canApprove = this.session.canApproveBatch;

  private readonly batches = this.store.selectSignal(payrollBatchesFeature.selectors.all);
  private readonly allSlips = this.store.selectSignal(payslipsFeature.selectors.all);
  private readonly payments = this.store.selectSignal(paymentsFeature.selectors.all);
  private readonly employees = this.store.selectSignal(employeesFeature.selectors.all);
  private readonly attendance = this.store.selectSignal(attendanceFeature.selectors.all);
  private readonly overtime = this.store.selectSignal(overtimeFeature.selectors.all);
  private readonly structures = this.store.selectSignal(salaryStructuresFeature.selectors.all);
  private readonly taxRules = this.store.selectSignal(taxRulesFeature.selectors.all);
  private readonly pfRules = this.store.selectSignal(pfRulesFeature.selectors.all);
  private readonly loans = this.store.selectSignal(loansFeature.selectors.all);
  private readonly bonuses = this.store.selectSignal(bonusesFeature.selectors.all);

  protected readonly batch = computed(() => this.batches().find((row) => row.id === this.id()));
  protected readonly slips = computed(() =>
    this.allSlips()
      .filter((slip) => slip.batchId === this.id())
      .slice()
      .sort((a, b) => a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true })),
  );
  protected readonly payment = computed(() =>
    this.payments().find((row) => row.batchId === this.id()),
  );

  protected readonly summary = computed<Field[]>(() => {
    const batch = this.batch();
    if (!batch) {
      return [];
    }
    return [
      { label: 'Cycle', value: `${batch.cycleStart} → ${batch.cycleEnd}`, mono: true },
      { label: 'Attendance locked', value: batch.locked ? 'Yes' : 'No' },
      { label: 'Employees', value: batch.employeeCount, mono: true },
      { label: 'Gross total', value: taka(batch.grossTotal), mono: true },
      { label: 'Deductions', value: taka(batch.deductionTotal), mono: true },
      { label: 'Net payable', value: taka(batch.netTotal), mono: true },
      { label: 'Requested by', value: batch.requestedBy },
      { label: 'Approved by', value: batch.approvedBy ?? '—' },
    ];
  });

  protected readonly steps = computed(() => {
    const status = this.batch()?.status ?? 'draft';
    const order: PayrollBatch['status'][] = [
      'draft',
      'calculated',
      'pending-approval',
      'approved',
      'paid',
    ];
    const reached = (target: PayrollBatch['status']) =>
      status === 'returned' ? order.indexOf(target) <= 1 : order.indexOf(status) >= order.indexOf(target);
    return [
      { label: 'Lock attendance and leave data', done: reached('calculated') },
      { label: 'Calculate working hours, late and overtime', done: reached('calculated') },
      { label: 'Calculate gross salary', done: reached('calculated') },
      { label: 'Calculate tax, PF, loan and bonus', done: reached('calculated') },
      { label: 'Calculate net salary and generate payslips', done: reached('calculated') },
      { label: 'Accountant verifies the batch', done: reached('approved') },
      { label: 'Process payment via bank', done: reached('paid') },
    ];
  });

  /** Runs the same pure engine the seed uses, so results are consistent. */
  protected runEngine(batch: PayrollBatch): void {
    const slips = runPayroll({
      employees: this.employees(),
      attendance: this.attendance(),
      overtime: this.overtime(),
      structures: this.structures(),
      loans: this.loans(),
      bonuses: this.bonuses(),
      taxRules: this.taxRules(),
      pfRule: this.pfRules()[0],
      // August has no seeded attendance, so the engine is run over the last
      // complete cycle — the demo shows the calculation, not a time machine.
      cycleStart: '2026-07-01',
      cycleEnd: '2026-07-31',
      batchId: batch.id,
    });

    this.store.dispatch(payslipsFeature.actions.upsertMany({ items: slips }));
    this.store.dispatch(
      payrollBatchesFeature.actions.upsert({
        item: { ...batch, status: 'calculated', locked: true, ...batchTotals(slips) },
      }),
    );
  }

  protected submit(batch: PayrollBatch): void {
    this.store.dispatch(
      payrollBatchesFeature.actions.upsert({
        item: { ...batch, status: 'pending-approval', remarks: undefined },
      }),
    );
  }

  protected approve(batch: PayrollBatch): void {
    this.store.dispatch(
      payrollBatchesFeature.actions.upsert({
        item: { ...batch, status: 'approved', approvedBy: 'rakib.hasan', remarks: undefined },
      }),
    );
  }

  protected returnBatch(batch: PayrollBatch): void {
    this.store.dispatch(
      payrollBatchesFeature.actions.upsert({
        item: {
          ...batch,
          status: 'returned',
          remarks: 'Overtime hours unverified for the sewing lines; re-check before resubmitting.',
        },
      }),
    );
  }

  protected pay(batch: PayrollBatch): void {
    const ref = `BRAC-BEFTN-${batch.cycleEnd.replace(/-/g, '')}-${batch.id.toUpperCase()}`;
    this.store.dispatch(
      paymentsFeature.actions.upsertMany({
        items: [
          {
            id: `pay-${batch.id}`,
            batchId: batch.id,
            amount: batch.netTotal,
            paymentDate: batch.cycleEnd,
            bankFileRef: ref,
            status: 'processed',
          },
        ],
      }),
    );
    this.store.dispatch(
      payrollBatchesFeature.actions.upsert({ item: { ...batch, status: 'paid' } }),
    );
  }

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
