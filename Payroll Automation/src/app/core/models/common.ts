/** Types shared across every module of the payroll application. */

export type Id = string;

/** Visual tone for badges. */
export type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'brand';

/** The four actors in the source activity diagram. */
export type RoleName = 'Admin' | 'HR' | 'Accountant' | 'Employee';

export const ROLE_NAMES: RoleName[] = ['Admin', 'HR', 'Accountant', 'Employee'];

/** Approval lifecycle shared by leave, overtime and change requests. */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * Payroll batch lifecycle, straight from the diagram:
 * HR requests a run, the engine calculates, the accountant verifies and either
 * returns it with remarks or approves it, then payment is processed.
 */
export type BatchStatus =
  | 'draft'
  | 'calculated'
  | 'pending-approval'
  | 'returned'
  | 'approved'
  | 'paid';

export const BATCH_TONE: Record<BatchStatus, Tone> = {
  draft: 'neutral',
  calculated: 'brand',
  'pending-approval': 'warn',
  returned: 'bad',
  approved: 'ok',
  paid: 'ok',
};

export const APPROVAL_TONE: Record<ApprovalStatus, Tone> = {
  pending: 'warn',
  approved: 'ok',
  rejected: 'bad',
};

/** All money in this app is BDT — the source diagram is a Bangladesh payroll. */
export function taka(amount: number, decimals = 0): string {
  return `৳${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function hours(value: number): string {
  return `${value.toFixed(2)} h`;
}

export type ModuleGroup = 'People' | 'Time & Attendance' | 'Payroll' | 'Governance';

export interface ModuleMeta {
  name: string;
  path: string;
  group: ModuleGroup;
  icon: string;
  blurb: string;
  /** Roles allowed to see this module in the sidebar. */
  roles: RoleName[];
}
