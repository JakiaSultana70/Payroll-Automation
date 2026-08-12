import {
  Attendance,
  BonusRecord,
  Employee,
  LoanRecord,
  Overtime,
  PFRule,
  Payslip,
  SalaryStructure,
  TaxRule,
} from './models/hr';

export interface EngineInput {
  employees: Employee[];
  attendance: Attendance[];
  overtime: Overtime[];
  structures: SalaryStructure[];
  loans: LoanRecord[];
  bonuses: BonusRecord[];
  taxRules: TaxRule[];
  pfRule: PFRule;
  cycleStart: string;
  cycleEnd: string;
  batchId: string;
}

const round = (n: number) => Math.round(n);

/**
 * The payroll engine from the activity diagram, in order:
 * calculate working hours / late / OT → gross → tax, PF, loan, bonus → net.
 *
 * Pure and deterministic: the same inputs always produce the same batch, which
 * is what lets the seed and the in-app "run engine" action agree.
 */
export function runPayroll(input: EngineInput): Payslip[] {
  const {
    employees,
    attendance,
    overtime,
    structures,
    loans,
    bonuses,
    taxRules,
    pfRule,
    cycleStart,
    cycleEnd,
    batchId,
  } = input;

  const inCycle = (date: string) => date >= cycleStart && date <= cycleEnd;

  return employees
    .filter((emp) => emp.status === 'active')
    .map((emp) => {
      const structure = structures.find((s) => s.employeeId === emp.id);
      if (!structure) {
        return null;
      }

      const workedHours = attendance
        .filter((row) => row.employeeId === emp.id && inCycle(row.date))
        .reduce((sum, row) => sum + row.workedHours, 0);

      // Only approved, payroll-eligible overtime is picked up. Both conditions
      // are checked rather than trusting `payrollEligible` alone: the flag is a
      // consequence of approval, and a stale one must never put money in a
      // payslip.
      const otRows = overtime.filter(
        (row) =>
          row.employeeId === emp.id &&
          row.status === 'approved' &&
          row.payrollEligible &&
          inCycle(row.date),
      );
      const overtimeHours = otRows.reduce((sum, row) => sum + row.hours, 0);
      const overtimeAmount = otRows.reduce((sum, row) => sum + row.amount, 0);

      const grossSalary = structure.grossSalary + overtimeAmount;

      const tax = structure.appliesTax ? monthlyTax(structure.grossSalary, taxRules) : 0;
      const pf = structure.appliesPF
        ? round((structure.basic * pfRule.employeeContributionPct) / 100)
        : 0;

      const loanRecovery = loans
        .filter((loan) => loan.employeeId === emp.id && loan.status === 'active')
        .reduce((sum, loan) => sum + Math.min(loan.emiAmount, loan.outstandingBalance), 0);

      const bonus = bonuses
        .filter(
          (row) =>
            row.employeeId === emp.id && row.status === 'approved' && inCycle(row.paymentDate),
        )
        .reduce((sum, row) => sum + row.amount, 0);

      const totalDeductions = tax + pf + loanRecovery;

      return {
        id: `ps-${batchId}-${emp.id}`,
        batchId,
        employeeId: emp.id,
        workedHours: Math.round(workedHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        basic: structure.basic,
        hra: structure.hra,
        allowances: structure.allowances,
        overtimeAmount,
        grossSalary,
        tax,
        pf,
        loanRecovery: round(loanRecovery),
        bonus,
        totalDeductions: round(totalDeductions),
        netSalary: round(grossSalary + bonus - totalDeductions),
        pdfUrl: `/payslips/${batchId}/${emp.employeeCode}.pdf`,
      } satisfies Payslip;
    })
    .filter((slip): slip is Payslip => slip !== null);
}

/** Slabs are annual; the deduction is applied to the month's gross. */
export function monthlyTax(monthlyGross: number, rules: TaxRule[]): number {
  const annual = monthlyGross * 12;
  const slab = rules.find((rule) => annual >= rule.minIncome && annual <= rule.maxIncome);
  if (!slab || slab.rate === 0) {
    return 0;
  }
  return round((monthlyGross * slab.rate) / 100);
}

export function batchTotals(slips: Payslip[]) {
  return {
    employeeCount: slips.length,
    grossTotal: slips.reduce((sum, slip) => sum + slip.grossSalary + slip.bonus, 0),
    deductionTotal: slips.reduce((sum, slip) => sum + slip.totalDeductions, 0),
    netTotal: slips.reduce((sum, slip) => sum + slip.netSalary, 0),
  };
}
