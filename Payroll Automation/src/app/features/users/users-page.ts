import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Tone } from '../../core/models/common';
import { AppUser } from '../../core/models/hr';
import { PasswordStore } from '../../core/auth/password-store';
import { RuntimeCredentialStore } from '../../core/auth/runtime-credentials';
import { AuditLogService } from '../../core/audit-log';
import { employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  permissionsFeature,
  rolesFeature,
  usersFeature,
} from '../../core/store/features';
import { Icon } from '../../shared/ui/icon';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';
import { NewUserResult, UserForm } from './user-form';

const USER_TONE: Record<AppUser['status'], Tone> = {
  active: 'ok',
  'pending-activation': 'warn',
  disabled: 'bad',
};

function tempPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Reset@${digits}`;
}

/** "Manage Users" and "User & Role Management" from the Admin lane. */
@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiTile, SectionCard, StatusBadge, Icon, UserForm],
  template: `
    <ui-page-header
      eyebrow="People"
      title="Users &amp; roles"
      subtitle="Accounts, role assignment and what each role may actually do"
    >
      <button
        type="button"
        (click)="formOpen.set(true)"
        class="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        <ui-icon name="edit" [size]="15" />
        Create user
      </button>
    </ui-page-header>

    @if (banner(); as msg) {
      <div class="mb-4 rounded-md bg-ok-100 px-4 py-3 text-sm text-ok-700">
        {{ msg }}
      </div>
    }

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Accounts" [value]="users().length" hint="Linked to an employee record" />
      <ui-kpi-tile
        label="Pending activation"
        [value]="pending().length"
        hint="Draft profiles without a login"
        [tone]="pending().length ? 'warn' : 'ok'"
      />
      <ui-kpi-tile label="Roles" [value]="roles().length" hint="Admin, HR, Accountant, Employee" />
      <ui-kpi-tile label="Permissions" [value]="permissions().length" hint="Module-level grants" />
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4">
      <ui-section-card heading="User accounts" [padded]="false">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
              <th scope="col" class="px-4 py-2 font-medium">Username</th>
              <th scope="col" class="px-4 py-2 font-medium">Employee</th>
              <th scope="col" class="px-4 py-2 font-medium">Email</th>
              <th scope="col" class="px-4 py-2 font-medium">Role</th>
              <th scope="col" class="px-4 py-2 font-medium">Last login</th>
              <th scope="col" class="px-4 py-2 font-medium">Status</th>
              <th scope="col" class="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (row of users(); track row.id) {
              <tr class="border-b border-ink-100 last:border-0">
                <td class="tnum px-4 py-2">{{ row.username }}</td>
                <td class="px-4 py-2">{{ employeeName(row.employeeId) }}</td>
                <td class="px-4 py-2">{{ row.email }}</td>
                <td class="px-4 py-2">{{ roleName(row.roleId) }}</td>
                <td class="tnum px-4 py-2">{{ row.lastLogin ?? 'never' }}</td>
                <td class="px-4 py-2"><ui-status-badge [label]="row.status" [tone]="USER_TONE[row.status]" /></td>
                <td class="px-4 py-2 text-right">
                  <button type="button" (click)="resetPassword(row)" class="rowBtn">Reset password</button>
                  @if (row.status === 'disabled') {
                    <button type="button" (click)="setStatus(row, 'active')" class="rowBtn">Enable</button>
                  } @else {
                    <button type="button" (click)="setStatus(row, 'disabled')" class="rowBtnDanger">Disable</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="px-4 py-6 text-center text-ink-500">No user account</td></tr>
            }
          </tbody>
        </table>
      </ui-section-card>

      <ui-section-card heading="Roles" note="A role grants permissions; a user holds one role">
        <ul class="space-y-3">
          @for (role of roles(); track role.id) {
            <li class="border-b border-ink-100 pb-3 last:border-0 last:pb-0">
              <div class="flex flex-wrap items-baseline gap-2">
                <span class="text-sm font-semibold text-ink-900">{{ role.roleName }}</span>
                <span class="tnum text-xs text-ink-400">{{ role.permissionIds.length }} permission(s)</span>
                <span class="tnum ml-auto text-xs text-ink-500">{{ userCount(role.id) }} user(s)</span>
              </div>
              <p class="mt-1 text-sm text-ink-600">{{ role.description }}</p>
            </li>
          }
        </ul>
      </ui-section-card>

      <ui-section-card heading="Permission matrix" [padded]="false">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
                <th scope="col" class="px-4 py-2 font-medium">Module</th>
                <th scope="col" class="px-4 py-2 font-medium">Read</th>
                <th scope="col" class="px-4 py-2 font-medium">Write</th>
                <th scope="col" class="px-4 py-2 font-medium">Approve</th>
                <th scope="col" class="px-4 py-2 font-medium">Held by</th>
              </tr>
            </thead>
            <tbody>
              @for (perm of permissions(); track perm.id) {
                <tr class="border-b border-ink-100 last:border-0">
                  <td class="px-4 py-2">{{ perm.moduleName }}</td>
                  <td class="px-4 py-2">{{ perm.read ? 'Yes' : '—' }}</td>
                  <td class="px-4 py-2">{{ perm.write ? 'Yes' : '—' }}</td>
                  <td class="px-4 py-2">{{ perm.canApprove ? 'Yes' : '—' }}</td>
                  <td class="px-4 py-2 text-ink-500">{{ heldBy(perm.id) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="px-4 py-6 text-center text-ink-500">Loading…</td></tr>
              }
            </tbody>
          </table>
        </div>
      </ui-section-card>
    </div>

    @if (formOpen()) {
      <app-user-form
        [employees]="employees()"
        [roles]="roles()"
        [existingEmployeeIds]="existingEmployeeIds()"
        [existingUsernames]="existingUsernames()"
        (submitted)="onCreate($event)"
        (cancelled)="formOpen.set(false)"
      />
    }
  `,
  styles: `
    .rowBtn { font-size: 12px; font-weight: 500; color: var(--color-brand-700); margin-left: 10px; }
    .rowBtn:hover { text-decoration: underline; }
    .rowBtnDanger { font-size: 12px; font-weight: 500; color: var(--color-bad-700); margin-left: 10px; }
    .rowBtnDanger:hover { text-decoration: underline; }
  `,
})
export class UsersPage {
  private readonly store = inject(Store);
  private readonly runtimeCredentials = inject(RuntimeCredentialStore);
  private readonly passwords = inject(PasswordStore);
  private readonly audit = inject(AuditLogService);
  private readonly session = inject(SessionService);

  protected readonly USER_TONE = USER_TONE;
  protected readonly employeeName = employeeName;

  protected readonly users = this.store.selectSignal(usersFeature.selectors.all);
  protected readonly roles = this.store.selectSignal(rolesFeature.selectors.all);
  protected readonly permissions = this.store.selectSignal(permissionsFeature.selectors.all);
  protected readonly employees = this.store.selectSignal(employeesFeature.selectors.all);

  protected readonly pending = computed(() =>
    this.users().filter((row) => row.status === 'pending-activation'),
  );
  protected readonly existingEmployeeIds = computed(() => this.users().map((row) => row.employeeId));
  protected readonly existingUsernames = computed(() => this.users().map((row) => row.username));

  protected readonly formOpen = signal(false);
  protected readonly banner = signal('');

  protected roleName(roleId: string): string {
    return this.roles().find((role) => role.id === roleId)?.roleName ?? '—';
  }

  protected userCount(roleId: string): number {
    return this.users().filter((user) => user.roleId === roleId).length;
  }

  protected heldBy(permissionId: string): string {
    const names = this.roles()
      .filter((role) => role.permissionIds.includes(permissionId))
      .map((role) => role.roleName);
    return names.length ? names.join(', ') : '—';
  }

  protected onCreate({ user, tempPassword: initialPassword }: NewUserResult): void {
    this.store.dispatch(usersFeature.actions.create({ item: user }));
    const role = this.roles().find((row) => row.id === user.roleId);
    this.runtimeCredentials.add({
      username: user.username,
      password: initialPassword,
      role: role?.roleName ?? 'Employee',
      userId: user.id,
    });
    this.audit.record({
      actorRole: this.session.role(),
      actorName: this.session.displayName(),
      action: 'Created user account',
      moduleName: 'Users & Roles',
      details: `${user.username} (${role?.roleName ?? ''})`,
    });
    this.banner.set(
      `Account "${user.username}" created. Temporary password: ${initialPassword} — share it securely; they should change it from My profile after first sign-in.`,
    );
    this.formOpen.set(false);
  }

  protected setStatus(user: AppUser, status: AppUser['status']): void {
    this.store.dispatch(usersFeature.actions.upsert({ item: { ...user, status } }));
    this.audit.record({
      actorRole: this.session.role(),
      actorName: this.session.displayName(),
      action: status === 'disabled' ? 'Disabled user account' : 'Enabled user account',
      moduleName: 'Users & Roles',
      details: user.username,
    });
  }

  protected resetPassword(user: AppUser): void {
    const next = tempPassword();
    this.passwords.set(user.username, next);
    this.audit.record({
      actorRole: this.session.role(),
      actorName: this.session.displayName(),
      action: 'Reset user password',
      moduleName: 'Users & Roles',
      details: user.username,
    });
    this.banner.set(`Password for "${user.username}" reset to: ${next}`);
  }

  constructor() {
    for (const feature of [
      usersFeature,
      rolesFeature,
      permissionsFeature,
      employeesFeature,
      departmentsFeature,
      designationsFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
