import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../core/session';
import { Icon } from '../../shared/ui/icon';

/**
 * "User Login → Valid Credentials? → [no] Show Error / [yes] Determine Role".
 * The role is not chosen here — it comes from the account, and decides which
 * dashboard the router lands on.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon],
  template: `
    <div class="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <!-- Brand panel: hidden on phones so the form gets the whole screen -->
      <section class="hidden flex-col justify-between bg-brand-800 p-10 text-white lg:flex">
        <div class="flex items-center gap-2.5">
          <span class="grid h-9 w-9 place-items-center rounded bg-brand-500 font-bold">P</span>
          <span class="leading-tight">
            <span class="block font-semibold">PayFlow</span>
            <span class="block text-xs text-brand-300">HR &amp; Payroll</span>
          </span>
        </div>

        <div class="max-w-md">
          <h2 class="text-2xl font-semibold">Payroll that closes on time.</h2>
          <p class="mt-3 text-sm text-brand-100">
            Attendance, leave and overtime feed one engine. HR runs the cycle, the accountant
            verifies and pays it, and every step is written to the audit trail.
          </p>
          <ul class="mt-6 space-y-2 text-sm text-brand-100">
            <li class="flex items-center gap-2">
              <ui-icon name="clock" [size]="16" /> Attendance locked before calculation
            </li>
            <li class="flex items-center gap-2">
              <ui-icon name="scale" [size]="16" /> Tax, provident fund, loans and bonuses applied
            </li>
            <li class="flex items-center gap-2">
              <ui-icon name="shield" [size]="16" /> Approvals separated by role
            </li>
          </ul>
        </div>

        <p class="text-xs text-brand-300">Meghna Apparels Ltd. · Gazipur, Bangladesh</p>
      </section>

      <section class="flex items-center justify-center p-6 sm:p-10">
        <div class="w-full max-w-sm">
          <div class="mb-6 flex items-center gap-2.5 lg:hidden">
            <span
              class="grid h-9 w-9 place-items-center rounded bg-brand-600 font-bold text-white"
            >
              P
            </span>
            <span class="leading-tight">
              <span class="block font-semibold text-ink-900">PayFlow</span>
              <span class="block text-xs text-ink-500">HR &amp; Payroll</span>
            </span>
          </div>

          <h1 class="text-xl font-semibold text-ink-900">Sign in</h1>
          <p class="mt-1 text-sm text-ink-500">Use your company account to continue.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-ink-700">Username</label>
              <input
                id="username"
                type="text"
                formControlName="username"
                autocomplete="username"
                spellcheck="false"
                [attr.aria-invalid]="error() ? 'true' : null"
                class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-ink-700">Password</label>
              <div class="relative mt-1">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  [attr.aria-invalid]="error() ? 'true' : null"
                  class="w-full rounded-md border border-ink-200 py-2 pr-16 pl-3 text-sm focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="absolute top-1.5 right-2 rounded px-1.5 py-1 text-xs font-medium text-ink-500 hover:text-brand-600"
                  [attr.aria-pressed]="showPassword()"
                >
                  {{ showPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            @if (error()) {
              <p
                role="alert"
                class="flex items-start gap-2 rounded-md border border-bad-600 bg-bad-100 px-3 py-2 text-sm text-bad-700"
              >
                <ui-icon name="alert" [size]="16" />
                {{ error() }}
              </p>
            }

            <button
              type="submit"
              [disabled]="submitting()"
              class="w-full rounded-md bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {{ submitting() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <div class="mt-8 rounded-lg border border-ink-200 bg-white p-4">
            <p class="text-xs font-semibold tracking-wide text-ink-500 uppercase">
              Demo accounts
            </p>
            <p class="mt-1 text-xs text-ink-500">
              This is a mock application. Pick a role to sign in as — each one sees a different
              dashboard and a different sidebar.
            </p>
            <ul class="mt-3 space-y-1.5">
              @for (account of accounts; track account.username) {
                <li>
                  <button
                    type="button"
                    (click)="fill(account.username, account.password)"
                    class="flex w-full items-center gap-2 rounded-md border border-ink-100 px-2.5 py-1.5 text-left text-xs hover:border-brand-400 hover:bg-brand-100/40"
                  >
                    <span class="w-20 shrink-0 font-medium text-ink-800">{{ account.role }}</span>
                    <span class="tnum min-w-0 flex-1 truncate text-ink-500">
                      {{ account.username }} / {{ account.password }}
                    </span>
                    <span class="shrink-0 text-brand-600">Use</span>
                  </button>
                </li>
              }
            </ul>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class LoginPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly accounts = this.session.demoAccounts;
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  private readonly next = computed(
    () => this.route.snapshot.queryParamMap.get('next') ?? '/dashboard',
  );

  protected fill(username: string, password: string): void {
    this.form.setValue({ username, password });
    this.error.set('');
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.error.set('');
    const { username, password } = this.form.getRawValue();
    this.submitting.set(true);

    const result = this.session.signIn(username, password);
    this.submitting.set(false);

    if (!result.ok) {
      this.error.set(result.message);
      this.form.patchValue({ password: '' });
      return;
    }
    void this.router.navigateByUrl(this.next());
  }
}
