import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface Field {
  label: string;
  value: string | number;
  mono?: boolean;
}

/** Label/value grid for record headers. One column on phones, two from `sm`. */
@Component({
  selector: 'ui-field-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      @for (field of fields(); track field.label) {
        <div class="min-w-0">
          <dt class="text-xs font-medium tracking-wide text-ink-500 uppercase">
            {{ field.label }}
          </dt>
          <dd class="mt-0.5 text-sm text-ink-900" [class.tnum]="field.mono === true">
            {{ field.value }}
          </dd>
        </div>
      }
    </dl>
  `,
})
export class FieldList {
  readonly fields = input.required<Field[]>();
}
