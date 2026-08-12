import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaxRule } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'app-tax-rule-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal [heading]="existing() ? 'Edit tax slab' : 'Add tax slab'" (dismiss)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" id="tax-rule-form">
        <ui-form-field label="Slab name" for="slabName" [error]="errorFor('slabName')">
          <input id="slabName" type="text" formControlName="slabName" [class]="inputClass" />
        </ui-form-field>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <ui-form-field label="From (annual income)" for="minIncome" [error]="errorFor('minIncome')">
            <input id="minIncome" type="number" min="0" formControlName="minIncome" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="To (annual income)" for="maxIncome" [error]="errorFor('maxIncome')">
            <input id="maxIncome" type="number" min="0" formControlName="maxIncome" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="Rate (%)" for="rate" [error]="errorFor('rate')">
            <input id="rate" type="number" min="0" max="100" formControlName="rate" [class]="inputClass" />
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
        form="tax-rule-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {{ existing() ? 'Save changes' : 'Add slab' }}
      </button>
    </ui-modal>
  `,
})
export class TaxRuleForm {
  readonly existing = input<TaxRule | null>(null);
  readonly submitted = output<TaxRule>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    slabName: ['', [Validators.required]],
    minIncome: [0, [Validators.required, Validators.min(0)]],
    maxIncome: [0, [Validators.required, Validators.min(0)]],
    rate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    effectiveFrom: ['', [Validators.required]],
  });

  constructor() {
    const rule = this.existing();
    if (rule) {
      this.form.reset({
        slabName: rule.slabName,
        minIncome: rule.minIncome,
        maxIncome: rule.maxIncome,
        rate: rule.rate,
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
      id: rule?.id ?? `tax-${Date.now()}`,
      slabName: value.slabName,
      minIncome: Number(value.minIncome),
      maxIncome: Number(value.maxIncome),
      rate: Number(value.rate),
      effectiveFrom: value.effectiveFrom,
    });
  }
}
