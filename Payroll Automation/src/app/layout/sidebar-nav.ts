import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MODULE_GROUPS, modulesFor } from '../core/module-registry';
import { SessionService } from '../core/session';
import { Icon } from '../shared/ui/icon';

/** Primary navigation. Entries are filtered by the signed-in role, mirroring
 *  the swimlanes in the source activity diagram. */
@Component({
  selector: 'app-sidebar-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <nav class="flex h-full flex-col overflow-y-auto bg-brand-800 pb-6" aria-label="Modules">
      <a
        routerLink="/dashboard"
        (click)="navigate.emit()"
        class="flex items-center gap-2.5 px-4 py-4 text-white"
      >
        <span class="grid h-8 w-8 place-items-center rounded bg-brand-500 text-sm font-bold">
          P
        </span>
        <span class="leading-tight">
          <span class="block text-sm font-semibold">PayFlow</span>
          <span class="block text-[11px] text-brand-300">HR &amp; Payroll</span>
        </span>
      </a>

      <a
        routerLink="/dashboard"
        routerLinkActive="bg-brand-600 text-white"
        (click)="navigate.emit()"
        class="mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-brand-100 hover:bg-brand-700 hover:text-white"
      >
        <ui-icon name="gauge" [size]="17" />
        {{ role() }} dashboard
      </a>

      @for (group of groups; track group) {
        @if (modulesIn(group).length) {
          <p
            class="mt-5 mb-1 px-4 text-[11px] font-semibold tracking-wider text-brand-300 uppercase"
          >
            {{ group }}
          </p>
          @for (mod of modulesIn(group); track mod.path) {
            <a
              [routerLink]="['/', mod.path]"
              routerLinkActive="bg-brand-600 text-white"
              (click)="navigate.emit()"
              class="mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-brand-100 hover:bg-brand-700 hover:text-white"
            >
              <ui-icon [name]="mod.icon" [size]="17" />
              <span class="min-w-0 flex-1 truncate">{{ mod.name }}</span>
            </a>
          }
        }
      }
    </nav>
  `,
})
export class SidebarNav {
  /** Emitted on any nav activation so the mobile drawer can close itself. */
  readonly navigate = output<void>();

  private readonly session = inject(SessionService);

  protected readonly groups = MODULE_GROUPS;
  protected readonly role = this.session.role;

  private readonly byGroup = computed(() =>
    Object.fromEntries(
      MODULE_GROUPS.map((group) => [group, modulesFor(this.session.role(), group)]),
    ),
  );

  protected modulesIn(group: string) {
    return this.byGroup()[group] ?? [];
  }
}
