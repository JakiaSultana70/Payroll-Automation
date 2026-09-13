Please do one final production-readiness audit of the Payroll module.

Focus on the remaining risks after the recent loan-recovery fix, especially:

1. Double-click or concurrent payroll actions causing duplicate processing, notifications, or bank-file generation.
2. Payroll state transition and locking safety — make sure invalid actions cannot happen from the wrong status.
3. Payment and Mark Paid safety — make sure payment cannot be processed twice.
4. Re-running and rejecting payroll cannot corrupt historical calculations, payslips, loans, bonuses, deductions, or payments.
5. Database transaction/atomicity issues between payroll batch, payslips, payments, and related records.
6. Historical payroll immutability after approval/paid.
7. TaxRule/PFRule effectiveFrom handling and whether rule versioning can cause incorrect historical payroll calculations.
8. Any remaining authorization or business-logic issues in the main payroll flow.

Do not implement anything yet.

First audit the actual frontend, backend, database, payroll engine, state machine, and existing tests.

Then tell me which issues are real bugs, which are only future risks, their severity, and what you recommend fixing now versus later.

Do not change anything that is already correct.

**2nd Prmpt:**

Please audit the Payroll calculation specifically for different employee scenarios.

Check whether salary is calculated correctly for employees who have no loan, employees who have a loan, employees who have no loan but receive a bonus, and employees who have both loan and bonus.

Verify that the payroll engine correctly handles all combinations of salary, attendance, leave, overtime, bonus, loan, PF, tax, deductions, gross salary, and net salary.

Make sure employees without a loan do NOT get any loan deduction, and employees without a bonus do NOT get any bonus amount. Also verify that adding a bonus or loan does not incorrectly change the calculation of unrelated salary components.

Compare the calculation logic for each scenario and confirm whether the differences are intentional according to the business rules.

Use real database data and existing payroll rules. Do not change anything yet.

First identify any calculation bug or inconsistency, explain the root cause and business impact, and recommend what should be fixed if anything is wrong.

**3rd Prmpt**

Good audit. Before making the production-readiness fixes, I want you to specifically verify the payroll calculation scenarios I originally asked about.

Check real payroll calculations for employees with:

1. No loan and no bonus
2. Loan but no bonus
3. No loan but bonus
4. Both loan and bonus

For each scenario, verify the complete calculation: salary structure, gross salary, attendance, leave, overtime, bonus, loan recovery, PF, tax, other deductions, and final net salary.

Confirm that having no loan results in zero loan deduction, having no bonus results in zero bonus earning, and adding a bonus or loan only affects the intended payroll components.

Use the actual payroll engine, real database data, and existing business rules. Do not change anything yet.

Give me a clear result for each scenario and identify any calculation bug or inconsistency if found.

After that, separately give me your recommendation on the production issues you found (#1 double-click protection, #3 payment unique constraint, #2 server-side state validation/immutability, #5 transactions, and #7 tax/PF effectiveFrom) and tell me which ones should be fixed now, before production, or later.

Do not implement anything until I approve the recommended fixes.

**4th prmpt**

Please implement only production fixes #1 and #3.

Fix #1: Prevent double-click/concurrent execution of the Pay action so the same payroll batch cannot trigger duplicate notifications or duplicate bank-file downloads while the first request is still processing. Keep the change narrow and limited to the payroll Pay action.

Fix #3: Add a database-level UNIQUE constraint on payment.batch_id so one payroll batch can never have multiple payment records, even if another client or API call tries to create one.

Do not change the payroll calculation engine, salary rules, loan/bonus logic, authorization model, or existing payroll workflow.

Add regression tests for both fixes, run the full test suite and build, and verify the changes against the real PostgreSQL database.

Do not implement #2, #5, or #7 yet.

**5th prmpt**



