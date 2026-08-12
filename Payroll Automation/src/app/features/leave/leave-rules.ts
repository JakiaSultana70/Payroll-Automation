import { LeaveBalance, LeaveRequest, LeaveType } from '../../core/models/hr';

const DAY_MS = 86_400_000;

/** Leave is counted in whole calendar days, both ends inclusive. */
export function countDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }
  return Math.round((end - start) / DAY_MS) + 1;
}

export interface LeaveDraft {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ValidationContext {
  balances: LeaveBalance[];
  /** Every request already on file for this employee. */
  existing: LeaveRequest[];
  /** Request being edited, excluded from the overlap check. */
  ignoreRequestId?: string;
}

/**
 * All the rules that decide whether a leave application may be submitted.
 *
 * Pure on purpose: the component only renders what this returns, and the rules
 * can be tested without a DOM. Every module should keep its logic here rather
 * than inside a component.
 */
export function validateLeaveRequest(
  draft: LeaveDraft,
  context: ValidationContext,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.startDate) {
    errors['startDate'] = 'Choose the first day of leave.';
  }
  if (!draft.endDate) {
    errors['endDate'] = 'Choose the last day of leave.';
  }
  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    errors['endDate'] = 'The last day cannot fall before the first day.';
  }

  const reason = draft.reason.trim();
  if (reason.length < 10) {
    errors['reason'] = 'Give a reason of at least 10 characters.';
  }

  const days = countDays(draft.startDate, draft.endDate);

  // Unpaid leave has no accrual to draw down, so the balance rule does not
  // apply to it — every other type is capped at what is left.
  if (days > 0 && draft.leaveType !== 'Unpaid') {
    const balance = context.balances.find(
      (row) => row.employeeId === draft.employeeId && row.leaveType === draft.leaveType,
    );
    if (!balance) {
      errors['leaveType'] = `You have no ${draft.leaveType} leave entitlement.`;
    } else if (days > balance.remaining) {
      errors['leaveType'] =
        `Only ${balance.remaining} day(s) of ${draft.leaveType} leave remain; this request is ${days}.`;
    }
  }

  // A rejected request frees its dates again; pending and approved ones do not.
  if (days > 0 && !errors['endDate']) {
    const clash = context.existing.find(
      (row) =>
        row.employeeId === draft.employeeId &&
        row.id !== context.ignoreRequestId &&
        row.status !== 'rejected' &&
        row.startDate <= draft.endDate &&
        row.endDate >= draft.startDate,
    );
    if (clash) {
      errors['startDate'] =
        `These dates overlap an existing ${clash.status} request (${clash.startDate} to ${clash.endDate}).`;
    }
  }

  return errors;
}

/** Approving a request moves days from remaining into taken. */
export function applyApproval(balance: LeaveBalance, days: number): LeaveBalance {
  return { ...balance, taken: balance.taken + days, remaining: balance.remaining - days };
}

/** Reversing an approval puts them back. */
export function reverseApproval(balance: LeaveBalance, days: number): LeaveBalance {
  return { ...balance, taken: balance.taken - days, remaining: balance.remaining + days };
}
