import { Employee, Overtime } from '../../core/models/hr';

/**
 * Per-claim sanity cap. The Labour Act's normal day is 8 hours extending to 10,
 * so 2 hours is the statutory norm; this factory's configured ceiling allows up
 * to 4 on a single day for shipment cut-offs.
 */
export const DAILY_OT_CAP = 4;

/**
 * The ceiling the diagram checks before payroll — "Within the Labour Act
 * overtime ceiling? → [no] Block and escalate, excess overtime is an audit
 * finding". Enforced across a calendar month.
 */
export const MONTHLY_OT_CEILING = 60;

export interface OvertimeDraft {
  employeeId: string;
  date: string;
  hours: number;
  rate: number;
  reason: string;
}

export interface OvertimeContext {
  employee: Employee | undefined;
  /** Every claim already on file, used for duplicates and the monthly total. */
  existing: Overtime[];
  /** Today's date, passed in so these rules stay pure and testable. */
  today: string;
  ignoreClaimId?: string;
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Hours already committed in the claim's month — rejected claims do not count. */
export function monthlyHours(
  employeeId: string,
  month: string,
  claims: Overtime[],
  ignoreClaimId?: string,
): number {
  return claims
    .filter(
      (row) =>
        row.employeeId === employeeId &&
        row.id !== ignoreClaimId &&
        row.status !== 'rejected' &&
        sameMonth(row.date, month),
    )
    .reduce((sum, row) => sum + row.hours, 0);
}

export function claimAmount(hours: number, rate: number): number {
  return Math.round(hours * rate);
}

/**
 * Everything that decides whether an overtime claim may be submitted.
 * Pure, like `leave-rules.ts` — see MODULE_RECIPE.md.
 */
export function validateOvertimeClaim(
  draft: OvertimeDraft,
  context: OvertimeContext,
): Record<string, string> {
  const errors: Record<string, string> = {};

  // Only workers flagged eligible may claim at all — managers on a monthly
  // salary are outside the overtime scheme.
  if (!context.employee) {
    errors['employeeId'] = 'No employee record found for this claim.';
  } else if (!context.employee.overtimeEligible) {
    errors['employeeId'] = `${context.employee.name} is not eligible for overtime.`;
  }

  if (!draft.date) {
    errors['date'] = 'Choose the date the overtime was worked.';
  } else if (draft.date > context.today) {
    errors['date'] = 'Overtime cannot be claimed before it has been worked.';
  }

  if (!(draft.hours > 0)) {
    errors['hours'] = 'Enter the hours worked.';
  } else if (draft.hours > DAILY_OT_CAP) {
    errors['hours'] = `A single day cannot exceed ${DAILY_OT_CAP} overtime hours.`;
  }

  if (!(draft.rate > 0)) {
    errors['rate'] = 'Enter the hourly overtime rate.';
  }

  if (draft.reason.trim().length < 10) {
    errors['reason'] = 'Give a reason of at least 10 characters.';
  }

  // One claim per employee per day; a rejected one frees the date again.
  if (draft.date && !errors['date']) {
    const duplicate = context.existing.find(
      (row) =>
        row.employeeId === draft.employeeId &&
        row.id !== context.ignoreClaimId &&
        row.status !== 'rejected' &&
        row.date === draft.date,
    );
    if (duplicate) {
      errors['date'] = `A ${duplicate.status} claim already exists for ${draft.date}.`;
    }
  }

  if (draft.date && draft.hours > 0 && !errors['date'] && !errors['hours']) {
    const committed = monthlyHours(
      draft.employeeId,
      draft.date,
      context.existing,
      context.ignoreClaimId,
    );
    if (committed + draft.hours > MONTHLY_OT_CEILING) {
      errors['hours'] =
        `This would take the month to ${committed + draft.hours} hours, above the ${MONTHLY_OT_CEILING}-hour ceiling. Escalate instead of claiming.`;
    }
  }

  return errors;
}
