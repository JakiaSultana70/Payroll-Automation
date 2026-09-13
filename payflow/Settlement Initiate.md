**Settlement Initiate** মানে কোনো employee-এর চাকরি শেষ হওয়ার সময় তার **Final Settlement process শুরু করা**।

### কী কাজ হবে?

ধরো একজন employee-এর **Last Working Day** শেষ হয়ে গেছে।

HR তখন:

```text
Employee
   ↓
Last Working Day
   ↓
Initiate Settlement
   ↓
Settlement Request
   ↓
Pending
   ↓
HR/Admin/Authorized Approver
   ↓
Approve / Reject
```

### Settlement-এর মধ্যে পরে কী কী হিসাব হবে?

Final settlement-এ সাধারণত:

- শেষ মাসের salary
    
- Unused leave-এর টাকা / leave encashment
    
- Gratuity
    
- Bonus/other dues
    
- Loan outstanding
    
- অন্যান্য deductions
    
- Final payable amount
    

ধরো:

```text
Salary Due          = 30,000
Leave Encashment    = 10,000
Gratuity            = 50,000
                     -------
Total               = 90,000

Loan Outstanding    = 20,000
                     -------
Final Payable       = 70,000
```

### কিন্তু এখন Angular-এ কী করবে?

**এখন শুধু Initiate flow বানাবে।**

মানে:

```text
HR
 ↓
Select Employee
 ↓
Last Working Day
 ↓
Reason / Remarks
 ↓
Initiate Settlement
 ↓
Pending
```

এখনই **final amount calculation, gratuity calculation, loan adjustment** করার দরকার নেই। এগুলো **backend + payroll/business logic-এর সাথে** করা ভালো।

তাই Claude-কে যে prompt দিয়েছিলাম, সেটার উদ্দেশ্য হলো **শুধু settlement শুরু করার frontend workflow তৈরি করা**, পুরো final settlement calculation না।


Claude Prompt ::  

Now complete the Settlement Initiate flow. Follow the existing Leave/Overtime pattern.
HR → Initiate Settlement → Submit → Pending → Accountant Verify/Approve → Completed
Add the form, validation, submit/save flow, detail view, audit log, and tests.
For now, only implement the frontend mock workflow. Do not implement final settlement calculations or backend integration yet. Do not change unrelated modules.
Run tests after finishing and tell me what you changed.