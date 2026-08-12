import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tone } from '../../core/models/common';
import { EmptyState } from './empty-state';
import { Icon } from './icon';
import { StatusBadge } from './status-badge';

export interface Column<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** Render with tabular figures — use for codes, quantities and money. */
  mono?: boolean;
  value: (row: T) => string | number;
  /** Render as a status badge instead of plain text. */
  badge?: (row: T) => { label: string; tone: Tone } | null;
  /** Override the sort key when the displayed value is not sortable. */
  sortValue?: (row: T) => string | number;
}

/**
 * Hand-rolled sortable, filterable table. Generic over the row type so column
 * accessors stay type-checked in templates. Wide content scrolls inside its own
 * container so the page body never scrolls horizontally.
 */
@Component({
  selector: 'ui-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, StatusBadge, EmptyState],
  template: `
    <div class="rounded-lg border border-ink-200 bg-white">
      @if (searchable()) {
        <div class="border-b border-ink-100 p-3">
          <div class="relative max-w-sm">
            <span class="pointer-events-none absolute top-2.5 left-2.5 text-ink-400">
              <ui-icon name="search" [size]="16" />
            </span>
            <input
              type="search"
              [value]="query()"
              (input)="onQuery($event)"
              [attr.placeholder]="searchPlaceholder()"
              [attr.aria-label]="searchPlaceholder()"
              class="w-full rounded-md border border-ink-200 py-1.5 pr-3 pl-8 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      }

      @if (loading()) {
        <div class="space-y-2 p-4" aria-busy="true" aria-live="polite">
          @for (row of skeletons; track row) {
            <div class="h-8 animate-pulse rounded bg-ink-100"></div>
          }
        </div>
      } @else if (!view().length) {
        <ui-empty-state [title]="emptyTitle()" [hint]="emptyHint()" />
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-ink-200 bg-ink-50">
                @for (col of columns(); track col.key) {
                  <th
                    scope="col"
                    class="px-3 py-2 font-medium text-ink-600"
                    [class.text-right]="col.align === 'right'"
                    [class.text-left]="col.align !== 'right'"
                    [attr.aria-sort]="ariaSort(col.key)"
                  >
                    <button
                      type="button"
                      (click)="toggleSort(col.key)"
                      class="inline-flex items-center gap-1 hover:text-brand-600"
                    >
                      {{ col.label }}
                      @if (sortKey() === col.key) {
                        <ui-icon name="sort" [size]="13" />
                      }
                    </button>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of view(); track row.id) {
                <tr class="border-b border-ink-100 last:border-0 hover:bg-brand-100/40">
                  @for (col of columns(); track col.key) {
                    <td
                      class="px-3 py-2 align-middle"
                      [class.text-right]="col.align === 'right'"
                      [class.tnum]="col.mono === true"
                    >
                      @if (col.badge) {
                        @if (col.badge(row); as badge) {
                          <ui-status-badge [label]="badge.label" [tone]="badge.tone" />
                        }
                      } @else if ($first && rowLink()) {
                        <a
                          [routerLink]="rowLink()!(row)"
                          class="font-medium text-brand-600 hover:underline"
                        >
                          {{ col.value(row) }}
                        </a>
                      } @else {
                        {{ col.value(row) }}
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div
          class="flex items-center justify-between border-t border-ink-100 px-3 py-2 text-xs text-ink-500"
        >
          <span>{{ view().length }} of {{ rows().length }} records</span>
          @if (query()) {
            <button type="button" (click)="query.set('')" class="hover:text-brand-600">
              Clear filter
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class DataTable<T extends { id: string }> {
  readonly columns = input.required<Column<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly loading = input(false);
  readonly searchable = input(true);
  readonly searchPlaceholder = input('Search records');
  readonly rowLink = input<((row: T) => (string | number)[]) | null>(null);
  readonly emptyTitle = input('No records match');
  readonly emptyHint = input('');

  protected readonly query = signal('');
  protected readonly sortKey = signal<string | null>(null);
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  protected readonly skeletons = [0, 1, 2, 3, 4];

  protected readonly view = computed(() => {
    const term = this.query().trim().toLowerCase();
    const cols = this.columns();
    let out = this.rows().slice();

    if (term) {
      out = out.filter((row) =>
        cols.some((col) => String(col.value(row)).toLowerCase().includes(term)),
      );
    }

    const key = this.sortKey();
    const col = cols.find((c) => c.key === key);
    if (col) {
      const read = col.sortValue ?? col.value;
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      out.sort((a, b) => {
        const left = read(a);
        const right = read(b);
        if (typeof left === 'number' && typeof right === 'number') {
          return (left - right) * dir;
        }
        return String(left).localeCompare(String(right)) * dir;
      });
    }
    return out;
  });

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected toggleSort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    this.sortDir.set('asc');
  }

  protected ariaSort(key: string): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key) {
      return 'none';
    }
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }
}
