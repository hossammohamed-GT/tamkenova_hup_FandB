# 🚨 Tamkeenova — دليل الأخطاء والمعالجة (Error Handling Reference)

> **الهدف:** مرجع شامل لكل الأخطاء اللي الـ API بيرجعها، عشان فريق الفرونت يعمل معالجة أخطاء احترافية بتوصل للمستخدم رسالة واضحة ومفيدة **من غير ما يعتمد على نص الرسالة اللي جاية من الباك اند**.
>
> **القاعدة:** لا تعتمد أبدًا على نص `message` القادم من السيرفر. اعتمد على الثنائي **(HTTP Status + المسار)** أو على **مفتاح خطأ ثابت (`error_key`)** هيتوافق عليه في النقطة (2).

---

## 📑 جدول المحتويات

1. [أشكال الاستجابة](#1-أشكال-الاستجابة-response-shapes)
2. [استراتيجية الربط (مهم جدًا)](#2-استراتيجية-الربط-مهم-جدًا)
3. [أخطاء عامة (Auth Guards + Validation Pipe)](#3-أخطاء-عامة)
4. [أخطاء المصادقة (Auth)](#4-أخطاء-المصادقة-auth)
5. [أخطاء الطالب (Students)](#5-أخطاء-الطالب-students)
6. [أخطاء المدرب (Trainers)](#6-أخطاء-المدرب-trainers)
7. [أخطاء الاستشارات (Consultations)](#7-أخطاء-الاستشارات-consultations)
8. [أخطاء طلبات الشركات (Corporate / B2B)](#8-أخطاء-طلبات-الشركات-corporate--b2b)
9. [أخطاء الأدمن (Admin)](#9-أخطاء-الأدمن-admin)
10. [أخطاء المهام (Tasks)](#10-أخطاء-المهام-tasks)
11. [أخطاء متفرقة (تخصصات / إشعارات / تحقق)](#11-أخطاء-متفرقة)
12. [قواعد الـ Validation لكل DTO](#12-قواعد-الـ-validation-لكل-dto)
13. [جدول الحالات الموحّد](#13-جدول-الحالات-الموحّد)

---

## 1. أشكال الاستجابة (Response Shapes)

### 1.1 نجاح
```json
{
  "success": true,
  "data": { "...": "..." }
}
```
> مش كل الـ endpoints بيرجعوا `success` — بعضهم بيرجع `{ data, total }` أو `{ message, ... }` مباشرة. اعتمد على **status code 2xx** كدليل نجاح.

### 1.2 خطأ HTTP (استثناء مرفوع يدويًا)
NestJS بيرجع الاستثناءات اليدوية بالشكل ده:
```json
{
  "statusCode": 400,
  "message": "Email already exists",
  "error": "Bad Request"
}
```
| الحقل | الوصف |
|-------|-------|
| `statusCode` | كود الحالة الرقمي — **هو المرجع الأساسي** |
| `message` | رسالة إنجليزية (نصية أو مصفوفة في أخطاء الـ validation) — **لا تعتمد عليها للعرض** |
| `error` | اسم الحالة (`Bad Request`, `Not Found`, `Forbidden`, ...) |

### 1.3 خطأ تحقق (Validation Error)
لما الـ DTO يبوظ (حقل ناقص/نوع غلط/قيمة خارج الحدود):
```json
{
  "statusCode": 400,
  "message": [
    "full_name must be a string",
    "email must be an email",
    "title must be shorter than or equal to 255 characters"
  ],
  "error": "Bad Request"
}
```
> `message` هنا **مصفوفة** وليست نص. الرسائل بتتبع صيغة `field + constraint` وده اللي تعرضه تحت الحقل المعني.

### 1.4 خطأ غير متوقع (500)
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```
> اعرض رسالة عامة ("حصلت مشكلة غير متوقعة، جرّب تاني بعد شوية") مع زر إعادة المحاولة.

---

## 2. استراتيجية الربط (مهم جدًا)

### المشكلة
- نص `message` الحالي **إنجليزي** وممكن يتغير أو يترجم لاحقًا.
- بعض الرسائل **ديناميكية** (بيتغير جزء منها حسب الحالة)، فمقارنة النص حرفيًا هتكسر.

### الحل المقترح (3 مستويات)

**المستوى 1 — دلوقتي (من غير أي تعديل باك اند):**
ابني `Map` في الفرونت مفتاحه `(statusCode, endpointPattern, message)` وترجم منه لرسالة عربية.

**المستوى 2 — الموصى به (تعديل بسيط مستقبلاً):**
نضيف للباك اند حقل `error_code` ثابت لكل خطأ (زي `AUTH_EMAIL_EXISTS`)، فيبقى شكل الاستجابة:
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict",
  "error_code": "AUTH_EMAIL_EXISTS"
}
```
والفرونت يترجم `error_code` → رسالة عربية ثابتة. **ده أكتر حل مستقر.**

**المستوى 3 — أعمق تفصيل:**
`error_code` + `field` (لو الخطأ مرتبط بحقل معين) + `details` عشان تعرف تحط الرسالة تحت الـ input الصح.

### مثال Mapping في الفرونت (pseudo-code)
```ts
const ERROR_MESSAGES = {
  AUTH_EMAIL_EXISTS: {
    title: 'البريد مسجّل بالفعل',
    message: 'فيه حساب تاني بنفس البريد ده. جرّب تسجيل الدخول أو استخدم بريد مختلف.',
    field: 'email',
  },
  AUTH_INVALID_OTP: {
    title: 'كود التحقق غلط',
    message: 'الكود اللي كتبته مش صحيح. اتأكد منه وجرّب تاني.',
    field: 'otp',
  },
  // ...
};

function resolveError(status: number, code?: string, fallbackMessage?: string) {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  // fallback حسب الـ status
  if (status === 401) return { title: 'انتهت الجلسة', message: 'سجّل دخولك تاني.' };
  if (status === 403) return { title: 'مش مسموح', message: 'مش عندك صلاحية للعملية دي.' };
  if (status === 404) return { title: 'مش موجود', message: 'العنصر المطلوب مش متاح.' };
  if (status === 409) return { title: 'تعارض', message: 'العملية دي متعارضة مع بيانات موجودة.' };
  if (status >= 500) return { title: 'مشكلة في السيرفر', message: 'حصلت مشكلة، جرّب تاني بعد شوية.' };
  return { title: 'خطأ', message: fallbackMessage || 'حصل خطأ غير متوقع.' };
}
```

> كل جداول الأخطاء الجاية فيها عمود `error_key` المقترح — استخدمه كاسم ثابت في الفرونت من دلوقتي (حتى لو الباك لسه مش بيرجعه، هيفضل مرجعك عند تطبيق المستوى 2).

---

## 3. أخطاء عامة

### 3.1 حماية الـ JWT (`JwtAuthGuard`)
| error_key | HTTP | الرسالة الفعلية | متى بتحصل | رسالة المستخدم المقترحة |
|-----------|------|-----------------|-----------|--------------------------|
| `AUTH_NO_TOKEN` | 401 | `Authorization header missing` | مفيش `Authorization` header أصلًا | "سجّل دخولك عشان تقدر تعمل العملية دي." |
| `AUTH_BAD_TOKEN_FORMAT` | 401 | `Invalid token format` | الـ header مش `Bearer <token>` | "الجلسة مش سليمة، سجّل دخولك تاني." |
| `AUTH_TOKEN_EXPIRED` | 401 | `Invalid or expired token` | التوكن منتهي أو مش صحيح | "انتهت الجلسة بتاعتك، سجّل دخولك تاني." |

### 3.2 حماية الأدوار (`RolesGuard`)
| error_key | HTTP | الرسالة الفعلية | متى بتحصل | رسالة المستخدم المقترحة |
|-----------|------|-----------------|-----------|--------------------------|
| `AUTH_FORBIDDEN` | 403 | `Access denied` | المستخدم مش موجود في الطلب | "مش مسموح لك بالوصول هنا." |
| `AUTH_ROLE_FORBIDDEN` | 403 | `You do not have permission to perform this action` | المستخدم مش أدمن/مش دوره | "الدور بتاعك مش مخوّل بالعملية دي." |

### 3.3 الـ Validation Pipe
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `VALIDATION_ERROR` | 400 | مصفوفة رسائل | حقل ناقص / نوع غلط / قيمة خارج الحدود / حقل مش معروف (forbidden) |

> الـ Pipe مفعّل بـ `whitelist: true` و `forbidNonWhitelisted: true` — يعني أي حقل **مش معروف** في الـ DTO بيترفض برسالة `property X should not exist`.

---

## 4. أخطاء المصادقة (Auth)

| error_key | HTTP | الرسالة الفعلية | المسار | متى بتحصل |
|-----------|------|-----------------|--------|-----------|
| `AUTH_EMAIL_EXISTS` | 400 | `Email already exists` | `POST /auth/register` + `POST /auth/register/volunteer` | الإيميل مستخدم قبل كده |
| `AUTH_USERNAME_EXISTS` | 400 | `Username already exists` | نفسهم | اسم المستخدم محجوز |
| `AUTH_PHONE_EXISTS` | 400 | `Phone number already exists` | نفسهم | رقم الهاتف مسجل قبل كده |
| `AUTH_SPECIALIZATION_NOT_FOUND` | 400 | `Specialization not found` | `POST /auth/register` (للمدرب) | `specialization_id` غير موجود |
| `AUTH_INVALID_OTP` | 400 | `Invalid OTP` | `POST /auth/verify-email` | كود التحقق غلط |
| `AUTH_OTP_EXPIRED` | 400 | `OTP expired` | `POST /auth/verify-email` | الكود عدّى 10 دقايق |
| `AUTH_USER_NOT_FOUND` | 400 | `User not found` | `POST /auth/resend-otp` | الإيميل مش مسجل |
| `AUTH_EMAIL_VERIFIED` | 400 | `Email already verified` | `POST /auth/resend-otp` | الإيميل متأكد منه أصلًا |
| `AUTH_INVALID_CREDENTIALS` | 400 | `Invalid email or password` | `POST /auth/login` | إيميل/باسورد غلط **أو** المستخدم مش موجود (نفس الرسالة للاتنين) |
| `AUTH_EMAIL_NOT_VERIFIED` | 400 | `Email not verified` | `POST /auth/login` | الحساب متسجل بس الإيميل لسه متأكدش |
| `AUTH_ACCOUNT_DISABLED` | 400 | `Account disabled` | `POST /auth/login` | الأدمن عطّل الحساب |

> **ملاحظة للأمان:** `AUTH_INVALID_CREDENTIALS` موحّد عمدًا عشان ما يبينش للهاكرز إذا كان الإيميل موجود ولا لأ. لا تحاول تفصل بينهم من الفرونت.

---

## 5. أخطاء الطالب (Students)

### البروفايل والحساب
| error_key | HTTP | الرسالة الفعلية | المسار | متى بتحصل |
|-----------|------|-----------------|--------|-----------|
| `STUDENT_NOT_FOUND` | 400 | `User not found` | `GET/PATCH /students/profile` | الحساب مش موجود |
| `STUDENT_USERNAME_TAKEN` | 409 | `Username is already taken` | `PATCH /students/profile` | اسم المستخدم محجوز |
| `STUDENT_NO_FILE` | 400 | `No file provided` | `PATCH /students/avatar` | مفيش ملف مبعوت |
| `STUDENT_INVALID_IMAGE` | 400 | `Only JPG, PNG, and WEBP images are allowed` | `PATCH /students/avatar` | نوع الملف مش صورة |
| `STUDENT_IMAGE_TOO_LARGE` | 400 | `File size must not exceed 5MB` | `PATCH /students/avatar` | حجم الصورة أكبر من 5MB |
| `STUDENT_WRONG_PASSWORD` | 401 | `Current password is incorrect` | `PATCH /students/change-password` | الباسورد الحالي غلط |
| `STUDENT_SAME_PASSWORD` | 400 | `New password must be different from current password` | `PATCH /students/change-password` | الجديد = الحالي |
| `STUDENT_EMAIL_TAKEN` | 409 | `Email is already in use` | `PATCH /students/contact-info` | الإيميل مستخدم |
| `STUDENT_PHONE_TAKEN` | 409 | `Phone number is already in use` | `PATCH /students/contact-info` | الهاتف مستخدم |

### التسجيل في البرامج
| error_key | HTTP | الرسالة الفعلية | المسار | متى بتحصل |
|-----------|------|-----------------|--------|-----------|
| `PROGRAM_NOT_FOUND` | 404 | `Program not found` | `POST /students/enrollments` | البرنامج مش موجود |
| `PROGRAM_INACTIVE` | 400 | `This program is not currently available` | `POST /students/enrollments` | البرنامج مخفي/مش متاح |
| `ENROLL_ALREADY` | 409 | `You are already enrolled in this program` | `POST /students/enrollments` | مسجل فيه أصلًا (ACTIVE) |
| `ENROLL_NOT_FOUND` | 404 | `Enrollment not found` | `GET /students/enrollments/:id` + `PATCH .../cancel` | التسجيل مش موجود |
| `ENROLL_BAD_STATUS` | 400 | `Cannot cancel enrollment with status "..."` | `PATCH /students/enrollments/:id/cancel` | بتحاول تلغي تسجيل مش ACTIVE (ديناميكية) |

### الشهادات
| error_key | HTTP | الرسالة الفعلية | المسار | متى بتحصل |
|-----------|------|-----------------|--------|-----------|
| `CERTIFICATE_NOT_FOUND` | 404 | `Certificate not found` | `GET /students/certificates/verify/:code` | كود الشهادة غلط |

### الريفيوهات
| error_key | HTTP | الرسالة الفعلية | المسار | متى بتحصل |
|-----------|------|-----------------|--------|-----------|
| `REVIEW_NOT_FOUND` | 404 | `Review not found` | `PATCH/DELETE /students/reviews/:id` | الريفيو مش موجود |
| `REVIEW_EMPTY` | 400 | `At least one field (rating or comment) must be provided` | `PATCH /students/reviews/:id` | مبعتش لا تقييم ولا تعليق |

### البروفايل العام
| error_key | HTTP | الرسالة الفعلية | المسار | متى بتحصل |
|-----------|------|-----------------|--------|-----------|
| `PUBLIC_USER_NOT_FOUND` | 404 | `User not found` | `GET /students/u/:username` | اسم المستخدم مش موجود |

---

## 6. أخطاء المدرب (Trainers)

| error_key | HTTP | الرسالة الفعلية | المسار | متى بتحصل |
|-----------|------|-----------------|--------|-----------|
| `TRAINER_NOT_FOUND` | 400 | `Trainer not found` | كل مسارات `trainers` | مفيش بروفايل مدرب للمستخدم ده (أو لسه PENDING) |
| `TRAINER_UNAUTHORIZED` | 400 | `Unauthorized` | برامج / أوقات / حجوزات | بيحاول يعدّل/يحذف حاجة مش بتاعته |
| `TRAINER_PROGRAM_NOT_FOUND` | 400 | `Program not found` | `PUT/DELETE /trainers/programs/:id` | البرنامج مش موجود |
| `TRAINER_AVAILABILITY_NOT_FOUND` | 400 | `Availability not found` | أوقات التوفر | الموعد مش موجود |
| `TRAINER_BOOKING_NOT_FOUND` | 400 | `Booking not found` | الحجوزات | الحجز مش موجود |

> **لاحظ:** موديول المدربين بيستخدم `400` كتير في حالات المفروض تكون `404` أو `403`. الفرونت يعاملها كخطأ حقيقي عادي — المهم يعرض رسالة واضحة مش يعرض النص الإنجليزي.

---

## 7. أخطاء الاستشارات (Consultations)

| error_key | HTTP | الرسالة الفعلية | المسار | متى بتحصل |
|-----------|------|-----------------|--------|-----------|
| `CONSULT_NOT_FOUND` | 404 | `Consultation not found` | كل مسارات الاستشارة | الاستشارة مش موجودة |
| `CONSULT_NOT_YOURS` | 403 | `This consultation does not belong to you` | تفاصيل/إلغاء/مراجعة | مش صاحبها |
| `CONSULT_NO_ACCESS` | 403 | `You do not have access to this consultation` | `GET /consultations/:id` | لا طالب ولا مدرب ولا أدمن |
| `CONSULT_BAD_STATUS` | 400 | `Cannot cancel consultation with status "..."` | `PATCH /consultations/:id/cancel` | مش PENDING (ديناميكية) |
| `CONSULT_REVIEW_NOT_COMPLETED` | 400 | `You can only review completed consultations` | `POST /consultations/:id/review` | الاستشارة مش COMPLETED |
| `CONSULT_ALREADY_REVIEWED` | 409 | `You have already reviewed this consultation` | `POST /consultations/:id/review` | قيّم قبل كده |
| `CONSULT_INVALID_TRANSITION` | 400 | `Cannot {action} consultation with status "..."` | `PATCH /consultations/:id/status` | انتقال حالة مش مسموح (ديناميكية) |

**انتقالات الحالة المسموحة (للمدرب):**
```
PENDING   → APPROVE → APPROVED  |  REJECT → REJECTED
APPROVED  → SCHEDULE → SCHEDULED |  CANCEL → CANCELLED
SCHEDULED → COMPLETE → COMPLETED |  CANCEL → CANCELLED
```

---

## 8. أخطاء طلبات الشركات (Corporate / B2B)

| error_key | HTTP | الرسالة الفعلية | المسار | متى بتحصل |
|-----------|------|-----------------|--------|-----------|
| `CORPORATE_NOT_FOUND` | 404 | `Corporate request not found` | تفاصيل/مرفقات | الطلب مش موجود |
| `CORPORATE_NOT_YOURS` | 403 | `This request does not belong to you` | مرفقات/تفاصيل | مش صاحب الطلب |
| `CORPORATE_NO_FILE` | 400 | `No file provided` | `POST /corporate-requests/:id/attachments` | مفيش ملف |
| `CORPORATE_INVALID_FILE` | 400 | `Only PDF, DOC, DOCX, JPG, PNG, WEBP files are allowed` | المرفقات | نوع ملف مرفوض |
| `CORPORATE_FILE_TOO_LARGE` | 400 | `File size must not exceed 10MB` | المرفقات | حجم الملف أكبر من 10MB |

---

## 9. أخطاء الأدمن (Admin)

### المستخدمين
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `ADMIN_USER_NOT_FOUND` | 404 | `User not found` | أي عملية على مستخدم غير موجود |

### المدربين
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `ADMIN_TRAINER_NOT_FOUND` | 404 | `Trainer not found` | أي عملية على مدرب غير موجود |

### المتطوعين
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `ADMIN_VOLUNTEER_NOT_FOUND` | 404 | `Volunteer not found` | أي عملية على متطوع غير موجود |

### الشهادات
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `ADMIN_CERT_NOT_FOUND` | 404 | `Certificate not found` | تعديل/رفع/إلغاء/حذف شهادة غير موجودة |
| `ADMIN_CERT_NO_FILE` | 400 | `No file provided` | رفع PDF من غير ملف |
| `ADMIN_CERT_BAD_TYPE` | 400 | `Only PDF files are allowed` | الملف مش PDF |
| `ADMIN_CERT_TOO_LARGE` | 400 | `File size must not exceed 10MB` | حجم الملف كبير |

### طلبات الشركات
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `ADMIN_CORPORATE_NOT_FOUND` | 404 | `Corporate request not found` | تفاصيل/تحديث طلب غير موجود |
| `ADMIN_CORPORATE_NEED_ASSIGNEE` | 400 | `assigned_to (employee id) is required when action is ASSIGNED` | تحويل لموظف من غير `assigned_to` |

### التخصصات
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `ADMIN_SPEC_REQUEST_NOT_FOUND` | 404 | `Specialization request not found` | قبول/رفض طلب تخصص غير موجود |
| `ADMIN_SPEC_EXISTS` | 400 | `Specialization already exists` | إضافة/قبول تخصص باسم موجود |
| `ADMIN_SPEC_NOT_FOUND` | 404 | `Specialization not found` | تعديل/حذف تخصص غير موجود |

### البرامج
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `ADMIN_PROGRAM_NOT_FOUND` | 404 | `Program not found` | تعديل/إخفاء/حذف برنامج غير موجود |

---

## 10. أخطاء المهام (Tasks)

### إنشاء المهمة
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `TASK_NO_ASSIGNEES` | 400 | `At least one assignee is required` | إنشاء مهمة من غير منفذين |
| `TASK_ASSIGNEE_NOT_FOUND` | 404 | `Assignee user not found: {id}` | `user_id` غير موجود (ديناميكية) |
| `TASK_ASSIGNEE_BAD_ROLE` | 400 | `User {name} is not an employee or volunteer` | المستخدم مش موظف/متطوع (ديناميكية) |

### إدارة المهمة
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `TASK_NOT_FOUND` | 404 | `Task not found` | أي عملية على مهمة غير موجودة |
| `TASK_USER_NOT_FOUND` | 404 | `User not found` | إضافة منفذ غير موجود |
| `TASK_ALREADY_ASSIGNED` | 400 | `User is already assigned to this task` | إضافة منفذ موجود أصلًا |

### المراجعة
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `TASK_ASSIGNMENT_NOT_FOUND` | 404 | `Assignment not found` | مراجعة/بدء/تسليم إسناد غير موجود |
| `TASK_NO_SUBMISSION` | 400 | `This task has no submission to review` | مراجعة مهمة لسه متسلّمتش |

### التنفيذ (للموظف/المتطوع)
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `TASK_LOCKED` | 400 | `You must complete the previous task first` | المهمة السابقة في الترتيب لسه متخلصتش |
| `TASK_ALREADY_STARTED` | 400 | `Task has already been started` | بدء مهمة مش PENDING |
| `TASK_ALREADY_APPROVED` | 400 | `Task already approved` | تسليم مهمة اتقبلت خلاص |
| `TASK_EMPTY_SUBMISSION` | 400 | `You must provide content, a link, or at least one file` | تسليم من غير محتوى ولا لينك ولا ملف |
| `TASK_SUBMISSION_FAILED` | 400 | `Failed to save task submission` | مشكلة داخلية في حفظ التسليم |

### الوصول
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `TASK_NOT_ASSIGNED` | 403 | `You are not assigned to this task` | بيحاول يشوف/يعلّق على مهمة مش بتاعته |

---

## 11. أخطاء متفرقة

### التخصصات (`specializations`)
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `SPEC_NOT_FOUND` | 404 | `Specialization not found` | `GET /specializations/:id` |
| `SPEC_EXISTS` | 400 | `Specialization already exists` | `POST /specializations/request` |

### الإشعارات (`notifications`)
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `NOTIFICATION_NOT_FOUND` | 404 | `Notification not found` | `PATCH /notifications/:id/read` |

### التحقق (`verification`)
| error_key | HTTP | الرسالة الفعلية | متى بتحصل |
|-----------|------|-----------------|-----------|
| `VERIFY_CERT_NOT_FOUND` | 404 | `Certificate not found` | `GET /verify/certificate/:code` |
| `VERIFY_USER_NOT_FOUND` | 404 | `User not found or not verified` | `GET /verify/user/:username` |

---

## 12. قواعد الـ Validation لكل DTO

> كل القواعد دي بترجع `400` بصيغة `{ "statusCode": 400, "message": [ "..." ], "error": "Bad Request" }`.

### `POST /auth/register` — RegisterDto
| الحقل | القاعدة |
|-------|---------|
| `full_name` | string — إجباري |
| `username` | string — إجباري |
| `email` | إيميل صحيح — إجباري |
| `phone` | string — إجباري |
| `password` | `@MinLength(6)` |
| `role` | enum من `['STUDENT', 'TRAINER']` |
| `specialization_id` | اختياري string |
| `linkedin_url` / `facebook_url` / `website_url` / `portfolio_url` | اختياري + `@IsUrl()` |
| `certificate_urls` | اختياري array |
| `documents[].file_url` | `@IsUrl()` |

### `POST /auth/register/volunteer` — RegisterVolunteerDto
| الحقل | القاعدة |
|-------|---------|
| `full_name`, `username`, `email`, `phone` | إجباريين (نفس فوق) |
| `password` | `@MinLength(6)` |
| `bio` | اختياري — `@MaxLength(500)` |

### `POST /auth/login` — LoginDto
| الحقل | القاعدة |
|-------|---------|
| `email` | إيميل صحيح |
| `password` | `@MinLength(6)` |

### `POST /auth/verify-email` — VerifyEmailDto
| الحقل | القاعدة |
|-------|---------|
| `email` | إيميل صحيح |
| `otp` | `@Length(6, 6)` — 6 أرقام بالظبط |

### `POST /trainers/programs` — CreateProgramDto
| الحقل | القاعدة |
|-------|---------|
| `title`, `short_description`, `description` | string إجباري |
| `price` | number إجباري |
| `image_url` | اختياري + `@IsUrl()` |
| `discount_price`, `duration_hours` | اختياري number |

### `POST /trainers/availability` — CreateAvailabilityDto
| الحقل | القاعدة |
|-------|---------|
| `day_of_week` | int + `@Min(0)` + `@Max(6)` |
| `start_time`, `end_time` | string إجباري |

### `POST /trainers/:id/reviews` — CreateReviewDto
| الحقل | القاعدة |
|-------|---------|
| `rating` | int + `@Min(1)` + `@Max(5)` |
| `comment` | اختياري string |

### `POST /consultations` — CreateConsultationDto
| الحقل | القاعدة |
|-------|---------|
| `trainer_id` | `@IsUUID()` |
| `title` | string + `@MaxLength(255)` |
| `description` | string |
| `preferred_date` | اختياري + `@IsDateString()` (YYYY-MM-DD) |
| `contact_phone` | اختياري + `@MaxLength(30)` |

### `PATCH /consultations/:id/status` — UpdateConsultationStatusDto
| الحقل | القاعدة |
|-------|---------|
| `action` | `@IsEnum` من `['APPROVE','REJECT','SCHEDULE','COMPLETE','CANCEL']` |
| `scheduled_at` | اختياري + `@IsDateString()` — مطلوب منطقيًا لو `action=SCHEDULE` |

### `POST /consultations/:id/review` — CreateConsultationReviewDto
| الحقل | القاعدة |
|-------|---------|
| `rating` | int + `@Min(1)` + `@Max(5)` |

### `POST /corporate-requests` — CreateCorporateRequestDto
| الحقل | القاعدة |
|-------|---------|
| `contact_name`, `company_name`, `service_type`, `service_description` | string إجباري |
| `contact_email` | إيميل صحيح + `@MaxLength(255)` |
| `employees_count` | اختياري int + `@Min(1)` |
| باقي الحقول | اختياري + MaxLength حسب الجدول |

### `POST /admin/certificates` — IssueCertificateDto
| الحقل | القاعدة |
|-------|---------|
| `user_id` | `@IsUUID()` |
| `title` | string + `@MaxLength(255)` |
| `training_hours` | اختياري int + `@Min(0)` |
| `certificate_type` | اختياري enum من `['TRAINING','VOLUNTEER','OTHER']` |
| `trainer_id` / `program_id` | اختياري `@IsUUID()` |

### `POST /tasks` — CreateTaskDto
| الحقل | القاعدة |
|-------|---------|
| `title` | string + `@MaxLength(255)` |
| `description` | string |
| `priority` | اختياري enum من `['LOW','MEDIUM','HIGH','URGENT']` |
| `deadline` | اختياري + `@IsDateString()` |
| `required_score` | اختياري + `@IsIn([60, 70, 80, 90])` |
| `estimated_hours` | اختياري int + `@Min(1)` |
| `assignees[]` | array إجبارية — كل عنصر: `user_id` = `@IsUUID()` + `task_order` اختياري `@Min(1)` |

### `PATCH /tasks/assignees/:id/review` — ReviewSubmissionDto
| الحقل | القاعدة |
|-------|---------|
| `action` | enum من `['APPROVE','REJECT']` |
| `score` | اختياري int + `@Min(0)` + `@Max(100)` |
| `note` | اختياري string |

### قواعد عامة بتتكرر
| الحقل | الرسالة الافتراضية (class-validator) |
|-------|--------------------------------------|
| string مفقود | `X must be a string` |
| إيميل غلط | `X must be an email` |
| طول زايد | `X must be shorter than or equal to N characters` |
| رقم أصغر من الحد | `X must not be less than N` |
| رقم أكبر من الحد | `X must not be greater than N` |
| UUID غلط | `X must be a UUID` |
| قيمة مش في enum | `X must be one of the following values: A, B, C` |
| حقل مش معروف | `property X should not exist` |

---

## 13. جدول الحالات الموحّد

| الحالة | المعنى | التعامل المقترح في الفرونت |
|--------|--------|----------------------------|
| `400` | طلب غير صحيح (بيانات/حالة) | اعرض رسالة الخطأ تحت الحقل المعني أو Toast توضيحي |
| `401` | مش متسجّل / الجلسة انتهت | وجّهه لصفحة تسجيل الدخول |
| `403` | مش مخوّل | اعرض "مش عندك صلاحية" من غير توجيه لتسجيل الدخول |
| `404` | العنصر مش موجود | اعرض "مش موجود" أو ارجع للقائمة |
| `409` | تعارض بيانات | اعرض رسالة التعارض (مكرر/موجود أصلًا) |
| `500` | خطأ سيرفر غير متوقع | رسالة عامة + زر إعادة المحاولة |

---

## ملاحظات ختامية للفرونت

1. **لا تعرض `message` الإنجليزي** للمستخدم أبدًا — ده للـ debugging بس (الكونسول/اللوجات).
2. اعتمد على **`statusCode` + `error_key`** المقترح في الجداول.
3. أخطاء الـ validation `message` فيها **مصفوفة** — اعرض كل عنصر تحت الحقل المناسب (الحقل هو أول كلمة في الرسالة).
4. الرسائل الديناميكية (اللي فيها `"..."`) قارن عليها بـ `startsWith` أو الأفضل `error_key` لما يتضاف.
5. لو عايزين نبدأ نرجع `error_code` من الباك اند فعليًا (المستوى 2)، ده تعديل بسيط نقدر نعمله في الـ GlobalExceptionFilter — قول وهعمله.
