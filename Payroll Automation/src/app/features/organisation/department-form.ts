import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Department, Employee } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'app-department-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal [heading]="existing() ? 'Edit department' : 'Add department'" (dismiss)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" id="department-form">
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field label="Code" for="code" [error]="errorFor('code')">
            <input id="code" type="text" formControlName="code" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="Name" for="name" [error]="errorFor('name')">
            <input id="name" type="text" formControlName="name" [class]="inputClass" />
          </ui-form-field>
        </div>
        <ui-form-field label="Department head" for="headEmployeeId" [optional]="true">
          <select id="headEmployeeId" formControlName="headEmployeeId" [class]="inputClass">
            <option value="">Not assigned</option>
            @for (emp of employees(); track emp.id) {
              <option [value]="emp.id">{{ emp.name }}</option>
            }
          </select>
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
        form="department-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {{ existing() ? 'Save changes' : 'Add department' }}
      </button>
    </ui-modal>
  `,
})
export class DepartmentForm {
  readonly existing = input<Department | null>(null);
  readonly employees = input.required<readonly Employee[]>();
  readonly submitted = output<Department>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    headEmployeeId: '',
  });

  constructor() {
    const dept = this.existing();
    if (dept) {
      this.form.reset({ code: dept.code, name: dept.name, headEmployeeId: dept.headEmployeeId ?? '' });
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
    const dept = this.existing();
    this.submitted.emit({
      id: dept?.id ?? `d-${Date.now()}`,
      code: value.code,
      name: value.name,
      headEmployeeId: value.headEmployeeId || undefined,
    });
  }
}
