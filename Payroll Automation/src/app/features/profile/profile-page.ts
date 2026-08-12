import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AuditLogService } from '../../core/audit-log';
import { departmentName, designationTitle, shiftName } from '../../core/mock-db/seed/org';
import { Employee } from '../../core/models/hr';
import { SessionService } from '../../core/session';
import { departmentsFeature, designationsFeature, employeesFeature, shiftsFeature } from '../../core/store/features';
import { Field, FieldList } from '../../shared/ui/field-list';
import { FormField } from '../../shared/ui/form-field';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';

const MAX_PHOTO_BYTES = 1_500_000;

/**
 * "View profile / Update profile / Change password" from the shared account
 * menu in the source diagram. Every role reaches this page for their own
 * record — HR-owned fields (department, designation, salary grade, joining
 * date…) stay read-only here; only the person's own contact details, photo
 * and password are self-service.
 */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageHeader, SectionCard, FieldList, FormField, Icon],
  template: `
    <ui-page-header
      eyebrow="Account"
      title="My profile"
      subtitle="View your record, update your contact details and manage your password."
    />

    @if (employee(); as emp) {
      <ui-section-card heading="Photo">
        <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div class="relative">
            @if (emp.photoUrl) {
              <img
                [src]="emp.photoUrl"
                alt="{{ emp.name }}'s photo"
                class="h-20 w-20 rounded-full border border-ink-200 object-cover"
              />
            } @else {
              <span
                class="grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-xl font-semibold text-white"
              >
                {{ initials() }}
              </span>
            }
          </div>
          <div>
            <label
              for="photo-upload"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              <ui-icon name="camera" [size]="16" />
              Change photo
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/png,image/jpeg"
              class="sr-only"
              (change)="onPhotoSelected($event, emp)"
            />
            <p class="mt-1.5 text-xs text-ink-500">JPG or PNG, up to 1.5&nbsp;MB.</p>
            @if (photoError()) {
              <p class="mt-1 text-xs text-bad-700" role="alert">{{ photoError() }}</p>
            }
            @if (photoSaved()) {
              <p class="mt-1 text-xs text-ok-700">Photo updated.</p>
            }
          </div>
        </div>
      </ui-section-card>

      <div class="mt-4">
        <ui-section-card heading="Profile" note="Managed by HR — contact HR to change these">
          <ui-field-list [fields]="readOnlyFields(emp)" />
        </ui-section-card>
      </div>

      <div class="mt-4">
        <ui-section-card heading="Contact details">
          @if (!editingContact()) {
            <ui-field-list [fields]="contactFields(emp)" />
            <button
              type="button"
              (click)="startEditContact(emp)"
              class="mt-4 rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Edit contact details
            </button>
          } @else {
            <form [formGroup]="contactForm" (ngSubmit)="saveContact(emp)">
              <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <ui-form-field label="Phone" for="phone" [error]="contactErrorFor('phone')">
                  <input
                    id="phone"
                    type="tel"
                    formControlName="phone"
                    class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </ui-form-field>
                <ui-form-field label="Email" for="email" [error]="contactErrorFor('email')">
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </ui-form-field>
              </div>

              <ui-form-field label="Address" for="address" [error]="contactErrorFor('address')">
                <textarea
                  id="address"
                  formControlName="address"
                  rows="2"
                  class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                ></textarea>
              </ui-form-field>

              <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <ui-form-field
                  label="Emergency contact name"
                  for="emergencyContactName"
                  [optional]="true"
                >
                  <input
                    id="emergencyContactName"
                    type="text"
                    formControlName="emergencyContactName"
                    class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </ui-form-field>
                <ui-form-field
                  label="Emergency contact phone"
                  for="emergencyContactPhone"
                  [optional]="true"
                >
                  <input
                    id="emergencyContactPhone"
                    type="tel"
                    formControlName="emergencyContactPhone"
                    class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </ui-form-field>
              </div>

              <div class="flex gap-2">
                <button
                  type="submit"
                  class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  (click)="cancelEditContact()"
                  class="rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          }
        </ui-section-card>
      </div>

      <div class="mt-4">
        <ui-section-card heading="Change password">
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <ui-form-field
              label="Current password"
              for="currentPassword"
              [error]="passwordErrorFor('currentPassword')"
            >
              <input
                id="currentPassword"
                type="password"
                autocomplete="current-password"
                formControlName="currentPassword"
                class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </ui-form-field>

            <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <ui-form-field
                label="New password"
                for="newPassword"
                hint="At least 8 characters."
                [error]="passwordErrorFor('newPassword')"
              >
                <input
                  id="newPassword"
                  type="password"
                  autocomplete="new-password"
                  formControlName="newPassword"
                  class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </ui-form-field>
              <ui-form-field
                label="Confirm new password"
                for="confirmPassword"
                [error]="passwordErrorFor('confirmPassword')"
              >
                <input
                  id="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  formControlName="confirmPassword"
                  class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </ui-form-field>
            </div>

            @if (passwordMessage(); as msg) {
              <p
                class="mb-3 text-xs"
                [class.text-bad-700]="!passwordSuccess()"
                [class.text-ok-700]="passwordSuccess()"
                role="alert"
              >
                {{ msg }}
              </p>
            }

            <button
              type="submit"
              class="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <ui-icon name="lock" [size]="15" />
              Update password
            </button>
          </form>
        </ui-section-card>
      </div>
    } @else {
      <div class="rounded-lg border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
        Loading profile…
      </div>
    }
  `,
})
export class ProfilePage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);
  private readonly audit = inject(AuditLogService);
  private readonly fb = inject(FormBuilder);

  protected readonly initials = this.session.initials;

  private readonly employees = this.store.selectSignal(employeesFeature.selectors.all);
  protected readonly employee = computed(() =>
    this.employees().find((row) => row.id === this.session.employeeId()),
  );

  /* ── Photo ─────────────────────────────────────────────────────────── */

  protected readonly photoError = signal('');
  protected readonly photoSaved = signal(false);

  protected onPhotoSelected(event: Event, emp: Employee): void {
    this.photoError.set('');
    this.photoSaved.set(false);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.photoError.set('Please choose a JPG or PNG image.');
      input.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.photoError.set('That image is larger than 1.5 MB — choose a smaller one.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.store.dispatch(
        employeesFeature.actions.upsert({ item: { ...emp, photoUrl: dataUrl } }),
      );
      this.audit.record({
        actorRole: this.session.role(),
        actorName: this.session.displayName(),
        action: 'Updated profile photo',
        moduleName: 'Profile',
        details: emp.name,
      });
      this.photoSaved.set(true);
      input.value = '';
    };
    reader.onerror = () => this.photoError.set('Could not read that file — try again.');
    reader.readAsDataURL(file);
  }

  /* ── Read-only + contact fields ───────────────────────────────────── */

  protected readonly readOnlyFields = (emp: Employee): Field[] => [
    { label: 'Employee code', value: emp.employeeCode, mono: true },
    { label: 'Department', value: departmentName(emp.deptId) },
    { label: 'Designation', value: designationTitle(emp.designationId) },
    { label: 'Shift', value: shiftName(emp.shiftId) },
    { label: 'Employment type', value: emp.employmentType },
    { label: 'Joining date', value: emp.joiningDate, mono: true },
  ];

  protected readonly contactFields = (emp: Employee): Field[] => [
    { label: 'Phone', value: emp.phone, mono: true },
    { label: 'Email', value: emp.email },
    { label: 'Address', value: emp.address },
    { label: 'Emergency contact', value: emp.emergencyContactName ?? 'Not set' },
    { label: 'Emergency phone', value: emp.emergencyContactPhone ?? 'Not set', mono: true },
  ];

  protected readonly editingContact = signal(false);
  private contactAttempted = false;

  protected readonly contactForm = this.fb.nonNullable.group({
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    address: ['', [Validators.required]],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
  });

  protected startEditContact(emp: Employee): void {
    this.contactAttempted = false;
    this.contactForm.reset({
      phone: emp.phone,
      email: emp.email,
      address: emp.address,
      emergencyContactName: emp.emergencyContactName ?? '',
      emergencyContactPhone: emp.emergencyContactPhone ?? '',
    });
    this.editingContact.set(true);
  }

  protected cancelEditContact(): void {
    this.editingContact.set(false);
  }

  protected contactErrorFor(control: string): string {
    if (!this.contactAttempted) {
      return '';
    }
    const field = this.contactForm.get(control);
    if (!field || field.valid) {
      return '';
    }
    if (field.errors?.['required']) {
      return 'This field is required.';
    }
    if (field.errors?.['email']) {
      return 'Enter a valid email address.';
    }
    return 'Check this field.';
  }

  protected saveContact(emp: Employee): void {
    this.contactAttempted = true;
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    const value = this.contactForm.getRawValue();
    this.store.dispatch(
      employeesFeature.actions.upsert({
        item: {
          ...emp,
          phone: value.phone,
          email: value.email,
          address: value.address,
          emergencyContactName: value.emergencyContactName || undefined,
          emergencyContactPhone: value.emergencyContactPhone || undefined,
        },
      }),
    );
    this.audit.record({
      actorRole: this.session.role(),
      actorName: this.session.displayName(),
      action: 'Updated contact details',
      moduleName: 'Profile',
      details: emp.name,
    });
    this.editingContact.set(false);
  }

  /* ── Password ──────────────────────────────────────────────────────── */

  private passwordAttempted = false;
  protected readonly passwordMessage = signal('');
  protected readonly passwordSuccess = signal(false);

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  protected passwordErrorFor(control: string): string {
    if (!this.passwordAttempted) {
      return '';
    }
    const field = this.passwordForm.get(control);
    if (!field) {
      return '';
    }
    if (control === 'confirmPassword' && this.passwordForm.hasError('mismatch')) {
      return 'Passwords do not match.';
    }
    if (field.valid) {
      return '';
    }
    if (field.errors?.['required']) {
      return 'This field is required.';
    }
    if (field.errors?.['minlength']) {
      return 'At least 8 characters.';
    }
    return 'Check this field.';
  }

  protected changePassword(): void {
    this.passwordAttempted = true;
    this.passwordMessage.set('');
    this.passwordSuccess.set(false);

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordForm.setErrors({ mismatch: true });
      return;
    }
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const result = this.session.changePassword(currentPassword, newPassword);
    if (!result.ok) {
      this.passwordMessage.set(result.message);
      return;
    }
    this.passwordSuccess.set(true);
    this.passwordMessage.set('Your password has been updated.');
    this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    this.passwordAttempted = false;
  }

  constructor() {
    for (const feature of [employeesFeature, departmentsFeature, designationsFeature, shiftsFeature]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
