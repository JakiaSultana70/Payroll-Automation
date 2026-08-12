import { Employee, Overtime } from '../../core/models/hr';
import {
  DAILY_OT_CAP,
  MONTHLY_OT_CEILING,
  claimAmount,
  monthlyHours,
  validateOvertimeClaim,
} from './overtime-rules';

const employee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'e4',
  employeeCode: 'EMP-1004',
  name: 'Tanvir Ahmed',
  email: 'tanvir@example.com',
  phone: '+880',
  gender: 'M',
  dob: '1990-01-01',
  nationalId: '1',
  address: 'Gazipur',
  joiningDate: '2021-06-20',
  employmentType: 'permanent',
  deptId: 'd1',
  designationId: 'g5',
  shiftId: 'sh2',
  salaryGrade: 'W1',
  status: 'active',
  overtimeEligible: true,
  ...overrides,
});

const claim = (overrides: Partial<Overtime> = {}): Overtime => ({
  id: 'ot-existing',
  employeeId: 'e4',
  date: '2026-07-10',
  hours: 2,
  rate: 100,
  amount: 200,
  status: 'approved',
  payrollEligible: true,
  ...overrides,
});

const draft = {
  employeeId: 'e4',
  date: '2026-07-15',
  hours: 2,
  rate: 110,
  reason: 'Shipment cut-off, packing had to finish',
};

const context = {
  employee: employee(),
  existing: [] as Overtime[],
  today: '2026-08-09',
};

describe('validateOvertimeClaim', () => {
  it('accepts a well-formed claim', () => {
    expect(validateOvertimeClaim(draft, context)).toEqual({});
  });

  it('blocks an employee who is not overtime eligible', () => {
    const errors = validateOvertimeClaim(draft, {
      ...context,
      employee: employee({ overtimeEligible: false }),
    });
    expect(errors['employeeId']).toContain('not eligible');
  });

  it('refuses a claim dated in the future', () => {
    expect(validateOvertimeClaim({ ...draft, date: '2026-09-01' }, context)['date']).toContain(
      'before it has been worked',
    );
  });

  it('refuses more hours than the daily cap', () => {
    const errors = validateOvertimeClaim({ ...draft, hours: DAILY_OT_CAP + 1 }, context);
    expect(errors['hours']).toContain(`${DAILY_OT_CAP} overtime hours`);
  });

  it('refuses zero hours or a zero rate', () => {
    expect(validateOvertimeClaim({ ...draft, hours: 0 }, context)['hours']).toBeTruthy();
    expect(validateOvertimeClaim({ ...draft, rate: 0 }, context)['rate']).toBeTruthy();
  });

  it('refuses a thin reason', () => {
    expect(validateOvertimeClaim({ ...draft, reason: 'busy' }, context)['reason']).toBeTruthy();
  });

  it('refuses a second claim for a date already claimed', () => {
    const errors = validateOvertimeClaim(draft, {
      ...context,
      existing: [claim({ date: '2026-07-15' })],
    });
    expect(errors['date']).toContain('already exists');
  });

  it('allows a date whose earlier claim was rejected', () => {
    const errors = validateOvertimeClaim(draft, {
      ...context,
      existing: [claim({ date: '2026-07-15', status: 'rejected' })],
    });
    expect(errors['date']).toBeUndefined();
  });

  it('blocks a claim that would breach the monthly ceiling', () => {
    const existing = Array.from({ length: 30 }, (_, i) =>
      claim({ id: `ot-${i}`, date: `2026-07-${String(i + 1).padStart(2, '0')}`, hours: 2 }),
    );
    const errors = validateOvertimeClaim({ ...draft, date: '2026-07-31' }, { ...context, existing });
    expect(errors['hours']).toContain(`${MONTHLY_OT_CEILING}-hour ceiling`);
  });

  it('counts only the claim month towards the ceiling', () => {
    const existing = Array.from({ length: 30 }, (_, i) =>
      claim({ id: `ot-${i}`, date: `2026-06-${String(i + 1).padStart(2, '0')}`, hours: 2 }),
    );
    expect(validateOvertimeClaim(draft, { ...context, existing })).toEqual({});
  });
});

describe('monthlyHours', () => {
  it('excludes rejected claims', () => {
    const claims = [
      claim({ id: 'a', hours: 2 }),
      claim({ id: 'b', hours: 3, status: 'rejected' }),
      claim({ id: 'c', hours: 1, status: 'pending' }),
    ];
    expect(monthlyHours('e4', '2026-07-01', claims)).toBe(3);
  });

  it('excludes the claim being edited', () => {
    const claims = [claim({ id: 'a', hours: 2 }), claim({ id: 'b', hours: 3 })];
    expect(monthlyHours('e4', '2026-07-01', claims, 'b')).toBe(2);
  });
});

describe('claimAmount', () => {
  it('multiplies hours by rate and rounds to whole taka', () => {
    expect(claimAmount(2.5, 115)).toBe(288);
  });
});
