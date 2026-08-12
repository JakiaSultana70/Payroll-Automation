import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { taka } from '../../core/models/common';
import { Employee, Overtime } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';
import {
  MONTHLY_OT_CEILING,
  claimAmount,
  monthlyHours,
  validateOvertimeClaim,
} from './overtime-rules';

/**
 * Records an overtime claim.
 *
 * Same shape as `leave-form.ts` with one addition: HR and Admin file claims on
 * behalf of a worker, so they get an employee picker restricted to eligible
 * staff, while an employee can only claim for themselves.
 */
@Component({
  selector: 'app-overtime-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal
      heading="Record overtime"
      description="Claims go to the line manager for approval before payroll picks them up."
      (dismiss)="cancelled.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" id="overtime-form">
        @if (canChooseEmployee()) {
          <ui-form-field label="Employee" for="employeeId" [error]="errorFor('employeeId')">
            <select
              id="employeeId"
              formControlName="employeeId"
              class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              @for (person of eligible(); track person.id) {
                <option [value]="person.id">{{ person.name }} — {{ person.employeeCode }}</option>
              }
            </select>
          </ui-form-field>
        } @else if (errorFor('employeeId')) {
          <p class="mb-4 rounded-md border border-bad-600 bg-bad-100 px-3 py-2 text-sm text-bad-700">
            {{ errorFor('employeeId') }}
          </p>
        }

        <ui-form-field label="Date worked" for="date" [error]="errorFor('date')">
          <input
            id="date"
            type="date"
            formControlName="date"
            class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </ui-form-field>

        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field
            label="Hours"
            for="hours"
            [error]="errorFor('hours')"
            hint="Beyond the rostered shift."
          >
            <input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              formControlName="hours"
              class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </ui-form-field>

          <ui-form-field label="Hourly rate" for="rate" [error]="errorFor('rate')">
            <input
              id="rate"
              type="number"
              step="5"
              min="0"
              formControlName="rate"
              class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </ui-form-field>
        </div>

        <ui-form-field
          label="Reason"
          for="reason"
          [error]="errorFor('reason')"
          hint="What the extra hours were spent on."
        >
          <textarea
            id="reason"
            rows="2"
            formControlName="reason"
            class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          ></textarea>
        </ui-form-field>

        <p class="rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-700">
          Claim value <span class="tnum font-medium">{{ money(amount()) }}</span
          >. Month to date:
          <span class="tnum font-medium">{{ monthTotal() }}</span> of
          <span class="tnum">{{ ceiling }}</span> hours.
        </p>
      </form>

      <button
        modalActions
        type="button"
        (click)="cancelled.emit()"
        class="rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
      >
        Cancel
      </button>
      <button
        modalActions
        type="submit"
        form="overtime-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Submit claim
      </button>
    </ui-modal>
  `,
})
export class OvertimeForm {
  readonly employeeId = input.required<string>();
  readonly employees = input.required<readonly Employee[]>();
  readonly existing = input.required<readonly Overtime[]>();
  /** HR and Admin file on behalf of a worker; an employee claims for themselves. */
  readonly canChooseEmployee = input(false);
  readonly today = input.required<string>();

  readonly submitted = output<Overtime>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly attempted = signal(false);

  protected readonly money = taka;
  protected readonly ceiling = MONTHLY_OT_CEILING;

  // Inputs are not bound yet when field initializers run, so the employee is
  // filled in from `ngOnInit` rather than here.
  protected readonly form = this.fb.nonNullable.group({
    employeeId: '',
    date: '',
    hours: 2,
    rate: 110,
    reason: '',
  });

  ngOnInit(): void {
    // Default to the signed-in person, but HR and Admin are rarely eligible for
    // overtime themselves — when they file on behalf, start on someone who
    // actually is, so the picker is never blank.
    const self = this.employeeId();
    const selfIsEligible = this.eligible().some((row) => row.id === self);
    const fallback = this.canChooseEmployee() ? (this.eligible()[0]?.id ?? self) : self;
    this.form.controls.employeeId.setValue(selfIsEligible ? self : fallback);
  }

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly eligible = computed(() =>
    this.employees().filter((row) => row.overtimeEligible && row.status === 'active'),
  );

  private readonly draft = computed(() => {
    const raw = this.value();
    return {
      employeeId: raw.employeeId || this.employeeId(),
      date: raw.date ?? '',
      hours: Number(raw.hours ?? 0),
      rate: Number(raw.rate ?? 0),
      reason: raw.reason ?? '',
    };
  });

  private readonly errors = computed(() =>
    validateOvertimeClaim(this.draft(), {
      employee: this.employees().find((row) => row.id === this.draft().employeeId),
      existing: [...this.existing()],
      today: this.today(),
    }),
  );

  protected readonly amount = computed(() =>
    claimAmount(this.draft().hours, this.draft().rate),
  );

  protected readonly monthTotal = computed(() => {
    const draft = this.draft();
    if (!draft.date) {
      return 0;
    }
    return monthlyHours(draft.employeeId, draft.date, [...this.existing()]) + draft.hours;
  });

  protected errorFor(field: string): string {
    return this.attempted() ? (this.errors()[field] ?? '') : '';
  }

  protected submit(): void {
    this.attempted.set(true);
    if (Object.keys(this.errors()).length) {
      return;
    }

    const draft = this.draft();
    this.submitted.emit({
      id: `ot-${draft.employeeId}-${Date.now()}`,
      employeeId: draft.employeeId,
      date: draft.date,
      hours: draft.hours,
      rate: draft.rate,
      amount: this.amount(),
      reason: draft.reason.trim(),
      status: 'pending',
      // Set only on approval — the engine must never pay an unapproved claim.
      payrollEligible: false,
    });
  }
}
