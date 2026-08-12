import { ModuleMeta, RoleName } from './models/common';

/**
 * Navigation map. `roles` mirrors the swimlanes in the source activity diagram:
 * an Employee sees self-service only, HR owns people and time, the Accountant
 * owns the money, and Admin sees everything.
 */
export const MODULES: ModuleMeta[] = [
  {
    name: 'Employees',
    path: 'employees',
    group: 'People',
    icon: 'users',
    blurb: 'Onboarding, profiles, employment status and separation',
    roles: ['Admin', 'HR'],
  },
  {
    name: 'Organisation',
    path: 'organisation',
    group: 'People',
    icon: 'sliders',
    blurb: 'Departments, designations, shifts and the holiday calendar',
    roles: ['Admin', 'HR'],
  },
  {
    name: 'Users & Roles',
    path: 'users',
    group: 'People',
    icon: 'shield',
    blurb: 'Accounts, role assignment and the permission matrix',
    roles: ['Admin'],
  },
  {
    name: 'Attendance',
    path: 'attendance',
    group: 'Time & Attendance',
    icon: 'clock',
    blurb: 'Daily check in and out, late flags and HR corrections',
    roles: ['Admin', 'HR', 'Employee'],
  },
  {
    name: 'Leave',
    path: 'leave',
    group: 'Time & Attendance',
    icon: 'calendar',
    blurb: 'Applications, approval queue and leave balances',
    roles: ['Admin', 'HR', 'Employee'],
  },
  {
    name: 'Overtime',
    path: 'overtime',
    group: 'Time & Attendance',
    icon: 'timer',
    blurb: 'Overtime claims, approval and payroll eligibility',
    roles: ['Admin', 'HR', 'Employee'],
  },
  {
    name: 'Payroll Batches',
    path: 'payroll',
    group: 'Payroll',
    icon: 'coins',
    blurb: 'Run the cycle, verify, approve, pay and generate payslips',
    roles: ['Admin', 'HR', 'Accountant'],
  },
  {
    name: 'Payslips',
    path: 'payslips',
    group: 'Payroll',
    icon: 'receipt',
    blurb: 'Earnings, deductions and net pay per employee per cycle',
    roles: ['Admin', 'HR', 'Accountant', 'Employee'],
  },
  {
    name: 'Salary & Rules',
    path: 'salary-rules',
    group: 'Payroll',
    icon: 'scale',
    blurb: 'Salary structures, tax slabs and provident fund rules',
    roles: ['Admin', 'Accountant'],
  },
  {
    name: 'Loans & Bonuses',
    path: 'loans-bonuses',
    group: 'Payroll',
    icon: 'gift',
    blurb: 'Loan recovery schedules and bonus records',
    roles: ['Admin', 'HR', 'Accountant'],
  },
  {
    name: 'Final Settlement',
    path: 'settlements',
    group: 'Payroll',
    icon: 'exit',
    blurb: 'Gratuity, leave encashment and dues on separation',
    roles: ['Accountant'],
  },
  {
    name: 'Audit Log',
    path: 'audit',
    group: 'Governance',
    icon: 'list',
    blurb: 'Who did what, in which module, and when',
    roles: ['Admin'],
  },
];

export const MODULE_GROUPS = [
  'People',
  'Time & Attendance',
  'Payroll',
  'Governance',
] as const;

export function modulesFor(role: RoleName, group: string): ModuleMeta[] {
  return MODULES.filter((mod) => mod.group === group && mod.roles.includes(role));
}

export function visibleModules(role: RoleName): ModuleMeta[] {
  return MODULES.filter((mod) => mod.roles.includes(role));
}

export function moduleByPath(path: string): ModuleMeta | undefined {
  return MODULES.find((mod) => mod.path === path);
}
