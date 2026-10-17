import { signal } from '@angular/core';
export type FieldErrors = Record<string, string[]>;
/** Shared form state. Never retries writes or strips fields rejected by an older API. */
export class FormFeedback {
  readonly fields = signal<FieldErrors>({});
  readonly general = signal('');
  readonly attempted = signal(false);
  readonly focusRevision = signal(0);
  validate(form?: { invalid: boolean | null; form: { markAllAsTouched(): void } }) {
    this.reset();
    if (!form?.invalid) return true;
    form.form.markAllAsTouched();
    this.reveal();
    return false;
  }
  reset() {
    this.fields.set({});
    this.general.set('');
    this.attempted.set(false);
  }
  clearField(path: string) {
    if (!(path in this.fields())) return;
    const fields = { ...this.fields() };
    delete fields[path];
    this.fields.set(fields);
  }
  setField(path: string, message: string) {
    this.fields.set({ ...this.fields(), [path]: [message] });
    this.focusRevision.update((n) => n + 1);
  }
  reveal() {
    this.attempted.set(true);
    this.focusRevision.update((n) => n + 1);
  }
  fail(error: unknown) {
    const body = (error as { error?: { message?: unknown; field_errors?: unknown } })?.error;
    const fields: FieldErrors = Object.create(null);
    const general: string[] = [];
    let incompatible = false;
    const record = (path: string, text: string) => {
      if (
        !/^[\w]+(?:\.[\w]+)*$/.test(path) ||
        ['__proto__', 'prototype', 'constructor'].some((key) => path.split('.').includes(key))
      )
        return;
      const unsupported = /should not exist/i.test(text);
      const outdated =
        unsupported &&
        /^(?:short_description_ar|short_description_en|content_type|sections\.\d+\.lessons\.\d+\.description_(?:ar|en))$/.test(
          path,
        );
      incompatible ||= outdated;
      (fields[path] ||= []).push(
        outdated
          ? 'الحقل غير مدعوم في نسخة الخادم الحالية؛ يلزم تحديث الـAPI، وليس حذف بياناتك. / This field requires the updated API; keep your data.'
          : text,
      );
    };
    if (
      body?.field_errors &&
      typeof body.field_errors === 'object' &&
      !Array.isArray(body.field_errors)
    ) {
      for (const [path, messages] of Object.entries(body.field_errors))
        for (const text of Array.isArray(messages) ? messages : [messages])
          if (typeof text === 'string') record(path, text);
    } else {
      for (const message of Array.isArray(body?.message) ? body.message : [body?.message]) {
        if (typeof message !== 'string') continue;
        // Nest's legacy nested whitelist format: sections.0.lessons.1.property description_ar ...
        const normalized = message.replace(/(^|\.)property\s+/g, '$1');
        const match = normalized.match(
          /^([a-zA-Z_]\w*(?:\.(?:\w+))*)(?::\s*|\s+)((?:should|must|has|is|Use|Enter|أدخل|اختر).*)$/,
        );
        if (match) record(match[1], match[2]);
        else general.push(message);
      }
    }
    if (incompatible)
      general.unshift(
        'نسخة خدمة الكورسات لا تتوافق مع النموذج. حدّث وأعد تشغيل الـAPI مع الواجهة، ثم أعد الحفظ. بياناتك ما زالت في النموذج. / The API is out of date. Deploy/restart the matching backend, then save again. Your entries are preserved.',
      );
    if (!Object.keys(fields).length && !general.length)
      general.push('تعذّر إتمام الطلب. حاول مرة أخرى / Please retry.');
    this.fields.set(fields);
    this.general.set(general.join(' · '));
    this.reveal();
  }
}
