import { environment } from '../../environments/environment';

export interface SubmissionFile {
  id: string;
  name: string;
  url: string;
}

type Json = Record<string, any>;


export function mergeSubmissionsIntoAssignees(
  assignees: Array<Json | null | undefined> | null | undefined,
  submissions: Array<Json | null | undefined> | null | undefined,
): Json[] {
  const rows = new Map<string, Json>();
  for (const a of Array.isArray(assignees) ? assignees : []) {
    if (a?.['id'] != null) rows.set(String(a['id']), { ...a });
  }
  for (const s of Array.isArray(submissions) ? submissions : []) {
    const a = (s?.['task_assignees'] ?? {}) as Json;
    const id = a?.['id'] != null ? String(a['id']) : s?.['assignee_id'] != null ? String(s['assignee_id']) : '';
    if (!id) continue;
    const existing = rows.get(id) ?? {};
    rows.set(id, {
      ...existing,
      ...a,
      users: { ...(existing['users'] ?? {}), ...(a['users'] ?? {}) },
      submission: {
        id: s?.['id'] ?? null,
        content: s?.['content'] ?? null,
        link_url: s?.['link_url'] ?? null,
        status: s?.['status'] ?? null,
        score: s?.['score'] ?? null,
        review_note: s?.['review_note'] ?? null,
        submitted_at: s?.['submitted_at'] ?? null,
        reviewed_at: s?.['reviewed_at'] ?? null,
        task_submission_attachments: Array.isArray(s?.['task_submission_attachments'])
          ? s?.['task_submission_attachments']
          : [],
      },
    });
  }
  return [...rows.values()];
}


export function submissionOfAssignee(assignee: Json | null | undefined): any | null {
  if (!assignee) return null;
  const raw = assignee['submission'] ?? assignee['task_submission'] ?? assignee['submission_data'];
  return raw ?? null;
}


export function absoluteFileUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${environment.apiUrl}/${url.replace(/^\/+/, '')}`;
}


export function submissionFiles(submission: Json | null | undefined): SubmissionFile[] {
  if (!submission) return [];
  const rawList =
    submission['task_submission_attachments'] ??
    submission['attachments'] ??
    submission['files'] ??
    submission['submission_attachments'] ??
    [];
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((item: Json, index: number): SubmissionFile => {
      const url: string = item?.['file_url'] ?? item?.['url'] ?? item?.['file_path'] ?? item?.['path'] ?? '';
      const name: string =
        item?.['file_name'] ?? item?.['name'] ?? item?.['filename'] ?? (url ? url.split('/').pop() ?? '' : '');
      return {
        id: String(item?.['id'] ?? index),
        name: name || 'file',
        url: absoluteFileUrl(url),
      };
    })
    .filter((f) => f.url !== '');
}
