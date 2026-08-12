import {
  AppUser,
  Company,
  Department,
  Designation,
  Employee,
  Holiday,
  Permission,
  Role,
  Shift,
} from '../../models/hr';

export const COMPANIES: Company[] = [
  {
    id: 'c1',
    name: 'Meghna Apparels Ltd.',
    address: 'Plot 44, Gazipur Sadar, Gazipur 1700',
    timezone: 'Asia/Dhaka',
    currency: 'BDT',
  },
];

export const DEPARTMENTS: Department[] = [
  { id: 'd1', code: 'PRD', name: 'Production', headEmployeeId: 'e3' },
  { id: 'd2', code: 'HRM', name: 'Human Resources', headEmployeeId: 'e1' },
  { id: 'd3', code: 'FIN', name: 'Finance & Accounts', headEmployeeId: 'e2' },
  { id: 'd4', code: 'QLT', name: 'Quality Assurance', headEmployeeId: 'e7' },
  { id: 'd5', code: 'STR', name: 'Store & Inventory', headEmployeeId: 'e10' },
  { id: 'd6', code: 'ADM', name: 'Administration', headEmployeeId: 'e12' },
];

export const DESIGNATIONS: Designation[] = [
  { id: 'g1', title: 'General Manager', grade: 'M1' },
  { id: 'g2', title: 'Manager', grade: 'M2' },
  { id: 'g3', title: 'Assistant Manager', grade: 'M3' },
  { id: 'g4', title: 'Executive', grade: 'E1' },
  { id: 'g5', title: 'Senior Operator', grade: 'W1' },
  { id: 'g6', title: 'Operator', grade: 'W2' },
  { id: 'g7', title: 'Helper', grade: 'W3' },
];

export const SHIFTS: Shift[] = [
  {
    id: 'sh1',
    name: 'General (Day)',
    startTime: '08:00',
    endTime: '17:00',
    breakMinutes: 60,
    lateAllowanceMinutes: 10,
  },
  {
    id: 'sh2',
    name: 'Production A',
    startTime: '07:00',
    endTime: '16:00',
    breakMinutes: 45,
    lateAllowanceMinutes: 5,
  },
  {
    id: 'sh3',
    name: 'Production B',
    startTime: '15:00',
    endTime: '23:00',
    breakMinutes: 45,
    lateAllowanceMinutes: 5,
  },
];

export const HOLIDAYS: Holiday[] = [
  { id: 'h1', name: 'International Mother Language Day', date: '2026-02-21', type: 'public' },
  { id: 'h2', name: 'Independence Day', date: '2026-03-26', type: 'public' },
  { id: 'h3', name: 'Eid-ul-Fitr', date: '2026-03-20', type: 'festival' },
  { id: 'h4', name: 'Bengali New Year', date: '2026-04-14', type: 'festival' },
  { id: 'h5', name: 'May Day', date: '2026-05-01', type: 'public' },
  { id: 'h6', name: 'Victory Day', date: '2026-12-16', type: 'public' },
];

interface EmployeeSeed {
  name: string;
  gender: 'M' | 'F';
  deptId: string;
  designationId: string;
  shiftId: string;
  grade: string;
  joined: string;
  type: Employee['employmentType'];
  status?: Employee['status'];
  otEligible?: boolean;
  lastWorkingDay?: string;
}

const PEOPLE: EmployeeSeed[] = [
  { name: 'Nasrin Akter', gender: 'F', deptId: 'd2', designationId: 'g2', shiftId: 'sh1', grade: 'M2', joined: '2019-04-01', type: 'permanent' },
  { name: 'Rakib Hasan', gender: 'M', deptId: 'd3', designationId: 'g2', shiftId: 'sh1', grade: 'M2', joined: '2018-09-15', type: 'permanent' },
  { name: 'Shahidul Islam', gender: 'M', deptId: 'd1', designationId: 'g1', shiftId: 'sh2', grade: 'M1', joined: '2016-01-10', type: 'permanent' },
  { name: 'Tanvir Ahmed', gender: 'M', deptId: 'd1', designationId: 'g5', shiftId: 'sh2', grade: 'W1', joined: '2021-06-20', type: 'permanent', otEligible: true },
  { name: 'Sultana Razia', gender: 'F', deptId: 'd1', designationId: 'g6', shiftId: 'sh2', grade: 'W2', joined: '2022-02-14', type: 'permanent', otEligible: true },
  { name: 'Jahangir Alam', gender: 'M', deptId: 'd1', designationId: 'g6', shiftId: 'sh3', grade: 'W2', joined: '2022-08-01', type: 'permanent', otEligible: true },
  { name: 'Farhana Islam', gender: 'F', deptId: 'd4', designationId: 'g3', shiftId: 'sh1', grade: 'M3', joined: '2020-11-05', type: 'permanent' },
  { name: 'Kamrul Hasan', gender: 'M', deptId: 'd4', designationId: 'g4', shiftId: 'sh2', grade: 'E1', joined: '2023-03-12', type: 'permanent', otEligible: true },
  { name: 'Ruma Begum', gender: 'F', deptId: 'd1', designationId: 'g7', shiftId: 'sh2', grade: 'W3', joined: '2024-01-08', type: 'probation', otEligible: true },
  { name: 'Abdul Karim', gender: 'M', deptId: 'd5', designationId: 'g3', shiftId: 'sh1', grade: 'M3', joined: '2019-07-22', type: 'permanent' },
  { name: 'Nusrat Jahan', gender: 'F', deptId: 'd3', designationId: 'g4', shiftId: 'sh1', grade: 'E1', joined: '2023-09-01', type: 'permanent' },
  { name: 'Mizanur Rahman', gender: 'M', deptId: 'd6', designationId: 'g2', shiftId: 'sh1', grade: 'M2', joined: '2017-05-30', type: 'permanent' },
  { name: 'Shirin Sultana', gender: 'F', deptId: 'd1', designationId: 'g6', shiftId: 'sh3', grade: 'W2', joined: '2023-11-19', type: 'contract', otEligible: true },
  {
    name: 'Habibur Rahman',
    gender: 'M',
    deptId: 'd1',
    designationId: 'g6',
    shiftId: 'sh2',
    grade: 'W2',
    joined: '2020-03-02',
    type: 'permanent',
    status: 'separated',
    lastWorkingDay: '2026-06-30',
    otEligible: true,
  },
  {
    name: 'Mahmuda Khatun',
    gender: 'F',
    deptId: 'd4',
    designationId: 'g4',
    shiftId: 'sh1',
    grade: 'E1',
    joined: '2026-07-20',
    type: 'probation',
    status: 'draft',
  },
];

/** Employee ids are e1..e15 and are referenced by every other collection. */
export const EMPLOYEES: Employee[] = PEOPLE.map((person, index) => {
  const n = index + 1;
  const slug = person.name.toLowerCase().replace(/[^a-z]+/g, '.');
  return {
    id: `e${n}`,
    employeeCode: `EMP-${String(1000 + n)}`,
    name: person.name,
    email: `${slug}@meghna-apparels.com`,
    phone: `+8801${String(700000000 + n * 111111).slice(0, 9)}`,
    gender: person.gender,
    dob: `19${80 + (index % 18)}-0${(index % 9) + 1}-1${index % 9}`,
    nationalId: `19${80 + (index % 18)}${String(4820000000 + n * 137)}`,
    address: `House ${12 + n}, Road ${3 + (index % 9)}, Gazipur`,
    joiningDate: person.joined,
    lastWorkingDay: person.lastWorkingDay,
    employmentType: person.type,
    deptId: person.deptId,
    designationId: person.designationId,
    shiftId: person.shiftId,
    salaryGrade: person.grade,
    status: person.status ?? 'active',
    overtimeEligible: person.otEligible ?? false,
  };
});

export const PERMISSIONS: Permission[] = [
  { id: 'p1', moduleName: 'Employees', read: true, write: true, canApprove: true },
  { id: 'p2', moduleName: 'Attendance', read: true, write: true, canApprove: true },
  { id: 'p3', moduleName: 'Leave', read: true, write: true, canApprove: true },
  { id: 'p4', moduleName: 'Overtime', read: true, write: true, canApprove: true },
  { id: 'p5', moduleName: 'Payroll', read: true, write: true, canApprove: true },
  { id: 'p6', moduleName: 'Payroll', read: true, write: false, canApprove: false },
  { id: 'p7', moduleName: 'Salary & Rules', read: true, write: true, canApprove: true },
  { id: 'p8', moduleName: 'Users & Roles', read: true, write: true, canApprove: true },
  { id: 'p9', moduleName: 'Self service', read: true, write: false, canApprove: false },
  { id: 'p10', moduleName: 'Audit Log', read: true, write: false, canApprove: false },
];

export const ROLES: Role[] = [
  {
    id: 'r1',
    roleName: 'Admin',
    description: 'Full system access, user provisioning and payroll rule configuration',
    permissionIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p7', 'p8', 'p10'],
  },
  {
    id: 'r2',
    roleName: 'HR',
    description: 'People, time and the payroll run request — cannot approve a batch',
    permissionIds: ['p1', 'p2', 'p3', 'p4', 'p6'],
  },
  {
    id: 'r3',
    roleName: 'Accountant',
    description: 'Verifies, approves and pays payroll batches; owns salary rules',
    permissionIds: ['p5', 'p7'],
  },
  {
    id: 'r4',
    roleName: 'Employee',
    description: 'Self service: attendance, leave, overtime and own payslips',
    permissionIds: ['p9'],
  },
];

const ROLE_BY_EMPLOYEE: Record<string, string> = {
  e1: 'r2',
  e2: 'r3',
  e7: 'r1',
  e11: 'r3',
  e12: 'r1',
};

export const USERS: AppUser[] = EMPLOYEES.filter((emp) => emp.status !== 'separated').map(
  (emp, index) => ({
    id: `u${index + 1}`,
    username: emp.email.split('@')[0],
    email: emp.email,
    employeeId: emp.id,
    roleId: ROLE_BY_EMPLOYEE[emp.id] ?? 'r4',
    // The draft employee has no activated account yet — see "Notify Admin to
    // Activate Account" in the onboarding flow.
    status: emp.status === 'draft' ? 'pending-activation' : 'active',
    lastLogin: emp.status === 'draft' ? undefined : `2026-08-0${(index % 7) + 1} 09:1${index % 6}`,
  }),
);

export function employeeName(id: string): string {
  return EMPLOYEES.find((emp) => emp.id === id)?.name ?? '—';
}

export function employeeCode(id: string): string {
  return EMPLOYEES.find((emp) => emp.id === id)?.employeeCode ?? '—';
}

export function departmentName(id: string): string {
  return DEPARTMENTS.find((dept) => dept.id === id)?.name ?? '—';
}

export function designationTitle(id: string): string {
  return DESIGNATIONS.find((row) => row.id === id)?.title ?? '—';
}

export function shiftName(id: string): string {
  return SHIFTS.find((row) => row.id === id)?.name ?? '—';
}
