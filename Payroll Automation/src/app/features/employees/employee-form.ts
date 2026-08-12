import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Department,
  Designation,
  Employee,
  EMPLOYEE_STATUS_LABEL,
  EmployeeStatus,
  Shift,
} from '../../core/models/hr';
import { FormField } from '../../shared/ui/form-field';
import { Modal } from '../../shared/ui/modal';

const STATUSES: EmployeeStatus[] = ['draft', 'active', 'inactive', 'separated'];

/**
 * Add/edit form for the employee register. Creating leaves status at
 * `draft` — matching "HR: Onboard Employee → draft profile, Admin
 * activates" in the diagram — an existing record can be moved through any
 * status directly, since that edit is what the Admin activation flow, and
 * separation, actually do under the hood.
 */
@Component({
  selector: 'app-employee-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Modal, FormField],
  template: `
    <ui-modal
      [heading]="existing() ? 'Edit employee' : 'Add employee'"
      description="Fields marked * are required."
      (dismiss)="cancelled.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" id="employee-form">
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field label="Full name" for="name" [error]="errorFor('name')">
            <input id="name" type="text" formControlName="name" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="Employee code" for="employeeCode" [error]="errorFor('employeeCode')">
            <input id="employeeCode" type="text" formControlName="employeeCode" [class]="inputClass" />
          </ui-form-field>
        </div>

        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ui-form-field label="Email" for="email" [error]="errorFor('email')">
            <input id="email" type="email" formControlName="email" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="Phone" for="phone" [error]="errorFor('phone')">
            <input id="phone" type="tel" formControlName="phone" [class]="inputClass" />
          </ui-form-field>
        </div>

        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <ui-form-field label="Gender" for="gender">
            <select id="gender" formControlName="gender" [class]="inputClass">
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </ui-form-field>
          <ui-form-field label="Date of birth" for="dob" [error]="errorFor('dob')">
            <input id="dob" type="date" formControlName="dob" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="National ID" for="nationalId" [error]="errorFor('nationalId')">
            <input id="nationalId" type="text" formControlName="nationalId" [class]="inputClass" />
          </ui-form-field>
        </div>

        <ui-form-field label="Address" for="address" [error]="errorFor('address')">
          <textarea id="address" formControlName="address" rows="2" [class]="inputClass"></textarea>
        </ui-form-field>

        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <ui-form-field label="Department" for="deptId">
            <select id="deptId" formControlName="deptId" [class]="inputClass">
              @for (dept of departments(); track dept.id) {
                <option [value]="dept.id">{{ dept.name }}</option>
              }
            </select>
          </ui-form-field>
          <ui-form-field label="Designation" for="designationId">
            <select id="designationId" formControlName="designationId" [class]="inputClass">
              @for (desig of designations(); track desig.id) {
                <option [value]="desig.id">{{ desig.title }}</option>
              }
            </select>
          </ui-form-field>
          <ui-form-field label="Shift" for="shiftId">
            <select id="shiftId" formControlName="shiftId" [class]="inputClass">
              @for (shift of shifts(); track shift.id) {
                <option [value]="shift.id">{{ shift.name }}</option>
              }
            </select>
          </ui-form-field>
        </div>

        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <ui-form-field label="Employment type" for="employmentType">
            <select id="employmentType" formControlName="employmentType" [class]="inputClass">
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="probation">Probation</option>
            </select>
          </ui-form-field>
          <ui-form-field label="Salary grade" for="salaryGrade" [error]="errorFor('salaryGrade')">
            <input id="salaryGrade" type="text" formControlName="salaryGrade" [class]="inputClass" />
          </ui-form-field>
          <ui-form-field label="Joining date" for="joiningDate" [error]="errorFor('joiningDate')">
            <input id="joiningDate" type="date" formControlName="joiningDate" [class]="inputClass" />
          </ui-form-field>
        </div>

        @if (existing() && canEditStatus()) {
          <ui-form-field label="Status" for="status">
            <select id="status" formControlName="status" [class]="inputClass">
              @for (status of statuses; track status) {
                <option [value]="status">{{ statusLabel(status) }}</option>
              }
            </select>
          </ui-form-field>
        }

        <label class="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" formControlName="overtimeEligible" class="h-4 w-4 rounded border-ink-300" />
          Eligible for overtime
        </label>
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
        form="employee-form"
        class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {{ existing() ? 'Save changes' : 'Add employee' }}
      </button>
    </ui-modal>
  `,
})
export class EmployeeForm {
  readonly existing = input<Employee | null>(null);
  readonly canEditStatus = input(false);
  readonly departments = input.required<readonly Department[]>();
  readonly designations = input.required<readonly Designation[]>();
  readonly shifts = input.required<readonly Shift[]>();

  readonly submitted = output<Employee>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly statuses = STATUSES;
  protected readonly statusLabel = (status: EmployeeStatus) => EMPLOYEE_STATUS_LABEL[status];
  protected readonly inputClass =
    'w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';
  private readonly attempted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    employeeCode: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    gender: 'M' as 'M' | 'F',
    dob: ['', [Validators.required]],
    nationalId: ['', [Validators.required]],
    address: ['', [Validators.required]],
    deptId: '',
    designationId: '',
    shiftId: '',
    employmentType: 'permanent' as Employee['employmentType'],
    salaryGrade: ['', [Validators.required]],
    joiningDate: ['', [Validators.required]],
    status: 'draft' as EmployeeStatus,
    overtimeEligible: false,
  });

  protected readonly isValid = computed(() => this.form.valid);

  constructor() {
    // `existing` has a default (null), so it is safe to read synchronously
    // here — only the *required* inputs below need `effect()`.
    const emp = this.existing();
    if (emp) {
      this.form.reset({
        name: emp.name,
        employeeCode: emp.employeeCode,
        email: emp.email,
        phone: emp.phone,
        gender: emp.gender,
        dob: emp.dob,
        nationalId: emp.nationalId,
        address: emp.address,
        deptId: emp.deptId,
        designationId: emp.designationId,
        shiftId: emp.shiftId,
        employmentType: emp.employmentType,
        salaryGrade: emp.salaryGrade,
        joiningDate: emp.joiningDate,
        status: emp.status,
        overtimeEligible: emp.overtimeEligible,
      });
    }

    // Required inputs are not guaranteed to be set yet while the
    // constructor runs, so this part reads them inside `effect()` — which
    // Angular runs once bindings are resolved — rather than directly here.
    effect(() => {
      if (this.existing()) {
        return; // editing: values already came from `emp` above
      }
      // Give new-record selects a real default once the reference data has
      // loaded, rather than leaving them on an empty first option.
      const dept = this.departments()[0];
      const desig = this.designations()[0];
      const shift = this.shifts()[0];
      this.form.patchValue({
        deptId: dept?.id ?? '',
        designationId: desig?.id ?? '',
        shiftId: shift?.id ?? '',
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
      return 'This field is required.';
    }
    if (field.errors?.['email']) {
      return 'Enter a valid email address.';
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
    const emp = this.existing();
    const result: Employee = {
      id: emp?.id ?? `e-${Date.now()}`,
      ...value,
      lastWorkingDay: emp?.lastWorkingDay,
      photoUrl: emp?.photoUrl,
      emergencyContactName: emp?.emergencyContactName,
      emergencyContactPhone: emp?.emergencyContactPhone,
    };
    this.submitted.emit(result);
  }
}
