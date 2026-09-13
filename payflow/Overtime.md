
**60 hours/month রেখো না।** তোমার project যদি Bangladesh Labour Act অনুযায়ী realistic করতে চাও, **60 hours হলো total working hours-এর weekly ceiling**, overtime-এর monthly ceiling নয়। Bangladesh Labour Act-এর Section 102 অনুযায়ী সাধারণ working week 48 hours, আর নির্দিষ্ট শর্তে total work **সর্বোচ্চ 60 hours/week**, এবং বছরে average 56 hours/week। ([NatLex](https://natlex.ilo.org/dyn/natlex2/natlex2/files/download/76402/BGD76402%20Eng.pdf?utm_source=chatgpt.com "Bangladesh Labour Act,"))

তাই তোমার automatic overtime system-এ ভালো rule হবে:

- Regular working hours: **8 hours/day**
    
- Normal weekly hours: **48 hours/week**
    
- Total working hours including overtime: **maximum 60 hours/week**
    
- অর্থাৎ সাধারণভাবে overtime-এর weekly ceiling **12 hours/week**
    
- Check-in/out থেকে overtime **automatically calculate & record**
    
- তারপর applicable weekly limit/rules validate করবে
    
- HR approval-এর পর payroll eligible হবে
    

Claude-কে এই prompt দাও:

Please make the Overtime rules realistic for Bangladesh.
Do not use a 60-hour monthly overtime limit. Use the Bangladesh weekly working-hour rule instead: 48 regular hours/week, with total working hours including overtime limited to 60 hours/week.
Keep overtime automatically calculated and recorded from check-in/check-out. Validate the weekly limit, then send overtime for HR approval before it becomes payroll eligible.
Update overtime-rules.ts, the live overtime flow, tests, and project plan accordingly. Do not change unrelated modules.

Please fix the Overtime module and make the workflow realistic and consistent across the project.
Use this workflow:
Employee Check-in → Check-out → Automatically calculate worked hours → Automatically calculate and record overtime → Validate Bangladesh weekly working-hour limit → Pending → HR Approve/Reject → Approved = Payroll Eligible.
Do not use a 60-hour monthly overtime limit. Use the applicable weekly working-hour rule.
Keep automatic overtime calculation and recording from attendance. Remove automatic approval.
Make sure the live attendance flow actually uses overtime-rules.ts validation. Remove or update the unused manual overtime claim flow if it is no longer needed.
Update the overtime UI, rules, tests, routes if needed, and project plan. Do not modify unrelated modules. Run the full test suite and build after finishing.


Next Prompt respons:

এখানে Claude বলছে **Overtime-এর frontend rework এখন complete করেছে** এবং project plan-ও update করেছে। তবে একটা গুরুত্বপূর্ণ ব্যাপার আছে।

### 1. Overtime এখন কী workflow হিসেবে ধরা হয়েছে?

Claude plan-এ এখন লিখেছে:

**Check-out → Auto overtime record → Weekly limit validation → HR approve/reject → Payroll eligible**

অর্থাৎ:

```text
Check-in
   ↓
Check-out
   ↓
Automatic Overtime Calculation
   ↓
Weekly Limit Validation
   ↓
Pending
   ↓
HR Approve/Reject
   ↓
Payroll Eligible
```

এটাই এখন তোমার **final intended workflow**।

---

### 2. 60-hour rule কীভাবে ধরেছে?

Claude লিখেছে:

> **48 regular + 12 overtime = 60 hours/week**

অর্থাৎ:

- Regular work = 48 hours/week
    
- Overtime = সর্বোচ্চ 12 hours/week
    
- Total = 60 hours/week
    

এটা **monthly 60 hours নয়**।

---

### 3. Notification এখনো বাকি

শুধু:

**Notification dispatch**

বাকি আছে।

কারণ actual:

```text
Spring Boot
 ↓
Email/SMS
 ↓
Employee
```

backend ছাড়া করা যাবে না।

তাই এটাকে এখন **backend-bound** বলেছে।

---

### 4. Loan-এর ব্যাপারেও clear করেছে

Approved loan এখনো:

```text
Approved
   ↓
❌ EMI recovery নয়
❌ Payroll deduction নয়
```

Backend-এ পরে loan active করে repayment/deduction implement করতে হবে।

---

### 5. Settlement-এর ব্যাপারেও এখন limitation আছে

এখন:

```text
Settlement
 ↓
Gratuity
Leave Encashment
Dues
```

এগুলো **manually entered** হচ্ছে।

Backend-এ পরে actual calculation হবে:

```text
Employee data
 ↓
Salary + Tenure + Leave + Loan
 ↓
Final Settlement Calculation
```

---

# সবচেয়ে গুরুত্বপূর্ণ: এখন Backend শুরু করার order

Claude plan update করেছে:

### Step 1 ✅

Frontend submission modules complete:

- Change Request ✅
    
- Loans & Bonuses ✅
    
- Settlements ✅
    
- Master Data CRUD ✅
    
- Overtime weekly-limit rework ✅
    

### Step 2 ⏭️

**Spring Boot + PostgreSQL setup**

### Step 3

**Authentication API**

### Step 4

**Leave + Overtime backend vertical slice**

এটাই খুব ভালো approach।

---

## এখন তোমার next কাজ

এখন আর Angular-এর কোনো বড় কাজ নেই।

তুমি Claude-কে বলবে **Spring Boot backend শুরু করতে**।

আমি recommend করব প্রথম prompt-এ শুধু **project setup + PostgreSQL** করতে বলবে, সব backend একসাথে না।

Claude-কে দাও:

**“Now start Part 2.1 of the project plan: set up the Spring Boot backend and local PostgreSQL environment. Follow the project plan exactly. Do not implement business modules yet.”**

তারপর ও setup শেষ করলে পরের step দেব।