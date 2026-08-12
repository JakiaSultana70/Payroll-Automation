import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { App } from './app';
import { SessionService } from './core/session';
import { runPayroll } from './core/payroll-engine';
import { EMPLOYEES } from './core/mock-db/seed/org';
import { ATTENDANCE, CYCLE_END, CYCLE_START, OVERTIME } from './core/mock-db/seed/time';
import { BONUSES, LOANS, PF_RULES, SALARY_STRUCTURES, TAX_RULES } from './core/mock-db/seed/pay';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideStore({})],
    }).compileComponents();
  });

  it('renders the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});

describe('authentication', () => {
  let session: SessionService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideStore({})] });
    session = TestBed.inject(SessionService);
  });

  it('starts signed out', () => {
    expect(session.isAuthenticated()).toBe(false);
  });

  it('rejects an unknown username', () => {
    const result = session.signIn('not.a.user', 'whatever');
    expect(result.ok).toBe(false);
    expect(session.isAuthenticated()).toBe(false);
  });

  it('rejects a wrong password with the same message as an unknown user', () => {
    const unknown = session.signIn('not.a.user', 'x');
    const wrong = session.signIn('nasrin.akter', 'wrong-password');
    expect(wrong.ok).toBe(false);
    expect(unknown.ok).toBe(false);
    if (!unknown.ok && !wrong.ok) {
      expect(wrong.message).toBe(unknown.message);
    }
  });

  it('signs in HR and resolves the role from the account, not the form', () => {
    const result = session.signIn('nasrin.akter', 'Hr@2026');
    expect(result.ok).toBe(true);
    expect(session.isAuthenticated()).toBe(true);
    expect(session.role()).toBe('HR');
    expect(session.employeeId()).toBe('e1');
    expect(session.canApproveLeave()).toBe(true);
    expect(session.canApproveBatch()).toBe(false);
  });

  it('gives the accountant batch approval but not leave approval', () => {
    session.signIn('rakib.hasan', 'Accounts@2026');
    expect(session.role()).toBe('Accountant');
    expect(session.canApproveBatch()).toBe(true);
    expect(session.canApproveLeave()).toBe(false);
  });

  it('gives an employee no approval rights', () => {
    session.signIn('tanvir.ahmed', 'Staff@2026');
    expect(session.role()).toBe('Employee');
    expect(session.canApproveLeave()).toBe(false);
    expect(session.canApproveBatch()).toBe(false);
    expect(session.canRequestPayroll()).toBe(false);
  });

  it('restores the session from storage', () => {
    session.signIn('farhana.islam', 'Admin@2026');
    const restored = TestBed.inject(SessionService);
    expect(restored.role()).toBe('Admin');
  });

  it('clears everything on sign out', () => {
    session.signIn('farhana.islam', 'Admin@2026');
    session.signOut();
    expect(session.isAuthenticated()).toBe(false);
    expect(session.currentUser()).toBeNull();
    expect(sessionStorage.getItem('payflow.session')).toBeNull();
  });
});

describe('payroll engine', () => {
  const slips = runPayroll({
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
    batchId: 'test',
  });

  it('produces one payslip per active employee', () => {
    const active = EMPLOYEES.filter((emp) => emp.status === 'active').length;
    expect(slips.length).toBe(active);
  });

  it('nets gross plus bonus minus deductions', () => {
    for (const slip of slips) {
      expect(slip.netSalary).toBe(
        Math.round(slip.grossSalary + slip.bonus - slip.totalDeductions),
      );
    }
  });

  it('only picks up payroll-eligible overtime', () => {
    const ineligible = OVERTIME.filter((row) => !row.payrollEligible).reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    const counted = slips.reduce((sum, slip) => sum + slip.overtimeAmount, 0);
    const eligible = OVERTIME.filter((row) => row.payrollEligible).reduce(
      (sum, row) => sum + row.amount,
      0,
    );
    expect(counted).toBe(eligible);
    expect(ineligible).toBeGreaterThan(0);
  });

  it('never records negative worked hours, including the evening shift', () => {
    for (const row of ATTENDANCE) {
      expect(row.workedHours).toBeGreaterThanOrEqual(0);
    }
  });

  it('ignores a rejected claim that still carries a stale eligible flag', () => {
    const victim = EMPLOYEES.find((emp) => emp.status === 'active' && emp.overtimeEligible)!;
    const stale = {
      id: 'ot-stale',
      employeeId: victim.id,
      date: CYCLE_START,
      hours: 40,
      rate: 500,
      amount: 20_000,
      status: 'rejected' as const,
      // Contradicts the status — exactly the corruption the engine must survive.
      payrollEligible: true,
    };

    const withStale = runPayroll({
      employees: EMPLOYEES,
      attendance: ATTENDANCE,
      overtime: [...OVERTIME, stale],
      structures: SALARY_STRUCTURES,
      loans: LOANS,
      bonuses: BONUSES,
      taxRules: TAX_RULES,
      pfRule: PF_RULES[0],
      cycleStart: CYCLE_START,
      cycleEnd: CYCLE_END,
      batchId: 'test',
    });

    const before = slips.find((slip) => slip.employeeId === victim.id)!;
    const after = withStale.find((slip) => slip.employeeId === victim.id)!;
    expect(after.overtimeAmount).toBe(before.overtimeAmount);
    expect(after.netSalary).toBe(before.netSalary);
  });
});
