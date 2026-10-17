import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class TasksRepository {


  constructor(private readonly prisma: PrismaService) {}





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



  updateTask(id: string, data: any) {
    return this.prisma.tasks.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }



  deleteTask(id: string) {
    return this.prisma.tasks.delete({ where: { id } });
  }



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



  getUserById(id: string) {
    return this.prisma.users.findUnique({ where: { id } });
  }





  addAssignee(taskId: string, data: { user_id: string; task_order: number }) {
    return this.prisma.task_assignees.create({
      data: {
        task_id: taskId,
        user_id: data.user_id,
        task_order: data.task_order,
      },
    });
  }



  removeAssignee(taskId: string, userId: string) {
    return this.prisma.task_assignees.deleteMany({
      where: { task_id: taskId, user_id: userId },
    });
  }



  getAssigneeById(id: string) {
    return this.prisma.task_assignees.findUnique({
      where: { id },
      include: {
        tasks: true,
        users: { select: { id: true, full_name: true, email: true, role: true } },
      },
    });
  }



  getAssignmentByTaskAndUser(taskId: string, userId: string) {
    return this.prisma.task_assignees.findUnique({
      where: { task_id_user_id: { task_id: taskId, user_id: userId } },
      include: { tasks: true },
    });
  }



  updateAssignee(id: string, data: any) {
    return this.prisma.task_assignees.update({ where: { id }, data });
  }



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





  getSubmissionByAssignee(assigneeId: string) {
    return this.prisma.task_submissions.findUnique({
      where: { assignee_id: assigneeId },
      include: { task_submission_attachments: true },
    });
  }



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



  updateSubmission(id: string, data: any) {
    return this.prisma.task_submissions.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
      include: { task_submission_attachments: true },
    });
  }



  createSubmissionAttachment(data: {
    submission_id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
  }) {
    return this.prisma.task_submission_attachments.create({ data });
  }



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





  createComment(data: { task_id: string; author_id: string; body: string }) {
    return this.prisma.task_comments.create({ data });
  }



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





  getVolunteerByUserId(userId: string) {
    return this.prisma.volunteers.findUnique({ where: { user_id: userId } });
  }



  countUserCertificates(userId: string) {
    return this.prisma.certificates.count({
      where: { student_id: userId, is_valid: true },
    });
  }



  incrementVolunteerHours(userId: string, hours: number) {
    return this.prisma.volunteers.update({
      where: { user_id: userId },
      data: { total_hours: { increment: hours }, updated_at: new Date() },
    });
  }





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
