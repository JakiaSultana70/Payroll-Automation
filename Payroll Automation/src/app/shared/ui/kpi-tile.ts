import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tone } from '../../core/models/common';

@Component({
  selector: 'ui-kpi-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-ink-200 bg-white p-4">
      <p class="text-xs font-medium tracking-wide text-ink-500 uppercase">{{ label() }}</p>
      <p
        class="tnum mt-1.5 text-2xl font-semibold"
        [class.text-ink-900]="tone() === 'neutral'"
        [class.text-ok-700]="tone() === 'ok'"
        [class.text-warn-700]="tone() === 'warn'"
        [class.text-bad-700]="tone() === 'bad'"
        [class.text-brand-700]="tone() === 'brand'"
      >
        {{ value() }}
      </p>
      @if (hint()) {
        <p class="mt-1 text-xs text-ink-500">{{ hint() }}</p>
      }
    </div>
  `,
})
export class KpiTile {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input('');
  readonly tone = input<Tone>('neutral');
}
