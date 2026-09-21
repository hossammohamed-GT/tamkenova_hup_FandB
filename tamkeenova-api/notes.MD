POST /trainer/certificates

DELETE /trainer/certificates/:id

DELETE /trainer/certificates/:id

POST /trainer/documents

DELETE /trainer/documents/:id

GET /trainer/documents

<!-- Phase 1 — Database (الأساس)
تحديث الـ Schema بكل الجداول الجديدة
إضافة الـ relations الـ missing
إضافة columns ناقصة في users
Run migration

Phase 2 — Student Profile & Account
students.module + students.controller + students.service + students.repository
GET/PATCH profile, avatar upload, change password, contact info -->

<!-- Phase 3 — Trainer Browse (تحسينات)
إضافة search و filter endpoints على الـ trainers controller الموجود

Phase 4 — Programs & Enrollment
Program search/filter endpoints
Enrollment CRUD (enroll, cancel, track status)
Auto-certificate on completion -->

<!-- Phase 5 — Certificates System
Certificate generation, verification, PDF, QR

Phase 6 — Consultations
Full consultation workflow (request → approve/reject → complete → review) -->
<!-- 
Phase 7 — Corporate Requests (B2B)
Full corporate request workflow + admin notifications

Phase 8 — Reviews (enhancements)
Edit/delete my reviews

Phase 9 — Notifications
Notifications CRUD + email triggers for important events -->

Phase 10 — Public Profile & Verification
/u/:username endpoint
/verify/certificate/:code endpoint
/verify/user/:username endpoint
