# 📚 Tamkeenova Student Module — API Documentation

> **Base URL:** `http://localhost:3000/api`
> **Authentication:** Bearer Token (JWT) — `Authorization: Bearer <token>`
> **Content-Type:** `application/json` (unless specified otherwise)

---

## 📑 Table of Contents

1. [Profile & Account](#1-profile--account)
2. [Trainer Browse](#2-trainer-browse)
3. [Training Programs](#3-training-programs)
4. [Enrollments](#4-enrollments)
5. [Certificates](#5-certificates)
6. [Notifications](#6-notifications)
7. [Consultations](#7-consultations)
8. [Corporate Requests](#8-corporate-requests-b2b)
9. [Reviews](#9-reviews)
10. [Public Profile](#10-public-profile)
11. [Verification](#11-verification)
12. [Status Codes & Errors](#12-status-codes--errors)
13. [Enums Reference](#13-enums-reference)

---

## 1. Profile & Account

### 1.1 Get My Profile

```
GET /api/students/profile
Authorization: Required
```

**Response:**
```json
{
  "id": "uuid",
  "full_name": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "+201234567890",
  "username": "ahmed_mohamed",
  "profile_image": "https://xxx.supabase.co/.../avatar.jpg",
  "bio": "طالب تعلم آلي",
  "location": "القاهرة، مصر",
  "whatsapp": "+201234567890",
  "website_url": "https://ahmed.dev",
  "linkedin_url": "https://linkedin.com/in/ahmed",
  "total_training_hours": 120,
  "role": "STUDENT",
  "created_at": "2024-01-01T00:00:00.000Z",
  "completed_programs_count": 3,
  "certificates_count": 5,
  "skills": [
    { "name": "Python", "source": "certificate" },
    { "name": "Machine Learning", "source": "enrollment" }
  ]
}
```

---

### 1.2 Update Profile

```
PATCH /api/students/profile
Authorization: Required
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "full_name": "أحمد محمد علي",
  "bio": "طالب تعلم آلي مهتم بالـ AI",
  "location": "الإسكندرية، مصر",
  "username": "ahmed_ali"
}
```

**Response:**
```json
{
  "id": "uuid",
  "full_name": "أحمد محمد علي",
  "email": "ahmed@example.com",
  "phone": "+201234567890",
  "username": "ahmed_ali",
  "profile_image": "...",
  "bio": "طالب تعلم آلي مهتم بالـ AI",
  "location": "الإسكندرية، مصر",
  "role": "STUDENT",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 409 | `Username is already taken` |

---

### 1.3 Upload Avatar

```
PATCH /api/students/avatar
Authorization: Required
Content-Type: multipart/form-data
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | JPG, PNG, WEBP — Max 5MB |

**How to send (frontend):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/students/avatar', {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

**Response:**
```json
{
  "id": "uuid",
  "full_name": "أحمد محمد",
  "email": "ahmed@example.com",
  "profile_image": "https://xxx.supabase.co/storage/v1/object/public/tamkeenova/avatars/1234567890-image.jpg",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 400 | `Only JPG, PNG, and WEBP images are allowed` |
| 400 | `File size must not exceed 5MB` |
| 400 | `No file provided` |

---

### 1.4 Change Password

```
PATCH /api/students/change-password
Authorization: Required
Content-Type: application/json
```

**Request Body:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass456!"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 401 | `Current password is incorrect` |
| 400 | `New password must be different from current password` |

---

### 1.5 Get Contact Info

```
GET /api/students/contact-info
Authorization: Required
```

**Response:**
```json
{
  "id": "uuid",
  "email": "ahmed@example.com",
  "phone": "+201234567890",
  "whatsapp": "+201234567890",
  "website_url": "https://ahmed.dev",
  "linkedin_url": "https://linkedin.com/in/ahmed"
}
```

---

### 1.6 Update Contact Info

```
PATCH /api/students/contact-info
Authorization: Required
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "phone": "+201234567890",
  "whatsapp": "+201234567890",
  "email": "ahmed@example.com",
  "website_url": "https://ahmed.dev",
  "linkedin_url": "https://linkedin.com/in/ahmed"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "ahmed@example.com",
  "phone": "+201234567890",
  "whatsapp": "+201234567890",
  "website_url": "https://ahmed.dev",
  "linkedin_url": "https://linkedin.com/in/ahmed",
  "updated_at": "2025-01-15T10:30:00.000Z"
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 409 | `Email is already in use` |
| 409 | `Phone number is already in use` |

---

## 2. Trainer Browse

### 2.1 Search & Filter Trainers

```
GET /api/students/trainers
Authorization: Required
```

**Query Parameters (all optional):**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by trainer name, username, bio or specialization name (case-insensitive) |
| `specialization_id` | uuid | Filter by specialization |
| `min_rating` | number (0-5) | Minimum rating filter |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 50) |

**Example:**
```
GET /api/students/trainers?search=أحمد&min_rating=3&page=1&limit=5
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "ahmed-trainer",
      "bio_ar": "مدرب تعلم آلي",
      "bio_en": "ML Trainer",
      "years_of_experience": 5,
      "consultation_price": "200.00",
      "average_rating": "4.50",
      "ratings_count": 12,
      "total_students": 50,
      "users": {
        "full_name": "أحمد محمد",
        "profile_image": "..."
      },
      "specializations": {
        "id": "uuid",
        "name_ar": "الذكاء الاصطناعي",
        "name_en": "Artificial Intelligence"
      }
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 5,
    "totalPages": 5
  }
}
```

---

## 3. Training Programs

### 3.1 Search & Filter Programs

```
GET /api/students/programs
Authorization: Required
```

**Query Parameters (all optional):**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by title or description |
| `level` | string | `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `trainer_id` | uuid | Filter by trainer |
| `min_price` | number | Minimum price |
| `max_price` | number | Maximum price |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 50) |

**Example:**
```
GET /api/students/programs?search=python&level=BEGINNER&max_price=500
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Python للمبتدئين",
      "slug": "python-beginners",
      "image_url": "...",
      "short_description": "تعلم أساسيات Python",
      "price": "300.00",
      "discount_price": "250.00",
      "duration_hours": 40,
      "level": "BEGINNER",
      "enrolled_count": 25,
      "trainers": {
        "id": "uuid",
        "slug": "ahmed-trainer",
        "users": {
          "full_name": "أحمد محمد",
          "profile_image": "..."
        }
      }
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3.2 Program Details

```
GET /api/students/programs/:id
Authorization: Required
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Python للمبتدئين",
  "slug": "python-beginners",
  "image_url": "...",
  "short_description": "تعلم أساسيات Python",
  "description": "دورة شاملة في أساسيات لغة Python...",
  "price": "300.00",
  "discount_price": "250.00",
  "duration_hours": 40,
  "level": "BEGINNER",
  "is_active": true,
  "enrolled_count": 25,
  "trainers": {
    "id": "uuid",
    "slug": "ahmed-trainer",
    "average_rating": "4.50",
    "users": {
      "full_name": "أحمد محمد",
      "profile_image": "..."
    },
    "specializations": {
      "id": "uuid",
      "name_ar": "الذكاء الاصطناعي",
      "name_en": "Artificial Intelligence"
    }
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | `Program not found` |

---

## 4. Enrollments

### 4.1 Enroll in Program

```
POST /api/students/enrollments
Authorization: Required
Content-Type: application/json
```

**Request Body:**
```json
{
  "program_id": "uuid-of-program"
}
```

**Response:**
```json
{
  "message": "Successfully enrolled in program",
  "enrollment": {
    "id": "uuid",
    "status": "ACTIVE",
    "enrolled_at": "2025-01-15T10:30:00.000Z",
    "progress": 0,
    "training_programs": {
      "id": "uuid",
      "title": "Python للمبتدئين",
      "slug": "python-beginners",
      "price": "300.00",
      "duration_hours": 40,
      "trainers": {
        "id": "uuid",
        "users": { "full_name": "أحمد محمد" }
      }
    }
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | `Program not found` |
| 400 | `This program is not currently available` |
| 409 | `You are already enrolled in this program` |

---

### 4.2 My Enrollments

```
GET /api/students/enrollments
Authorization: Required
```

**Query Parameters (all optional):**
| Param | Type | Description |
|-------|------|-------------|
| `status` | enum | `ACTIVE`, `COMPLETED`, `CANCELLED`, `SUSPENDED` |

**Example:**
```
GET /api/students/enrollments?status=ACTIVE
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "ACTIVE",
      "enrolled_at": "2025-01-15T...",
      "completed_at": null,
      "cancelled_at": null,
      "progress": 0,
      "trainer_notes": null,
      "training_programs": {
        "id": "uuid",
        "title": "Python للمبتدئين",
        "slug": "python-beginners",
        "image_url": "...",
        "price": "300.00",
        "discount_price": "250.00",
        "duration_hours": 40,
        "level": "BEGINNER",
        "trainers": {
          "id": "uuid",
          "slug": "ahmed-trainer",
          "users": {
            "full_name": "أحمد محمد",
            "profile_image": "..."
          }
        }
      }
    }
  ],
  "total": 1
}
```

---

### 4.3 Enrollment Details

```
GET /api/students/enrollments/:id
Authorization: Required
```

**Response:** Same structure as single enrollment from 4.2 but with full program description and trainer specialization.

**Errors:**
| Status | Message |
|--------|---------|
| 404 | `Enrollment not found` |

---

### 4.4 Cancel Enrollment

```
PATCH /api/students/enrollments/:id/cancel
Authorization: Required
```

**Response:**
```json
{
  "message": "Enrollment cancelled successfully",
  "enrollment": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelled_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | `Enrollment not found` |
| 400 | `Cannot cancel enrollment with status "COMPLETED"` |

---

## 5. Certificates

### 5.1 My Certificates

```
GET /api/students/certificates
Authorization: Required
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "verification_code": "TAM-A1B2C3D4",
      "title": "شهادة إتمام Python للمبتدئين",
      "description": "...",
      "pdf_url": "https://xxx.supabase.co/.../cert.pdf",
      "qr_code_url": "https://xxx.supabase.co/.../qr.png",
      "issued_at": "2025-01-15T...",
      "is_valid": true,
      "training_hours": 40,
      "training_programs": {
        "id": "uuid",
        "title": "Python للمبتدئين",
        "slug": "python-beginners"
      },
      "trainers": {
        "id": "uuid",
        "slug": "ahmed-trainer",
        "users": { "full_name": "أحمد محمد" }
      }
    }
  ],
  "total": 1
}
```

---

### 5.2 Verify Certificate (Public)

```
GET /api/students/certificates/verify/:code
Authorization: NOT required
```

**Response:**
```json
{
  "valid": true,
  "certificate": {
    "id": "uuid",
    "verification_code": "TAM-A1B2C3D4",
    "title": "شهادة إتمام Python للمبتدئين",
    "description": "...",
    "pdf_url": "...",
    "qr_code_url": "...",
    "issued_at": "2025-01-15T...",
    "is_valid": true,
    "training_hours": 40,
    "users": {
      "id": "uuid",
      "full_name": "أحمد محمد",
      "profile_image": "..."
    },
    "training_programs": {
      "id": "uuid",
      "title": "Python للمبتدئين",
      "slug": "python-beginners",
      "duration_hours": 40
    },
    "trainers": {
      "id": "uuid",
      "slug": "ahmed-trainer",
      "users": { "full_name": "أحمد محمد" }
    }
  }
}
```

---

## 6. Notifications

### 6.1 Get All Notifications

```
GET /api/notifications
Authorization: Required
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "تم قبول طلب الاستشارة",
      "message": "تحديث: استشارة Python — تم قبول طلب الاستشارة",
      "type": "CONSULTATION_APPROVED",
      "reference_id": "uuid",
      "reference_type": "CONSULTATION",
      "is_read": false,
      "created_at": "2025-01-15T..."
    },
    {
      "id": "uuid",
      "title": "طلب شركة جديد",
      "message": "تم استلام طلب جديد من شركة \"Tech Corp\"",
      "type": "CORPORATE_REQUEST",
      "reference_id": "uuid",
      "reference_type": "CORPORATE_REQUEST",
      "is_read": true,
      "created_at": "2025-01-14T..."
    }
  ],
  "total": 2,
  "unread_count": 1
}
```

---

### 6.2 Unread Count

```
GET /api/notifications/unread-count
Authorization: Required
```

**Response:**
```json
{
  "unread_count": 5
}
```

---

### 6.3 Mark as Read

```
PATCH /api/notifications/:id/read
Authorization: Required
```

**Response:**
```json
{
  "id": "uuid",
  "is_read": true
}
```

---

### 6.4 Mark All as Read

```
PATCH /api/notifications/read-all
Authorization: Required
```

**Response:**
```json
{
  "message": "All notifications marked as read",
  "updated_count": 5
}
```

---

## 7. Consultations

### 7.1 Create Consultation Request (Student)

```
POST /api/consultations
Authorization: Required
Content-Type: application/json
```

**Request Body:**
```json
{
  "trainer_id": "uuid-of-trainer",
  "title": "استشارة حول تعلم Python",
  "description": "أحتاج مساعدة في اختيار مسار تعلم Python للمبتدئين",
  "preferred_date": "2025-01-20",
  "preferred_time": "14:00",
  "contact_phone": "+201234567890",
  "preferred_contact_method": "whatsapp",
  "student_notes": "أفضل التواصل عبر واتساب"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `trainer_id` | ✅ | UUID of the trainer |
| `title` | ✅ | Consultation title (max 255) |
| `description` | ✅ | Full description |
| `preferred_date` | ❌ | Format: `YYYY-MM-DD` |
| `preferred_time` | ❌ | Format: `HH:MM` |
| `contact_phone` | ❌ | Phone number (max 30) |
| `preferred_contact_method` | ❌ | `whatsapp`, `phone`, `email` |
| `student_notes` | ❌ | Additional notes |

**Response:**
```json
{
  "message": "Consultation request sent successfully",
  "consultation": {
    "id": "uuid",
    "title": "استشارة حول تعلم Python",
    "description": "...",
    "preferred_date": "2025-01-20T...",
    "preferred_time": "14:00",
    "status": "PENDING",
    "price": null,
    "contact_phone": "+201234567890",
    "preferred_contact_method": "whatsapp",
    "student_notes": "أفضل التواصل عبر واتساب",
    "created_at": "2025-01-15T...",
    "trainers": {
      "id": "uuid",
      "slug": "ahmed-trainer",
      "consultation_price": "200.00",
      "users": {
        "full_name": "أحمد محمد",
        "profile_image": "..."
      }
    }
  }
}
```

**Side Effects:**
- ✉️ Email sent to trainer with full student details
- 🔔 In-app notification sent to trainer

---

### 7.2 My Consultations (Student)

```
GET /api/consultations
Authorization: Required
```

**Query Parameters (all optional):**
| Param | Type | Description |
|-------|------|-------------|
| `status` | enum | `PENDING`, `APPROVED`, `REJECTED`, `SCHEDULED`, `COMPLETED`, `CANCELLED` |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "استشارة حول تعلم Python",
      "description": "...",
      "preferred_date": "2025-01-20T...",
      "preferred_time": "14:00",
      "status": "APPROVED",
      "price": "200.00",
      "scheduled_at": "2025-01-20T14:00:00.000Z",
      "completed_at": null,
      "trainer_notes": "تم القبول",
      "created_at": "2025-01-15T...",
      "trainers": {
        "id": "uuid",
        "slug": "ahmed-trainer",
        "users": {
          "full_name": "أحمد محمد",
          "profile_image": "..."
        },
        "specializations": {
          "id": "uuid",
          "name_ar": "الذكاء الاصطناعي",
          "name_en": "AI"
        }
      }
    }
  ],
  "total": 1
}
```

---

### 7.3 Consultation Details

```
GET /api/consultations/:id
Authorization: Required
```

> Accessible by: student who created it, trainer assigned to it, or admin.

**Response:**
```json
{
  "id": "uuid",
  "student_id": "uuid",
  "trainer_id": "uuid",
  "title": "استشارة حول تعلم Python",
  "description": "...",
  "preferred_date": "2025-01-20T...",
  "preferred_time": "14:00",
  "status": "SCHEDULED",
  "price": "200.00",
  "trainer_notes": "تم تحديد الموعد",
  "student_notes": "أفضل التواصل عبر واتساب",
  "scheduled_at": "2025-01-20T14:00:00.000Z",
  "completed_at": null,
  "contact_phone": "+201234567890",
  "preferred_contact_method": "whatsapp",
  "rejection_reason": null,
  "created_at": "2025-01-15T...",
  "updated_at": "2025-01-16T...",
  "users": {
    "id": "uuid",
    "full_name": "أحمد محمد",
    "email": "ahmed@example.com",
    "phone": "+201234567890",
    "profile_image": "...",
    "bio": "طالب تعلم آلي",
    "whatsapp": "+201234567890",
    "certificates": [
      {
        "id": "uuid",
        "title": "شهادة Python",
        "verification_code": "TAM-A1B2C3D4",
        "issued_at": "2024-06-01T..."
      }
    ]
  },
  "trainers": {
    "id": "uuid",
    "user_id": "uuid",
    "slug": "ahmed-trainer",
    "consultation_price": "200.00",
    "users": {
      "full_name": "أحمد محمد",
      "email": "trainer@example.com",
      "profile_image": "..."
    },
    "specializations": {
      "id": "uuid",
      "name_ar": "الذكاء الاصطناعي",
      "name_en": "AI"
    }
  }
}
```

---

### 7.4 Cancel Consultation (Student)

```
PATCH /api/consultations/:id/cancel
Authorization: Required
```

> Only `PENDING` consultations can be cancelled by student.

**Response:**
```json
{
  "message": "Consultation cancelled successfully",
  "consultation": {
    "id": "uuid",
    "status": "CANCELLED",
    "trainer_notes": null,
    "rejection_reason": null,
    "scheduled_at": null,
    "completed_at": null,
    "updated_at": "2025-01-15T..."
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | `Consultation not found` |
| 403 | `This consultation does not belong to you` |
| 400 | `Cannot cancel consultation with status "APPROVED"` |

---

### 7.5 Review Consultation (Student)

```
POST /api/consultations/:id/review
Authorization: Required
Content-Type: application/json
```

> Only `COMPLETED` consultations can be reviewed. One review per consultation.

**Request Body:**
```json
{
  "rating": 5,
  "comment": "ممتاز جداً،استفدت كتير"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `rating` | ✅ | 1-5 |
| `comment` | ❌ | Review text |

**Response:**
```json
{
  "message": "Review submitted successfully",
  "review": {
    "id": "uuid",
    "rating": 5,
    "comment": "ممتاز جداً،استفدت كتير",
    "created_at": "2025-01-15T..."
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 400 | `You can only review completed consultations` |
| 409 | `You have already reviewed this consultation` |

---

### 7.6 Trainer Consultations

```
GET /api/consultations/trainer/all
Authorization: Required (Trainer token)
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | enum | Filter by status |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "استشارة حول تعلم Python",
      "description": "...",
      "preferred_date": "2025-01-20T...",
      "preferred_time": "14:00",
      "status": "PENDING",
      "price": "200.00",
      "scheduled_at": null,
      "completed_at": null,
      "trainer_notes": null,
      "student_notes": "أفضل التواصل عبر واتساب",
      "created_at": "2025-01-15T...",
      "users": {
        "id": "uuid",
        "full_name": "أحمد محمد",
        "email": "ahmed@example.com",
        "phone": "+201234567890",
        "profile_image": "..."
      }
    }
  ],
  "total": 1
}
```

---

### 7.7 Update Consultation Status (Trainer)

```
PATCH /api/consultations/:id/status
Authorization: Required (Trainer token)
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "APPROVE",
  "trainer_notes": "تم القبول",
  "reason": null,
  "scheduled_at": null
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `action` | ✅ | See status flow below |
| `trainer_notes` | ❌ | Notes for student |
| `reason` | ❌ | Required if action = `REJECT` |
| `scheduled_at` | ❌ | Required if action = `SCHEDULE`. Format: ISO 8601 |

**Status Flow:**
```
PENDING ──→ APPROVE ──→ APPROVED ──→ SCHEDULE ──→ SCHEDULED ──→ COMPLETE ──→ COMPLETED
    │                      │                        │
    └──→ REJECT ──→ REJECTED   └──→ CANCEL           └──→ CANCEL
```

**Available Actions:**
| Current Status | Allowed Actions |
|---------------|-----------------|
| `PENDING` | `APPROVE`, `REJECT` |
| `APPROVED` | `SCHEDULE`, `CANCEL` |
| `SCHEDULED` | `COMPLETE`, `CANCEL` |

**Example — Approve:**
```json
{ "action": "APPROVE", "trainer_notes": "تم القبول" }
```

**Example — Reject:**
```json
{ "action": "REJECT", "reason": "غير متاح حالياً" }
```

**Example — Schedule:**
```json
{ "action": "SCHEDULE", "scheduled_at": "2025-01-20T14:00:00Z" }
```

**Example — Complete:**
```json
{ "action": "COMPLETE", "trainer_notes": "تمت الاستشارة بنجاح" }
```

**Response:**
```json
{
  "message": "Consultation approve successfully",
  "consultation": {
    "id": "uuid",
    "status": "APPROVED",
    "trainer_notes": "تم القبول",
    "rejection_reason": null,
    "scheduled_at": null,
    "completed_at": null,
    "updated_at": "2025-01-15T..."
  }
}
```

**Side Effects:**
- 🔔 In-app notification sent to student about status change

---

### 7.8 Trainer Consultation Reviews

```
GET /api/consultations/trainer/reviews
Authorization: Required (Trainer token)
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "ممتاز جداً",
      "created_at": "2025-01-15T...",
      "consultations": {
        "id": "uuid",
        "title": "استشارة حول تعلم Python"
      },
      "users": {
        "id": "uuid",
        "full_name": "أحمد محمد",
        "profile_image": "..."
      }
    }
  ],
  "total": 1
}
```

---

## 8. Corporate Requests (B2B)

### 8.1 Submit Corporate Request

```
POST /api/corporate-requests
Authorization: Required
Content-Type: application/json
```

**Request Body:**
```json
{
  "contact_name": "أحمد علي",
  "contact_email": "ahmed@company.com",
  "contact_phone": "+201234567890",
  "contact_whatsapp": "+201234567890",
  "company_name": "شركة التقنية المتقدمة",
  "sector": "تقنية المعلومات",
  "country": "مصر",
  "employees_count": 150,
  "service_type": "TRAINING",
  "service_description": "نحتاج برنامج تدريبي للموظفين على أساسيات الذكاء الاصطناعي",
  "expected_budget": "50000-100000 جنيه",
  "project_duration": "3 أشهر"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `contact_name` | ✅ | Contact person name |
| `contact_email` | ✅ | Contact email |
| `contact_phone` | ❌ | Contact phone |
| `contact_whatsapp` | ❌ | WhatsApp number |
| `company_name` | ✅ | Company name |
| `sector` | ❌ | Business sector |
| `country` | ❌ | Country |
| `employees_count` | ❌ | Number of employees |
| `service_type` | ✅ | Type of service needed |
| `service_description` | ✅ | Detailed description |
| `expected_budget` | ❌ | Budget range |
| `project_duration` | ❌ | Expected duration |

**Response:**
```json
{
  "message": "Corporate request submitted successfully",
  "request": {
    "id": "uuid",
    "company_name": "شركة التقنية المتقدمة",
    "service_type": "TRAINING",
    "status": "PENDING",
    "created_at": "2025-01-15T..."
  }
}
```

**Side Effects:**
- 🔔 In-app notification sent to ALL admins
- ✉️ Email sent to FIRST admin only

---

### 8.2 Upload Attachment

```
POST /api/corporate-requests/:id/attachments
Authorization: Required
Content-Type: multipart/form-data
```

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | PDF, DOC, DOCX, JPG, PNG, WEBP — Max 10MB |

**How to send (frontend):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch(`/api/corporate-requests/${requestId}/attachments`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

**Response:**
```json
{
  "message": "Attachment uploaded successfully",
  "attachment": {
    "id": "uuid",
    "file_name": "RFP-Document.pdf",
    "file_url": "https://xxx.supabase.co/.../corporate-attachments/1234567890-RFP-Document.pdf",
    "file_type": "application/pdf",
    "created_at": "2025-01-15T..."
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | `Corporate request not found` |
| 403 | `This request does not belong to you` |
| 400 | `Only PDF, DOC, DOCX, JPG, PNG, WEBP files are allowed` |
| 400 | `File size must not exceed 10MB` |

---

### 8.3 My Corporate Requests

```
GET /api/corporate-requests
Authorization: Required
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | enum | `PENDING`, `UNDER_REVIEW`, `ASSIGNED`, `APPROVED`, `REJECTED`, `COMPLETED` |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "company_name": "شركة التقنية المتقدمة",
      "sector": "تقنية المعلومات",
      "country": "مصر",
      "service_type": "TRAINING",
      "service_description": "...",
      "expected_budget": "50000-100000 جنيه",
      "project_duration": "3 أشهر",
      "status": "PENDING",
      "admin_notes": null,
      "rejection_reason": null,
      "created_at": "2025-01-15T...",
      "updated_at": "2025-01-15T...",
      "corporate_request_attachments": [
        {
          "id": "uuid",
          "file_name": "RFP-Document.pdf",
          "file_url": "...",
          "file_type": "application/pdf",
          "created_at": "2025-01-15T..."
        }
      ]
    }
  ],
  "total": 1
}
```

---

### 8.4 Corporate Request Details

```
GET /api/corporate-requests/:id
Authorization: Required
```

**Response:** Same as single item from 8.3 but includes full contact info:
```json
{
  "id": "uuid",
  "requester_id": "uuid",
  "contact_name": "أحمد علي",
  "contact_email": "ahmed@company.com",
  "contact_phone": "+201234567890",
  "contact_whatsapp": "+201234567890",
  "company_name": "شركة التقنية المتقدمة",
  "sector": "تقنية المعلومات",
  "country": "مصر",
  "employees_count": 150,
  "service_type": "TRAINING",
  "service_description": "...",
  "expected_budget": "50000-100000 جنيه",
  "project_duration": "3 أشهر",
  "status": "UNDER_REVIEW",
  "admin_notes": "تم المراجعة",
  "assigned_to": null,
  "rejection_reason": null,
  "created_at": "2025-01-15T...",
  "updated_at": "2025-01-16T...",
  "corporate_request_attachments": [...]
}
```

---

## 9. Reviews

### 9.1 My Reviews

```
GET /api/students/reviews
Authorization: Required
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "مدرب ممتاز",
      "created_at": "2025-01-15T...",
      "trainers": {
        "id": "uuid",
        "slug": "ahmed-trainer",
        "users": {
          "full_name": "أحمد محمد",
          "profile_image": "..."
        },
        "specializations": {
          "id": "uuid",
          "name_ar": "الذكاء الاصطناعي",
          "name_en": "AI"
        }
      }
    }
  ],
  "total": 1
}
```

---

### 9.2 Edit Review

```
PATCH /api/students/reviews/:id
Authorization: Required
Content-Type: application/json
```

**Request Body (at least one field required):**
```json
{
  "rating": 4,
  "comment": "ممتاز بس كان ممكن أحسن"
}
```

**Response:**
```json
{
  "message": "Review updated successfully",
  "review": {
    "id": "uuid",
    "rating": 4,
    "comment": "ممتاز بس كان ممكن أحسن",
    "created_at": "2025-01-15T..."
  }
}
```

**Side Effects:**
- Trainer's `average_rating` and `ratings_count` are recalculated automatically.

**Errors:**
| Status | Message |
|--------|---------|
| 404 | `Review not found` |
| 400 | `At least one field (rating or comment) must be provided` |

---

### 9.3 Delete Review

```
DELETE /api/students/reviews/:id
Authorization: Required
```

**Response:**
```json
{
  "message": "Review deleted successfully"
}
```

**Side Effects:**
- Trainer's `average_rating` and `ratings_count` are recalculated automatically.

---

## 10. Public Profile

### 10.1 Get Public Profile

```
GET /api/students/u/:username
Authorization: NOT required
```

**Response:**
```json
{
  "id": "uuid",
  "full_name": "أحمد محمد",
  "username": "ahmed_mohamed",
  "profile_image": "...",
  "bio": "طالب تعلم آلي مهتم بالـ AI",
  "location": "القاهرة، مصر",
  "website_url": "https://ahmed.dev",
  "linkedin_url": "https://linkedin.com/in/ahmed",
  "total_training_hours": 120,
  "role": "STUDENT",
  "created_at": "2024-01-01T...",
  "completed_programs": [
    {
      "id": "uuid",
      "completed_at": "2025-01-01T...",
      "program": {
        "id": "uuid",
        "title": "Python للمبتدئين",
        "slug": "python-beginners",
        "duration_hours": 40,
        "trainers": {
          "id": "uuid",
          "slug": "ahmed-trainer",
          "users": { "full_name": "أحمد محمد" }
        }
      }
    }
  ],
  "certificates": [
    {
      "id": "uuid",
      "title": "شهادة إتمام Python",
      "verification_code": "TAM-A1B2C3D4",
      "issued_at": "2025-01-01T...",
      "training_hours": 40,
      "program": { "id": "uuid", "title": "Python للمبتدئين" },
      "trainer": {
        "id": "uuid",
        "slug": "ahmed-trainer",
        "users": { "full_name": "أحمد محمد" }
      }
    }
  ],
  "skills": [
    { "name": "Python", "source": "certificate" },
    { "name": "Machine Learning", "source": "enrollment" }
  ],
  "stats": {
    "completed_programs_count": 3,
    "certificates_count": 5,
    "skills_count": 8,
    "total_training_hours": 120
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | `User not found` |

---

## 11. Verification

### 11.1 Verify Certificate

```
GET /api/verify/certificate/:code
Authorization: NOT required
```

**Response:**
```json
{
  "verified": true,
  "status": "VALID",
  "certificate": {
    "id": "uuid",
    "verification_code": "TAM-A1B2C3D4",
    "title": "شهادة إتمام Python للمبتدئين",
    "description": "...",
    "issued_at": "2025-01-01T...",
    "training_hours": 40,
    "pdf_url": "...",
    "qr_code_url": "...",
    "holder": {
      "name": "أحمد محمد",
      "username": "ahmed_mohamed",
      "image": "..."
    },
    "program": {
      "title": "Python للمبتدئين",
      "duration_hours": 40,
      "level": "BEGINNER"
    },
    "trainer": {
      "name": "أحمد محمد",
      "image": "...",
      "slug": "ahmed-trainer",
      "specialization": {
        "name_ar": "الذكاء الاصطناعي",
        "name_en": "AI"
      }
    }
  },
  "verified_at": "2025-01-15T10:30:00.000Z"
}
```

---

### 11.2 Verify User (Full Profile)

```
GET /api/verify/user/:username
Authorization: NOT required
```

**Response:**
```json
{
  "verified": true,
  "user": {
    "name": "أحمد محمد",
    "username": "ahmed_mohamed",
    "image": "...",
    "bio": "طالب تعلم آلي",
    "location": "القاهرة، مصر",
    "role": "STUDENT",
    "member_since": "2024-01-01T..."
  },
  "certificates": [
    {
      "id": "uuid",
      "verification_code": "TAM-A1B2C3D4",
      "title": "شهادة إتمام Python",
      "description": "...",
      "issued_at": "2025-01-01T...",
      "training_hours": 40,
      "pdf_url": "...",
      "qr_code_url": "...",
      "program": {
        "title": "Python للمبتدئين",
        "duration_hours": 40
      },
      "trainer": {
        "name": "أحمد محمد",
        "slug": "ahmed-trainer"
      }
    }
  ],
  "completed_programs": [
    {
      "id": "uuid",
      "completed_at": "2025-01-01T...",
      "program": {
        "title": "Python للمبتدئين",
        "duration_hours": 40,
        "level": "BEGINNER"
      },
      "trainer": {
        "name": "أحمد محمد",
        "slug": "ahmed-trainer"
      }
    }
  ],
  "trainers": [
    {
      "id": "uuid",
      "name": "أحمد محمد",
      "image": "...",
      "slug": "ahmed-trainer",
      "specialization": {
        "name_ar": "الذكاء الاصطناعي",
        "name_en": "AI"
      }
    }
  ],
  "skills": [
    { "name": "Python", "source": "certificate" },
    { "name": "Machine Learning", "source": "enrollment" }
  ],
  "stats": {
    "total_certificates": 5,
    "total_completed_programs": 3,
    "total_trainers": 2,
    "total_skills": 8,
    "total_training_hours": 120
  },
  "verified_at": "2025-01-15T10:30:00.000Z"
}
```

---

## 12. Status Codes & Errors

### HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request — invalid input |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — no access to this resource |
| `404` | Not Found |
| `409` | Conflict — duplicate data |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

### Validation Error Format

```json
{
  "statusCode": 400,
  "message": [
    "full_name must be shorter than or equal to 255 characters",
    "email must be an email"
  ],
  "error": "Bad Request"
}
```

---

## 13. Enums Reference

### enrollment_status
| Value | Description |
|-------|-------------|
| `ACTIVE` | Currently enrolled |
| `COMPLETED` | Program completed |
| `CANCELLED` | Enrollment cancelled |
| `SUSPENDED` | Enrollment suspended |

### consultation_status
| Value | Description |
|-------|-------------|
| `PENDING` | Waiting for trainer response |
| `APPROVED` | Approved by trainer |
| `REJECTED` | Rejected by trainer |
| `SCHEDULED` | Date/time scheduled |
| `COMPLETED` | Consultation completed |
| `CANCELLED` | Cancelled by student or trainer |

### corporate_status
| Value | Description |
|-------|-------------|
| `PENDING` | Newly submitted |
| `UNDER_REVIEW` | Being reviewed by admin |
| `ASSIGNED` | Assigned to team member |
| `APPROVED` | Approved |
| `REJECTED` | Rejected |
| `COMPLETED` | Request completed |

### user_role
| Value | Description |
|-------|-------------|
| `STUDENT` | Student / Client |
| `TRAINER` | Trainer |
| `EMPLOYEE` | Employee |
| `ADMIN` | Admin |
| `SUPER_ADMIN` | Super Admin |
| `VOLUNTEER` | Volunteer |

---

## 📋 Quick Reference — All Endpoints

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | `GET` | `/api/students/profile` | ✅ | My profile |
| 2 | `PATCH` | `/api/students/profile` | ✅ | Update profile |
| 3 | `PATCH` | `/api/students/avatar` | ✅ | Upload avatar (multipart) |
| 4 | `PATCH` | `/api/students/change-password` | ✅ | Change password |
| 5 | `GET` | `/api/students/contact-info` | ✅ | Get contact info |
| 6 | `PATCH` | `/api/students/contact-info` | ✅ | Update contact info |
| 7 | `GET` | `/api/students/trainers` | ✅ | Search trainers |
| 8 | `GET` | `/api/students/programs` | ✅ | Search programs |
| 9 | `GET` | `/api/students/programs/:id` | ✅ | Program details |
| 10 | `POST` | `/api/students/enrollments` | ✅ | Enroll in program |
| 11 | `GET` | `/api/students/enrollments` | ✅ | My enrollments |
| 12 | `GET` | `/api/students/enrollments/:id` | ✅ | Enrollment details |
| 13 | `PATCH` | `/api/students/enrollments/:id/cancel` | ✅ | Cancel enrollment |
| 14 | `GET` | `/api/students/certificates` | ✅ | My certificates |
| 15 | `GET` | `/api/students/certificates/verify/:code` | ❌ | Verify certificate |
| 16 | `GET` | `/api/notifications` | ✅ | All notifications |
| 17 | `GET` | `/api/notifications/unread-count` | ✅ | Unread count |
| 18 | `PATCH` | `/api/notifications/:id/read` | ✅ | Mark as read |
| 19 | `PATCH` | `/api/notifications/read-all` | ✅ | Mark all as read |
| 20 | `POST` | `/api/consultations` | ✅ | Create consultation |
| 21 | `GET` | `/api/consultations` | ✅ | My consultations |
| 22 | `GET` | `/api/consultations/:id` | ✅ | Consultation details |
| 23 | `PATCH` | `/api/consultations/:id/cancel` | ✅ | Cancel consultation |
| 24 | `POST` | `/api/consultations/:id/review` | ✅ | Review consultation |
| 25 | `GET` | `/api/consultations/trainer/all` | ✅ | Trainer consultations |
| 26 | `PATCH` | `/api/consultations/:id/status` | ✅ | Update status (trainer) |
| 27 | `GET` | `/api/consultations/trainer/reviews` | ✅ | Trainer reviews |
| 28 | `POST` | `/api/corporate-requests` | ✅ | Submit B2B request |
| 29 | `POST` | `/api/corporate-requests/:id/attachments` | ✅ | Upload attachment |
| 30 | `GET` | `/api/corporate-requests` | ✅ | My B2B requests |
| 31 | `GET` | `/api/corporate-requests/:id` | ✅ | B2B request details |
| 32 | `GET` | `/api/students/reviews` | ✅ | My reviews |
| 33 | `PATCH` | `/api/students/reviews/:id` | ✅ | Edit review |
| 34 | `DELETE` | `/api/students/reviews/:id` | ✅ | Delete review |
| 35 | `GET` | `/api/students/u/:username` | ❌ | Public profile |
| 36 | `GET` | `/api/verify/certificate/:code` | ❌ | Verify certificate |
| 37 | `GET` | `/api/verify/user/:username` | ❌ | Verify user |

---

> **Total: 37 endpoints** | **34 authenticated** | **3 public**
