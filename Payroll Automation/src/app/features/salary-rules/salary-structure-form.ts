import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Employee, SalaryStructure } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'app-salary-structure-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal
      [heading]="existing() ? 'Edit salary structure' : 'Add salary structure'"
      (dismiss)="cancelled.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" id="salary-structure-form">
        @if (!existing()) {
          <ui-form-field label="Employee" for="employeeId" [error]="errorFor('employeeId')">
            <select id="employeeId" formControlName="employeeId" [class]="inputClass">
              <option value="">Select an employee</option>
              @for (emp of employeesWithoutStructure(); track emp.id) {
                <option [value]="emp.id">{{ emp.name }}</option>
              }
            </select>
          </ui-form-field>
        }

        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <ui-form-field label="Basic" for="basic" [error]="errorFor('basic')">
            <input id="basic" type="number" min="0" formControlName="basic" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="House rent" for="hra" [error]="errorFor('hra')">
            <input id="hra" type="number" min="0" formControlName="hra" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="Allowances" for="allowances" [error]="errorFor('allowances')">
            <input id="allowances" type="number" min="0" formControlName="allowances" [class]="inputClass" />
          </ui-form-field>
        </div>

        <p class="mb-3 text-sm text-ink-600">Gross salary: <span class="tnum font-medium">{{ gross() }}</span></p>

        <ui-form-field label="Effective from" for="effectiveFrom" [error]="errorFor('effectiveFrom')">
          <input id="effectiveFrom" type="date" formControlName="effectiveFrom" [class]="inputClass" />
        </ui-form-field>

        <div class="flex gap-4">
          <label class="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" formControlName="appliesTax" class="h-4 w-4 rounded border-ink-300" />
            Tax applies
          </label>
          <label class="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" formControlName="appliesPF" class="h-4 w-4 rounded border-ink-300" />
            PF applies
          </label>
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
        form="salary-structure-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {{ existing() ? 'Save changes' : 'Add structure' }}
      </button>
    </ui-modal>
  `,
})
export class SalaryStructureForm {
  readonly existing = input<SalaryStructure | null>(null);
  readonly employees = input.required<readonly Employee[]>();
  readonly existingEmployeeIds = input.required<readonly string[]>();
  readonly submitted = output<SalaryStructure>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly employeesWithoutStructure = computed(() =>
    this.employees().filter((emp) => !this.existingEmployeeIds().includes(emp.id)),
  );

  protected readonly form = this.fb.nonNullable.group({
    employeeId: ['', [Validators.required]],
    basic: [0, [Validators.required, Validators.min(0)]],
    hra: [0, [Validators.required, Validators.min(0)]],
    allowances: [0, [Validators.required, Validators.min(0)]],
    effectiveFrom: ['', [Validators.required]],
    appliesTax: true,
    appliesPF: true,
  });

  protected gross(): string {
    const value = this.form.getRawValue();
    return `৳${(Number(value.basic) + Number(value.hra) + Number(value.allowances)).toLocaleString('en-US')}`;
  }

  constructor() {
    const row = this.existing();
    if (row) {
      this.form.reset({
        employeeId: row.employeeId,
        basic: row.basic,
        hra: row.hra,
        allowances: row.allowances,
        effectiveFrom: row.effectiveFrom,
        appliesTax: row.appliesTax,
        appliesPF: row.appliesPF,
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
    if (field.errors?.['required']) {
      return 'This field is required.';
    }
    if (field.errors?.['min']) {
      return 'Must be zero or more.';
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
    const row = this.existing();
    const basic = Number(value.basic);
    const hra = Number(value.hra);
    const allowances = Number(value.allowances);
    this.submitted.emit({
      id: row?.id ?? `ss-${Date.now()}`,
      employeeId: row?.employeeId ?? value.employeeId,
      basic,
      hra,
      allowances,
      grossSalary: basic + hra + allowances,
      effectiveFrom: value.effectiveFrom,
      appliesTax: value.appliesTax,
      appliesPF: value.appliesPF,
    });
  }
}
