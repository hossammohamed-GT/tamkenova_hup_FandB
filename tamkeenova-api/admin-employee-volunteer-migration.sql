

CREATE TYPE "task_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED');

CREATE TYPE "task_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE "volunteer_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "certificate_type" AS ENUM ('TRAINING', 'VOLUNTEER', 'OTHER');



DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_certificate_trainer'
      AND conrelid = '"trainer_certificates"'::regclass
  ) THEN
    ALTER TABLE "trainer_certificates"
      RENAME CONSTRAINT "fk_certificate_trainer" TO "fk_trainer_certificate_trainer";
  END IF;
END $$;

ALTER TABLE "certificates"
  ADD COLUMN "certificate_type" "certificate_type" NOT NULL DEFAULT 'TRAINING';

ALTER TABLE "certificates" DROP CONSTRAINT "fk_certificate_trainer";
ALTER TABLE "certificates" DROP CONSTRAINT "fk_certificate_program";

ALTER TABLE "certificates" ALTER COLUMN "trainer_id" DROP NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "program_id" DROP NOT NULL;

ALTER TABLE "certificates"
  ADD CONSTRAINT "fk_certificate_trainer"
    FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "fk_certificate_program"
    FOREIGN KEY ("program_id") REFERENCES "training_programs"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;


CREATE TABLE "volunteers" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"          UUID NOT NULL,
  "volunteer_status" "volunteer_status" NOT NULL DEFAULT 'PENDING',
  "rejection_reason" TEXT,
  "approved_at"      TIMESTAMPTZ(6),
  "approved_by"      UUID,
  "bio"              VARCHAR(500),
  "total_hours"      INTEGER NOT NULL DEFAULT 0,
  "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "volunteers_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "fk_volunteers_user"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_volunteers_user_id" ON "volunteers"("user_id");
CREATE INDEX "idx_volunteers_status"  ON "volunteers"("volunteer_status");


CREATE TABLE "tasks" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "created_by"      UUID NOT NULL,
  "title"           VARCHAR(255) NOT NULL,
  "description"     TEXT NOT NULL,
  "priority"        "task_priority" NOT NULL DEFAULT 'MEDIUM',
  "deadline"        TIMESTAMPTZ(6),
  "required_score"  INTEGER,
  "estimated_hours" INTEGER,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_tasks_created_by" ON "tasks"("created_by");
CREATE INDEX "idx_tasks_deadline"    ON "tasks"("deadline");


CREATE TABLE "task_assignees" (
  "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
  "task_id"            UUID NOT NULL,
  "user_id"            UUID NOT NULL,
  "task_order"         INTEGER NOT NULL DEFAULT 1,
  "status"             "task_status" NOT NULL DEFAULT 'PENDING',
  "score"              INTEGER,
  "hours_awarded"      INTEGER NOT NULL DEFAULT 0,
  "started_at"         TIMESTAMPTZ(6),
  "submitted_at"       TIMESTAMPTZ(6),
  "approved_at"        TIMESTAMPTZ(6),
  "rejected_count"     INTEGER NOT NULL DEFAULT 0,
  "resubmission_count" INTEGER NOT NULL DEFAULT 0,
  "assigned_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_assignees_task_user_unique" UNIQUE ("task_id", "user_id"),
  CONSTRAINT "fk_task_assignee_task"
    FOREIGN KEY ("task_id") REFERENCES "tasks"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "fk_task_assignee_user"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_task_assignees_task"   ON "task_assignees"("task_id");
CREATE INDEX "idx_task_assignees_user"   ON "task_assignees"("user_id");
CREATE INDEX "idx_task_assignees_status" ON "task_assignees"("status");


CREATE TABLE "task_submissions" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignee_id"  UUID NOT NULL,
  "content"      TEXT,
  "link_url"     TEXT,
  "status"       "task_status" NOT NULL DEFAULT 'SUBMITTED',
  "score"        INTEGER,
  "review_note"  TEXT,
  "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "reviewed_at"  TIMESTAMPTZ(6),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_submissions_assignee_id_key" UNIQUE ("assignee_id"),
  CONSTRAINT "fk_submission_assignee"
    FOREIGN KEY ("assignee_id") REFERENCES "task_assignees"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_task_submissions_assignee" ON "task_submissions"("assignee_id");


CREATE TABLE "task_submission_attachments" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" UUID NOT NULL,
  "file_name"     VARCHAR(255) NOT NULL,
  "file_url"      TEXT NOT NULL,
  "file_type"     VARCHAR(50) NOT NULL,
  "file_size"     INTEGER NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "task_submission_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_submission_attachment"
    FOREIGN KEY ("submission_id") REFERENCES "task_submissions"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_submission_attachments_submission" ON "task_submission_attachments"("submission_id");


CREATE TABLE "task_comments" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "task_id"    UUID NOT NULL,
  "author_id"  UUID NOT NULL,
  "body"       TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_task_comment_task"
    FOREIGN KEY ("task_id") REFERENCES "tasks"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "fk_task_comment_author"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_task_comments_task" ON "task_comments"("task_id");


CREATE TABLE "activity_logs" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL,
  "action"      VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(50),
  "entity_id"   UUID,
  "details"     TEXT,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_activity_user"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_activity_logs_user"    ON "activity_logs"("user_id");
CREATE INDEX "idx_activity_logs_created" ON "activity_logs"("created_at");
