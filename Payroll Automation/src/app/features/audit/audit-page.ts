import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Tone } from '../../core/models/common';
import { AuditLog } from '../../core/models/hr';
import { auditLogsFeature, notificationsFeature } from '../../core/store/features';
import { Column, DataTable } from '../../shared/ui/data-table';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';

const ROLE_TONE: Record<string, Tone> = {
  Admin: 'brand',
  HR: 'ok',
  Accountant: 'warn',
  Employee: 'neutral',
};

/** "System: Log Audit Event" — every action in the diagram writes one of these. */
@Component({
  selector: 'app-audit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiTile, SectionCard, DataTable, StatusBadge],
  template: `
    <ui-page-header
      eyebrow="Governance"
      title="Audit log"
      subtitle="Who did what, in which module, and when"
    />

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Events" [value]="logs().length" hint="All recorded actions" />
      <ui-kpi-tile label="Payroll events" [value]="payrollEvents()" hint="Runs, approvals, payments" />
      <ui-kpi-tile
        label="Unread notifications"
        [value]="unread().length"
        hint="Across all users"
        [tone]="unread().length ? 'warn' : 'ok'"
      />
      <ui-kpi-tile label="Notifications sent" [value]="notifications().length" hint="System messages" />
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4">
      <ui-section-card heading="Audit trail" note="Newest first" [padded]="false">
        <ui-data-table
          [columns]="columns"
          [rows]="logs()"
          [loading]="loading()"
          searchPlaceholder="Search action, module or actor"
          emptyTitle="No audit event"
        />
      </ui-section-card>

      <ui-section-card heading="Notifications" [padded]="false">
        <ul class="divide-y divide-ink-100">
          @for (note of notifications(); track note.id) {
            <li class="flex flex-wrap items-start gap-3 px-4 py-3">
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium text-ink-900">{{ note.title }}</span>
                <span class="block text-sm text-ink-600">{{ note.message }}</span>
              </span>
              <ui-status-badge
                [label]="note.read ? 'read' : 'unread'"
                [tone]="note.read ? 'neutral' : 'warn'"
              />
              <span class="tnum text-xs text-ink-500">{{ note.sentAt }}</span>
            </li>
          } @empty {
            <li class="px-4 py-6 text-center text-sm text-ink-500">Loading…</li>
          }
        </ul>
      </ui-section-card>
    </div>
  `,
})
export class AuditPage {
  private readonly store = inject(Store);

  protected readonly columns: Column<AuditLog>[] = [
    { key: 'time', label: 'Timestamp', mono: true, value: (row) => row.timestamp },
    {
      key: 'role',
      label: 'Role',
      value: (row) => row.actorRole,
      badge: (row) => ({ label: row.actorRole, tone: ROLE_TONE[row.actorRole] ?? 'neutral' }),
    },
    { key: 'actor', label: 'Actor', mono: true, value: (row) => row.actorName },
    { key: 'module', label: 'Module', value: (row) => row.moduleName },
    { key: 'action', label: 'Action', value: (row) => row.action },
    { key: 'details', label: 'Details', value: (row) => row.details },
  ];

  protected readonly logs = this.store.selectSignal(auditLogsFeature.selectors.all);
  protected readonly notifications = this.store.selectSignal(notificationsFeature.selectors.all);
  protected readonly loading = this.store.selectSignal(auditLogsFeature.selectors.loading);

  protected readonly payrollEvents = computed(
    () => this.logs().filter((row) => row.moduleName === 'Payroll' || row.moduleName === 'Payment')
      .length,
  );
  protected readonly unread = computed(() => this.notifications().filter((row) => !row.read));

  constructor() {
    this.store.dispatch(auditLogsFeature.actions.load());
    this.store.dispatch(notificationsFeature.actions.load());
  }
}
