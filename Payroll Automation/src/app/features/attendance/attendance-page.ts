import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Tone, hours } from '../../core/models/common';
import { Attendance, Overtime } from '../../core/models/hr';
import { employeeCode, employeeName } from '../../core/mock-db/seed/org';
import { SessionService } from '../../core/session';
import {
  attendanceFeature,
  departmentsFeature,
  designationsFeature,
  employeesFeature,
  overtimeFeature,
  salaryStructuresFeature,
  shiftsFeature,
} from '../../core/store/features';
import { Icon } from '../../shared/ui/icon';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { PageHeader } from '../../shared/ui/page-header';
import { SectionCard } from '../../shared/ui/section-card';
import { StatusBadge } from '../../shared/ui/status-badge';
import { AttendanceCorrectionForm } from './attendance-correction-form';

const STATUS_TONE: Record<Attendance['status'], Tone> = {
  present: 'ok',
  absent: 'bad',
  leave: 'warn',
  holiday: 'brand',
  weekend: 'neutral',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function nowHHMM(): string {
  return new Date().toTimeString().slice(0, 5);
}
function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
function minutesBetween(start: string, end: string): number {
  const startMs = Date.parse(`2026-01-01T${start}:00Z`);
  let endMs = Date.parse(`2026-01-01T${end}:00Z`);
  if (endMs <= startMs) {
    endMs += 86_400_000;
  }
  return (endMs - startMs) / 60_000;
}
function isLateCheckIn(checkIn: string, shiftStart: string, graceMinutes: number): boolean {
  return minutesOf(checkIn) > minutesOf(shiftStart) + graceMinutes;
}
function workedHoursFor(checkIn: string, checkOut: string, breakMinutes: number): number {
  const raw = minutesOf(checkOut) - minutesOf(checkIn) - breakMinutes;
  return raw > 0 ? Math.round((raw / 60) * 100) / 100 : 0;
}

/**
 * "Employee: Check In / Check Out" and "HR: Review Attendance / correction"
 * from the diagram — raw punches are never edited in place; a correction is
 * a new value plus a reason, recorded via `AttendanceCorrectionForm`.
 */
@Component({
  selector: 'app-attendance-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, KpiTile, SectionCard, StatusBadge, Icon, AttendanceCorrectionForm],
  template: `
    <ui-page-header
      eyebrow="Time & Attendance"
      [title]="isSelfService() ? 'My attendance' : 'Attendance'"
      subtitle="Raw punches are never edited — corrections are recorded with a reason"
    />

    @if (isSelfService()) {
      <ui-section-card heading="Today" [note]="todayLabel">
        <div class="flex flex-wrap items-center gap-4">
          <div class="text-sm">
            <span class="text-ink-500">Check in:</span>
            <span class="tnum ml-1 font-medium">{{ today()?.checkIn ?? '—' }}</span>
          </div>
          <div class="text-sm">
            <span class="text-ink-500">Check out:</span>
            <span class="tnum ml-1 font-medium">{{ today()?.checkOut ?? '—' }}</span>
          </div>
          @if (today()?.isLate) {
            <ui-status-badge label="late" tone="warn" />
          }

          <div class="ml-auto flex gap-2">
            @if (!today()) {
              <button
                type="button"
                (click)="checkIn()"
                class="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <ui-icon name="clock" [size]="15" />
                Check in
              </button>
            } @else if (!today()!.checkOut) {
              <button
                type="button"
                (click)="checkOut()"
                class="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <ui-icon name="clock" [size]="15" />
                Check out
              </button>
            } @else {
              <span class="text-sm text-ok-700">Day complete — {{ hoursLabel(today()!) }}</span>
            }
          </div>
        </div>
      </ui-section-card>
    }

    <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ui-kpi-tile label="Present" [value]="present().length" hint="Days recorded" />
      <ui-kpi-tile
        label="Late arrivals"
        [value]="late().length"
        hint="Beyond the shift grace period"
        [tone]="late().length ? 'warn' : 'ok'"
      />
      <ui-kpi-tile
        label="Absent"
        [value]="absent().length"
        hint="Unapproved absence"
        [tone]="absent().length ? 'bad' : 'ok'"
      />
      <ui-kpi-tile label="Hours worked" [value]="totalHours()" hint="Net of break time" tone="brand" />
    </div>

    <div class="mt-4">
      <ui-section-card
        heading="Daily register"
        [note]="corrected().length + ' corrected entr(ies)'"
        [padded]="false"
      >
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-ink-200 bg-ink-50 text-left text-ink-600">
              <th scope="col" class="px-4 py-2 font-medium">Date</th>
              @if (!isSelfService()) {
                <th scope="col" class="px-4 py-2 font-medium">Employee</th>
              }
              <th scope="col" class="px-4 py-2 font-medium">Check in</th>
              <th scope="col" class="px-4 py-2 font-medium">Check out</th>
              <th scope="col" class="px-4 py-2 text-right font-medium">Hours</th>
              <th scope="col" class="px-4 py-2 font-medium">Late</th>
              <th scope="col" class="px-4 py-2 font-medium">Status</th>
              <th scope="col" class="px-4 py-2 font-medium">Correction</th>
              @if (canCorrect()) {
                <th scope="col" class="px-4 py-2 text-right font-medium">Actions</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.id) {
              <tr class="border-b border-ink-100 last:border-0">
                <td class="tnum px-4 py-2">{{ row.date }}</td>
                @if (!isSelfService()) {
                  <td class="px-4 py-2">
                    {{ employeeName(row.employeeId) }}
                    <span class="tnum text-ink-400">· {{ employeeCode(row.employeeId) }}</span>
                  </td>
                }
                <td class="tnum px-4 py-2">{{ row.checkIn ?? '—' }}</td>
                <td class="tnum px-4 py-2">{{ row.checkOut ?? '—' }}</td>
                <td class="tnum px-4 py-2 text-right">{{ row.workedHours ? row.workedHours.toFixed(2) : '—' }}</td>
                <td class="px-4 py-2">
                  <ui-status-badge
                    [label]="row.isLate ? 'late' : 'on time'"
                    [tone]="row.isLate ? 'warn' : 'neutral'"
                  />
                </td>
                <td class="px-4 py-2">
                  <ui-status-badge [label]="row.status" [tone]="statusTone(row.status)" />
                </td>
                <td class="px-4 py-2 text-ink-500">{{ row.correctionReason ?? '—' }}</td>
                @if (canCorrect()) {
                  <td class="px-4 py-2 text-right">
                    <button type="button" (click)="openCorrection(row)" class="rowBtn">Correct</button>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="isSelfService() ? 7 : 8" class="px-4 py-6 text-center text-ink-500">
                  No attendance recorded
                </td>
              </tr>
            }
          </tbody>
        </table>
      </ui-section-card>
    </div>

    @if (correcting(); as rec) {
      <app-attendance-correction-form
        [record]="rec"
        [employeeLabel]="employeeName(rec.employeeId) + ' · ' + employeeCode(rec.employeeId)"
        (submitted)="saveCorrection($event)"
        (cancelled)="correcting.set(null)"
      />
    }
  `,
  styles: `
    .rowBtn { font-size: 12px; font-weight: 500; color: var(--color-brand-700); }
    .rowBtn:hover { text-decoration: underline; }
  `,
})
export class AttendancePage {
  private readonly store = inject(Store);
  private readonly session = inject(SessionService);

  protected readonly employeeName = employeeName;
  protected readonly employeeCode = employeeCode;
  protected readonly statusTone = (status: Attendance['status']) => STATUS_TONE[status];
  protected readonly hours = hours;
  protected readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  protected readonly isSelfService = computed(() => this.session.role() === 'Employee');
  protected readonly canCorrect = computed(() => ['Admin', 'HR'].includes(this.session.role()));

  private readonly all = this.store.selectSignal(attendanceFeature.selectors.all);
  protected readonly loading = this.store.selectSignal(attendanceFeature.selectors.loading);
  private readonly employees = this.store.selectSignal(employeesFeature.selectors.all);
  private readonly shifts = this.store.selectSignal(shiftsFeature.selectors.all);
  private readonly overtime = this.store.selectSignal(overtimeFeature.selectors.all);
  private readonly salaryStructures = this.store.selectSignal(salaryStructuresFeature.selectors.all);

  protected readonly rows = computed(() =>
    this.isSelfService()
      ? this.all().filter((row) => row.employeeId === this.session.employeeId())
      : this.all(),
  );

  protected readonly today = computed(() => {
    const iso = todayIso();
    return this.all().find(
      (row) => row.employeeId === this.session.employeeId() && row.date === iso,
    );
  });

  protected readonly present = computed(() => this.rows().filter((row) => row.status === 'present'));
  protected readonly late = computed(() => this.rows().filter((row) => row.isLate));
  protected readonly absent = computed(() => this.rows().filter((row) => row.status === 'absent'));
  protected readonly corrected = computed(() => this.rows().filter((row) => row.correctedBy));
  protected readonly totalHours = computed(() =>
    hours(this.rows().reduce((sum, row) => sum + row.workedHours, 0)),
  );

  protected hoursLabel(row: Attendance): string {
    return hours(row.workedHours);
  }

  private myShift() {
    const emp = this.employees().find((row) => row.id === this.session.employeeId());
    return emp ? this.shifts().find((shift) => shift.id === emp.shiftId) : undefined;
  }

  protected checkIn(): void {
    const shift = this.myShift();
    const checkInTime = nowHHMM();
    const isLate = shift ? isLateCheckIn(checkInTime, shift.startTime, shift.lateAllowanceMinutes) : false;
    const item: Attendance = {
      id: `att-${Date.now()}`,
      employeeId: this.session.employeeId(),
      date: todayIso(),
      checkIn: checkInTime,
      workedHours: 0,
      isLate,
      status: 'present',
    };
    this.store.dispatch(attendanceFeature.actions.create({ item }));
  }

  protected checkOut(): void {
    const rec = this.today();
    if (!rec || !rec.checkIn) {
      return;
    }
    const shift = this.myShift();
    const checkOutTime = nowHHMM();
    const workedHours = workedHoursFor(rec.checkIn, checkOutTime, shift?.breakMinutes ?? 0);
    this.store.dispatch(
      attendanceFeature.actions.upsert({ item: { ...rec, checkOut: checkOutTime, workedHours } }),
    );
    this.syncOvertimeForToday(this.session.employeeId(), rec.date, workedHours, shift);
  }

  private syncOvertimeForToday(
    employeeId: string,
    date: string,
    workedHours: number,
    shift: { startTime: string; endTime: string; breakMinutes: number } | undefined,
  ): void {
    if (!shift) {
      return;
    }

    const employee = this.employees().find((row) => row.id === employeeId);
    if (!employee || !employee.overtimeEligible) {
      return;
    }

    const scheduledMinutes = Math.max(0, minutesBetween(shift.startTime, shift.endTime) - shift.breakMinutes);
    const overtimeMinutes = Math.max(0, workedHours * 60 - scheduledMinutes);
    if (overtimeMinutes <= 0) {
      return;
    }

    const rate = (() => {
      const structure = this.salaryStructures().find((row) => row.employeeId === employeeId);
      if (!structure) {
        return 110;
      }
      return Math.max(110, Math.round(structure.grossSalary / 160));
    })();

    const hours = Math.round((overtimeMinutes / 60) * 100) / 100;
    const item: Overtime = {
      id: `ot-${employeeId}-${date}`,
      employeeId,
      date,
      hours,
      rate,
      amount: Math.round(hours * rate),
      reason: 'Auto-generated from attendance system',
      status: 'approved',
      payrollEligible: true,
      approvedBy: 'attendance-system',
    };

    this.store.dispatch(overtimeFeature.actions.upsert({ item }));
  }

  protected readonly correcting = signal<Attendance | null>(null);

  protected openCorrection(row: Attendance): void {
    this.correcting.set(row);
  }

  protected saveCorrection(updated: Attendance): void {
    this.store.dispatch(
      attendanceFeature.actions.upsert({
        item: { ...updated, correctedBy: this.session.displayName() },
      }),
    );
    this.correcting.set(null);
  }

  constructor() {
    for (const feature of [
      attendanceFeature,
      employeesFeature,
      departmentsFeature,
      designationsFeature,
      salaryStructuresFeature,
      overtimeFeature,
      shiftsFeature,
    ]) {
      this.store.dispatch(feature.actions.load());
    }
  }
}
