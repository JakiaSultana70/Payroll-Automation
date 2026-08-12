import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { APPROVAL_TONE } from '../../core/models/common';
import { LeaveRequest } from '../../core/models/hr';
import { AuditLogService } from '../../core/audit-log';
import { employeeCode, employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import { leaveBalancesFeature, leaveRequestsFeature } from '../../core/store/features';
import { Field, FieldList } from '../../shared/ui/field-list';
import { FormField } from '../../shared/ui/form-field';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';
import { applyApproval, reverseApproval } from './leave-rules';

/**
 * "Review Leave → Approve or Reject Leave → System: Update Leave Balance".
 *
 * Every decision happens here rather than inline in the list, because a
 * rejection has to carry a reason and an approval has to move the balance —
 * neither belongs behind a one-click button in a table row.
 */
@Component({
  selector: 'app-leave-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, SectionCard, StatusBadge, FieldList, FormField],
  template: `
    @if (request(); as request) {
      <ui-page-header
        eyebrow="Time & Attendance"
        [title]="name(request.employeeId) + ' · ' + request.leaveType + ' leave'"
        [subtitle]="request.days + ' day(s), ' + request.startDate + ' to ' + request.endDate"
        backLink="/leave"
        backLabel="Leave"
      >
        <ui-status-badge [label]="request.status" [tone]="tone(request.status)" />
      </ui-page-header>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <div class="space-y-4">
          <ui-section-card heading="Application">
            <ui-field-list [fields]="fields()" />
            <div class="mt-4 border-t border-ink-100 pt-3">
              <p class="text-xs font-medium tracking-wide text-ink-500 uppercase">Reason given</p>
              <p class="mt-1 text-sm text-ink-800">{{ request.reason }}</p>
            </div>
            @if (request.rejectionReason) {
              <div class="mt-3 rounded-md border border-bad-600 bg-bad-100 px-3 py-2">
                <p class="text-xs font-medium tracking-wide text-bad-700 uppercase">
                  Rejection reason
                </p>
                <p class="mt-0.5 text-sm text-bad-700">{{ request.rejectionReason }}</p>
              </div>
            }
          </ui-section-card>

          @if (canDecide() && request.status === 'pending') {
            <ui-section-card
              heading="Decision"
              note="Approving moves the days out of the balance"
            >
              <ui-form-field
                label="Rejection reason"
                for="rejectionReason"
                [optional]="true"
                [error]="rejectError()"
                hint="Required only if you reject the request."
              >
                <textarea
                  id="rejectionReason"
                  rows="2"
                  [value]="rejectionReason()"
                  (input)="onReason($event)"
                  class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                ></textarea>
              </ui-form-field>

              <div class="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  (click)="approve(request)"
                  class="rounded-md bg-ok-600 px-3 py-2 text-sm font-medium text-white hover:bg-ok-700"
                >
                  Approve request
                </button>
                <button
                  type="button"
                  (click)="reject(request)"
                  class="rounded-md border border-bad-600 px-3 py-2 text-sm font-medium text-bad-700 hover:bg-bad-100"
                >
                  Reject request
                </button>
              </div>
            </ui-section-card>
          }
        </div>

        <ui-section-card heading="Balance impact" [note]="request.leaveType">
          @if (balance(); as balance) {
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-ink-500">Accrued</dt>
                <dd class="tnum">{{ balance.accrued }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-ink-500">Taken</dt>
                <dd class="tnum">{{ balance.taken }}</dd>
              </div>
              <div class="flex justify-between border-t border-ink-100 pt-2 font-medium">
                <dt>Remaining</dt>
                <dd class="tnum">{{ balance.remaining }}</dd>
              </div>
              @if (request.status === 'pending') {
                <div class="flex justify-between text-ink-500">
                  <dt>If approved</dt>
                  <dd class="tnum">{{ balance.remaining - request.days }}</dd>
                </div>
              }
            </dl>
          } @else {
            <p class="text-sm text-ink-500">
              Unpaid leave draws on no balance, so nothing is deducted.
            </p>
          }
        </ui-section-card>
      </div>
    } @else {
      <div class="rounded-lg border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
        Loading request…
      </div>
    }
  `,
})
export class LeaveDetailPage {
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  private readonly session = inject(SessionService);
  private readonly audit = inject(AuditLogService);

  protected readonly name = employeeName;
  protected readonly tone = (status: LeaveRequest['status']) => APPROVAL_TONE[status];
  protected readonly canDecide = this.session.canApproveLeave;
  protected readonly rejectionReason = signal('');
  protected readonly rejectError = signal('');

  private readonly requests = this.store.selectSignal(leaveRequestsFeature.selectors.all);
  private readonly balances = this.store.selectSignal(leaveBalancesFeature.selectors.all);

  protected readonly request = computed(() =>
    this.requests().find((row) => row.id === this.id()),
  );

  protected readonly balance = computed(() => {
    const request = this.request();
    if (!request || request.leaveType === 'Unpaid') {
      return undefined;
    }
    return this.balances().find(
      (row) => row.employeeId === request.employeeId && row.leaveType === request.leaveType,
    );
  });

  protected readonly fields = computed<Field[]>(() => {
    const request = this.request();
    if (!request) {
      return [];
    }
    return [
      { label: 'Employee', value: employeeName(request.employeeId) },
      { label: 'Employee code', value: employeeCode(request.employeeId), mono: true },
      { label: 'Leave type', value: request.leaveType },
      { label: 'First day', value: request.startDate, mono: true },
      { label: 'Last day', value: request.endDate, mono: true },
      { label: 'Days', value: request.days, mono: true },
      { label: 'Applied on', value: request.appliedAt, mono: true },
      { label: 'Decided by', value: request.approvedBy ?? '—' },
    ];
  });

  protected onReason(event: Event): void {
    this.rejectionReason.set((event.target as HTMLTextAreaElement).value);
    this.rejectError.set('');
  }

  protected approve(request: LeaveRequest): void {
    this.store.dispatch(
      leaveRequestsFeature.actions.upsert({
        item: {
          ...request,
          status: 'approved',
          approvedBy: this.session.currentUser()?.username ?? 'system',
          rejectionReason: undefined,
        },
      }),
    );

    const balance = this.balance();
    if (balance) {
      this.store.dispatch(
        leaveBalancesFeature.actions.upsert({ item: applyApproval(balance, request.days) }),
      );
    }
    this.log(request, 'Approved leave request');
  }

  protected reject(request: LeaveRequest): void {
    const reason = this.rejectionReason().trim();
    if (reason.length < 10) {
      this.rejectError.set('Give a reason of at least 10 characters before rejecting.');
      return;
    }

    // A previously approved request that is now rejected must give its days back.
    const balance = this.balance();
    if (request.status === 'approved' && balance) {
      this.store.dispatch(
        leaveBalancesFeature.actions.upsert({ item: reverseApproval(balance, request.days) }),
      );
    }

    this.store.dispatch(
      leaveRequestsFeature.actions.upsert({
        item: {
          ...request,
          status: 'rejected',
          approvedBy: this.session.currentUser()?.username ?? 'system',
          rejectionReason: reason,
        },
      }),
    );
    this.log(request, 'Rejected leave request');
  }

  private log(request: LeaveRequest, action: string): void {
    this.audit.record({
      actorRole: this.session.role(),
      actorName: this.session.currentUser()?.username ?? 'system',
      action,
      moduleName: 'Leave',
      details: `${employeeName(request.employeeId)} · ${request.leaveType} · ${request.days} day(s) from ${request.startDate}`,
    });
  }

  constructor() {
    this.store.dispatch(leaveRequestsFeature.actions.load());
    this.store.dispatch(leaveBalancesFeature.actions.load());
  }
}
