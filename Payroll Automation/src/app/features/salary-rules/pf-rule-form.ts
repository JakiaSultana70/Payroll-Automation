import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PFRule } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'app-pf-rule-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal
      [heading]="existing() ? 'Edit provident fund rule' : 'Add provident fund rule'"
      (dismiss)="cancelled.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" id="pf-rule-form">
        <ui-form-field label="Scheme name" for="name" [error]="errorFor('name')">
          <input id="name" type="text" formControlName="name" [class]="inputClass" />
        </ui-form-field>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field
            label="Employee contribution (%)"
            for="employeeContributionPct"
            [error]="errorFor('employeeContributionPct')"
          >
            <input
              id="employeeContributionPct"
              type="number"
              min="0"
              max="100"
              formControlName="employeeContributionPct"
              [class]="inputClass"
            />
          </ui-form-field>
          <ui-form-field
            label="Employer contribution (%)"
            for="employerContributionPct"
            [error]="errorFor('employerContributionPct')"
          >
            <input
              id="employerContributionPct"
              type="number"
              min="0"
              max="100"
              formControlName="employerContributionPct"
              [class]="inputClass"
            />
          </ui-form-field>
        </div>
        <ui-form-field label="Effective from" for="effectiveFrom" [error]="errorFor('effectiveFrom')">
          <input id="effectiveFrom" type="date" formControlName="effectiveFrom" [class]="inputClass" />
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
        form="pf-rule-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {{ existing() ? 'Save changes' : 'Add rule' }}
      </button>
    </ui-modal>
  `,
})
export class PfRuleForm {
  readonly existing = input<PFRule | null>(null);
  readonly submitted = output<PFRule>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    employeeContributionPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    employerContributionPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    effectiveFrom: ['', [Validators.required]],
  });

  constructor() {
    const rule = this.existing();
    if (rule) {
      this.form.reset({
        name: rule.name,
        employeeContributionPct: rule.employeeContributionPct,
        employerContributionPct: rule.employerContributionPct,
        effectiveFrom: rule.effectiveFrom,
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
    if (field.errors?.['min'] || field.errors?.['max']) {
      return 'Out of range.';
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
    const rule = this.existing();
    this.submitted.emit({
      id: rule?.id ?? `pf-${Date.now()}`,
      name: value.name,
      employeeContributionPct: Number(value.employeeContributionPct),
      employerContributionPct: Number(value.employerContributionPct),
      effectiveFrom: value.effectiveFrom,
    });
  }
}
