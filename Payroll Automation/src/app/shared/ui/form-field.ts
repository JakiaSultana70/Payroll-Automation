import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

/**
 * Label + control + hint/error wrapper. Keeps every form in the app consistent
 * and makes the error state a single decision rather than per-field markup.
 *
 * Pass the control's `id` so the label binds to it, and `error` only once the
 * field should actually show it (touched or submitted) — the wrapper does not
 * decide when to nag.
 */
@Component({
  selector: 'ui-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4">
      <label [attr.for]="for()" class="block text-sm font-medium text-ink-700">
        {{ label() }}
        @if (!optional()) {
          <span class="text-bad-600" aria-hidden="true">*</span>
        }
      </label>

      <div class="mt-1">
        <ng-content />
      </div>

      @if (error()) {
        <p class="mt-1 text-xs text-bad-700" role="alert">{{ error() }}</p>
      } @else if (hint()) {
        <p class="mt-1 text-xs text-ink-500">{{ hint() }}</p>
      }
    </div>
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly for = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly optional = input(false, { transform: booleanAttribute });
}
