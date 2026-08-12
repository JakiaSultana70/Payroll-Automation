import {
  AppUser,
  Attendance,
  AuditLog,
  BonusRecord,
  ChangeRequest,
  Department,
  Designation,
  Employee,
  FinalSettlement,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LoanRecord,
  Notification,
  Overtime,
  PFRule,
  Payment,
  PayrollBatch,
  Payslip,
  Permission,
  Role,
  SalaryStructure,
  Shift,
  TaxRule,
} from '../models/hr';
import { createCollectionFeature, provideCollection } from './collection-feature';

/**
 * One feature per collection. Declared centrally so any route can pull in
 * exactly the slices its pages read, without thirteen near-identical files.
 */
export const employeesFeature = createCollectionFeature<Employee>({
  name: 'employees',
  collection: 'employees',
  sortComparer: (a, b) => a.employeeCode.localeCompare(b.employeeCode),
});
export const departmentsFeature = createCollectionFeature<Department>({
  name: 'departments',
  collection: 'departments',
});
export const designationsFeature = createCollectionFeature<Designation>({
  name: 'designations',
  collection: 'designations',
});
export const shiftsFeature = createCollectionFeature<Shift>({ name: 'shifts', collection: 'shifts' });
export const holidaysFeature = createCollectionFeature<Holiday>({
  name: 'holidays',
  collection: 'holidays',
  sortComparer: (a, b) => a.date.localeCompare(b.date),
});
export const usersFeature = createCollectionFeature<AppUser>({ name: 'users', collection: 'users' });
export const rolesFeature = createCollectionFeature<Role>({ name: 'roles', collection: 'roles' });
export const permissionsFeature = createCollectionFeature<Permission>({
  name: 'permissions',
  collection: 'permissions',
});

export const attendanceFeature = createCollectionFeature<Attendance>({
  name: 'attendance',
  collection: 'attendance',
  sortComparer: (a, b) => b.date.localeCompare(a.date),
});
export const leaveRequestsFeature = createCollectionFeature<LeaveRequest>({
  name: 'leaveRequests',
  collection: 'leaveRequests',
  sortComparer: (a, b) => b.appliedAt.localeCompare(a.appliedAt),
});
export const leaveBalancesFeature = createCollectionFeature<LeaveBalance>({
  name: 'leaveBalances',
  collection: 'leaveBalances',
});
export const overtimeFeature = createCollectionFeature<Overtime>({
  name: 'overtime',
  collection: 'overtime',
  sortComparer: (a, b) => b.date.localeCompare(a.date),
});

export const salaryStructuresFeature = createCollectionFeature<SalaryStructure>({
  name: 'salaryStructures',
  collection: 'salaryStructures',
});
export const taxRulesFeature = createCollectionFeature<TaxRule>({
  name: 'taxRules',
  collection: 'taxRules',
  sortComparer: (a, b) => a.minIncome - b.minIncome,
});
export const pfRulesFeature = createCollectionFeature<PFRule>({
  name: 'pfRules',
  collection: 'pfRules',
});
export const loansFeature = createCollectionFeature<LoanRecord>({
  name: 'loans',
  collection: 'loans',
});
export const bonusesFeature = createCollectionFeature<BonusRecord>({
  name: 'bonuses',
  collection: 'bonuses',
});

export const payrollBatchesFeature = createCollectionFeature<PayrollBatch>({
  name: 'payrollBatches',
  collection: 'payrollBatches',
  sortComparer: (a, b) => b.cycleStart.localeCompare(a.cycleStart),
});
export const payslipsFeature = createCollectionFeature<Payslip>({
  name: 'payslips',
  collection: 'payslips',
});
export const paymentsFeature = createCollectionFeature<Payment>({
  name: 'payments',
  collection: 'payments',
});
export const settlementsFeature = createCollectionFeature<FinalSettlement>({
  name: 'settlements',
  collection: 'settlements',
});

export const changeRequestsFeature = createCollectionFeature<ChangeRequest>({
  name: 'changeRequests',
  collection: 'changeRequests',
  sortComparer: (a, b) => b.requestedAt.localeCompare(a.requestedAt),
});
export const notificationsFeature = createCollectionFeature<Notification>({
  name: 'notifications',
  collection: 'notifications',
});
export const auditLogsFeature = createCollectionFeature<AuditLog>({
  name: 'auditLogs',
  collection: 'auditLogs',
  sortComparer: (a, b) => b.timestamp.localeCompare(a.timestamp),
});

/** Employee lookups are needed by nearly every page, so most routes include
 *  the people slices alongside their own. */
export const PEOPLE_STATE = [
  ...provideCollection(employeesFeature),
  ...provideCollection(departmentsFeature),
  ...provideCollection(designationsFeature),
];
