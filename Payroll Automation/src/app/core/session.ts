import { Injectable, computed, inject, signal } from '@angular/core';
import { RoleName } from './models/common';
import { AppUser, Employee, Role } from './models/hr';
import { AuditLogService } from './audit-log';
import { DEMO_CREDENTIALS, DemoCredential, findCredential } from './auth/demo-credentials';
import { PasswordStore } from './auth/password-store';
import { RuntimeCredential, RuntimeCredentialStore } from './auth/runtime-credentials';
import { MockApiService } from './mock-db/mock-api';

const STORAGE_KEY = 'payflow.session';

export interface SignedInUser {
  userId: string;
  username: string;
  employeeId: string;
  name: string;
  role: RoleName;
}

export type SignInResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Authentication and the signed-in session.
 *
 * Implements the first branch of the activity diagram — User Login → Valid
 * Credentials? → [no] Show Error / [yes] Determine Role → the matching
 * dashboard. Credentials are static (see `auth/demo-credentials.ts`); the
 * account state checks, role resolution, audit trail and sign-out are real.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly audit = inject(AuditLogService);
  private readonly passwords = inject(PasswordStore);
  private readonly runtimeCredentials = inject(RuntimeCredentialStore);
  private readonly api = inject(MockApiService);

  private readonly user = signal<SignedInUser | null>(this.restore());

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** Falls back to Employee so guards can evaluate before sign-in. */
  readonly role = computed<RoleName>(() => this.user()?.role ?? 'Employee');

  /** The signed-in person's own employee record, used by self-service views. */
  readonly employeeId = computed(() => this.user()?.employeeId ?? '');

  readonly displayName = computed(() => this.user()?.name ?? 'Guest');

  readonly initials = computed(() =>
    this.displayName()
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2),
  );

  /** Approvals belong to specific roles — see the swimlanes in the diagram. */
  readonly canApproveLeave = computed(() => ['HR', 'Admin'].includes(this.role()));
  readonly canApproveBatch = computed(() => ['Accountant', 'Admin'].includes(this.role()));
  readonly canRequestPayroll = computed(() => ['HR', 'Admin'].includes(this.role()));

  /** Checks the seeded demo accounts first, then any account created at
   *  runtime via the "Users & Roles" page. */
  private resolveCredential(username: string): DemoCredential | RuntimeCredential | undefined {
    return findCredential(username) ?? this.runtimeCredentials.find(username);
  }

  signIn(username: string, password: string): SignInResult {
    const trimmed = username.trim();
    if (!trimmed || !password) {
      return { ok: false, message: 'Enter both your username and password.' };
    }

    const credential = this.resolveCredential(trimmed);
    // A changed password overrides the seeded demo password for the rest of
    // this browser session; the demo value keeps working until it is changed.
    const expected = credential ? (this.passwords.passwordFor(credential.username) ?? credential.password) : undefined;
    // Same message for an unknown user and a wrong password, so the form does
    // not reveal which usernames exist.
    if (!credential || expected !== password) {
      return { ok: false, message: 'Invalid username or password.' };
    }

    // Live lookups (not the static seed) so a user created from the Admin UI
    // this session can sign in immediately.
    const account = this.api.peek<AppUser>('users').find((row) => row.id === credential.userId);
    if (!account) {
      return { ok: false, message: 'No account is linked to this login.' };
    }
    if (account.status === 'pending-activation') {
      return {
        ok: false,
        message: 'This account is awaiting activation by an administrator.',
      };
    }
    if (account.status === 'disabled') {
      return { ok: false, message: 'This account has been disabled. Contact HR.' };
    }

    const employee = this.api.peek<Employee>('employees').find((row) => row.id === account.employeeId);
    const role = this.api.peek<Role>('roles').find((row) => row.id === account.roleId);
    if (!employee || !role) {
      return { ok: false, message: 'This account is not fully configured.' };
    }
    if (employee.status === 'separated') {
      return { ok: false, message: 'This employee has left the company.' };
    }

    const signedIn: SignedInUser = {
      userId: account.id,
      username: account.username,
      employeeId: employee.id,
      name: employee.name,
      role: role.roleName,
    };

    this.user.set(signedIn);
    this.persist(signedIn);
    this.recordAudit(signedIn, 'Signed in');
    return { ok: true };
  }

  /**
   * "Change password" self-service. Verifies the current password against
   * the same source `signIn` checks, then stores the new one in
   * `PasswordStore` and records an audit entry — no email/reset flow, since
   * this app has no mail server, but everything else behaves like the real
   * thing.
   */
  changePassword(currentPassword: string, newPassword: string): SignInResult {
    const current = this.user();
    if (!current) {
      return { ok: false, message: 'You must be signed in to change your password.' };
    }
    const credential = this.resolveCredential(current.username);
    const expected = credential
      ? (this.passwords.passwordFor(credential.username) ?? credential.password)
      : undefined;
    if (!credential || expected !== currentPassword) {
      return { ok: false, message: 'Your current password is not correct.' };
    }
    if (newPassword.length < 8) {
      return { ok: false, message: 'New password must be at least 8 characters.' };
    }
    this.passwords.set(current.username, newPassword);
    this.recordAudit(current, 'Changed password');
    return { ok: true };
  }

  signOut(): void {
    const current = this.user();
    if (current) {
      this.recordAudit(current, 'Signed out');
    }
    this.user.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /** Roles that have a demo account, for the hints on the sign-in screen. */
  readonly demoAccounts = DEMO_CREDENTIALS;

  /** Every sign-in and sign-out lands in the audit trail, as in the diagram. */
  private recordAudit(user: SignedInUser, action: string): void {
    this.audit.record({
      actorRole: user.role,
      actorName: user.username,
      action,
      moduleName: 'Authentication',
      details: `${user.name} (${user.role})`,
    });
  }

  private persist(user: SignedInUser): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  /** Survives a page reload, but not a new browser session. */
  private restore(): SignedInUser | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SignedInUser) : null;
    } catch {
      return null;
    }
  }
}
