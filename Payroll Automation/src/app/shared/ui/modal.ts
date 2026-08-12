import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from './icon';

/**
 * Accessible modal used by every write form in the app.
 *
 * Focus is trapped with the CDK (`cdkTrapFocus` + autocapture), Escape and a
 * backdrop click both dismiss, and the dialog is labelled by its own heading.
 * Content and footer actions are projected, so a feature only writes its form.
 */
@Component({
  selector: 'ui-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  host: { '(document:keydown.escape)': 'dismiss.emit()' },
  template: `
    <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div class="absolute inset-0 bg-ink-950/50" (click)="dismiss.emit()" aria-hidden="true"></div>

      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="heading()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        class="relative max-h-[90vh] w-full overflow-y-auto rounded-t-lg border border-ink-200 bg-white shadow-xl sm:max-w-lg sm:rounded-lg"
      >
        <div class="flex items-start justify-between gap-4 border-b border-ink-100 px-4 py-3">
          <div>
            <h2 class="text-sm font-semibold text-ink-900">{{ heading() }}</h2>
            @if (description()) {
              <p class="mt-0.5 text-xs text-ink-500">{{ description() }}</p>
            }
          </div>
          <button
            type="button"
            (click)="dismiss.emit()"
            class="rounded p-1 text-ink-500 hover:text-ink-900"
            aria-label="Close"
          >
            <ui-icon name="close" [size]="16" />
          </button>
        </div>

        <div class="px-4 py-4">
          <ng-content />
        </div>

        <div
          class="flex flex-col-reverse gap-2 border-t border-ink-100 px-4 py-3 sm:flex-row sm:justify-end"
        >
          <ng-content select="[modalActions]" />
        </div>
      </div>
    </div>
  `,
})
export class Modal {
  readonly heading = input.required<string>();
  readonly description = input('');
  readonly dismiss = output<void>();
}
