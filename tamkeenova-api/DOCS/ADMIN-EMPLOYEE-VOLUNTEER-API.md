# 🛠 Tamkeenova — Admin / Employee / Volunteer API Documentation

> **Base URL:** `http://localhost:3000/api`
> **Authentication:** Bearer Token (JWT) — `Authorization: Bearer <token>`
> **Content-Type:** `application/json` (multipart/form-data for uploads)

هذا الملف يوثّق الأدوار الجديدة (الأدمن، الموظف، المتطوع) ونظام المهام (Tasks System).

---

## 📑 Table of Contents

1. [Database Setup](#1-database-setup)
2. [Roles & Permissions](#2-roles--permissions)
3. [Volunteer Registration](#3-volunteer-registration)
4. [Admin — Users](#4-admin--users)
5. [Admin — Trainers](#5-admin--trainers)
6. [Admin — Volunteers](#6-admin--volunteers)
7. [Admin — Certificates](#7-admin--certificates)
8. [Admin — Corporate Requests (B2B)](#8-admin--corporate-requests-b2b)
9. [Admin — Specializations](#9-admin--specializations)
10. [Admin — Programs](#10-admin--programs)
11. [Admin — Dashboard](#11-admin--dashboard)
12. [Tasks System](#12-tasks-system)
13. [Employee Dashboard](#13-employee-dashboard)
14. [Volunteer Dashboard](#14-volunteer-dashboard)
15. [Enums Reference](#15-enums-reference)

---

## 1. Database Setup

قبل تشغيل الكود، نفّذ خطوة واحدة على قاعدة البيانات (Neon / Supabase):

1. شغّل ملف الهجرة:
   ```
   admin-employee-volunteer-migration.sql
   ```
   الملف بيضيف:
   - الـ enums الجديدة: `task_status`, `task_priority`, `volunteer_status`, `certificate_type`.
   - تعديل جدول `certificates` (اختياري `trainer_id`/`program_id` + حقل `certificate_type`).
   - جداول جديدة: `volunteers`, `tasks`, `task_assignees`, `task_submissions`, `task_submission_attachments`, `task_comments`, `activity_logs`.

2. بعدها ولّد الـ Prisma Client:
   ```bash
   npm run build   # = prisma generate && nest build
   # أو
   npx prisma generate
   ```

> ملاحظة: الـ `user_role` enum فيه القيم التانية (`CLIENT`, `EMPLOYEE`, `ADMIN`, `SUPER_ADMIN`, `VOLUNTEER`) من الأصل. لو قاعدة بياناتك قديمة، شغّل أوامر `ALTER TYPE "user_role" ADD VALUE ...` الموجودة كتعليق في أول ملف الهجرة.

---

## 2. Roles & Permissions

| الدور | الوصول |
|-------|--------|
| `ADMIN` / `SUPER_ADMIN` | كل endpoints الخاصة بالإدارة + نظام المهام (إنشاء/مراجعة) |
| `EMPLOYEE` | مشاهدة المهام المسندة له وتنفيذها وتسليمها + Dashboard |
| `VOLUNTEER` | كل اللي فوق + تقييم المهام وساعات التطوع والشهادات |

كل endpoints الإدارة محمية بـ `RolesGuard`:
```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
```

---

## 3. Volunteer Registration

التسجيل منفصل عن تسجيل المستخدم/المدرب، والحساب يفضل `PENDING` لحد ما الأدمن يقبله.

### 3.1 Register Volunteer

```
POST /api/auth/register/volunteer
Authorization: NOT required
```

**Request Body:**
```json
{
  "full_name": "أحمد محمد",
  "username": "ahmed-vol",
  "email": "ahmed@vol.com",
  "phone": "01012345678",
  "password": "123456",
  "bio": "متطوع مهتم بالتدريب"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Volunteer request submitted successfully. Verify your email. Your account will be reviewed by an admin.",
  "user_id": "uuid"
}
```

**Side Effects:**
- 🔔 إشعار للأدمن + ✉️ إيميل للأدمن بطلب التطوع.
- ✉️ OTP للتحقق من الإيميل (نفس طريقة المستخدم العادي).

---

## 4. Admin — Users

### 4.1 List All Users

```
GET /api/admin/users?search=&role=&is_active=&page=1&limit=20
```

**Response:**
```json
{
  "data": [ { "id": "uuid", "full_name": "...", "role": "STUDENT", "is_active": true, "email_verified": true } ],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

### 4.2 Get User Details

```
GET /api/admin/users/:id
```

### 4.3 Change User Role

```
PATCH /api/admin/users/:id/role
```

```json
{ "role": "EMPLOYEE" }
```

> تغيير الدور لـ `VOLUNTEER` بينشئ تلقائيًا ملف متطوع (`volunteers`) بحالة `PENDING` لو مش موجود.

### 4.4 Activate / Deactivate Account

```
PATCH /api/admin/users/:id/status
```

```json
{ "is_active": false }
```

### 4.5 View User Activity

```
GET /api/admin/users/:id/activity
```

---

## 5. Admin — Trainers

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/admin/trainers?status=PENDING` | عرض المدربين (فلترة بالحالة) |
| `GET` | `/api/admin/trainers/:id` | تفاصيل مدرب |
| `PATCH` | `/api/admin/trainers/:id/approve` | قبول المدرب |
| `PATCH` | `/api/admin/trainers/:id/reject` | رفض المدرب `{ "reason": "..." }` |
| `PATCH` | `/api/admin/trainers/:id/suspend` | تعليق المدرب |
| `PATCH` | `/api/admin/trainers/:id/activate` | إعادة تفعيل المدرب |
| `PATCH` | `/api/admin/trainers/:id` | تعديل بيانات المدرب |
| `POST` | `/api/admin/trainers/:id/certificates` | إضافة شهادة `{ "title": "...", "certificate_url": "https://..." }` |
| `DELETE` | `/api/admin/trainers/certificates/:id` | حذف شهادة مدرب |
| `POST` | `/api/admin/trainers/:id/documents` | إضافة ملف `{ "file_name": "...", "file_url": "https://...", "file_type": "CV" }` |
| `DELETE` | `/api/admin/trainers/documents/:id` | حذف ملف مدرب |

---

## 6. Admin — Volunteers

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/admin/volunteers?status=PENDING` | عرض المتطوعين |
| `GET` | `/api/admin/volunteers/:id` | تفاصيل متطوع |
| `PATCH` | `/api/admin/volunteers/:id/approve` | قبول المتطوع |
| `PATCH` | `/api/admin/volunteers/:id/reject` | رفض المتطوع `{ "reason": "..." }` |

---

## 7. Admin — Certificates

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/admin/certificates` | سجل كل الشهادات |
| `POST` | `/api/admin/certificates` | إصدار شهادة لأي مستخدم |
| `POST` | `/api/admin/certificates/:id/pdf` | رفع PDF الشهادة (multipart `file`) |
| `PATCH` | `/api/admin/certificates/:id` | تعديل شهادة |
| `PATCH` | `/api/admin/certificates/:id/revoke` | إلغاء الشهادة (`is_valid=false`) |
| `DELETE` | `/api/admin/certificates/:id` | حذف الشهادة |

### Issue Certificate

```
POST /api/admin/certificates
```

```json
{
  "user_id": "uuid",
  "title": "شهادة تطوع",
  "description": "إتمام 100 ساعة تطوع",
  "training_hours": 100,
  "certificate_type": "VOLUNTEER"
}
```

**Side Effects:**
- توليد `verification_code` (مثل `TAM-1A2B3C4D`).
- توليد رابط صورة QR (بدون أي مكتبة server-side) يرمّز رابط التحقق العام وتخزينه في `qr_code_url`.
- 🔔 إشعار + ✉️ إيميل لصاحب الشهادة.

> `trainer_id` و `program_id` اختياريين دلوقتي — شهادة التطوع أو أي شهادة عامة مش محتاجة برنامج أو مدرب.

---

## 8. Admin — Corporate Requests (B2B)

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/admin/corporate-requests?status=PENDING` | عرض طلبات الشركات |
| `GET` | `/api/admin/corporate-requests/:id` | تفاصيل الطلب |
| `PATCH` | `/api/admin/corporate-requests/:id/status` | تحديث الحالة |

```json
{ "action": "ASSIGNED", "assigned_to": "employee-uuid", "admin_notes": "..." }
```

| `action` | ملاحظة |
|----------|--------|
| `UNDER_REVIEW` | تحت المراجعة |
| `ASSIGNED` | تحويل لموظف — **مطلوب** `assigned_to` |
| `APPROVED` | قبول |
| `REJECTED` | رفض — `reason` اختياري |
| `COMPLETED` | إنهاء |

---

## 9. Admin — Specializations

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/admin/specializations/requests` | التخصصات المقترحة |
| `PATCH` | `/api/admin/specializations/requests/:id/approve` | قبول تخصص مقترح |
| `PATCH` | `/api/admin/specializations/requests/:id/reject` | رفض تخصص مقترح |
| `POST` | `/api/admin/specializations` | إضافة تخصص `{ "name_ar": "...", "name_en": "..." }` |
| `PATCH` | `/api/admin/specializations/:id` | تعديل تخصص |
| `DELETE` | `/api/admin/specializations/:id` | حذف تخصص |

---

## 10. Admin — Programs

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/admin/programs` | عرض كل البرامج (مراجعة) |
| `PATCH` | `/api/admin/programs/:id` | تعديل برنامج |
| `PATCH` | `/api/admin/programs/:id/hide` | إخفاء برنامج |
| `PATCH` | `/api/admin/programs/:id/show` | إظهار برنامج |
| `DELETE` | `/api/admin/programs/:id` | حذف برنامج |

---

## 11. Admin — Dashboard

```
GET /api/admin/dashboard
```

```json
{
  "success": true,
  "data": {
    "users_count": 120,
    "students_count": 80,
    "trainers_count": 10,
    "pending_trainers_count": 3,
    "employees_count": 5,
    "volunteers_count": 8,
    "pending_volunteers_count": 2,
    "programs_count": 25,
    "consultations_count": 40,
    "corporate_requests_count": 12,
    "pending_corporate_requests_count": 4,
    "certificates_count": 60,
    "tasks_count": 30
  }
}
```

---

## 12. Tasks System

### الحالة والأولوية

**Status:** `PENDING → IN_PROGRESS → SUBMITTED → APPROVED | REJECTED`

**Priority:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`

### 12.1 Create Task (Admin)

```
POST /api/tasks
Authorization: Admin / Super Admin
```

```json
{
  "title": "تصميم صفحة الهبوط",
  "description": "تنفيذ تصميم الصفحة الرئيسية",
  "priority": "HIGH",
  "deadline": "2026-09-20T23:59:59.000Z",
  "required_score": 80,
  "estimated_hours": 5,
  "assignees": [
    { "user_id": "employee-or-volunteer-uuid", "task_order": 1 },
    { "user_id": "another-uuid", "task_order": 2 }
  ]
}
```

**Side Effects:**
- 🔔 إشعار داخل النظام لكل منفّذ + ✉️ إيميل لكل منفّذ.
- ترتيب المهام (`task_order`) لكل منفّذ لوحده — المهمة التالية متظهرش غير بعد إتمام اللي قبلها.

### 12.2 List Tasks (Admin)

```
GET /api/tasks?status=SUBMITTED
```

### 12.3 Update / Delete Task (Admin)

```
PATCH /api/tasks/:id
DELETE /api/tasks/:id
```

### 12.4 Add / Remove Assignee (Admin)

```
POST /api/tasks/:id/assignees        { "user_id": "uuid", "task_order": 2 }
DELETE /api/tasks/:id/assignees/:userId
```

### 12.5 Review Submission (Admin)

```
PATCH /api/tasks/assignees/:id/review
```

```json
{ "action": "APPROVE", "score": 87, "note": "شغل ممتاز" }
```

| حالة | التفاصيل |
|------|----------|
| `APPROVE` | بيحط `APPROVED` + `score` + `hours_awarded` (من `estimated_hours`). لو المتطوع، بيزيد `volunteers.total_hours`. |
| `REJECT` | بيحط `REJECTED` + بيعمل `rejected_count +1` + بيسجل `review_note`. |

> لو في `required_score` والدرجة أقل منه → بيتحول تلقائيًا لرفض (مثال: أقل من 80 = مرفوض).

### 12.6 List Submissions (Admin)

```
GET /api/tasks/:id/submissions
```

### 12.7 My Tasks (Employee / Volunteer)

```
GET /api/tasks/my
```

**Response:**
```json
{
  "data": [
    {
      "id": "assignee-uuid",
      "assignee_id": "assignee-uuid",
      "task_id": "task-uuid",
      "task_order": 1,
      "status": "PENDING",
      "is_locked": false,
      "task": { "id": "task-uuid", "title": "...", "priority": "HIGH", "deadline": "...", "required_score": 80, "estimated_hours": 5 },
      "submission": null
    }
  ],
  "total": 1
}
```

> **مهم للفرونت:** استخدم `task_id` (الحقل المسطّح) لما تستدعي `/start` و `/submit` و `/comments`،
> واستخدم `assignee_id` لما تستدعي `/tasks/assignees/:id/review` (مراجعة الأدمن).
> الحقلين كمان موجودين جوه `task.id` و `id` — بس الحقول المسطّحة هي المرجع الأوضح.

### 12.8 Start Task

```
PATCH /api/tasks/:task_id/start
Authorization: Required (Employee / Volunteer)
```

> الـ `:task_id` هنا هو نفس `task_id` اللي جاي من `GET /api/tasks/my`.

### 12.9 Submit Task (files optional)

```
POST /api/tasks/:id/submit
Content-Type: multipart/form-data  (عشان ترفع ملفات)
```

| Field | Type | الوصف |
|-------|------|-------|
| `content` | text | نص التسليم |
| `link_url` | text | لينك — **لينك عادي** زي `https://example.com/...` |
| `files` | files | حتى 10 ملفات (PDF / ZIP / صور / ...) |

> **ملاحظة مهمة للفرونت:** `link_url` لازم يتبعت **لينك عادي** (URL خام)، مش بصيغة Markdown
> زي `[https://...](https://...)`. الباك اند بيعمل normalize تلقائيًا لو وصلت صيغة Markdown،
> بس الأفضل تبعت اللينك الخام مباشرة.
>
> مثال صحيح: `link_url = "https://localhost:4200/portal/volunteer/tasks"`

```javascript
const fd = new FormData();
fd.append('content', 'تم التنفيذ');
fd.append('link_url', 'https://example.com/result');   // لينك خام بدون [ ] أو ( )
fd.append('files', fileInput.files[0]);
fetch('/api/tasks/task-id/submit', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
```

**Side Effects:**
- ✉️ إيميل لأول أدمن + 🔔 إشعار لباقي الأدمنز.

### 12.10 Comments

```
GET  /api/tasks/:id/comments
POST /api/tasks/:id/comments        { "body": "ملاحظة" }
```

---

## 13. Employee Dashboard

```
GET /api/tasks/dashboard
Authorization: Employee
```

```json
{
  "total_tasks": 10,
  "current_tasks": 4,
  "completed_tasks": 5,
  "delayed_tasks": 1,
  "average_completion": 50
}
```

---

## 14. Volunteer Dashboard

```
GET /api/tasks/dashboard
Authorization: Volunteer
```

```json
{
  "total_tasks": 12,
  "current_tasks": 3,
  "completed_tasks": 8,
  "delayed_tasks": 1,
  "average_completion": 67,
  "total_hours": 42,
  "average_score": 88.5,
  "on_time_rate": 75,
  "certificates_count": 2,
  "last_tasks": [
    { "id": "uuid", "title": "...", "status": "APPROVED", "score": 92 }
  ]
}
```

### شهادة التطوع

الأدمن يصدر شهادة تطوع من:
```
POST /api/admin/certificates   { "user_id": "volunteer-user-uuid", "title": "شهادة تطوع", "training_hours": 100, "certificate_type": "VOLUNTEER" }
```
- شروط مقترحة: 100 ساعة → شهادة، 200 ساعة → شهادة أعلى (بتحددها الإدارة).
- ساعات التطوع بتتحدث تلقائيًا لما الأدمن يعتمد مهمة.

---

## 15. Enums Reference

### task_status
`PENDING` · `IN_PROGRESS` · `SUBMITTED` · `APPROVED` · `REJECTED`

### task_priority
`LOW` · `MEDIUM` · `HIGH` · `URGENT`

### volunteer_status
`PENDING` · `APPROVED` · `REJECTED`

### certificate_type
`TRAINING` · `VOLUNTEER` · `OTHER`

### user_role
`STUDENT` · `TRAINER` · `CLIENT` · `EMPLOYEE` · `ADMIN` · `SUPER_ADMIN` · `VOLUNTEER`
