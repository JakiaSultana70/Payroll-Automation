import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { moduleByPath, visibleModules } from '../core/module-registry';
import { SessionService } from '../core/session';
import { Icon } from '../shared/ui/icon';
import { SidebarNav } from './sidebar-nav';

/**
 * Application chrome. Persistent left sidebar on desktop, off-canvas drawer
 * below `md`. The header carries breadcrumb, search, the role switcher,
 * notifications and the user menu — no navigation logic.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, Icon, SidebarNav],
  host: { '(document:keydown.escape)': 'closeAll()' },
  template: `
    <div class="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      <div class="hidden md:sticky md:top-0 md:block md:h-screen">
        <app-sidebar-nav class="block h-full" />
      </div>

      @if (drawerOpen()) {
        <div
          class="fixed inset-0 z-40 bg-ink-950/50 md:hidden"
          (click)="drawerOpen.set(false)"
          aria-hidden="true"
        ></div>
      }
      <div
        class="fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 md:hidden"
        [class.translate-x-0]="drawerOpen()"
        [class.-translate-x-full]="!drawerOpen()"
        [attr.aria-hidden]="!drawerOpen()"
      >
        <app-sidebar-nav class="block h-full" (navigate)="drawerOpen.set(false)" />
      </div>

      <div class="flex min-w-0 flex-col">
        <header class="sticky top-0 z-30 border-b border-ink-200 bg-white">
          <div class="flex items-center gap-3 px-3 py-2.5 sm:px-5">
            <button
              type="button"
              (click)="drawerOpen.set(true)"
              class="flex items-center gap-1.5 rounded-md border border-ink-200 px-2 py-1.5 text-sm font-medium text-ink-700 md:hidden"
            >
              <ui-icon name="menu" [size]="17" />
              Menu
            </button>

            <nav aria-label="Breadcrumb" class="min-w-0 flex-1">
              <ol class="flex items-center gap-1.5 text-sm">
                <li>
                  <a routerLink="/dashboard" class="text-ink-500 hover:text-brand-600">Home</a>
                </li>
                @for (crumb of crumbs(); track crumb.path) {
                  <li class="flex min-w-0 items-center gap-1.5">
                    <span class="text-ink-300"><ui-icon name="chevron-right" [size]="14" /></span>
                    @if (crumb.linked) {
                      <a
                        [routerLink]="crumb.path"
                        class="truncate text-ink-700 hover:text-brand-600"
                        [class.font-medium]="$last"
                      >
                        {{ crumb.label }}
                      </a>
                    } @else {
                      <span class="truncate text-ink-700" [class.font-medium]="$last">
                        {{ crumb.label }}
                      </span>
                    }
                  </li>
                }
              </ol>
            </nav>

            <button
              type="button"
              (click)="searchOpen.set(!searchOpen())"
              class="rounded-md border border-ink-200 p-1.5 text-ink-600 sm:hidden"
              [attr.aria-expanded]="searchOpen()"
              aria-label="Search modules"
            >
              <ui-icon name="search" [size]="17" />
            </button>

            <div class="relative hidden sm:block sm:w-56">
              <span class="pointer-events-none absolute top-2 left-2.5 text-ink-400">
                <ui-icon name="search" [size]="16" />
              </span>
              <input
                type="search"
                [value]="query()"
                (input)="onQuery($event)"
                placeholder="Find a module"
                aria-label="Find a module"
                class="w-full rounded-md border border-ink-200 py-1.5 pr-3 pl-8 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
              />
              @if (matches().length) {
                <ul
                  class="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-ink-200 bg-white shadow-lg"
                >
                  @for (mod of matches(); track mod.path) {
                    <li>
                      <a
                        [routerLink]="['/', mod.path]"
                        (click)="query.set('')"
                        class="block px-3 py-2 text-sm hover:bg-brand-100"
                      >
                        {{ mod.name }}
                      </a>
                    </li>
                  }
                </ul>
              }
            </div>

            <a
              routerLink="/audit"
              class="relative hidden rounded-md border border-ink-200 p-1.5 text-ink-600 hover:text-brand-600 sm:block"
              aria-label="Notifications"
            >
              <ui-icon name="bell" [size]="17" />
              <span
                class="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-bad-600 px-1 text-[10px] font-semibold text-white"
              >
                3
              </span>
            </a>

            <div class="relative">
              <button
                type="button"
                (click)="userMenuOpen.set(!userMenuOpen())"
                [attr.aria-expanded]="userMenuOpen()"
                class="flex items-center gap-2 rounded-md border border-ink-200 py-1 pr-2 pl-1 text-sm hover:border-brand-400"
              >
                <span
                  class="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white"
                >
                  {{ initials() }}
                </span>
                <span class="hidden lg:inline">{{ displayName() }}</span>
                <ui-icon name="chevron-down" [size]="14" />
              </button>

              @if (userMenuOpen()) {
                <div
                  class="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-md border border-ink-200 bg-white shadow-lg"
                >
                  <div class="border-b border-ink-100 px-3 py-2.5">
                    <p class="text-sm font-medium text-ink-900">{{ displayName() }}</p>
                    <p class="tnum text-xs text-ink-500">{{ username() }}</p>
                    <p class="mt-1 text-xs text-brand-700">Signed in as {{ role() }}</p>
                  </div>
                  <a
                    routerLink="/profile"
                    (click)="userMenuOpen.set(false)"
                    class="block px-3 py-2 text-sm hover:bg-brand-100"
                  >
                    My profile
                  </a>
                  <button
                    type="button"
                    (click)="signOut()"
                    class="flex w-full items-center gap-2 border-t border-ink-100 px-3 py-2 text-left text-sm text-bad-700 hover:bg-bad-100"
                  >
                    <ui-icon name="exit" [size]="15" />
                    Sign out
                  </button>
                </div>
              }
            </div>
          </div>

          @if (searchOpen()) {
            <div class="border-t border-ink-100 p-3 sm:hidden">
              <input
                type="search"
                [value]="query()"
                (input)="onQuery($event)"
                placeholder="Find a module"
                aria-label="Find a module"
                class="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              @if (matches().length) {
                <ul class="mt-2 overflow-hidden rounded-md border border-ink-200">
                  @for (mod of matches(); track mod.path) {
                    <li>
                      <a
                        [routerLink]="['/', mod.path]"
                        (click)="closeAll()"
                        class="block px-3 py-2 text-sm hover:bg-brand-100"
                      >
                        {{ mod.name }}
                      </a>
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </header>

        <main class="min-w-0 flex-1 px-3 py-5 sm:px-5 sm:py-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);

  protected readonly drawerOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly query = signal('');

  protected readonly role = this.session.role;
  protected readonly displayName = this.session.displayName;
  protected readonly initials = this.session.initials;
  protected readonly username = computed(() => this.session.currentUser()?.username ?? '');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly crumbs = computed(() => {
    const segments = this.url().split('?')[0].split('/').filter(Boolean);
    if (!segments.length) {
      return [];
    }
    const mod = moduleByPath(segments[0]);
    // A crumb only links when the role may actually open it. Someone viewing
    // their own record inside a module they cannot browse gets plain text
    // rather than a link that bounces them to the dashboard.
    const linked = !mod || mod.roles.includes(this.session.role());
    const trail = [
      { path: `/${segments[0]}`, label: mod?.name ?? titleise(segments[0]), linked },
    ];
    if (segments.length > 1) {
      trail.push({ path: this.url(), label: decodeURIComponent(segments[1]), linked: true });
    }
    return trail;
  });

  protected readonly matches = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (term.length < 2) {
      return [];
    }
    return visibleModules(this.session.role())
      .filter(
        (mod) =>
          mod.name.toLowerCase().includes(term) || mod.blurb.toLowerCase().includes(term),
      )
      .slice(0, 6);
  });

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected signOut(): void {
    this.session.signOut();
    this.closeAll();
    void this.router.navigate(['/login']);
  }

  protected closeAll(): void {
    this.drawerOpen.set(false);
    this.searchOpen.set(false);
    this.userMenuOpen.set(false);
    this.query.set('');
  }
}

function titleise(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
