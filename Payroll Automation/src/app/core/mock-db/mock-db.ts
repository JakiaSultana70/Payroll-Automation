import { AUDIT_LOGS, CHANGE_REQUESTS, NOTIFICATIONS } from './seed/governance';
import {
  COMPANIES,
  DEPARTMENTS,
  DESIGNATIONS,
  EMPLOYEES,
  HOLIDAYS,
  PERMISSIONS,
  ROLES,
  SHIFTS,
  USERS,
} from './seed/org';
import {
  BONUSES,
  LOANS,
  PAYMENTS,
  PAYROLL_BATCHES,
  PAYSLIPS,
  PF_RULES,
  SALARY_STRUCTURES,
  SETTLEMENTS,
  TAX_RULES,
} from './seed/pay';
import { ATTENDANCE, LEAVE_BALANCES, LEAVE_REQUESTS, OVERTIME } from './seed/time';

/**
 * The central mock database — every module reads from this one object.
 * Collections share employee ids (`e1`..`e15`), so attendance, leave, overtime,
 * payslips and settlements all describe the same people.
 */
export const MOCK_DB = {
  companies: COMPANIES,
  departments: DEPARTMENTS,
  designations: DESIGNATIONS,
  shifts: SHIFTS,
  holidays: HOLIDAYS,
  employees: EMPLOYEES,
  users: USERS,
  roles: ROLES,
  permissions: PERMISSIONS,

  attendance: ATTENDANCE,
  leaveRequests: LEAVE_REQUESTS,
  leaveBalances: LEAVE_BALANCES,
  overtime: OVERTIME,

  salaryStructures: SALARY_STRUCTURES,
  taxRules: TAX_RULES,
  pfRules: PF_RULES,
  loans: LOANS,
  bonuses: BONUSES,

  payrollBatches: PAYROLL_BATCHES,
  payslips: PAYSLIPS,
  payments: PAYMENTS,
  settlements: SETTLEMENTS,

  changeRequests: CHANGE_REQUESTS,
  notifications: NOTIFICATIONS,
  auditLogs: AUDIT_LOGS,
} satisfies Record<string, { id: string }[]>;

export type CollectionKey = keyof typeof MOCK_DB;
