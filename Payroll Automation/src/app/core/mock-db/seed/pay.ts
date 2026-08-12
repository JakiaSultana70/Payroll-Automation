import { batchTotals, runPayroll } from '../../payroll-engine';
import {
  BonusRecord,
  FinalSettlement,
  LoanRecord,
  PFRule,
  Payment,
  PayrollBatch,
  Payslip,
  SalaryStructure,
  TaxRule,
} from '../../models/hr';
import { EMPLOYEES } from './org';
import { ATTENDANCE, CYCLE_END, CYCLE_START, OVERTIME } from './time';

/** Grade → salary components. Gross is the sum, as in the class diagram. */
const GRADE_PAY: Record<string, { basic: number; hra: number; allowances: number }> = {
  M1: { basic: 85000, hra: 34000, allowances: 12000 },
  M2: { basic: 62000, hra: 24800, allowances: 9000 },
  M3: { basic: 45000, hra: 18000, allowances: 7000 },
  E1: { basic: 32000, hra: 12800, allowances: 5000 },
  W1: { basic: 19000, hra: 7600, allowances: 3000 },
  W2: { basic: 14500, hra: 5800, allowances: 2500 },
  W3: { basic: 11000, hra: 4400, allowances: 2000 },
};

export const SALARY_STRUCTURES: SalaryStructure[] = EMPLOYEES.filter(
  (emp) => emp.status !== 'draft',
).map((emp) => {
  const pay = GRADE_PAY[emp.salaryGrade];
  const grossSalary = pay.basic + pay.hra + pay.allowances;
  return {
    id: `ss-${emp.id}`,
    employeeId: emp.id,
    basic: pay.basic,
    hra: pay.hra,
    allowances: pay.allowances,
    grossSalary,
    effectiveFrom: emp.joiningDate,
    // Workers below the taxable threshold still carry the flag honestly.
    appliesTax: grossSalary * 12 > 350_000,
    appliesPF: emp.employmentType === 'permanent',
  };
});

export const TAX_RULES: TaxRule[] = [
  { id: 'tx1', slabName: 'Exempt', minIncome: 0, maxIncome: 350_000, rate: 0, effectiveFrom: '2026-07-01' },
  { id: 'tx2', slabName: 'Slab 1', minIncome: 350_001, maxIncome: 450_000, rate: 5, effectiveFrom: '2026-07-01' },
  { id: 'tx3', slabName: 'Slab 2', minIncome: 450_001, maxIncome: 750_000, rate: 10, effectiveFrom: '2026-07-01' },
  { id: 'tx4', slabName: 'Slab 3', minIncome: 750_001, maxIncome: 1_150_000, rate: 15, effectiveFrom: '2026-07-01' },
  { id: 'tx5', slabName: 'Slab 4', minIncome: 1_150_001, maxIncome: 99_999_999, rate: 20, effectiveFrom: '2026-07-01' },
];

export const PF_RULES: PFRule[] = [
  {
    id: 'pf1',
    name: 'Standard Provident Fund',
    employeeContributionPct: 10,
    employerContributionPct: 10,
    effectiveFrom: '2026-01-01',
  },
];

export const LOANS: LoanRecord[] = [
  { id: 'ln1', employeeId: 'e4', principal: 60_000, emiAmount: 5000, outstandingBalance: 35_000, startDate: '2025-11-01', status: 'active' },
  { id: 'ln2', employeeId: 'e5', principal: 30_000, emiAmount: 2500, outstandingBalance: 12_500, startDate: '2026-01-15', status: 'active' },
  { id: 'ln3', employeeId: 'e9', principal: 20_000, emiAmount: 2000, outstandingBalance: 6000, startDate: '2026-03-01', status: 'active' },
  { id: 'ln4', employeeId: 'e13', principal: 25_000, emiAmount: 2500, outstandingBalance: 0, startDate: '2025-06-01', status: 'closed' },
  { id: 'ln5', employeeId: 'e8', principal: 45_000, emiAmount: 3750, outstandingBalance: 22_500, startDate: '2025-12-01', status: 'active' },
];

export const BONUSES: BonusRecord[] = [
  { id: 'bn1', employeeId: 'e4', type: 'Attendance', amount: 1500, paymentDate: '2026-07-28', status: 'approved' },
  { id: 'bn2', employeeId: 'e6', type: 'Attendance', amount: 1500, paymentDate: '2026-07-28', status: 'approved' },
  { id: 'bn3', employeeId: 'e3', type: 'Performance', amount: 25_000, paymentDate: '2026-07-28', status: 'approved' },
  { id: 'bn4', employeeId: 'e8', type: 'Performance', amount: 8000, paymentDate: '2026-07-28', status: 'pending' },
  { id: 'bn5', employeeId: 'e5', type: 'Festival', amount: 14_500, paymentDate: '2026-03-18', status: 'approved' },
  { id: 'bn6', employeeId: 'e13', type: 'Attendance', amount: 1500, paymentDate: '2026-07-28', status: 'rejected' },
];

const JULY = runPayroll({
  employees: EMPLOYEES,
  attendance: ATTENDANCE,
  overtime: OVERTIME,
  structures: SALARY_STRUCTURES,
  loans: LOANS,
  bonuses: BONUSES,
  taxRules: TAX_RULES,
  pfRule: PF_RULES[0],
  cycleStart: CYCLE_START,
  cycleEnd: CYCLE_END,
  batchId: 'pb3',
});

const julyTotals = batchTotals(JULY);

/** Scale an earlier month off the July run so history looks plausible. */
function historic(batchId: string, factor: number): Payslip[] {
  return JULY.map((slip) => ({
    ...slip,
    id: `ps-${batchId}-${slip.employeeId}`,
    batchId,
    overtimeAmount: Math.round(slip.overtimeAmount * factor),
    grossSalary: Math.round(slip.grossSalary * factor),
    bonus: 0,
    netSalary: Math.round((slip.grossSalary * factor) - slip.totalDeductions),
    pdfUrl: `/payslips/${batchId}/${slip.employeeId}.pdf`,
  }));
}

const MAY = historic('pb1', 0.94);
const JUNE = historic('pb2', 0.97);
const mayTotals = batchTotals(MAY);
const juneTotals = batchTotals(JUNE);

export const PAYROLL_BATCHES: PayrollBatch[] = [
  {
    id: 'pb1',
    batchRef: 'PR-2026-05',
    month: 'May 2026',
    cycleStart: '2026-05-01',
    cycleEnd: '2026-05-31',
    status: 'paid',
    locked: true,
    ...mayTotals,
    requestedBy: 'nasrin.akter',
    approvedBy: 'rakib.hasan',
  },
  {
    id: 'pb2',
    batchRef: 'PR-2026-06',
    month: 'June 2026',
    cycleStart: '2026-06-01',
    cycleEnd: '2026-06-30',
    status: 'paid',
    locked: true,
    ...juneTotals,
    requestedBy: 'nasrin.akter',
    approvedBy: 'rakib.hasan',
  },
  {
    id: 'pb3',
    batchRef: 'PR-2026-07',
    month: 'July 2026',
    cycleStart: CYCLE_START,
    cycleEnd: CYCLE_END,
    // Sitting with the accountant: HR has run it, verification is outstanding.
    status: 'pending-approval',
    locked: true,
    ...julyTotals,
    requestedBy: 'nasrin.akter',
  },
  {
    id: 'pb4',
    batchRef: 'PR-2026-08',
    month: 'August 2026',
    cycleStart: '2026-08-01',
    cycleEnd: '2026-08-31',
    // Not yet run — the engine button on its detail page does the work.
    status: 'draft',
    locked: false,
    employeeCount: 0,
    grossTotal: 0,
    deductionTotal: 0,
    netTotal: 0,
    requestedBy: 'nasrin.akter',
  },
];

export const PAYSLIPS: Payslip[] = [...MAY, ...JUNE, ...JULY];

export const PAYMENTS: Payment[] = [
  {
    id: 'pay1',
    batchId: 'pb1',
    amount: mayTotals.netTotal,
    paymentDate: '2026-06-05',
    bankFileRef: 'BRAC-BEFTN-20260605-0417',
    status: 'processed',
  },
  {
    id: 'pay2',
    batchId: 'pb2',
    amount: juneTotals.netTotal,
    paymentDate: '2026-07-05',
    bankFileRef: 'BRAC-BEFTN-20260705-0582',
    status: 'processed',
  },
];

export const SETTLEMENTS: FinalSettlement[] = [
  {
    id: 'fs1',
    employeeId: 'e14',
    lastWorkingDay: '2026-06-30',
    tenureMonths: 76,
    gratuity: 87_000,
    leaveEncashment: 11_600,
    pendingDues: 4200,
    netSettlementAmount: 94_400,
    status: 'pending',
  },
];
