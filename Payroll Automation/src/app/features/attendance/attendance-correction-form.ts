import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Attendance, AttendanceStatus } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'leave', 'holiday', 'weekend'];

/** HR/Admin correction — the diagram's "raw punches are never edited, a
 *  correction is recorded with a reason." `correctedBy` is stamped by the
 *  page from the signed-in user, never left to the form. */
@Component({
  selector: 'app-attendance-correction-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal
      heading="Correct attendance entry"
      [description]="employeeLabel() + ' — ' + record().date"
      (dismiss)="cancelled.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" id="attendance-correction-form">
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field label="Check in" for="checkIn" [optional]="true">
            <input id="checkIn" type="time" formControlName="checkIn" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="Check out" for="checkOut" [optional]="true">
            <input id="checkOut" type="time" formControlName="checkOut" [class]="inputClass" />
          </ui-form-field>
        </div>

        <ui-form-field label="Status" for="status">
          <select id="status" formControlName="status" [class]="inputClass">
            @for (status of statuses; track status) {
              <option [value]="status">{{ status }}</option>
            }
          </select>
        </ui-form-field>

        <ui-form-field
          label="Reason for correction"
          for="correctionReason"
          [error]="errorFor('correctionReason')"
        >
          <textarea
            id="correctionReason"
            formControlName="correctionReason"
            rows="2"
            placeholder="e.g. Forgot to check out, biometric device was offline"
            [class]="inputClass"
          ></textarea>
        </ui-form-field>
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
        form="attendance-correction-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Save correction
      </button>
    </ui-modal>
  `,
})
export class AttendanceCorrectionForm {
  readonly record = input.required<Attendance>();
  readonly employeeLabel = input.required<string>();
  readonly submitted = output<Attendance>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly statuses = STATUSES;
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    checkIn: [''],
    checkOut: [''],
    status: 'present' as AttendanceStatus,
    correctionReason: ['', [Validators.required, Validators.minLength(5)]],
  });

  constructor() {
    // `record` is a required input — not guaranteed to be bound yet while
    // the constructor runs — so it's read inside `effect()` instead, which
    // Angular runs once bindings are resolved.
    effect(() => {
      const rec = this.record();
      this.form.reset({
        checkIn: rec.checkIn ?? '',
        checkOut: rec.checkOut ?? '',
        status: rec.status,
        correctionReason: '',
      });
    });
  }

  protected errorFor(control: string): string {
    if (!this.attempted()) {
      return '';
    }
    const field = this.form.get(control);
    if (!field || field.valid) {
      return '';
    }
    if (field.errors?.['required']) {
      return 'Explain why this entry was corrected.';
    }
    if (field.errors?.['minlength']) {
      return 'A few more words, please — this goes on the audit trail.';
    }
    return 'Check this field.';
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const rec = this.record();
    const checkIn = value.checkIn || undefined;
    const checkOut = value.checkOut || undefined;
    this.submitted.emit({
      ...rec,
      checkIn,
      checkOut,
      status: value.status,
      workedHours: workedHoursOf(checkIn, checkOut),
      correctionReason: value.correctionReason,
    });
  }
}

/** Simple HH:MM difference in hours, floored at zero. No break deduction
 *  here — the shift's break time is already netted out when the entry was
 *  first recorded; a correction only adjusts the punch times themselves. */
function workedHoursOf(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) {
    return 0;
  }
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const diff = outH * 60 + outM - (inH * 60 + inM);
  return diff > 0 ? Math.round((diff / 60) * 100) / 100 : 0;
}
