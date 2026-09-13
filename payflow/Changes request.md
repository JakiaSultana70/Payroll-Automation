Rebuild the Change Requests module properly.

The current Change Request model/store exists but the module is orphaned from the routes/sidebar/module registry.

Follow the existing Leave/Overtime module pattern and implement the complete flow:

Employee/authorized user
→ Raise Change Request
→ Fill request form
→ Submit
→ Pending
→ HR/Admin Approve or Reject
→ If approved, apply the requested change
→ Create Audit Log

Add whatever is necessary for the route, sidebar/module registry, page, form/modal, validation, detail view, approval/rejection flow, tests, and audit logging.

Reuse the existing Change Request model/store and project architecture where possible.

Do not modify unrelated completed modules. After finishing, run the relevant tests/build and report what you changed.