Trainer Module Documentation - Tamkeenova
Overview

نظام المدربين فى Tamkeenova مبنى على فكرة أن أى مستخدم يمكنه التقديم كمدرب أثناء التسجيل.

عند تسجيل مدرب جديد:

يتم إنشاء حساب المستخدم.
يتم إنشاء Trainer Profile بحالة PENDING.
يتم حفظ التخصص المختار.
يتم حفظ الشهادات والمستندات.
يتم إرسال إشعار للأدمن.
يتم إرسال OTP للتحقق من البريد.

بعد ذلك يستطيع المدرب:

متابعة حالة الطلب.
تعديل بياناته.
إدارة البرامج التدريبية.
إدارة أوقات التوفر.
الاطلاع على الإحصائيات.
استقبال التقييمات.
Authentication
Register Trainer
Endpoint
POST /api/auth/register
Description

إنشاء حساب جديد كمدرب أو طالب.

Request Body
{
  "full_name": "Ahmed Mohamed",
  "username": "ahmed-trainer",
  "email": "ahmed@test.com",
  "phone": "01012345678",
  "password": "123456",
  "role": "TRAINER",

  "specialization_id": "uuid",

  "bio_ar": "مدرب واجهات",
  "bio_en": "UI Trainer",

  "description_ar": "خبرة فى التصميم",
  "description_en": "Experienced Trainer",

  "cover_letter": "أرغب بالانضمام كمدرب",

  "linkedin_url": "https://linkedin.com/in/test",
  "facebook_url": "https://facebook.com/test",
  "website_url": "https://test.com",
  "portfolio_url": "https://behance.net/test",

  "consultation_price_from": 300,
  "consultation_price_to": 600,
  "consultation_duration": 60,

  "certificate_urls": [
    "https://drive.google.com/certificate1",
    "https://drive.google.com/certificate2"
  ],

  "documents": [
    {
      "file_name": "CV",
      "file_url": "https://drive.google.com/cv",
      "file_type": "CV"
    }
  ]
}
Response
{
  "success": true,
  "message": "Trainer request submitted successfully. Verify your email.",
  "user_id": "uuid"
}
Verify Email
Endpoint
POST /api/auth/verify-email
Body
{
  "email": "ahmed@test.com",
  "otp": "123456"
}
Login
Endpoint
POST /api/auth/login
Body
{
  "email": "ahmed@test.com",
  "password": "123456"
}
Response
{
  "success": true,
  "data": {
    "access_token": "JWT_TOKEN",
    "user": {}
  }
}
Trainer Profile
Get My Profile
Endpoint
GET /api/trainers/me
Headers
Authorization: Bearer TOKEN
Returns

يرجع جميع بيانات المدرب:

بيانات الحساب
التخصص
الشهادات
المستندات
روابط التواصل
حالة الطلب

{
    "id": "613f18f8-b2ee-40ef-9050-c90eee94e964",
    "user_id": "27e2607d-e88c-4007-b723-87781fae7c2d",
    "slug": "ahmed-trainer-24318",
    "bio_ar": "مدرب Angular متقدم",
    "bio_en": "Senior Angular Trainer",
    "description_ar": "خبرة 10 سنوات",
    "description_en": "10 years experience",
    "years_of_experience": 0,
    "consultation_price": "0",
    "discount_percentage": "0",
    "average_rating": "5",
    "ratings_count": 1,
    "is_available": true,
    "created_at": "2026-09-06T07:16:50.781Z",
    "updated_at": "2026-09-06T07:16:50.781Z",
    "trainer_status": "APPROVED",
    "rejection_reason": null,
    "approved_at": null,
    "approved_by": null,
    "specialization_id": "d004c09e-7d61-4bc1-9edf-624c0c666848",
    "linkedin_url": "https://linkedin.com/in/test",
    "website_url": "https://ahmed.com",
    "facebook_url": "https://facebook.com/ahmed",
    "portfolio_url": "https://behance.net/ahmed",
    "cover_letter": "أرغب في الانضمام كمدرب في منصة تمكينوفا",
    "consultation_price_from": "500",
    "consultation_price_to": "1000",
    "consultation_duration": 90,
    "is_featured": false,
    "total_students": 0,
    "users": {
        "id": "27e2607d-e88c-4007-b723-87781fae7c2d",
        "full_name": "Ahmed Mohamed",
        "username": "ahmed-trainer",
        "email": "ahmed.trainer@test.com",
        "phone": "01012345678",
        "role": "TRAINER",
        "profile_image": null,
        "email_verified": true,
        "is_active": true,
        "created_at": "2026-09-06T07:16:50.015Z"
    },
    "specializations": {
        "id": "d004c09e-7d61-4bc1-9edf-624c0c666848",
        "name_ar": "تصميم واجهات المستخدم",
        "name_en": "UI UX Design",
        "created_at": "2026-09-06T07:16:50.410Z"
    },
    "trainer_certificates": [
        {
            "id": "b7bcbeb3-2f36-4c04-bce3-97ab2c9b2a22",
            "trainer_id": "613f18f8-b2ee-40ef-9050-c90eee94e964",
            "title": null,
            "certificate_url": "https://drive.google.com/file/d/new-cert-1/view",
            "created_at": "2026-09-06T14:32:30.837Z"
        },
        {
            "id": "491324f5-6578-4e7b-bec6-1881ec7e3f54",
            "trainer_id": "613f18f8-b2ee-40ef-9050-c90eee94e964",
            "title": null,
            "certificate_url": "https://drive.google.com/file/d/new-cert-2/view",
            "created_at": "2026-09-06T14:32:30.837Z"
        }
    ],
    "trainer_documents": [
        {
            "id": "2953a5ed-df9e-4ae1-a708-73d342e32946",
            "trainer_id": "613f18f8-b2ee-40ef-9050-c90eee94e964",
            "file_name": "New CV",
            "file_url": "https://drive.google.com/file/d/cv/view",
            "file_type": "CV",
            "created_at": "2026-09-06T14:32:32.035Z"
        }
    ]
}


Update My Profile
Endpoint
PATCH /api/trainers/me
Headers
Authorization: Bearer TOKEN
Body Example
{
  "bio_ar": "مدرب واجهات محترف",

  "description_ar": "خبرة 5 سنوات",

  "linkedin_url": "https://linkedin.com/in/test",

  "consultation_price_from": 500,

  "consultation_price_to": 1000,

  "consultation_duration": 60,

  "certificate_urls": [
    "https://drive.google.com/certificate"
  ],

  "documents": [
    {
      "file_name": "CV",
      "file_url": "https://drive.google.com/cv",
      "file_type": "CV"
    }
  ]
}
Response
{
  "success": true,
  "message": "Profile updated successfully"
}
Application Status
Get Application Status
Endpoint
GET /api/trainers/application-status
Headers
Authorization: Bearer TOKEN
Response
{
  "success": true,
  "data": {
    "status": "PENDING",
    "rejection_reason": null,
    "approved_at": null
  }
}

Possible Status Values

PENDING
APPROVED
REJECTED
Training Programs
Create Program
Endpoint
POST /api/trainers/programs
Headers
Authorization: Bearer TOKEN
Body
{
  "title": "Angular Masterclass",

  "image_url": "https://example.com/image.png",

  "short_description": "Angular Course",

  "description": "Complete Angular Course",

  "price": 1000,

  "discount_price": 800,

  "duration_hours": 40,

  "level": "INTERMEDIATE"
}
Response
{
  "success": true,
  "message": "Program created successfully"
}
Get My Programs
Endpoint
GET /api/trainers/programs
Headers
Authorization: Bearer TOKEN
Returns
[
  {
    "id": "uuid",
    "title": "Angular Masterclass",
    "price": 1000
  }
]
Update Program
Endpoint
PUT /api/trainers/programs/:id
Headers
Authorization: Bearer TOKEN
Body

نفس بيانات إنشاء البرنامج.

Delete Program
Endpoint
DELETE /api/trainers/programs/:id
Headers
Authorization: Bearer TOKEN
Availability
Create Availability
Endpoint
POST /api/trainers/availability
Body
{
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "12:00:00"
}
Days Mapping
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
Get Availability
Endpoint
GET /api/trainers/availability
Update Availability
Endpoint
PATCH /api/trainers/availability/:id
Body
{
  "day_of_week": 2,
  "start_time": "10:00:00",
  "end_time": "13:00:00"
}
Delete Availability
Endpoint
DELETE /api/trainers/availability/:id
Reviews
Create Review
Endpoint
POST /api/trainers/:trainerId/reviews
Headers
Authorization: Bearer TOKEN
Body
{
  "rating": 5,
  "comment": "مدرب ممتاز"
}
Notes
التقييم من 1 إلى 5.
المستخدم يستطيع تقييم المدرب مرة واحدة فقط.
Get Trainer Reviews
Endpoint
GET /api/trainers/:trainerId/reviews
Response
[
  {
    "rating": 5,
    "comment": "مدرب ممتاز",
    "created_at": "2026-09-06"
  }
]
Dashboard Statistics
Get Dashboard Stats
Endpoint
GET /api/trainers/dashboard
Headers
Authorization: Bearer TOKEN
Response
{
  "success": true,
  "data": {
    "programs_count": 5,
    "reviews_count": 20,
    "availability_count": 7,
    "average_rating": 4.8,
    "ratings_count": 20
  }
}