// -- Tasks System Models (mirrors Tamkeenova Tasks API) --

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ReviewAction = 'APPROVE' | 'REJECT';

export interface TaskAssigneeInput {
  user_id: string;
  task_order: number;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string;
  required_score?: number;
  estimated_hours?: number;
  assignees: TaskAssigneeInput[];
}

export interface TaskUser {
  id: string;
  full_name: string;
  username: string | null;
  profile_image: string | null;
  email: string;
  role: string;
}

export interface TaskSubmissionAttachment {
  id: string;
  file_url: string;
  file_name?: string | null;
  file_type?: string | null;
}

export interface TaskSubmission {
  id: string;
  content: string | null;
  link_url: string | null;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  score?: number | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  submitted_at: string;
  task_submission_attachments?: TaskSubmissionAttachment[];
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  task_order: number;
  status: TaskStatus;
  is_locked: boolean;
  score: number | null;
  hours_awarded: number | null;
  review_note: string | null;
  rejected_count: number;
  started_at: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  users?: TaskUser | null;
  submission?: TaskSubmission | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status?: TaskStatus | null;
  deadline: string;
  required_score: number | null;
  estimated_hours: number | null;
  created_at: string;
  updated_at?: string;
  task_assignees?: TaskAssignee[];
  task_comments?: TaskComment[];
  creator?: TaskUser | null;
}

export interface MyTaskItem {
  id: string;
  task_id: string;
  task_order: number;
  status: TaskStatus;
  is_locked: boolean;
  score: number | null;
  hours_awarded: number | null;
  review_note: string | null;
  rejected_count: number;
  started_at: string | null;
  task: Task;
  submission: TaskSubmission | null;
}

export interface TaskComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  users?: TaskUser | null;
}

export interface ReviewPayload {
  action: ReviewAction;
  score?: number;
  note?: string;
}

export interface TasksDashboardStats {
  total_tasks: number;
  current_tasks: number;
  completed_tasks: number;
  delayed_tasks: number;
  average_completion: number;
  // -- Volunteer Extras --
  total_hours?: number;
  average_score?: number;
  on_time_rate?: number;
  certificates_count?: number;
  last_tasks?: { id: string; title: string; status: TaskStatus; score: number | null }[];
}
