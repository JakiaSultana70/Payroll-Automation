prompt:  

Now complete the Raise Loan and Raise Bonus forms.
Follow the existing Leave/Overtime pattern.
Loan:  Employee/HR → Raise Loan Request → Submit → Pending → HR Approve/Reject
Bonus:  HR → Raise Bonus Request → Submit → Pending → HR Approve/Reject
Add the forms, validation, submit/save flow, detail view, audit log, and tests.
Do not implement loan repayment or payroll deduction yet. Do not change unrelated modules.
Run tests after finishing and tell me what you changed.
For both Loan and Bonus, use HR as the approver. Do not add Admin approval.


new prmpt:

Please audit the Loan and Bonus modules from a real HR Payroll business-process perspective.
There is currently a problem in the Bonus workflow: when HR raises a bonus request, HR can also approve or reject the same request. This creates a self-approval problem.
Please review the existing frontend, backend, authorization, roles, database workflow, audit logs, notifications, and payroll integration for both Loan and Bonus.I want you to specifically recommend the most professional business workflow before making any changes.
For Loan, determine who should request a loan and who should review/approve/reject it. Employee should be the requester. Check whether HR, Accountant, or Admin should be the approver based on proper separation of duties and our existing architecture.
For Bonus, determine the correct workflow for a payroll system. My initial idea is that HR should select the employee, propose/raise the bonus with amount and reason, and Admin should review and approve/reject it. HR must not be able to approve their own bonus request.
Also review how bonus should be distributed: who can select employees, enter the bonus amount/reason, whether one request can contain multiple employees, and how approved bonuses should flow into payroll.
Do not implement anything yet.
First give me your professional recommendation for the final Loan and Bonus workflows, explain the role responsibilities and approval flow, identify any current self-approval or authorization problems, and recommend the cleanest design that fits our existing HR Payroll system.
Also consider audit logs, rejection reasons, notifications, duplicate requests, and payroll integration.

**3rd Prmpt**

I agree with your recommendation. Please implement the Bonus workflow with HR as the requester and Accountant as the approver. Do not change the Loan workflow.
For Bonus, HR should select an employee, enter the bonus type, amount, payment date, and reason, then submit it. The request goes to pending status. Accountant can review and approve or reject it. Rejection must keep the existing mandatory rejection reason validation.
HR must not be able to approve or reject bonus requests, including bonuses raised by another HR user. Admin should not be the normal bonus approver.
Also add requestedBy to BonusRecord so the system records which HR user created the bonus request, following the existing PayrollBatch.requestedBy pattern. Update the database, backend, frontend model, creation flow, and audit logging as needed.
Add an Accountant-side pending bonus/awaiting-review indicator or queue so Accountant can easily see bonuses waiting for approval. Keep the existing bonus duplicate prevention, payroll engine integration, employee approve/reject notifications, audit logs, and bonus calculation behavior unchanged unless required for this role change.
Keep one employee per BonusRecord. Do not add bulk bonus functionality now.
Do not change the Loan module.
After implementation, test and verify:
HR can create/submit bonus
HR cannot approve/reject bonus
Accountant can approve/reject bonus
Admin is not required for the normal bonus workflow
Rejection reason is mandatory
requestedBy is correctly stored
Approved bonus is included in payroll
Rejected bonus is excluded from payroll
Employee receives the existing approve/reject notification
Audit log correctly records HR as requester and Accountant as approver
Duplicate bonus prevention still works
Run the full test suite, build, and real PostgreSQL E2E verification. Do not make unrelated changes.

**4th Prmpt**

