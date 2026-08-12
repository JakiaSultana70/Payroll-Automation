import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Designation } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'app-designation-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal [heading]="existing() ? 'Edit designation' : 'Add designation'" (dismiss)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" id="designation-form">
        <ui-form-field label="Title" for="title" [error]="errorFor('title')">
          <input id="title" type="text" formControlName="title" [class]="inputClass" />
        </ui-form-field>
        <ui-form-field label="Grade" for="grade" [error]="errorFor('grade')">
          <input id="grade" type="text" formControlName="grade" [class]="inputClass" />
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
        form="designation-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {{ existing() ? 'Save changes' : 'Add designation' }}
      </button>
    </ui-modal>
  `,
})
export class DesignationForm {
  readonly existing = input<Designation | null>(null);
  readonly submitted = output<Designation>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    grade: ['', [Validators.required]],
  });

  constructor() {
    const desig = this.existing();
    if (desig) {
      this.form.reset({ title: desig.title, grade: desig.grade });
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
    const desig = this.existing();
    this.submitted.emit({ id: desig?.id ?? `g-${Date.now()}`, title: value.title, grade: value.grade });
  }
}
