import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Department, Designation, Holiday, Shift } from '../../core/models/hr';
import { employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  holidaysFeature,
  shiftsFeature,
} from '../../core/store/features';
import { Icon } from '../../shared/ui/icon';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';
import { DepartmentForm } from './department-form';
import { DesignationForm } from './designation-form';
import { HolidayForm } from './holiday-form';
import { ShiftForm } from './shift-form';

type Tab = 'departments' | 'designations' | 'shifts' | 'holidays';

/** "Employee/Dept/Designation/Shift/Holiday CRUD" — the master data the rest
 *  of the system references. Admin has full add/edit/delete; other roles
 *  that can open this page (HR) get a read-only view. */
@Component({
  selector: 'app-organisation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader,
    KpiTile,
    SectionCard,
    StatusBadge,
    Icon,
    DepartmentForm,
    DesignationForm,
    ShiftForm,
    HolidayForm,
  ],
  template: `
    <ui-page-header
      eyebrow="People"
      title="Organisation"
      subtitle="Departments, designations, shifts and the holiday calendar"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Departments" [value]="departments().length" hint="With a nominated head" />
      <ui-kpi-tile label="Designations" [value]="designations().length" hint="Across seven grades" />
      <ui-kpi-tile label="Shifts" [value]="shifts().length" hint="Day and evening lines" />
      <ui-kpi-tile label="Holidays" [value]="holidays().length" hint="2026 calendar" />
    </div>

    <div class="mt-6 flex flex-wrap gap-1 border-b border-ink-200" role="tablist">
      @for (item of tabs; track item.key) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="tab() === item.key"
          (click)="tab.set(item.key)"
          class="-mb-px border-b-2 px-3 py-2 text-sm font-medium"
          [class.border-brand-600]="tab() === item.key"
          [class.text-brand-700]="tab() === item.key"
          [class.border-transparent]="tab() !== item.key"
          [class.text-ink-500]="tab() !== item.key"
        >
          {{ item.label }}
        </button>
      }
    </div>

    <div class="mt-4">
      @switch (tab()) {
        @case ('departments') {
          <ui-section-card heading="Departments" [padded]="false">
            <div class="p-3">
              @if (canManage()) {
                <button type="button" (click)="deptForm.set('new')" class="addBtn">
                  <ui-icon name="edit" [size]="15" /> Add department
                </button>
              }
            </div>
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
                  <th scope="col" class="px-4 py-2 font-medium">Code</th>
                  <th scope="col" class="px-4 py-2 font-medium">Department</th>
                  <th scope="col" class="px-4 py-2 font-medium">Head</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Headcount</th>
                  @if (canManage()) {
                    <th scope="col" class="px-4 py-2 text-right font-medium">Actions</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (dept of departments(); track dept.id) {
                  <tr class="border-b border-ink-100 last:border-0">
                    <td class="tnum px-4 py-2">{{ dept.code }}</td>
                    <td class="px-4 py-2">{{ dept.name }}</td>
                    <td class="px-4 py-2">{{ head(dept.headEmployeeId) }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ headcount(dept.id) }}</td>
                    @if (canManage()) {
                      <td class="px-4 py-2 text-right">
                        <button type="button" (click)="deptForm.set(dept)" class="rowBtn">Edit</button>
                        <button type="button" (click)="removeDept(dept)" class="rowBtnDanger">Delete</button>
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="px-4 py-6 text-center text-ink-500">Loading…</td></tr>
                }
              </tbody>
            </table>
          </ui-section-card>
        }
        @case ('designations') {
          <ui-section-card heading="Designations" [padded]="false">
            <div class="p-3">
              @if (canManage()) {
                <button type="button" (click)="desigForm.set('new')" class="addBtn">
                  <ui-icon name="edit" [size]="15" /> Add designation
                </button>
              }
            </div>
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
                  <th scope="col" class="px-4 py-2 font-medium">Title</th>
                  <th scope="col" class="px-4 py-2 font-medium">Grade</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Employees</th>
                  @if (canManage()) {
                    <th scope="col" class="px-4 py-2 text-right font-medium">Actions</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of designations(); track row.id) {
                  <tr class="border-b border-ink-100 last:border-0">
                    <td class="px-4 py-2">{{ row.title }}</td>
                    <td class="tnum px-4 py-2">{{ row.grade }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ inDesignation(row.id) }}</td>
                    @if (canManage()) {
                      <td class="px-4 py-2 text-right">
                        <button type="button" (click)="desigForm.set(row)" class="rowBtn">Edit</button>
                        <button type="button" (click)="removeDesig(row)" class="rowBtnDanger">Delete</button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </ui-section-card>
        }
        @case ('shifts') {
          <ui-section-card heading="Shifts" note="Late flag fires past the grace period" [padded]="false">
            <div class="p-3">
              @if (canManage()) {
                <button type="button" (click)="shiftFormSig.set('new')" class="addBtn">
                  <ui-icon name="edit" [size]="15" /> Add shift
                </button>
              }
            </div>
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
                  <th scope="col" class="px-4 py-2 font-medium">Shift</th>
                  <th scope="col" class="px-4 py-2 font-medium">Start</th>
                  <th scope="col" class="px-4 py-2 font-medium">End</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Break</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Grace</th>
                  @if (canManage()) {
                    <th scope="col" class="px-4 py-2 text-right font-medium">Actions</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of shifts(); track row.id) {
                  <tr class="border-b border-ink-100 last:border-0">
                    <td class="px-4 py-2">{{ row.name }}</td>
                    <td class="tnum px-4 py-2">{{ row.startTime }}</td>
                    <td class="tnum px-4 py-2">{{ row.endTime }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ row.breakMinutes }} min</td>
                    <td class="tnum px-4 py-2 text-right">{{ row.lateAllowanceMinutes }} min</td>
                    @if (canManage()) {
                      <td class="px-4 py-2 text-right">
                        <button type="button" (click)="shiftFormSig.set(row)" class="rowBtn">Edit</button>
                        <button type="button" (click)="removeShift(row)" class="rowBtnDanger">Delete</button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </ui-section-card>
        }
        @case ('holidays') {
          <ui-section-card heading="Holiday calendar" note="Friday is the weekly holiday" [padded]="false">
            <div class="p-3">
              @if (canManage()) {
                <button type="button" (click)="holidayForm.set('new')" class="addBtn">
                  <ui-icon name="edit" [size]="15" /> Add holiday
                </button>
              }
            </div>
            <ul class="divide-y divide-ink-100">
              @for (row of holidays(); track row.id) {
                <li class="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span class="tnum w-28 text-sm text-ink-600">{{ row.date }}</span>
                  <span class="text-sm text-ink-900">{{ row.name }}</span>
                  <span class="ml-auto flex items-center gap-3">
                    <ui-status-badge
                      [label]="row.type"
                      [tone]="row.type === 'festival' ? 'brand' : 'neutral'"
                    />
                    @if (canManage()) {
                      <button type="button" (click)="holidayForm.set(row)" class="rowBtn">Edit</button>
                      <button type="button" (click)="removeHoliday(row)" class="rowBtnDanger">Delete</button>
                    }
                  </span>
                </li>
              }
            </ul>
          </ui-section-card>
        }
      }
    </div>

    @if (deptForm(); as target) {
      <app-department-form
        [existing]="target === 'new' ? null : target"
        [employees]="employees()"
        (submitted)="saveDept($event)"
        (cancelled)="deptForm.set(null)"
      />
    }
    @if (desigForm(); as target) {
      <app-designation-form
        [existing]="target === 'new' ? null : target"
        (submitted)="saveDesig($event)"
        (cancelled)="desigForm.set(null)"
      />
    }
    @if (shiftFormSig(); as target) {
      <app-shift-form
        [existing]="target === 'new' ? null : target"
        (submitted)="saveShift($event)"
        (cancelled)="shiftFormSig.set(null)"
      />
    }
    @if (holidayForm(); as target) {
      <app-holiday-form
        [existing]="target === 'new' ? null : target"
        (submitted)="saveHoliday($event)"
        (cancelled)="holidayForm.set(null)"
      />
    }
  `,
  styles: `
    .addBtn { display: inline-flex; align-items: center; gap: 6px; border-radius: 6px; background: var(--color-brand-600); color: #fff; padding: 8px 12px; font-size: 13px; font-weight: 500; }
    .addBtn:hover { background: var(--color-brand-700); }
    .rowBtn { font-size: 12px; font-weight: 500; color: var(--color-brand-700); margin-left: 10px; }
    .rowBtn:hover { text-decoration: underline; }
    .rowBtnDanger { font-size: 12px; font-weight: 500; color: var(--color-bad-700); margin-left: 10px; }
    .rowBtnDanger:hover { text-decoration: underline; }
  `,
})
export class OrganisationPage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly canManage = computed(() => this.session.role() === 'Admin');

  protected readonly tab = signal<Tab>('departments');
  protected readonly tabs: { key: Tab; label: string }[] = [
    { key: 'departments', label: 'Departments' },
    { key: 'designations', label: 'Designations' },
    { key: 'shifts', label: 'Shifts' },
    { key: 'holidays', label: 'Holidays' },
  ];

  protected readonly departments = this.store.selectSignal(departmentsFeature.selectors.all);
  protected readonly designations = this.store.selectSignal(designationsFeature.selectors.all);
  protected readonly shifts = this.store.selectSignal(shiftsFeature.selectors.all);
  protected readonly holidays = this.store.selectSignal(holidaysFeature.selectors.all);
  protected readonly employees = this.store.selectSignal(employeesFeature.selectors.all);

  protected readonly deptForm = signal<Department | 'new' | null>(null);
  protected readonly desigForm = signal<Designation | 'new' | null>(null);
  protected readonly shiftFormSig = signal<Shift | 'new' | null>(null);
  protected readonly holidayForm = signal<Holiday | 'new' | null>(null);

  protected head(employeeId?: string): string {
    return employeeId ? employeeName(employeeId) : 'Not assigned';
  }

  protected headcount(deptId: string): number {
    return this.employees().filter((emp) => emp.deptId === deptId && emp.status === 'active')
      .length;
  }

  protected inDesignation(designationId: string): number {
    return this.employees().filter((emp) => emp.designationId === designationId).length;
  }

  protected saveDept(item: Department): void {
    const isNew = this.deptForm() === 'new';
    this.store.dispatch(
      isNew
        ? departmentsFeature.actions.create({ item })
        : departmentsFeature.actions.upsert({ item }),
    );
    this.deptForm.set(null);
  }
  protected removeDept(item: Department): void {
    if (confirm(`Delete the "${item.name}" department? Employees assigned to it will keep the reference.`)) {
      this.store.dispatch(departmentsFeature.actions.remove({ id: item.id }));
    }
  }

  protected saveDesig(item: Designation): void {
    const isNew = this.desigForm() === 'new';
    this.store.dispatch(
      isNew
        ? designationsFeature.actions.create({ item })
        : designationsFeature.actions.upsert({ item }),
    );
    this.desigForm.set(null);
  }
  protected removeDesig(item: Designation): void {
    if (confirm(`Delete the "${item.title}" designation?`)) {
      this.store.dispatch(designationsFeature.actions.remove({ id: item.id }));
    }
  }

  protected saveShift(item: Shift): void {
    const isNew = this.shiftFormSig() === 'new';
    this.store.dispatch(
      isNew ? shiftsFeature.actions.create({ item }) : shiftsFeature.actions.upsert({ item }),
    );
    this.shiftFormSig.set(null);
  }
  protected removeShift(item: Shift): void {
    if (confirm(`Delete the "${item.name}" shift?`)) {
      this.store.dispatch(shiftsFeature.actions.remove({ id: item.id }));
    }
  }

  protected saveHoliday(item: Holiday): void {
    const isNew = this.holidayForm() === 'new';
    this.store.dispatch(
      isNew
        ? holidaysFeature.actions.create({ item })
        : holidaysFeature.actions.upsert({ item }),
    );
    this.holidayForm.set(null);
  }
  protected removeHoliday(item: Holiday): void {
    if (confirm(`Delete the "${item.name}" holiday?`)) {
      this.store.dispatch(holidaysFeature.actions.remove({ id: item.id }));
    }
  }

  constructor() {
    for (const feature of [
      departmentsFeature,
      designationsFeature,
      shiftsFeature,
      holidaysFeature,
      employeesFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
