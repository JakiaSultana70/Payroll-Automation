import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { APPROVAL_TONE, taka } from '../../core/models/common';
import { Overtime } from '../../core/models/hr';
import { employeeCode, employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import { overtimeFeature } from '../../core/store/features';
import { Field, FieldList } from '../../shared/ui/field-list';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';
import { MONTHLY_OT_CEILING, monthlyHours } from './overtime-rules';

/**
 * Overtime is auto-recorded by the attendance system. The detail view is a read-
 * only history page, not a workflow for approval or rejection.
 */
@Component({
  selector: 'app-overtime-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, SectionCard, StatusBadge, FieldList],
  template: `
    @if (claim(); as claim) {
      <ui-page-header
        eyebrow="Time & Attendance"
        [title]="name(claim.employeeId) + ' · overtime'"
        [subtitle]="claim.hours + ' hour(s) on ' + claim.date"
        backLink="/overtime"
        backLabel="Overtime"
      >
        <ui-status-badge [label]="claim.status" [tone]="tone(claim.status)" />
        <ui-status-badge
          [label]="claim.payrollEligible ? 'payroll eligible' : 'not counted'"
          [tone]="claim.payrollEligible ? 'ok' : 'neutral'"
        />
      </ui-page-header>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <div class="space-y-4">
          <p class="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
            This overtime record was generated automatically from the attendance system and is read only.
          </p>

          <ui-section-card heading="Claim">
            <ui-field-list [fields]="fields()" />
            @if (claim.reason) {
              <div class="mt-4 border-t border-ink-100 pt-3">
                <p class="text-xs font-medium tracking-wide text-ink-500 uppercase">Reason</p>
                <p class="mt-1 text-sm text-ink-800">{{ claim.reason }}</p>
              </div>
            }
            @if (claim.rejectionReason) {
              <div class="mt-3 rounded-md border border-bad-600 bg-bad-100 px-3 py-2">
                <p class="text-xs font-medium tracking-wide text-bad-700 uppercase">
                  Rejection reason
                </p>
                <p class="mt-0.5 text-sm text-bad-700">{{ claim.rejectionReason }}</p>
              </div>
            }
          </ui-section-card>
        </div>

        <ui-section-card heading="Monthly ceiling" [note]="claim.date.slice(0, 7)">
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-ink-500">Committed hours</dt>
              <dd class="tnum">{{ committed() }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-ink-500">Ceiling</dt>
              <dd class="tnum">{{ ceiling }}</dd>
            </div>
            <div class="flex justify-between border-t border-ink-100 pt-2 font-medium">
              <dt>Headroom</dt>
              <dd class="tnum" [class.text-bad-700]="headroom() < 0">{{ headroom() }}</dd>
            </div>
          </dl>
          <p class="mt-3 text-xs text-ink-500">
            Pending and approved claims count towards the ceiling; rejected ones do not.
          </p>
        </ui-section-card>
      </div>
    } @else {
      <div class="rounded-lg border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
        Loading claim…
      </div>
    }
  `,
})
export class OvertimeDetailPage {
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly name = employeeName;
  protected readonly ceiling = MONTHLY_OT_CEILING;
  protected readonly tone = (status: Overtime['status']) => APPROVAL_TONE[status];

  private readonly claims = this.store.selectSignal(overtimeFeature.selectors.all);

  protected readonly claim = computed(() => this.claims().find((row) => row.id === this.id()));

  protected readonly committed = computed(() => {
    const claim = this.claim();
    return claim ? monthlyHours(claim.employeeId, claim.date, this.claims()) : 0;
  });

  protected readonly headroom = computed(() => MONTHLY_OT_CEILING - this.committed());

  protected readonly fields = computed<Field[]>(() => {
    const claim = this.claim();
    if (!claim) {
      return [];
    }
    return [
      { label: 'Employee', value: employeeName(claim.employeeId) },
      { label: 'Employee code', value: employeeCode(claim.employeeId), mono: true },
      { label: 'Date worked', value: claim.date, mono: true },
      { label: 'Hours', value: claim.hours, mono: true },
      { label: 'Hourly rate', value: taka(claim.rate), mono: true },
      { label: 'Claim value', value: taka(claim.amount), mono: true },
      { label: 'Decided by', value: claim.approvedBy ?? '—' },
    ];
  });

  constructor() {
    this.store.dispatch(overtimeFeature.actions.load());
  }
}
