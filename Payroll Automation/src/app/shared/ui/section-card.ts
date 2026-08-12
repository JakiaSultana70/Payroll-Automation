import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Titled container for a detail-page block. */
@Component({
  selector: 'ui-section-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-lg border border-ink-200 bg-white">
      <div class="flex items-baseline justify-between gap-3 border-b border-ink-100 px-4 py-3">
        <h2 class="text-sm font-semibold text-ink-800">{{ heading() }}</h2>
        @if (note()) {
          <p class="text-xs text-ink-500">{{ note() }}</p>
        }
      </div>
      <div [class.p-4]="padded()">
        <ng-content />
      </div>
    </section>
  `,
})
export class SectionCard {
  readonly heading = input.required<string>();
  readonly note = input('');
  readonly padded = input(true);
}
