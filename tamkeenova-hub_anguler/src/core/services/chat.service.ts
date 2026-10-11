import { Injectable, signal } from '@angular/core';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  isOpen = signal(false);
  isTyping = signal(false);
  messages = signal<ChatMessage[]>([
    { id: 0, role: 'assistant', text: '' }
  ]);

  private nextId = 1;

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  setWelcomeMessage(text: string): void {
    this.messages.update((msgs) => {
      if (msgs.length && msgs[0].id === 0) {
        return [{ ...msgs[0], text }, ...msgs.slice(1)];
      }
      return msgs;
    });
  }

  async send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    this.messages.update((msgs) => [...msgs, { id: this.nextId++, role: 'user', text: trimmed }]);
    this.isTyping.set(true);

    const reply = await this.fakeAssistantReply(trimmed);

    this.isTyping.set(false);
    this.messages.update((msgs) => [...msgs, { id: this.nextId++, role: 'assistant', text: reply }]);
  }

  private fakeAssistantReply(_userText: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('هيتم ربط الرد الفعلي بالـ backend قريباً — دي رسالة تجريبية من الفرونت.');
      }, 1100);
    });
  }
}
