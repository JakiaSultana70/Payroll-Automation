import {
  Attendance,
  AttendanceStatus,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  Overtime,
} from '../../models/hr';
import { EMPLOYEES, HOLIDAYS, SHIFTS } from './org';

/** The cycle every seeded record belongs to. */
export const CYCLE_START = '2026-07-01';
export const CYCLE_END = '2026-07-31';

const DAY_MS = 86_400_000;

function dates(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

const CYCLE_DATES = dates(CYCLE_START, CYCLE_END);
const HOLIDAY_DATES = new Set(HOLIDAYS.map((h) => h.date));
const PAYROLL_EMPLOYEES = EMPLOYEES.filter((emp) => emp.status === 'active');

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * One attendance row per active employee per day of the cycle. Deterministic:
 * lateness and absence follow index arithmetic, not randomness, so the numbers
 * on the dashboard are stable across reloads.
 */
export const ATTENDANCE: Attendance[] = PAYROLL_EMPLOYEES.flatMap((emp, empIndex) =>
  CYCLE_DATES.map((date, dayIndex) => {
    const shift = SHIFTS.find((s) => s.id === emp.shiftId)!;
    const id = `att-${emp.id}-${date}`;
    const seed = empIndex * 7 + dayIndex;

    // Friday is the weekly holiday in this factory.
    if (weekday(date) === 5) {
      return base(id, emp.id, date, 'weekend');
    }
    if (HOLIDAY_DATES.has(date)) {
      return base(id, emp.id, date, 'holiday');
    }
    if (seed % 23 === 0) {
      return base(id, emp.id, date, 'absent');
    }
    if (seed % 17 === 0) {
      return base(id, emp.id, date, 'leave');
    }

    const lateBy = seed % 11 === 0 ? shift.lateAllowanceMinutes + 8 + (seed % 13) : 0;
    const checkIn = addMinutes(shift.startTime, lateBy - (lateBy ? 0 : seed % 6));
    const extra = emp.overtimeEligible && seed % 5 === 0 ? 90 : 0;
    const checkOut = addMinutes(shift.endTime, extra);
    // The evening shift ends at 23:00, so overtime pushes check-out past
    // midnight and the clock wraps. Roll the end forward a day in that case,
    // otherwise the subtraction goes negative and eats the month's hours.
    const startMs = Date.parse(`2026-01-01T${checkIn}:00Z`);
    let endMs = Date.parse(`2026-01-01T${checkOut}:00Z`);
    if (endMs <= startMs) {
      endMs += 86_400_000;
    }
    const gross = (endMs - startMs) / 3_600_000;

    return {
      id,
      employeeId: emp.id,
      date,
      checkIn,
      checkOut,
      workedHours: Math.round((gross - shift.breakMinutes / 60) * 100) / 100,
      isLate: lateBy > 0,
      status: 'present' as AttendanceStatus,
      correctedBy: seed % 29 === 0 ? 'nasrin.akter' : undefined,
      correctionReason: seed % 29 === 0 ? 'Device offline; punch restored from register' : undefined,
    };
  }),
);

function base(id: string, employeeId: string, date: string, status: AttendanceStatus): Attendance {
  return { id, employeeId, date, workedHours: 0, isLate: false, status };
}

const LEAVE_TYPES: LeaveType[] = ['Casual', 'Sick', 'Earned', 'Maternity', 'Unpaid'];

const ENTITLEMENT: Record<LeaveType, number> = {
  Casual: 10,
  Sick: 14,
  Earned: 18,
  Maternity: 112,
  Unpaid: 0,
};

export const LEAVE_BALANCES: LeaveBalance[] = PAYROLL_EMPLOYEES.flatMap((emp, empIndex) =>
  LEAVE_TYPES.filter((type) => type !== 'Unpaid' && !(type === 'Maternity' && emp.gender === 'M')).map(
    (type, i) => {
      const accrued = ENTITLEMENT[type];
      const taken = type === 'Maternity' ? 0 : (empIndex + i * 3) % Math.max(1, accrued - 2);
      return {
        id: `lb-${emp.id}-${type}`,
        employeeId: emp.id,
        leaveType: type,
        accrued,
        taken,
        remaining: accrued - taken,
        cycleStart: '2026-01-01',
        cycleEnd: '2026-12-31',
      };
    },
  ),
);

const LEAVE_REASONS = [
  'Family emergency at home',
  'Fever and doctor advised rest',
  'Attending a wedding out of district',
  'Personal work at the passport office',
  'Child is unwell',
  'Religious observance',
];

export const LEAVE_REQUESTS: LeaveRequest[] = PAYROLL_EMPLOYEES.flatMap((emp, empIndex) =>
  [0, 1].map((k) => {
    const seed = empIndex * 3 + k;
    const start = CYCLE_DATES[(seed * 5) % 26];
    const days = (seed % 3) + 1;
    const status = seed % 4 === 0 ? 'pending' : seed % 7 === 0 ? 'rejected' : 'approved';
    return {
      id: `lv-${emp.id}-${k + 1}`,
      employeeId: emp.id,
      leaveType: LEAVE_TYPES[seed % 4],
      startDate: start,
      endDate: new Date(Date.parse(`${start}T00:00:00Z`) + (days - 1) * DAY_MS)
        .toISOString()
        .slice(0, 10),
      days,
      reason: LEAVE_REASONS[seed % LEAVE_REASONS.length],
      status: status as LeaveRequest['status'],
      appliedAt: new Date(Date.parse(`${start}T00:00:00Z`) - 4 * DAY_MS).toISOString().slice(0, 10),
      approvedBy: status === 'approved' ? 'nasrin.akter' : undefined,
      rejectionReason:
        status === 'rejected' ? 'Line target at risk; reapply after the shipment' : undefined,
    };
  }),
);

/** Overtime is claimed only by eligible workers, and only approved OT is
 *  picked up by the payroll engine. */
const OT_REASONS = [
  'Shipment cut-off; finishing the packing list',
  'Line target shortfall after a machine breakdown',
  'Buyer inspection preparation',
  'Fabric relaxation had to finish before cutting',
];

export const OVERTIME: Overtime[] = PAYROLL_EMPLOYEES.filter((emp) => emp.overtimeEligible).flatMap(
  (emp, empIndex) =>
    [0, 1, 2].map((k) => {
      const seed = empIndex * 4 + k;
      const date = CYCLE_DATES[(seed * 3 + 2) % 28];
      const hrs = 1.5 + (seed % 4) * 0.5;
      const rate = 95 + (seed % 3) * 15;
      const status = seed % 5 === 0 ? 'pending' : seed % 11 === 0 ? 'rejected' : 'approved';
      return {
        id: `ot-${emp.id}-${k + 1}`,
        employeeId: emp.id,
        date,
        hours: hrs,
        rate,
        amount: Math.round(hrs * rate),
        reason: OT_REASONS[seed % OT_REASONS.length],
        status: status as Overtime['status'],
        payrollEligible: status === 'approved',
        approvedBy: status === 'approved' ? 'shahidul.islam' : undefined,
        rejectionReason:
          status === 'rejected' ? 'Hours not confirmed by the line supervisor' : undefined,
      };
    }),
);
