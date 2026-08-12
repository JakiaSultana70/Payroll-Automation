import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Tone, taka } from '../../core/models/common';
import { EMPLOYEE_STATUS_LABEL, Employee } from '../../core/models/hr';
import {
  departmentName,
  designationTitle,
  shiftName,
} from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  leaveBalancesFeature,
  salaryStructuresFeature,
  shiftsFeature,
} from '../../core/store/features';
import { EmptyState } from '../../shared/ui/empty-state';
import { Field, FieldList } from '../../shared/ui/field-list';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';
import { EmployeeForm } from './employee-form';

const STATUS_TONE: Record<Employee['status'], Tone> = {
  draft: 'warn',
  active: 'ok',
  inactive: 'neutral',
  separated: 'bad',
};

@Component({
  selector: 'app-employee-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, SectionCard, StatusBadge, FieldList, EmptyState, EmployeeForm, Icon],
  template: `
    @if (employee(); as emp) {
      <ui-page-header
        eyebrow="People"
        [title]="emp.name"
        [subtitle]="designation() + ' · ' + department()"
        [backLink]="canSeeRegister() ? '/employees' : null"
        backLabel="Employee register"
      >
        <ui-status-badge [label]="statusLabel(emp.status)" [tone]="tone(emp.status)" />
        @if (canManage()) {
          <button
            type="button"
            (click)="formOpen.set(true)"
            class="inline-flex items-center gap-1.5 rounded-md border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            <ui-icon name="edit" [size]="15" />
            Edit
          </button>
        }
        @if (emp.status === 'draft' && canActivate()) {
          <button
            type="button"
            (click)="activate(emp)"
            class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Activate account
          </button>
        }
        @if (canActivate() && emp.status !== 'inactive') {
          <button
            type="button"
            (click)="deactivate(emp)"
            class="inline-flex items-center gap-1.5 rounded-md border border-bad-600 px-3 py-2 text-sm font-medium text-bad-700 hover:bg-bad-100"
          >
            Deactivate
          </button>
        }
      </ui-page-header>

      @if (emp.status === 'draft') {
        <p
          class="mb-4 rounded-md border border-warn-600 bg-warn-100 px-3 py-2 text-sm text-warn-700"
        >
          Draft profile created by HR. The Admin must activate the account before this person can
          sign in or appear in a payroll run.
        </p>
      }

      <ui-section-card heading="Profile">
        <ui-field-list [fields]="profileFields()" />
      </ui-section-card>

      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ui-section-card heading="Salary structure" note="Effective from joining">
          @if (structure(); as pay) {
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-ink-500">Basic</dt>
                <dd class="tnum">{{ money(pay.basic) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-500">House rent</dt>
                <dd class="tnum">{{ money(pay.hra) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-500">Allowances</dt>
                <dd class="tnum">{{ money(pay.allowances) }}</dd>
              </div>
              <div class="flex justify-between border-t border-ink-100 pt-2 font-medium">
                <dt>Gross monthly</dt>
                <dd class="tnum">{{ money(pay.grossSalary) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-500">Income tax applies</dt>
                <dd>{{ pay.appliesTax ? 'Yes' : 'Below threshold' }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-500">Provident fund applies</dt>
                <dd>{{ pay.appliesPF ? 'Yes' : 'Not for this contract type' }}</dd>
              </div>
            </dl>
          } @else {
            <ui-empty-state
              icon="scale"
              title="No salary structure"
              hint="A structure is created when the profile is activated."
            />
          }
        </ui-section-card>

        <ui-section-card heading="Leave balances" note="2026 cycle" [padded]="false">
          @if (balances().length) {
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
                  <th scope="col" class="px-4 py-2 font-medium">Type</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Accrued</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Taken</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody>
                @for (bal of balances(); track bal.id) {
                  <tr class="border-b border-ink-100 last:border-0">
                    <td class="px-4 py-2">{{ bal.leaveType }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ bal.accrued }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ bal.taken }}</td>
                    <td class="tnum px-4 py-2 text-right font-medium">{{ bal.remaining }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <ui-empty-state icon="calendar" title="No leave balance on record" />
          }
        </ui-section-card>
      </div>
    } @else {
      <div class="rounded-lg border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
        Loading employee…
      </div>
    }

    @if (formOpen() && employee(); as emp) {
      <app-employee-form
        [existing]="emp"
        [canEditStatus]="isAdmin()"
        [departments]="allDepartments()"
        [designations]="allDesignations()"
        [shifts]="allShifts()"
        (submitted)="onSave($event)"
        (cancelled)="formOpen.set(false)"
      />
    }
  `,
})
export class EmployeeDetailPage {
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly money = taka;
  protected readonly tone = (status: Employee['status']) => STATUS_TONE[status];
  protected readonly statusLabel = (status: Employee['status']) => EMPLOYEE_STATUS_LABEL[status];
  protected readonly canActivate = computed(() => this.session.role() === 'Admin');
  protected readonly isAdmin = computed(() => this.session.role() === 'Admin');
  protected readonly canManage = computed(() => ['Admin', 'HR'].includes(this.session.role()));
  protected readonly formOpen = signal(false);

  /** An Employee reaches this page only for their own record, so the link back
   *  to the register would be a dead end for them. */
  protected readonly canSeeRegister = computed(() =>
    ['Admin', 'HR'].includes(this.session.role()),
  );

  private readonly employees = this.store.selectSignal(employeesFeature.selectors.all);
  private readonly structures = this.store.selectSignal(salaryStructuresFeature.selectors.all);
  private readonly allBalances = this.store.selectSignal(leaveBalancesFeature.selectors.all);
  protected readonly allDepartments = this.store.selectSignal(departmentsFeature.selectors.all);
  protected readonly allDesignations = this.store.selectSignal(designationsFeature.selectors.all);
  protected readonly allShifts = this.store.selectSignal(shiftsFeature.selectors.all);

  protected readonly employee = computed(() =>
    this.employees().find((row) => row.id === this.id()),
  );
  protected readonly structure = computed(() =>
    this.structures().find((row) => row.employeeId === this.id()),
  );
  protected readonly balances = computed(() =>
    this.allBalances().filter((row) => row.employeeId === this.id()),
  );

  protected readonly department = computed(() =>
    departmentName(this.employee()?.deptId ?? ''),
  );
  protected readonly designation = computed(() =>
    designationTitle(this.employee()?.designationId ?? ''),
  );

  protected readonly profileFields = computed<Field[]>(() => {
    const emp = this.employee();
    if (!emp) {
      return [];
    }
    return [
      { label: 'Employee code', value: emp.employeeCode, mono: true },
      { label: 'Email', value: emp.email },
      { label: 'Phone', value: emp.phone, mono: true },
      { label: 'National ID', value: emp.nationalId, mono: true },
      { label: 'Date of birth', value: emp.dob, mono: true },
      { label: 'Gender', value: emp.gender === 'M' ? 'Male' : 'Female' },
      { label: 'Address', value: emp.address },
      { label: 'Department', value: this.department() },
      { label: 'Designation', value: this.designation() },
      { label: 'Shift', value: shiftName(emp.shiftId) },
      { label: 'Grade', value: emp.salaryGrade, mono: true },
      { label: 'Employment type', value: emp.employmentType },
      { label: 'Joining date', value: emp.joiningDate, mono: true },
      { label: 'Last working day', value: emp.lastWorkingDay ?? '—', mono: true },
      { label: 'Overtime eligible', value: emp.overtimeEligible ? 'Yes' : 'No' },
    ];
  });

  protected activate(employee: Employee): void {
    this.store.dispatch(
      employeesFeature.actions.upsert({ item: { ...employee, status: 'active' } }),
    );
  }

  protected onSave(employee: Employee): void {
    this.store.dispatch(employeesFeature.actions.upsert({ item: employee }));
    this.formOpen.set(false);
  }

  protected deactivate(employee: Employee): void {
    const sure = confirm(`Deactivate ${employee.name}? Their account and payroll eligibility will be suspended, but their record stays on file.`);
    if (!sure) {
      return;
    }
    this.store.dispatch(
      employeesFeature.actions.upsert({ item: { ...employee, status: 'inactive' } }),
    );
  }

  constructor() {
    for (const feature of [
      employeesFeature,
      departmentsFeature,
      designationsFeature,
      shiftsFeature,
      salaryStructuresFeature,
      leaveBalancesFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
