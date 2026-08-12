import { ApprovalStatus, BatchStatus, Id, RoleName } from './common';

/* ── Organisation ───────────────────────────────────────────────────────── */

export interface Company {
  id: Id;
  name: string;
  address: string;
  timezone: string;
  currency: string;
}

export interface Department {
  id: Id;
  code: string;
  name: string;
  headEmployeeId?: Id;
}

export interface Designation {
  id: Id;
  title: string;
  grade: string;
}

export interface Shift {
  id: Id;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  /** Grace period before an entry is flagged late. */
  lateAllowanceMinutes: number;
}

export interface Holiday {
  id: Id;
  name: string;
  date: string;
  type: 'public' | 'festival' | 'weekly';
}

/* ── People and access ──────────────────────────────────────────────────── */

export type EmployeeStatus = 'draft' | 'active' | 'inactive' | 'separated';

/** Display label for an employee status — 'inactive' is the deactivated state,
 *  shown to users as "Deactivated" rather than the raw enum value. */
export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  inactive: 'Deactivated',
  separated: 'Separated',
};

export interface Employee {
  id: Id;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  gender: 'M' | 'F';
  dob: string;
  nationalId: string;
  address: string;
  joiningDate: string;
  lastWorkingDay?: string;
  employmentType: 'permanent' | 'contract' | 'probation';
  deptId: Id;
  designationId: Id;
  shiftId: Id;
  salaryGrade: string;
  status: EmployeeStatus;
  overtimeEligible: boolean;
  /** Data URL of the profile photo. Optional — the UI falls back to initials. */
  photoUrl?: string;
  /** Self-service contact kept separate from the legal address on file. */
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface Permission {
  id: Id;
  moduleName: string;
  read: boolean;
  write: boolean;
  canApprove: boolean;
}

export interface Role {
  id: Id;
  roleName: RoleName;
  description: string;
  permissionIds: Id[];
}

export interface AppUser {
  id: Id;
  username: string;
  email: string;
  employeeId: Id;
  roleId: Id;
  status: 'active' | 'pending-activation' | 'disabled';
  lastLogin?: string;
}

/* ── Time ───────────────────────────────────────────────────────────────── */

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'holiday' | 'weekend';

export interface Attendance {
  id: Id;
  employeeId: Id;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workedHours: number;
  isLate: boolean;
  status: AttendanceStatus;
  /** HR corrections are recorded, never silently overwritten. */
  correctedBy?: string;
  correctionReason?: string;
}

export type LeaveType = 'Casual' | 'Sick' | 'Earned' | 'Maternity' | 'Unpaid';

export interface LeaveRequest {
  id: Id;
  employeeId: Id;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: ApprovalStatus;
  appliedAt: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface LeaveBalance {
  id: Id;
  employeeId: Id;
  leaveType: LeaveType;
  accrued: number;
  taken: number;
  remaining: number;
  cycleStart: string;
  cycleEnd: string;
}

export interface Overtime {
  id: Id;
  employeeId: Id;
  date: string;
  hours: number;
  rate: number;
  amount: number;
  /** What the extra hours were worked on. */
  reason?: string;
  status: ApprovalStatus;
  /** Only set once approved — the engine picks up eligible OT only. */
  payrollEligible: boolean;
  approvedBy?: string;
  rejectionReason?: string;
}

/* ── Pay rules ──────────────────────────────────────────────────────────── */

export interface SalaryStructure {
  id: Id;
  employeeId: Id;
  basic: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  effectiveFrom: string;
  appliesTax: boolean;
  appliesPF: boolean;
}

export interface TaxRule {
  id: Id;
  slabName: string;
  minIncome: number;
  maxIncome: number;
  rate: number;
  effectiveFrom: string;
}

export interface PFRule {
  id: Id;
  name: string;
  employeeContributionPct: number;
  employerContributionPct: number;
  effectiveFrom: string;
}

export interface LoanRecord {
  id: Id;
  employeeId: Id;
  principal: number;
  emiAmount: number;
  outstandingBalance: number;
  startDate: string;
  status: 'active' | 'closed';
}

export interface BonusRecord {
  id: Id;
  employeeId: Id;
  type: 'Festival' | 'Performance' | 'Attendance';
  amount: number;
  paymentDate: string;
  status: ApprovalStatus;
}

/* ── Payroll run ────────────────────────────────────────────────────────── */

export interface PayrollBatch {
  id: Id;
  batchRef: string;
  month: string;
  cycleStart: string;
  cycleEnd: string;
  status: BatchStatus;
  /** Attendance and leave are frozen before calculation. */
  locked: boolean;
  employeeCount: number;
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  requestedBy: string;
  approvedBy?: string;
  remarks?: string;
}

export interface Payslip {
  id: Id;
  batchId: Id;
  employeeId: Id;
  workedHours: number;
  overtimeHours: number;
  basic: number;
  hra: number;
  allowances: number;
  overtimeAmount: number;
  grossSalary: number;
  tax: number;
  pf: number;
  loanRecovery: number;
  bonus: number;
  totalDeductions: number;
  netSalary: number;
  pdfUrl: string;
}

export interface Payment {
  id: Id;
  batchId: Id;
  amount: number;
  paymentDate: string;
  bankFileRef: string;
  status: 'pending' | 'processed';
}

export interface FinalSettlement {
  id: Id;
  employeeId: Id;
  lastWorkingDay: string;
  tenureMonths: number;
  gratuity: number;
  leaveEncashment: number;
  pendingDues: number;
  netSettlementAmount: number;
  status: ApprovalStatus;
}

/* ── Governance ─────────────────────────────────────────────────────────── */

export interface ChangeRequest {
  id: Id;
  employeeId: Id;
  fieldName: string;
  currentValue: string;
  proposedValue: string;
  status: ApprovalStatus;
  requestedAt: string;
  approvedBy?: string;
}

export interface Notification {
  id: Id;
  userId: Id;
  title: string;
  message: string;
  type: 'payroll' | 'leave' | 'overtime' | 'account';
  sentAt: string;
  read: boolean;
}

export interface AuditLog {
  id: Id;
  actorRole: RoleName;
  actorName: string;
  action: string;
  moduleName: string;
  details: string;
  timestamp: string;
}
