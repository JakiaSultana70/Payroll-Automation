import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { APPROVAL_TONE, taka } from '../../core/models/common';
import { FinalSettlement } from '../../core/models/hr';
import { employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  settlementsFeature,
} from '../../core/store/features';
import { EmptyState } from '../../shared/ui/empty-state';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';

/** "Generate Final Payslip" — gratuity, leave encashment and pending dues on
 *  separation, settled once and recorded. */
@Component({
  selector: 'app-settlements-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiTile, SectionCard, StatusBadge, EmptyState],
  template: `
    <ui-page-header
      eyebrow="Payroll"
      title="Final settlement"
      subtitle="Gratuity, leave encashment and dues for separated employees"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Settlements" [value]="rows().length" hint="All separations" />
      <ui-kpi-tile
        label="Pending"
        [value]="pending().length"
        hint="Awaiting approval"
        [tone]="pending().length ? 'warn' : 'ok'"
      />
      <ui-kpi-tile label="Gratuity payable" [value]="gratuity()" hint="Across open settlements" />
      <ui-kpi-tile label="Net payable" [value]="netTotal()" hint="After dues" tone="brand" />
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4">
      @for (row of rows(); track row.id) {
        <ui-section-card
          [heading]="name(row.employeeId)"
          [note]="'Last working day ' + row.lastWorkingDay"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <dl class="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt class="text-xs tracking-wide text-ink-500 uppercase">Tenure</dt>
                <dd class="tnum mt-0.5">
                  {{ row.tenureMonths }} months ({{ (row.tenureMonths / 12).toFixed(1) }} y)
                </dd>
              </div>
              <div>
                <dt class="text-xs tracking-wide text-ink-500 uppercase">Gratuity</dt>
                <dd class="tnum mt-0.5">{{ money(row.gratuity) }}</dd>
              </div>
              <div>
                <dt class="text-xs tracking-wide text-ink-500 uppercase">Leave encashment</dt>
                <dd class="tnum mt-0.5">{{ money(row.leaveEncashment) }}</dd>
              </div>
              <div>
                <dt class="text-xs tracking-wide text-ink-500 uppercase">Pending dues</dt>
                <dd class="tnum mt-0.5 text-bad-700">− {{ money(row.pendingDues) }}</dd>
              </div>
              <div>
                <dt class="text-xs tracking-wide text-ink-500 uppercase">Net settlement</dt>
                <dd class="tnum mt-0.5 font-semibold">{{ money(row.netSettlementAmount) }}</dd>
              </div>
              <div>
                <dt class="text-xs tracking-wide text-ink-500 uppercase">Status</dt>
                <dd class="mt-0.5">
                  <ui-status-badge [label]="row.status" [tone]="tone(row.status)" />
                </dd>
              </div>
            </dl>
            @if (row.status === 'pending' && canApprove()) {
              <button
                type="button"
                (click)="settle(row)"
                class="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Approve settlement
              </button>
            }
          </div>
        </ui-section-card>
      } @empty {
        <ui-section-card heading="Settlements" [padded]="false">
          <ui-empty-state
            icon="exit"
            title="No separation on record"
            hint="Settlements appear when an employee's last working day is set."
          />
        </ui-section-card>
      }
    </div>
  `,
})
export class SettlementsPage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly money = taka;
  protected readonly name = employeeName;
  protected readonly tone = (status: FinalSettlement['status']) => APPROVAL_TONE[status];
  protected readonly canApprove = computed(() =>
    ['Accountant', 'Admin'].includes(this.session.role()),
  );

  protected readonly rows = this.store.selectSignal(settlementsFeature.selectors.all);

  protected readonly pending = computed(() =>
    this.rows().filter((row) => row.status === 'pending'),
  );
  protected readonly gratuity = computed(() =>
    taka(this.rows().reduce((sum, row) => sum + row.gratuity, 0)),
  );
  protected readonly netTotal = computed(() =>
    taka(this.rows().reduce((sum, row) => sum + row.netSettlementAmount, 0)),
  );

  protected settle(row: FinalSettlement): void {
    this.store.dispatch(
      settlementsFeature.actions.upsert({ item: { ...row, status: 'approved' } }),
    );
  }

  constructor() {
    for (const feature of [
      settlementsFeature,
      employeesFeature,
      departmentsFeature,
      designationsFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
