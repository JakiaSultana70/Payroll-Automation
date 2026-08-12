import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Tone } from '../../core/models/common';
import { EMPLOYEE_STATUS_LABEL, Employee } from '../../core/models/hr';
import { SessionService } from '../../core/session';
import { departmentName, designationTitle } from '../../core/mock-db/seed/org';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  leaveBalancesFeature,
  salaryStructuresFeature,
  shiftsFeature,
} from '../../core/store/features';
import { Column, DataTable } from '../../shared/ui/data-table';
import { Icon } from '../../shared/ui/icon';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { EmployeeForm } from './employee-form';

const STATUS_TONE: Record<Employee['status'], Tone> = {
  draft: 'warn',
  active: 'ok',
  inactive: 'neutral',
  separated: 'bad',
};

@Component({
  selector: 'app-employee-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiTile, SectionCard, DataTable, EmployeeForm, Icon],
  template: `
    <ui-page-header
      eyebrow="People"
      title="Employees"
      subtitle="Onboarding, profiles, employment status and separation"
    >
      @if (canManage()) {
        <button
          type="button"
          (click)="openCreate()"
          class="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <ui-icon name="edit" [size]="15" />
          Add employee
        </button>
      }
    </ui-page-header>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Headcount" [value]="active().length" hint="Active employees" />
      <ui-kpi-tile
        label="Pending activation"
        [value]="drafts().length"
        hint="Draft profiles awaiting an account"
        [tone]="drafts().length ? 'warn' : 'ok'"
      />
      <ui-kpi-tile label="On probation" [value]="probation().length" hint="Not yet confirmed" />
      <ui-kpi-tile label="Separated" [value]="separated().length" hint="Final settlement due" />
    </div>

    <div class="mt-6">
      <ui-section-card heading="Employee register" [note]="rows().length + ' records'" [padded]="false">
        <ui-data-table
          [columns]="columns"
          [rows]="rows()"
          [loading]="loading()"
          [rowLink]="link"
          searchPlaceholder="Search name, code or department"
          emptyTitle="No employee matches"
        />
      </ui-section-card>
    </div>

    @if (formOpen()) {
      <app-employee-form
        [departments]="departments()"
        [designations]="designations()"
        [shifts]="shifts()"
        (submitted)="onCreate($event)"
        (cancelled)="formOpen.set(false)"
      />
    }
  `,
})
export class EmployeeListPage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly link = (row: Employee) => ['/employees', row.id];
  protected readonly canManage = computed(() => ['Admin', 'HR'].includes(this.session.role()));
  protected readonly formOpen = signal(false);

  protected readonly columns: Column<Employee>[] = [
    { key: 'code', label: 'Code', mono: true, value: (row) => row.employeeCode },
    { key: 'name', label: 'Name', value: (row) => row.name },
    { key: 'dept', label: 'Department', value: (row) => departmentName(row.deptId) },
    { key: 'desig', label: 'Designation', value: (row) => designationTitle(row.designationId) },
    { key: 'grade', label: 'Grade', mono: true, value: (row) => row.salaryGrade },
    { key: 'type', label: 'Type', value: (row) => row.employmentType },
    { key: 'joined', label: 'Joined', mono: true, value: (row) => row.joiningDate },
    {
      key: 'status',
      label: 'Status',
      value: (row) => EMPLOYEE_STATUS_LABEL[row.status],
      badge: (row) => ({ label: EMPLOYEE_STATUS_LABEL[row.status], tone: STATUS_TONE[row.status] }),
    },
  ];

  protected readonly rows = this.store.selectSignal(employeesFeature.selectors.all);
  protected readonly loading = this.store.selectSignal(employeesFeature.selectors.loading);
  protected readonly departments = this.store.selectSignal(departmentsFeature.selectors.all);
  protected readonly designations = this.store.selectSignal(designationsFeature.selectors.all);
  protected readonly shifts = this.store.selectSignal(shiftsFeature.selectors.all);

  protected readonly active = computed(() => this.rows().filter((row) => row.status === 'active'));
  protected readonly drafts = computed(() => this.rows().filter((row) => row.status === 'draft'));
  protected readonly probation = computed(() =>
    this.rows().filter((row) => row.employmentType === 'probation'),
  );
  protected readonly separated = computed(() =>
    this.rows().filter((row) => row.status === 'separated'),
  );

  protected openCreate(): void {
    this.formOpen.set(true);
  }

  protected onCreate(employee: Employee): void {
    this.store.dispatch(employeesFeature.actions.create({ item: employee }));
    this.formOpen.set(false);
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

