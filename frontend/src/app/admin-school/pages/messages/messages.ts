import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { AdminRegistration, AdminSchoolService, Conversation,ChatMessage } from '../../admin-school.service';
import { FormsModule } from '@angular/forms';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-messages',
  imports: [FormsModule,DatePipe,UpperCasePipe,RouterLink],
  templateUrl: './messages.html',
  styleUrl: './messages.css',
})
export class Messages implements OnInit{

  private adminService = inject(AdminSchoolService)
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller')
  private timer: ReturnType<typeof setInterval>| undefined

  schoolName = signal('')
  conversations = signal<Conversation[]>([])
  messages = signal<ChatMessage[]>([])
  selectedId = signal<number | null>(null)
  loadingThread = signal(false)
  sending = signal(false)
  error = signal('')

  search = signal('')
  unreadOnly = signal(false)
  draft = ''

  selected = computed(() => this.conversations().find(c => c.student_id === this.selectedId()) ?? null)
  totalUnread = computed(() => this.conversations().reduce((sum,c) => sum + c.unread,0))

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase()
    return this.conversations().filter(c => {
      if (this.unreadOnly() && c.unread === 0) return false
      if (!q) return true
      return `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(q)
    })
  })

  grouped = computed(() => {
    const groups: {day: string, items: ChatMessage[]}[] = []
    for (const m of this.messages()) {
      const day = m.created_at.slice(0,10)
      const last = groups[groups.length - 1 ]
      if (last && last.day === day) last.items.push(m)
      else groups.push({day, items: [m]})
    }
    return groups
  })

  ngOnInit() {
    this.adminService.getRegistrations().subscribe({ next: (r) => this.schoolName.set(r.schoolName) });
    this.loadConversations();
    // simple polling: refresh the list and the open thread every 8 seconds
    this.timer = setInterval(() => {
      this.loadConversations();
      if (this.selectedId() !== null) this.loadThread(this.selectedId()!, false);
    }, 8000);
  }

  ngOnDestroy() { clearInterval(this.timer); }

  loadConversations() {
    this.adminService.getConversations().subscribe({
      next: (res) => this.conversations.set(res.conversations),
      error: () => this.error.set('Could not load conversations.'),
    });
  }
  open(c: Conversation) {
    this.selectedId.set(c.student_id);
    this.messages.set([]);
    this.error.set('');
    this.loadThread(c.student_id, true);
  }

  back() { this.selectedId.set(null); }

  private loadThread(studentId: number, showLoader: boolean) {
    if (showLoader) this.loadingThread.set(true);
    this.adminService.getThread(studentId).subscribe({
      next: (res) => {
        if (this.selectedId() !== studentId) return;     // user switched chat meanwhile
        const grew = res.messages.length !== this.messages().length;
        this.messages.set(res.messages);
        this.loadingThread.set(false);
        // opening a thread marks it read on the server, so clear the badge locally too
        this.conversations.update(list => list.map(c => (c.student_id === studentId ? { ...c, unread: 0 } : c)));
        if (grew) this.scrollDown();
      },
      error: () => { this.loadingThread.set(false); this.error.set('Could not load this conversation.'); },
    });
  }

  send() {
    const id = this.selectedId();
    const text = this.draft.trim();
    if (id === null || !text || this.sending()) return;
    this.sending.set(true);
    this.adminService.sendMessage(id, text).subscribe({
      next: (res) => {
        this.messages.update(list => [...list, res.message]);
        this.conversations.update(list =>
          list.map(c => (c.student_id === id
            ? { ...c, last_body: text, last_sender: 'school' as const, last_at: res.message.created_at }
            : c))
        );
        this.draft = '';
        this.sending.set(false);
        this.scrollDown();
      },
      error: (err) => { this.error.set(err.error?.message || 'Message not sent.'); this.sending.set(false); },
    });
  }

  // Enter sends, Shift+Enter makes a new line
  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  initials(c: { first_name: string; last_name: string }) {
    return `${c.first_name[0] ?? ''}${c.last_name[0] ?? ''}`.toUpperCase();
  }

  dayLabel(day: string) {
    const today = new Date();
    const yest = new Date(); yest.setDate(today.getDate() - 1);
    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (day === key(today)) return 'Today';
    if (day === key(yest)) return 'Yesterday';
    return new Date(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private scrollDown() {
    setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
