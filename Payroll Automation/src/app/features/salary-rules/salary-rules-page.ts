import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { taka } from '../../core/models/common';
import { PFRule, SalaryStructure, TaxRule } from '../../core/models/hr';
import { employeeCode, employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  pfRulesFeature,
  salaryStructuresFeature,
  taxRulesFeature,
} from '../../core/store/features';
import { Icon } from '../../shared/ui/icon';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { PfRuleForm } from './pf-rule-form';
import { SalaryStructureForm } from './salary-structure-form';
import { TaxRuleForm } from './tax-rule-form';

type Tab = 'structures' | 'tax' | 'pf';

/** "Configure Payroll Rules — Salary/Tax/PF/Loan Rules" from the Admin lane.
 *  Admin gets full add/edit/delete; every other role that can open this page
 *  (Accountant) sees it read-only. */
@Component({
  selector: 'app-salary-rules-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiTile, SectionCard, Icon, SalaryStructureForm, TaxRuleForm, PfRuleForm],
  template: `
    <ui-page-header
      eyebrow="Payroll"
      title="Salary &amp; rules"
      subtitle="What the engine reads before it calculates anything"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Structures" [value]="structures().length" hint="One per employee" />
      <ui-kpi-tile label="Monthly gross" [value]="totalGross()" hint="All active structures" tone="brand" />
      <ui-kpi-tile label="Tax slabs" [value]="taxRules().length" hint="Annual income bands" />
      <ui-kpi-tile label="PF contribution" [value]="pfLabel()" hint="Employee / employer share" />
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
        @case ('structures') {
          <ui-section-card heading="Salary structures" [padded]="false">
            <div class="p-3">
              @if (canManage()) {
                <button type="button" (click)="structureForm.set('new')" class="addBtn">
                  <ui-icon name="edit" [size]="15" /> Add structure
                </button>
              }
            </div>
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
                  <th scope="col" class="px-4 py-2 font-medium">Code</th>
                  <th scope="col" class="px-4 py-2 font-medium">Employee</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Basic</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">House rent</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Allowances</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Gross</th>
                  <th scope="col" class="px-4 py-2 font-medium">Tax</th>
                  <th scope="col" class="px-4 py-2 font-medium">PF</th>
                  @if (canManage()) {
                    <th scope="col" class="px-4 py-2 text-right font-medium">Actions</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of structures(); track row.id) {
                  <tr class="border-b border-ink-100 last:border-0">
                    <td class="tnum px-4 py-2">{{ employeeCode(row.employeeId) }}</td>
                    <td class="px-4 py-2">{{ employeeName(row.employeeId) }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ money(row.basic) }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ money(row.hra) }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ money(row.allowances) }}</td>
                    <td class="tnum px-4 py-2 text-right font-medium">{{ money(row.grossSalary) }}</td>
                    <td class="px-4 py-2">{{ row.appliesTax ? 'applies' : 'exempt' }}</td>
                    <td class="px-4 py-2">{{ row.appliesPF ? 'applies' : 'n/a' }}</td>
                    @if (canManage()) {
                      <td class="px-4 py-2 text-right">
                        <button type="button" (click)="structureForm.set(row)" class="rowBtn">Edit</button>
                        <button type="button" (click)="removeStructure(row)" class="rowBtnDanger">Delete</button>
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr><td colspan="9" class="px-4 py-6 text-center text-ink-500">Loading…</td></tr>
                }
              </tbody>
            </table>
          </ui-section-card>
        }
        @case ('tax') {
          <ui-section-card heading="Income tax slabs" note="Applied to annualised gross" [padded]="false">
            <div class="p-3">
              @if (canManage()) {
                <button type="button" (click)="taxForm.set('new')" class="addBtn">
                  <ui-icon name="edit" [size]="15" /> Add slab
                </button>
              }
            </div>
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
                  <th scope="col" class="px-4 py-2 font-medium">Slab</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">From</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">To</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Rate</th>
                  <th scope="col" class="px-4 py-2 font-medium">Effective from</th>
                  @if (canManage()) {
                    <th scope="col" class="px-4 py-2 text-right font-medium">Actions</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (rule of taxRules(); track rule.id) {
                  <tr class="border-b border-ink-100 last:border-0">
                    <td class="px-4 py-2">{{ rule.slabName }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ money(rule.minIncome) }}</td>
                    <td class="tnum px-4 py-2 text-right">{{ money(rule.maxIncome) }}</td>
                    <td class="tnum px-4 py-2 text-right font-medium">{{ rule.rate }}%</td>
                    <td class="tnum px-4 py-2">{{ rule.effectiveFrom }}</td>
                    @if (canManage()) {
                      <td class="px-4 py-2 text-right">
                        <button type="button" (click)="taxForm.set(rule)" class="rowBtn">Edit</button>
                        <button type="button" (click)="removeTax(rule)" class="rowBtnDanger">Delete</button>
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="px-4 py-6 text-center text-ink-500">Loading…</td></tr>
                }
              </tbody>
            </table>
          </ui-section-card>
        }
        @case ('pf') {
          <ui-section-card heading="Provident fund" note="Applies to permanent staff only" [padded]="false">
            <div class="p-3">
              @if (canManage()) {
                <button type="button" (click)="pfForm.set(pfRules().at(0) ?? 'new')" class="addBtn">
                  <ui-icon name="edit" [size]="15" /> {{ pfRules()[0] ? 'Edit rule' : 'Add rule' }}
                </button>
              }
            </div>
            @for (rule of pfRules(); track rule.id) {
              <dl class="space-y-2 p-4 text-sm">
                <div class="flex justify-between">
                  <dt class="text-ink-500">Scheme</dt>
                  <dd>{{ rule.name }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-ink-500">Employee contribution</dt>
                  <dd class="tnum">{{ rule.employeeContributionPct }}% of basic</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-ink-500">Employer contribution</dt>
                  <dd class="tnum">{{ rule.employerContributionPct }}% of basic</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-ink-500">Effective from</dt>
                  <dd class="tnum">{{ rule.effectiveFrom }}</dd>
                </div>
              </dl>
            } @empty {
              <p class="p-4 text-sm text-ink-500">No PF rule configured yet.</p>
            }
          </ui-section-card>
        }
      }
    </div>

    @if (structureForm(); as target) {
      <app-salary-structure-form
        [existing]="target === 'new' ? null : target"
        [employees]="employees()"
        [existingEmployeeIds]="structureEmployeeIds()"
        (submitted)="saveStructure($event)"
        (cancelled)="structureForm.set(null)"
      />
    }
    @if (taxForm(); as target) {
      <app-tax-rule-form
        [existing]="target === 'new' ? null : target"
        (submitted)="saveTax($event)"
        (cancelled)="taxForm.set(null)"
      />
    }
    @if (pfForm(); as target) {
      <app-pf-rule-form
        [existing]="target === 'new' ? null : target"
        (submitted)="savePf($event)"
        (cancelled)="pfForm.set(null)"
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
export class SalaryRulesPage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly money = taka;
  protected readonly employeeCode = employeeCode;
  protected readonly employeeName = employeeName;
  protected readonly canManage = computed(() => this.session.role() === 'Admin');

  protected readonly tab = signal<Tab>('structures');
  protected readonly tabs: { key: Tab; label: string }[] = [
    { key: 'structures', label: 'Salary structures' },
    { key: 'tax', label: 'Tax slabs' },
    { key: 'pf', label: 'Provident fund' },
  ];

  protected readonly structures = this.store.selectSignal(salaryStructuresFeature.selectors.all);
  protected readonly taxRules = this.store.selectSignal(taxRulesFeature.selectors.all);
  protected readonly pfRules = this.store.selectSignal(pfRulesFeature.selectors.all);
  protected readonly employees = this.store.selectSignal(employeesFeature.selectors.all);

  protected readonly structureEmployeeIds = computed(() =>
    this.structures().map((row) => row.employeeId),
  );

  protected readonly totalGross = computed(() =>
    taka(this.structures().reduce((sum, row) => sum + row.grossSalary, 0)),
  );
  protected readonly pfLabel = computed(() => {
    const rule = this.pfRules()[0];
    return rule ? `${rule.employeeContributionPct}% / ${rule.employerContributionPct}%` : '—';
  });

  protected readonly structureForm = signal<SalaryStructure | 'new' | null>(null);
  protected readonly taxForm = signal<TaxRule | 'new' | null>(null);
  protected readonly pfForm = signal<PFRule | 'new' | null>(null);

  protected saveStructure(item: SalaryStructure): void {
    const isNew = this.structureForm() === 'new';
    this.store.dispatch(
      isNew
        ? salaryStructuresFeature.actions.create({ item })
        : salaryStructuresFeature.actions.upsert({ item }),
    );
    this.structureForm.set(null);
  }
  protected removeStructure(item: SalaryStructure): void {
    if (confirm(`Delete the salary structure for ${employeeName(item.employeeId)}?`)) {
      this.store.dispatch(salaryStructuresFeature.actions.remove({ id: item.id }));
    }
  }

  protected saveTax(item: TaxRule): void {
    const isNew = this.taxForm() === 'new';
    this.store.dispatch(
      isNew ? taxRulesFeature.actions.create({ item }) : taxRulesFeature.actions.upsert({ item }),
    );
    this.taxForm.set(null);
  }
  protected removeTax(item: TaxRule): void {
    if (confirm(`Delete the "${item.slabName}" tax slab?`)) {
      this.store.dispatch(taxRulesFeature.actions.remove({ id: item.id }));
    }
  }

  protected savePf(item: PFRule): void {
    const isNew = this.pfForm() === 'new';
    this.store.dispatch(
      isNew ? pfRulesFeature.actions.create({ item }) : pfRulesFeature.actions.upsert({ item }),
    );
    this.pfForm.set(null);
  }

  constructor() {
    for (const feature of [
      salaryStructuresFeature,
      taxRulesFeature,
      pfRulesFeature,
      employeesFeature,
      departmentsFeature,
      designationsFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
