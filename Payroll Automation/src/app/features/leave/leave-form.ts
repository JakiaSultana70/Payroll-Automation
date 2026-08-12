import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LeaveBalance, LeaveRequest, LeaveType } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';
import { countDays, validateLeaveRequest } from './leave-rules';

const LEAVE_TYPES: LeaveType[] = ['Casual', 'Sick', 'Earned', 'Maternity', 'Unpaid'];

/**
 * "Apply Leave → Submit Leave Request" from the diagram.
 *
 * The component owns no rules: it renders `validateLeaveRequest` and emits a
 * request. Errors appear only after a submit attempt, so the form does not
 * scold someone who is still filling it in.
 */
@Component({
  selector: 'app-leave-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal
      heading="Apply for leave"
      description="Your application goes to HR for approval."
      (dismiss)="cancelled.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" id="leave-form">
        <ui-form-field label="Leave type" for="leaveType" [error]="errorFor('leaveType')">
          <select
            id="leaveType"
            formControlName="leaveType"
            class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            @for (type of types; track type) {
              <option [value]="type">{{ type }} — {{ remainingFor(type) }}</option>
            }
          </select>
        </ui-form-field>

        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field label="First day" for="startDate" [error]="errorFor('startDate')">
            <input
              id="startDate"
              type="date"
              formControlName="startDate"
              class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </ui-form-field>

          <ui-form-field label="Last day" for="endDate" [error]="errorFor('endDate')">
            <input
              id="endDate"
              type="date"
              formControlName="endDate"
              class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </ui-form-field>
        </div>

        <ui-form-field
          label="Reason"
          for="reason"
          [error]="errorFor('reason')"
          hint="Seen by HR when they review the request."
        >
          <textarea
            id="reason"
            formControlName="reason"
            rows="3"
            class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          ></textarea>
        </ui-form-field>

        <p class="rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-700">
          @if (days() > 0) {
            <span class="tnum font-medium">{{ days() }}</span> day(s) requested.
            @if (draft().leaveType !== 'Unpaid') {
              Balance after approval:
              <span class="tnum font-medium">{{ balanceAfter() }}</span> day(s).
            }
          } @else {
            Choose a date range to see the day count.
          }
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
        form="leave-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Submit request
      </button>
    </ui-modal>
  `,
})
export class LeaveForm {
  readonly employeeId = input.required<string>();
  readonly balances = input.required<readonly LeaveBalance[]>();
  readonly existing = input.required<readonly LeaveRequest[]>();

  readonly submitted = output<LeaveRequest>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly types = LEAVE_TYPES;
  private readonly attempted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    leaveType: 'Casual' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
  });

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly draft = computed(() => {
    const raw = this.value();
    return {
      employeeId: this.employeeId(),
      leaveType: (raw.leaveType ?? 'Casual') as LeaveType,
      startDate: raw.startDate ?? '',
      endDate: raw.endDate ?? '',
      reason: raw.reason ?? '',
    };
  });

  protected readonly days = computed(() =>
    countDays(this.draft().startDate, this.draft().endDate),
  );

  private readonly errors = computed(() =>
    validateLeaveRequest(this.draft(), {
      balances: [...this.balances()],
      existing: [...this.existing()],
    }),
  );

  protected readonly balanceAfter = computed(() => {
    const balance = this.balanceOf(this.draft().leaveType);
    return balance ? balance.remaining - this.days() : 0;
  });

  protected errorFor(field: string): string {
    return this.attempted() ? (this.errors()[field] ?? '') : '';
  }

  protected remainingFor(type: LeaveType): string {
    if (type === 'Unpaid') {
      return 'no balance required';
    }
    const balance = this.balanceOf(type);
    return balance ? `${balance.remaining} day(s) left` : 'not entitled';
  }

  protected submit(): void {
    this.attempted.set(true);
    if (Object.keys(this.errors()).length) {
      return;
    }

    const draft = this.draft();
    const today = new Date().toISOString().slice(0, 10);
    this.submitted.emit({
      id: `lv-${draft.employeeId}-${Date.now()}`,
      employeeId: draft.employeeId,
      leaveType: draft.leaveType,
      startDate: draft.startDate,
      endDate: draft.endDate,
      days: this.days(),
      reason: draft.reason.trim(),
      status: 'pending',
      appliedAt: today,
    });
  }

  private balanceOf(type: LeaveType): LeaveBalance | undefined {
    return this.balances().find(
      (row) => row.employeeId === this.employeeId() && row.leaveType === type,
    );
  }
}
