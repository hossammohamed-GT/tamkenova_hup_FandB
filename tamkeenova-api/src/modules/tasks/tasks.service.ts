import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TasksRepository } from './tasks.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { StorageService } from '../storage/storage.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssigneeDto } from './dto/assignee.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
const TEAM_ROLES = ['EMPLOYEE', 'VOLUNTEER'];


@Injectable()
export class TasksService {

  // Initialize instance
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}




  // Handle create task
  async createTask(adminId: string, dto: CreateTaskDto) {
    if (!dto.assignees || dto.assignees.length === 0) {
      throw new BadRequestException('At least one assignee is required');
    }

    const task = await this.tasksRepo.createTask({
      created_by: adminId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      required_score: dto.required_score ?? null,
      estimated_hours: dto.estimated_hours ?? null,
    });

    const assignees: { user_id: string; task_order: number }[] = [];

    for (let i = 0; i < dto.assignees.length; i++) {
      const a = dto.assignees[i];
      const user = await this.tasksRepo.getUserById(a.user_id);

      if (!user) {
        throw new NotFoundException(`Assignee user not found: ${a.user_id}`);
      }

      if (!TEAM_ROLES.includes(user.role)) {
        throw new BadRequestException(
          `User ${user.full_name} is not an employee or volunteer`,
        );
      }

      assignees.push({
        user_id: a.user_id,
        task_order: a.task_order ?? i + 1,
      });
    }

    await this.tasksRepo.createAssignees(task.id, assignees);


    await this.notifyAssignees(task, assignees);

    await this.tasksRepo.logActivity({
      user_id: adminId,
      action: 'TASK_CREATED',
      entity_type: 'TASK',
      entity_id: task.id,
      details: `Created task "${task.title}" with ${assignees.length} assignee(s)`,
    });

    return {
      success: true,
      message: 'Task created and assigned successfully',
      task: await this.tasksRepo.getTaskById(task.id),
    };
  }


  // Handle list tasks
  async listTasks(status?: string) {
    const tasks = await this.tasksRepo.listTasks(status);
    return { data: tasks, total: tasks.length };
  }


  // Handle update task
  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = await this.tasksRepo.getTaskById(id);
    if (!task) throw new NotFoundException('Task not found');

    const updated = await this.tasksRepo.updateTask(id, {
      ...dto,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    });

    return { success: true, message: 'Task updated', task: updated };
  }


  // Handle delete task
  async deleteTask(id: string) {
    const task = await this.tasksRepo.getTaskById(id);
    if (!task) throw new NotFoundException('Task not found');

    await this.tasksRepo.deleteTask(id);
    return { success: true, message: 'Task deleted' };
  }


  // Handle add assignee
  async addAssignee(taskId: string, dto: AssigneeDto) {
    const task = await this.tasksRepo.getTaskById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    const user = await this.tasksRepo.getUserById(dto.user_id);
    if (!user) throw new NotFoundException('User not found');
    if (!TEAM_ROLES.includes(user.role)) {
      throw new BadRequestException('User is not an employee or volunteer');
    }

    const existing = await this.tasksRepo.getAssignmentByTaskAndUser(
      taskId,
      dto.user_id,
    );
    if (existing) {
      throw new BadRequestException('User is already assigned to this task');
    }

    const taskOrder =
      dto.task_order ?? task.task_assignees.length + 1;

    const assignee = await this.tasksRepo.addAssignee(taskId, {
      user_id: dto.user_id,
      task_order: taskOrder,
    });

    await this.notifyAssignees(task, [
      { user_id: dto.user_id, task_order: taskOrder },
    ]);

    return { success: true, message: 'Assignee added', assignee };
  }


  // Handle remove assignee
  async removeAssignee(taskId: string, userId: string) {
    const task = await this.tasksRepo.getTaskById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    await this.tasksRepo.removeAssignee(taskId, userId);
    return { success: true, message: 'Assignee removed' };
  }


  // Handle get task submissions
  async getTaskSubmissions(taskId: string) {
    const task = await this.tasksRepo.getTaskById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    const submissions = await this.tasksRepo.getTaskSubmissions(taskId);
    return { data: submissions, total: submissions.length };
  }


  // Handle review submission
  async reviewSubmission(
    adminId: string,
    assigneeId: string,
    dto: ReviewSubmissionDto,
  ) {
    const assignee = await this.tasksRepo.getAssigneeById(assigneeId);
    if (!assignee) throw new NotFoundException('Assignment not found');

    if (assignee.status !== 'SUBMITTED') {
      throw new BadRequestException('This task has no submission to review');
    }

    const task = assignee.tasks;
    if (!task) {
      throw new NotFoundException('Task not found');
    }


    let action = dto.action;
    if (
      dto.action === 'APPROVE' &&
      task.required_score != null &&
      dto.score != null &&
      dto.score < task.required_score
    ) {
      action = 'REJECT';
    }

    const submission = await this.tasksRepo.getSubmissionByAssignee(assignee.id);

    if (action === 'APPROVE') {
      const hours = task.estimated_hours || 0;

      await this.tasksRepo.updateAssignee(assignee.id, {
        status: 'APPROVED',
        score: dto.score ?? null,
        hours_awarded: hours,
        approved_at: new Date(),
      });

      if (submission) {
        await this.tasksRepo.updateSubmission(submission.id, {
          status: 'APPROVED',
          score: dto.score ?? null,
          review_note: dto.note || null,
          reviewed_at: new Date(),
        });
      }


      if (assignee.users?.role === 'VOLUNTEER' && hours > 0) {
        try {
          await this.tasksRepo.incrementVolunteerHours(assignee.user_id, hours);
        } catch (e) {
          console.error('Failed to award volunteer hours', e);
        }
      }

      await this.notificationsService.createNotification({
        user_id: assignee.user_id,
        title: 'تم اعتماد المهمة',
        message: `تم اعتماد تسليم مهمة "${task.title}"${
          dto.score != null ? ` — التقييم: ${dto.score}/100` : ''
        }`,
        type: 'TASK_APPROVED',
        reference_id: task.id,
        reference_type: 'TASK',
      });

      await this.tasksRepo.logActivity({
        user_id: assignee.user_id,
        action: 'TASK_APPROVED',
        entity_type: 'TASK',
        entity_id: task.id,
        details: `Task approved${dto.score != null ? ` with score ${dto.score}` : ''}`,
      });

      return {
        success: true,
        message: 'Submission approved',
        assignee: await this.tasksRepo.getAssigneeById(assignee.id),
      };
    }


    await this.tasksRepo.updateAssignee(assignee.id, {
      status: 'REJECTED',
      rejected_count: { increment: 1 },
    });

    if (submission) {
      await this.tasksRepo.updateSubmission(submission.id, {
        status: 'REJECTED',
        score: dto.score ?? null,
        review_note: dto.note || null,
        reviewed_at: new Date(),
      });
    }

    await this.notificationsService.createNotification({
      user_id: assignee.user_id,
      title: 'تم رفض تسليم المهمة',
      message: `تم رفض تسليم مهمة "${task.title}"${
        dto.note ? ` — ملاحظات: ${dto.note}` : ''
      }`,
      type: 'TASK_REJECTED',
      reference_id: task.id,
      reference_type: 'TASK',
    });

    await this.tasksRepo.logActivity({
      user_id: assignee.user_id,
      action: 'TASK_REJECTED',
      entity_type: 'TASK',
      entity_id: task.id,
      details: `Task rejected${dto.note ? `: ${dto.note}` : ''}`,
    });

    return {
      success: true,
      message: 'Submission rejected',
      assignee: await this.tasksRepo.getAssigneeById(assignee.id),
    };
  }




  // Handle get my tasks
  async getMyTasks(userId: string) {
    const assignments = await this.tasksRepo.getMyAssignments(userId);

    const data = assignments.map((a: any) => {
      const task = a.tasks;
      const submissions = a.task_submissions || [];

      return {
        id: a.id,
        assignee_id: a.id,
        task_id: task ? task.id : null,
        task_order: a.task_order,
        status: a.status,
        score: a.score,
        hours_awarded: a.hours_awarded,
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        approved_at: a.approved_at,
        rejected_count: a.rejected_count,
        resubmission_count: a.resubmission_count,
        is_locked: this.isLocked(a.task_order, assignments),
        task: task
          ? {
              id: task.id,
              title: task.title,
              description: task.description,
              priority: task.priority,
              deadline: task.deadline,
              required_score: task.required_score,
              estimated_hours: task.estimated_hours,
            }
          : null,
        submission: submissions[0] || null,
      };
    });

    return { data, total: data.length };
  }


  // Handle get task details
  async getTaskDetails(userId: string, role: string, taskId: string) {
    const task = await this.tasksRepo.getTaskById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    if (!ADMIN_ROLES.includes(role)) {
      const isAssignee = task.task_assignees.some(
        (a: any) => a.user_id === userId,
      );
      if (!isAssignee) {
        throw new ForbiddenException('You are not assigned to this task');
      }
    }

    return task;
  }


  // Handle start task
  async startTask(userId: string, taskId: string) {
    const assignment = await this.tasksRepo.getAssignmentByTaskAndUser(
      taskId,
      userId,
    );
    if (!assignment) throw new NotFoundException('Assignment not found');

    const assignments = await this.tasksRepo.getMyAssignments(userId);
    if (this.isLocked(assignment.task_order, assignments)) {
      throw new BadRequestException(
        'You must complete the previous task first',
      );
    }

    if (assignment.status !== 'PENDING') {
      throw new BadRequestException('Task has already been started');
    }

    const updated = await this.tasksRepo.updateAssignee(assignment.id, {
      status: 'IN_PROGRESS',
      started_at: new Date(),
    });

    return { success: true, message: 'Task started', assignment: updated };
  }


  // Handle submit task
  async submitTask(
    userId: string,
    taskId: string,
    dto: SubmitTaskDto,
    files?: Express.Multer.File[],
  ) {
    const assignment = await this.tasksRepo.getAssignmentByTaskAndUser(
      taskId,
      userId,
    );
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (assignment.status === 'APPROVED') {
      throw new BadRequestException('Task already approved');
    }

    if (!dto.content && !dto.link_url && (!files || files.length === 0)) {
      throw new BadRequestException(
        'You must provide content, a link, or at least one file',
      );
    }

    const wasRejected = assignment.status === 'REJECTED';


    let submission = await this.tasksRepo.getSubmissionByAssignee(assignment.id);

    if (submission) {
      submission = await this.tasksRepo.updateSubmission(submission.id, {
        content: dto.content ?? submission.content,
        link_url: dto.link_url ?? submission.link_url,
        status: 'SUBMITTED',
        submitted_at: new Date(),
        reviewed_at: null,
        review_note: null,
      });
    } else {
      submission = await this.tasksRepo.createSubmission({
        assignee_id: assignment.id,
        content: dto.content || null,
        link_url: dto.link_url || null,
      });
    }

    if (!submission) {
      throw new BadRequestException('Failed to save task submission');
    }


    if (files && files.length > 0) {
      for (const file of files) {
        const result = await this.storageService.uploadFile(
          'task-submissions',
          file.originalname,
          file.buffer,
          file.mimetype,
        );

        await this.tasksRepo.createSubmissionAttachment({
          submission_id: submission.id,
          file_name: file.originalname,
          file_url: result.url,
          file_type: file.mimetype,
          file_size: file.size,
        });
      }
    }

    await this.tasksRepo.updateAssignee(assignment.id, {
      status: 'SUBMITTED',
      submitted_at: new Date(),
      resubmission_count: wasRejected
        ? { increment: 1 }
        : assignment.resubmission_count,
    });


    const taskTitle = assignment.tasks?.title ?? 'Unknown task';
    await this.notifyAdminsOfSubmission(taskTitle, userId);

    await this.tasksRepo.logActivity({
      user_id: userId,
      action: 'TASK_SUBMITTED',
      entity_type: 'TASK',
      entity_id: taskId,
      details: `Submitted task "${taskTitle}"`,
    });

    return {
      success: true,
      message: 'Task submitted for review',
      submission,
    };
  }




  // Handle add comment
  async addComment(
    userId: string,
    role: string,
    taskId: string,
    dto: CreateCommentDto,
  ) {
    const task = await this.tasksRepo.getTaskById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    if (!ADMIN_ROLES.includes(role)) {
      const isAssignee = task.task_assignees.some((a: any) => a.user_id === userId);
      if (!isAssignee) {
        throw new ForbiddenException('You are not assigned to this task');
      }
    }

    const comment = await this.tasksRepo.createComment({
      task_id: taskId,
      author_id: userId,
      body: dto.body,
    });

    return { success: true, message: 'Comment added', comment };
  }


  // Handle get comments
  async getComments(userId: string, role: string, taskId: string) {
    const task = await this.tasksRepo.getTaskById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    if (!ADMIN_ROLES.includes(role)) {
      const isAssignee = task.task_assignees.some((a: any) => a.user_id === userId);
      if (!isAssignee) {
        throw new ForbiddenException('You are not assigned to this task');
      }
    }

    const comments = await this.tasksRepo.getComments(taskId);
    return { data: comments, total: comments.length };
  }




  // Handle get dashboard
  async getDashboard(userId: string, role: string) {
    const assignments = await this.tasksRepo.getMyAssignments(userId);
    const now = new Date();

    const current = assignments.filter((a: any) =>
      ['PENDING', 'IN_PROGRESS', 'SUBMITTED'].includes(a.status),
    ).length;
    const completed = assignments.filter((a: any) => a.status === 'APPROVED').length;
    const delayed = assignments.filter(
      (a: any) =>
        a.tasks?.deadline &&
        a.tasks.deadline < now &&
        !['APPROVED', 'REJECTED'].includes(a.status),
    ).length;

    const base = {
      total_tasks: assignments.length,
      current_tasks: current,
      completed_tasks: completed,
      delayed_tasks: delayed,
      average_completion:
        assignments.length === 0
          ? 0
          : Math.round((completed / assignments.length) * 100),
    };

    if (role === 'VOLUNTEER') {
      return {
        ...base,
        ...(await this.buildVolunteerStats(userId, assignments)),
      };
    }

    return base;
  }


  // Handle build volunteer stats
  private async buildVolunteerStats(userId: string, assignments: any[]) {
    const volunteer = await this.tasksRepo.getVolunteerByUserId(userId);

    const scored = assignments.filter((a) => a.score != null);
    const averageScore =
      scored.length === 0
        ? 0
        : scored.reduce((sum, a) => sum + a.score, 0) / scored.length;

    const approved = assignments.filter((a) => a.status === 'APPROVED');
    const onTime = approved.filter(
      (a) =>
        a.tasks?.deadline &&
        a.submitted_at &&
        a.submitted_at <= a.tasks.deadline,
    ).length;
    const onTimeRate =
      approved.length === 0 ? null : Math.round((onTime / approved.length) * 100);

    const certificates = await this.tasksRepo.countUserCertificates(userId);

    const lastTasks = [...assignments]
      .sort(
        (a, b) =>
          new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime(),
      )
      .slice(0, 5)
      .map((a) => ({
        id: a.tasks?.id,
        task_id: a.tasks?.id,
        title: a.tasks?.title,
        status: a.status,
        score: a.score,
      }));

    return {
      total_hours: volunteer?.total_hours ?? 0,
      average_score: Math.round(averageScore * 10) / 10,
      on_time_rate: onTimeRate,
      certificates_count: certificates,
      last_tasks: lastTasks,
    };
  }




  // Handle is locked
  private isLocked(taskOrder: number, assignments: any[]): boolean {
    return assignments.some(
      (a) => a.task_order < taskOrder && a.status !== 'APPROVED',
    );
  }


  // Handle notify assignees
  private async notifyAssignees(
    task: { id: string; title: string; deadline: Date | null; priority: string },
    assignees: { user_id: string; task_order?: number }[],
  ) {
    for (const a of assignees) {
      const user = await this.tasksRepo.getUserById(a.user_id);
      if (!user) continue;

      await this.notificationsService.createNotification({
        user_id: user.id,
        title: 'New Task Assigned',
        message: `تم إسناد مهمة جديدة إليك: "${task.title}"`,
        type: 'TASK_ASSIGNED',
        reference_id: task.id,
        reference_type: 'TASK',
      });

      try {
        await this.mailService.sendTaskAssignedEmail(
          user.email,
          user.full_name,
          task.title,
          task.deadline ? task.deadline.toISOString().slice(0, 10) : undefined,
          task.priority,
        );
      } catch (e) {
        console.error('Failed to send task assignment email', e);
      }
    }
  }


  // Handle notify admins of submission
  private async notifyAdminsOfSubmission(taskTitle: string, assigneeUserId: string) {
    try {
      const admins = await this.notificationsService.getAdminUsers();
      if (admins.length === 0) return;

      const assignee = await this.tasksRepo.getUserById(assigneeUserId);

      await this.notificationsService.createBulkNotifications(
        admins.map((a) => a.id),
        {
          title: 'تسليم مهمة جديد',
          message: `قام ${assignee?.full_name || 'أحد المنفذين'} بتسليم مهمة "${taskTitle}" للمراجعة`,
          type: 'TASK_SUBMITTED',
          reference_type: 'TASK',
        },
      );

      const firstAdmin = admins[0];
      if (firstAdmin.email) {
        try {
          await this.mailService.sendTaskSubmittedAdminEmail(
            firstAdmin.email,
            assignee?.full_name || 'Unknown',
            taskTitle,
          );
        } catch (e) {
          console.error('Failed to send admin submission email', e);
        }
      }
    } catch (e) {
      console.error('Failed to notify admins of submission', e);
    }
  }
}
