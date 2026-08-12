import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppUser, Employee, Role } from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

export interface NewUserResult {
  user: AppUser;
  tempPassword: string;
}

function tempPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Welcome@${digits}`;
}

/** "Admin: Manage Users" — links a login to an existing employee record and
 *  a role. There's no email server here, so the temporary password is shown
 *  once on screen instead of being emailed out. */
@Component({
  selector: 'app-user-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal heading="Create user account" description="Links a login to an employee record." (dismiss)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" id="user-form">
        <ui-form-field label="Employee" for="employeeId" [error]="errorFor('employeeId')">
          <select id="employeeId" formControlName="employeeId" [class]="inputClass">
            <option value="">Select an employee</option>
            @for (emp of eligibleEmployees(); track emp.id) {
              <option [value]="emp.id">{{ emp.name }} ({{ emp.employeeCode }})</option>
            }
          </select>
        </ui-form-field>

        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field label="Username" for="username" [error]="errorFor('username')">
            <input id="username" type="text" formControlName="username" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="Email" for="email" [error]="errorFor('email')">
            <input id="email" type="email" formControlName="email" [class]="inputClass" />
          </ui-form-field>
        </div>

        <ui-form-field label="Role" for="roleId" [error]="errorFor('roleId')">
          <select id="roleId" formControlName="roleId" [class]="inputClass">
            <option value="">Select a role</option>
            @for (role of roles(); track role.id) {
              <option [value]="role.id">{{ role.roleName }}</option>
            }
          </select>
        </ui-form-field>

        @if (usernameTaken()) {
          <p class="mb-3 text-xs text-bad-700" role="alert">
            That username is already in use — choose another.
          </p>
        }
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
        form="user-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Create account
      </button>
    </ui-modal>
  `,
})
export class UserForm {
  readonly employees = input.required<readonly Employee[]>();
  readonly roles = input.required<readonly Role[]>();
  readonly existingEmployeeIds = input.required<readonly string[]>();
  readonly existingUsernames = input.required<readonly string[]>();

  readonly submitted = output<NewUserResult>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly eligibleEmployees = computed(() =>
    this.employees().filter((emp) => !this.existingEmployeeIds().includes(emp.id)),
  );

  protected readonly form = this.fb.nonNullable.group({
    employeeId: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.pattern(/^[a-z0-9.]{3,}$/i)]],
    email: ['', [Validators.required, Validators.email]],
    roleId: ['', [Validators.required]],
  });

  protected readonly usernameTaken = computed(() => {
    const value = this.form.controls.username.value.trim().toLowerCase();
    return !!value && this.existingUsernames().some((name) => name.toLowerCase() === value);
  });

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
    if (field.errors?.['email']) {
      return 'Enter a valid email address.';
    }
    if (field.errors?.['pattern']) {
      return 'Letters, numbers and dots only, at least 3 characters.';
    }
    return 'Check this field.';
  }

  protected submit(): void {
    this.attempted.set(true);
    if (this.form.invalid || this.usernameTaken()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const user: AppUser = {
      id: `u-${Date.now()}`,
      username: value.username,
      email: value.email,
      employeeId: value.employeeId,
      roleId: value.roleId,
      status: 'active',
    };
    this.submitted.emit({ user, tempPassword: tempPassword() });
  }
}
