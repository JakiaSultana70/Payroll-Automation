import { LeaveBalance, LeaveRequest } from '../../core/models/hr';
import {
  applyApproval,
  countDays,
  reverseApproval,
  validateLeaveRequest,
} from './leave-rules';

const balance = (overrides: Partial<LeaveBalance> = {}): LeaveBalance => ({
  id: 'lb-1',
  employeeId: 'e4',
  leaveType: 'Casual',
  accrued: 10,
  taken: 3,
  remaining: 7,
  cycleStart: '2026-01-01',
  cycleEnd: '2026-12-31',
  ...overrides,
});

const request = (overrides: Partial<LeaveRequest> = {}): LeaveRequest => ({
  id: 'lv-existing',
  employeeId: 'e4',
  leaveType: 'Casual',
  startDate: '2026-09-10',
  endDate: '2026-09-12',
  days: 3,
  reason: 'Existing approved leave',
  status: 'approved',
  appliedAt: '2026-09-01',
  ...overrides,
});

const draft = {
  employeeId: 'e4',
  leaveType: 'Casual' as const,
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  reason: 'Family commitment out of district',
};

describe('countDays', () => {
  it('counts both ends inclusively', () => {
    expect(countDays('2026-10-01', '2026-10-03')).toBe(3);
  });

  it('counts a single day as one', () => {
    expect(countDays('2026-10-01', '2026-10-01')).toBe(1);
  });

  it('returns zero for a reversed or incomplete range', () => {
    expect(countDays('2026-10-03', '2026-10-01')).toBe(0);
    expect(countDays('', '2026-10-01')).toBe(0);
  });
});

describe('validateLeaveRequest', () => {
  const context = { balances: [balance()], existing: [] as LeaveRequest[] };

  it('accepts a well-formed request within balance', () => {
    expect(validateLeaveRequest(draft, context)).toEqual({});
  });

  it('rejects an end date before the start date', () => {
    const errors = validateLeaveRequest(
      { ...draft, startDate: '2026-10-05', endDate: '2026-10-01' },
      context,
    );
    expect(errors['endDate']).toBeTruthy();
  });

  it('rejects a thin reason', () => {
    expect(validateLeaveRequest({ ...draft, reason: 'sick' }, context)['reason']).toBeTruthy();
  });

  it('rejects a request longer than the remaining balance', () => {
    const errors = validateLeaveRequest(
      { ...draft, startDate: '2026-10-01', endDate: '2026-10-20' },
      context,
    );
    expect(errors['leaveType']).toContain('7 day(s)');
  });

  it('exempts unpaid leave from the balance rule', () => {
    const errors = validateLeaveRequest(
      { ...draft, leaveType: 'Unpaid', startDate: '2026-10-01', endDate: '2026-10-20' },
      context,
    );
    expect(errors['leaveType']).toBeUndefined();
  });

  it('rejects a type the employee has no entitlement for', () => {
    const errors = validateLeaveRequest({ ...draft, leaveType: 'Maternity' }, context);
    expect(errors['leaveType']).toContain('no Maternity leave entitlement');
  });

  it('rejects dates overlapping an existing pending or approved request', () => {
    const errors = validateLeaveRequest(
      { ...draft, startDate: '2026-09-11', endDate: '2026-09-13' },
      { ...context, existing: [request()] },
    );
    expect(errors['startDate']).toContain('overlap');
  });

  it('allows dates that overlap a rejected request', () => {
    const errors = validateLeaveRequest(
      { ...draft, startDate: '2026-09-11', endDate: '2026-09-13' },
      { ...context, existing: [request({ status: 'rejected' })] },
    );
    expect(errors['startDate']).toBeUndefined();
  });

  it('ignores the request being edited when checking overlap', () => {
    const errors = validateLeaveRequest(
      { ...draft, startDate: '2026-09-11', endDate: '2026-09-12' },
      { ...context, existing: [request()], ignoreRequestId: 'lv-existing' },
    );
    expect(errors['startDate']).toBeUndefined();
  });
});

describe('balance movement', () => {
  it('moves days from remaining into taken on approval', () => {
    const after = applyApproval(balance(), 3);
    expect(after.taken).toBe(6);
    expect(after.remaining).toBe(4);
  });

  it('is reversible, so a reversed approval restores the balance exactly', () => {
    const start = balance();
    expect(reverseApproval(applyApproval(start, 3), 3)).toEqual(start);
  });

  it('never changes the accrual', () => {
    expect(applyApproval(balance(), 5).accrued).toBe(10);
  });
});
