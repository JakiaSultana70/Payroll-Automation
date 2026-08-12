import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'ui-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span class="rounded-full bg-ink-100 p-2.5 text-ink-400">
        <ui-icon [name]="icon()" [size]="20" />
      </span>
      <p class="text-sm font-medium text-ink-700">{{ title() }}</p>
      @if (hint()) {
        <p class="max-w-sm text-sm text-ink-500">{{ hint() }}</p>
      }
    </div>
  `,
})
export class EmptyState {
  readonly title = input('Nothing here yet');
  readonly hint = input('');
  readonly icon = input('search');
}
