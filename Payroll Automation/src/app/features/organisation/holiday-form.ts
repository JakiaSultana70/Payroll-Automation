import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Holiday } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'app-holiday-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal [heading]="existing() ? 'Edit holiday' : 'Add holiday'" (dismiss)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" id="holiday-form">
        <ui-form-field label="Name" for="name" [error]="errorFor('name')">
          <input id="name" type="text" formControlName="name" [class]="inputClass" />
        </ui-form-field>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field label="Date" for="date" [error]="errorFor('date')">
            <input id="date" type="date" formControlName="date" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="Type" for="type">
            <select id="type" formControlName="type" [class]="inputClass">
              <option value="public">Public</option>
              <option value="festival">Festival</option>
              <option value="weekly">Weekly</option>
            </select>
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
        form="holiday-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {{ existing() ? 'Save changes' : 'Add holiday' }}
      </button>
    </ui-modal>
  `,
})
export class HolidayForm {
  readonly existing = input<Holiday | null>(null);
  readonly submitted = output<Holiday>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    date: ['', [Validators.required]],
    type: 'public' as Holiday['type'],
  });

  constructor() {
    const holiday = this.existing();
    if (holiday) {
      this.form.reset({ name: holiday.name, date: holiday.date, type: holiday.type });
    }
  }

  protected errorFor(control: string): string {
    if (!this.attempted()) {
      return '';
    }
    const field = this.form.get(control);
    return field && !field.valid && field.errors?.['required'] ? 'This field is required.' : '';
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const holiday = this.existing();
    this.submitted.emit({
      id: holiday?.id ?? `hol-${Date.now()}`,
      name: value.name,
      date: value.date,
      type: value.type,
    });
  }
}
