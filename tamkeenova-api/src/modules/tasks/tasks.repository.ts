import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class TasksRepository {

  // Initialize instance
  constructor(private readonly prisma: PrismaService) {}




  // Handle create task
  createTask(data: {
    created_by: string;
    title: string;
    description: string;
    priority?: string;
    deadline?: Date | null;
    required_score?: number | null;
    estimated_hours?: number | null;
  }) {
    return this.prisma.tasks.create({
      data: {
        created_by: data.created_by,
        title: data.title,
        description: data.description,
        priority: (data.priority as any) || 'MEDIUM',
        deadline: data.deadline || null,
        required_score: data.required_score ?? null,
        estimated_hours: data.estimated_hours ?? null,
      },
    });
  }


  // Handle create assignees
  createAssignees(
    taskId: string,
    assignees: { user_id: string; task_order: number }[],
  ) {
    return this.prisma.task_assignees.createMany({
      data: assignees.map((a) => ({
        task_id: taskId,
        user_id: a.user_id,
        task_order: a.task_order,
      })),
    });
  }


  // Handle update task
  updateTask(id: string, data: any) {
    return this.prisma.tasks.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }


  // Handle delete task
  deleteTask(id: string) {
    return this.prisma.tasks.delete({ where: { id } });
  }


  // Handle get task by id
  getTaskById(id: string) {
    return this.prisma.tasks.findUnique({
      where: { id },
      include: {
        task_assignees: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                username: true,
                email: true,
                role: true,
                profile_image: true,
              },
            },
          },
        },
        task_comments: {
          include: {
            users: {
              select: { id: true, full_name: true, role: true },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });
  }


  // Handle list tasks
  listTasks(status?: string) {
    return this.prisma.tasks.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        task_assignees: {
          where: status ? { status: status as any } : undefined,
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                username: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }


  // Handle get user by id
  getUserById(id: string) {
    return this.prisma.users.findUnique({ where: { id } });
  }




  // Handle add assignee
  addAssignee(taskId: string, data: { user_id: string; task_order: number }) {
    return this.prisma.task_assignees.create({
      data: {
        task_id: taskId,
        user_id: data.user_id,
        task_order: data.task_order,
      },
    });
  }


  // Handle remove assignee
  removeAssignee(taskId: string, userId: string) {
    return this.prisma.task_assignees.deleteMany({
      where: { task_id: taskId, user_id: userId },
    });
  }


  // Handle get assignee by id
  getAssigneeById(id: string) {
    return this.prisma.task_assignees.findUnique({
      where: { id },
      include: {
        tasks: true,
        users: { select: { id: true, full_name: true, email: true, role: true } },
      },
    });
  }


  // Handle get assignment by task and user
  getAssignmentByTaskAndUser(taskId: string, userId: string) {
    return this.prisma.task_assignees.findUnique({
      where: { task_id_user_id: { task_id: taskId, user_id: userId } },
      include: { tasks: true },
    });
  }


  // Handle update assignee
  updateAssignee(id: string, data: any) {
    return this.prisma.task_assignees.update({ where: { id }, data });
  }


  // Handle get my assignments
  getMyAssignments(userId: string) {
    return this.prisma.task_assignees.findMany({
      where: { user_id: userId },
      orderBy: { task_order: 'asc' },
      include: {
        tasks: true,
        task_submissions: {
          include: { task_submission_attachments: true },
        },
      },
    });
  }




  // Handle get submission by assignee
  getSubmissionByAssignee(assigneeId: string) {
    return this.prisma.task_submissions.findUnique({
      where: { assignee_id: assigneeId },
      include: { task_submission_attachments: true },
    });
  }


  // Handle create submission
  createSubmission(data: {
    assignee_id: string;
    content?: string | null;
    link_url?: string | null;
  }) {
    return this.prisma.task_submissions.create({
      data: {
        assignee_id: data.assignee_id,
        content: data.content || null,
        link_url: data.link_url || null,
      },
      include: { task_submission_attachments: true },
    });
  }


  // Handle update submission
  updateSubmission(id: string, data: any) {
    return this.prisma.task_submissions.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
      include: { task_submission_attachments: true },
    });
  }


  // Handle create submission attachment
  createSubmissionAttachment(data: {
    submission_id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
  }) {
    return this.prisma.task_submission_attachments.create({ data });
  }


  // Handle get task submissions
  getTaskSubmissions(taskId: string) {
    return this.prisma.task_submissions.findMany({
      where: { task_assignees: { task_id: taskId } },
      orderBy: { submitted_at: 'desc' },
      include: {
        task_submission_attachments: true,
        task_assignees: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                username: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }




  // Handle create comment
  createComment(data: { task_id: string; author_id: string; body: string }) {
    return this.prisma.task_comments.create({ data });
  }


  // Handle get comments
  getComments(taskId: string) {
    return this.prisma.task_comments.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'asc' },
      include: {
        users: {
          select: { id: true, full_name: true, role: true, profile_image: true },
        },
      },
    });
  }




  // Handle get volunteer by user id
  getVolunteerByUserId(userId: string) {
    return this.prisma.volunteers.findUnique({ where: { user_id: userId } });
  }


  // Handle count user certificates
  countUserCertificates(userId: string) {
    return this.prisma.certificates.count({
      where: { student_id: userId, is_valid: true },
    });
  }


  // Handle increment volunteer hours
  incrementVolunteerHours(userId: string, hours: number) {
    return this.prisma.volunteers.update({
      where: { user_id: userId },
      data: { total_hours: { increment: hours }, updated_at: new Date() },
    });
  }




  // Handle log activity
  logActivity(data: {
    user_id: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: string;
  }) {
    return this.prisma.activity_logs.create({ data });
  }
}
