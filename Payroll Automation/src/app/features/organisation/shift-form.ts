import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Shift } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'app-shift-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal [heading]="existing() ? 'Edit shift' : 'Add shift'" (dismiss)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" id="shift-form">
        <ui-form-field label="Name" for="name" [error]="errorFor('name')">
          <input id="name" type="text" formControlName="name" [class]="inputClass" />
        </ui-form-field>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field label="Start time" for="startTime" [error]="errorFor('startTime')">
            <input id="startTime" type="time" formControlName="startTime" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="End time" for="endTime" [error]="errorFor('endTime')">
            <input id="endTime" type="time" formControlName="endTime" [class]="inputClass" />
          </ui-form-field>
        </div>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field label="Break (minutes)" for="breakMinutes" [error]="errorFor('breakMinutes')">
            <input id="breakMinutes" type="number" min="0" formControlName="breakMinutes" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field
            label="Late grace (minutes)"
            for="lateAllowanceMinutes"
            [error]="errorFor('lateAllowanceMinutes')"
          >
            <input
              id="lateAllowanceMinutes"
              type="number"
              min="0"
              formControlName="lateAllowanceMinutes"
              [class]="inputClass"
            />
          </ui-form-field>
        </div>
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
        form="shift-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {{ existing() ? 'Save changes' : 'Add shift' }}
      </button>
    </ui-modal>
  `,
})
export class ShiftForm {
  readonly existing = input<Shift | null>(null);
  readonly submitted = output<Shift>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    startTime: ['', [Validators.required]],
    endTime: ['', [Validators.required]],
    breakMinutes: [0, [Validators.required, Validators.min(0)]],
    lateAllowanceMinutes: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    const shift = this.existing();
    if (shift) {
      this.form.reset({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakMinutes: shift.breakMinutes,
        lateAllowanceMinutes: shift.lateAllowanceMinutes,
      });
    }
  }

  protected errorFor(control: string): string {
    if (!this.attempted()) {
      return '';
    }
    const field = this.form.get(control);
    if (!field || field.valid) {
      return '';
    }
    return field.errors?.['required'] ? 'This field is required.' : 'Must be zero or more.';
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const shift = this.existing();
    this.submitted.emit({
      id: shift?.id ?? `sh-${Date.now()}`,
      name: value.name,
      startTime: value.startTime,
      endTime: value.endTime,
      breakMinutes: Number(value.breakMinutes),
      lateAllowanceMinutes: Number(value.lateAllowanceMinutes),
    });
  }
}
