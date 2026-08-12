import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth-guard';
import { provideCollection } from './core/store/collection-feature';
import {
  PEOPLE_STATE,
  attendanceFeature,
  auditLogsFeature,
  bonusesFeature,
  holidaysFeature,
  leaveBalancesFeature,
  leaveRequestsFeature,
  loansFeature,
  notificationsFeature,
  overtimeFeature,
  paymentsFeature,
  payrollBatchesFeature,
  payslipsFeature,
  permissionsFeature,
  pfRulesFeature,
  rolesFeature,
  salaryStructuresFeature,
  settlementsFeature,
  shiftsFeature,
  taxRulesFeature,
  usersFeature,
} from './core/store/features';
import { AppShell } from './layout/app-shell';

/**
 * Two top-level routes: the sign-in screen, and the application shell behind
 * an auth guard. `roleGuard` runs on every child, so a module a role cannot see
 * in the sidebar is also unreachable by typing its URL.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · PayFlow',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · PayFlow',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(attendanceFeature),
          ...provideCollection(leaveRequestsFeature),
          ...provideCollection(overtimeFeature),
          ...provideCollection(payrollBatchesFeature),
          ...provideCollection(payslipsFeature),
          ...provideCollection(notificationsFeature),
        ],
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'profile',
        title: 'My profile · PayFlow',
        providers: [...PEOPLE_STATE, ...provideCollection(shiftsFeature)],
        loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
      },
      {
        path: 'employees',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(shiftsFeature),
          ...provideCollection(salaryStructuresFeature),
          ...provideCollection(leaveBalancesFeature),
        ],
        children: [
          {
            path: '',
            title: 'Employees · PayFlow',
            loadComponent: () =>
              import('./features/employees/employee-list').then((m) => m.EmployeeListPage),
          },
          {
            path: ':id',
            title: 'Employee · PayFlow',
            loadComponent: () =>
              import('./features/employees/employee-detail').then((m) => m.EmployeeDetailPage),
          },
        ],
      },
      {
        path: 'organisation',
        title: 'Organisation · PayFlow',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(shiftsFeature),
          ...provideCollection(holidaysFeature),
        ],
        loadComponent: () =>
          import('./features/organisation/organisation-page').then((m) => m.OrganisationPage),
      },
      {
        path: 'users',
        title: 'Users & Roles · PayFlow',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(usersFeature),
          ...provideCollection(rolesFeature),
          ...provideCollection(permissionsFeature),
        ],
        loadComponent: () => import('./features/users/users-page').then((m) => m.UsersPage),
      },
      {
        path: 'attendance',
        title: 'Attendance · PayFlow',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(attendanceFeature),
          ...provideCollection(overtimeFeature),
          ...provideCollection(salaryStructuresFeature),
          ...provideCollection(shiftsFeature),
        ],
        loadComponent: () =>
          import('./features/attendance/attendance-page').then((m) => m.AttendancePage),
      },
      {
        path: 'leave',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(leaveRequestsFeature),
          ...provideCollection(leaveBalancesFeature),
        ],
        children: [
          {
            path: '',
            title: 'Leave · PayFlow',
            loadComponent: () => import('./features/leave/leave-page').then((m) => m.LeavePage),
          },
          {
            path: ':id',
            title: 'Leave request · PayFlow',
            loadComponent: () =>
              import('./features/leave/leave-detail').then((m) => m.LeaveDetailPage),
          },
        ],
      },
      {
        path: 'overtime',
        providers: [...PEOPLE_STATE, ...provideCollection(overtimeFeature)],
        children: [
          {
            path: '',
            title: 'Overtime · PayFlow',
            loadComponent: () =>
              import('./features/overtime/overtime-page').then((m) => m.OvertimePage),
          },
          {
            path: ':id',
            title: 'Overtime claim · PayFlow',
            loadComponent: () =>
              import('./features/overtime/overtime-detail').then((m) => m.OvertimeDetailPage),
          },
        ],
      },
      {
        path: 'payroll',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(payrollBatchesFeature),
          ...provideCollection(payslipsFeature),
          ...provideCollection(paymentsFeature),
          ...provideCollection(attendanceFeature),
          ...provideCollection(overtimeFeature),
          ...provideCollection(salaryStructuresFeature),
          ...provideCollection(taxRulesFeature),
          ...provideCollection(pfRulesFeature),
          ...provideCollection(loansFeature),
          ...provideCollection(bonusesFeature),
        ],
        children: [
          {
            path: '',
            title: 'Payroll batches · PayFlow',
            loadComponent: () =>
              import('./features/payroll/batch-list').then((m) => m.BatchListPage),
          },
          {
            path: ':id',
            title: 'Payroll batch · PayFlow',
            loadComponent: () =>
              import('./features/payroll/batch-detail').then((m) => m.BatchDetailPage),
          },
        ],
      },
      {
        path: 'payslips',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(payslipsFeature),
          ...provideCollection(payrollBatchesFeature),
        ],
        children: [
          {
            path: '',
            title: 'Payslips · PayFlow',
            loadComponent: () =>
              import('./features/payslips/payslip-list').then((m) => m.PayslipListPage),
          },
          {
            path: ':id',
            title: 'Payslip · PayFlow',
            loadComponent: () =>
              import('./features/payslips/payslip-detail').then((m) => m.PayslipDetailPage),
          },
        ],
      },
      {
        path: 'salary-rules',
        title: 'Salary & Rules · PayFlow',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(salaryStructuresFeature),
          ...provideCollection(taxRulesFeature),
          ...provideCollection(pfRulesFeature),
        ],
        loadComponent: () =>
          import('./features/salary-rules/salary-rules-page').then((m) => m.SalaryRulesPage),
      },
      {
        path: 'loans-bonuses',
        title: 'Loans & Bonuses · PayFlow',
        providers: [
          ...PEOPLE_STATE,
          ...provideCollection(loansFeature),
          ...provideCollection(bonusesFeature),
        ],
        loadComponent: () =>
          import('./features/loans-bonuses/loans-bonuses-page').then((m) => m.LoansBonusesPage),
      },
      {
        path: 'settlements',
        title: 'Final settlement · PayFlow',
        providers: [...PEOPLE_STATE, ...provideCollection(settlementsFeature)],
        loadComponent: () =>
          import('./features/settlements/settlements-page').then((m) => m.SettlementsPage),
      },
      {
        path: 'audit',
        title: 'Audit log · PayFlow',
        providers: [
          ...provideCollection(auditLogsFeature),
          ...provideCollection(notificationsFeature),
        ],
        loadComponent: () => import('./features/audit/audit-page').then((m) => m.AuditPage),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
