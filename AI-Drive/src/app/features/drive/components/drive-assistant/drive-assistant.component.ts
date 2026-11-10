import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { DriveApiService, getApiErrorMessage } from '../../data-access/drive-api.service';
import { environment } from '../../../../../environments/environment';
import type { DriveFile } from '../../models/drive-file.model';

interface ReplySegment {
  text: string;
  fileName: string | null;
  downloadUrl: string | null;
}

@Component({
  selector: 'app-drive-assistant',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './drive-assistant.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriveAssistantComponent {
  private readonly driveApi = inject(DriveApiService);

  readonly selectedFile = input<DriveFile | null>(null);
  readonly isOpen = input.required<boolean>();
  readonly closeRequested = output<void>();
  readonly openRequested = output<void>();
  protected readonly reply = linkedSignal(() => {
    this.selectedFile();
    return '';
  });
  protected readonly replySegments = computed(() => this.formatReply(this.reply()));
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected askAssistant(question: string): void {
    const message = question.trim();
    if (!message || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.reply.set('');
    this.driveApi
      .ask(message)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ reply }) => this.reply.set(reply),
        error: (error: unknown) => this.errorMessage.set(
          getApiErrorMessage(error, 'No se pudo obtener una respuesta del asistente'),
        ),
      });
  }

  private formatReply(text: string): ReplySegment[] {
    const segments: ReplySegment[] = [];
    const fileReference = /\[([^\[\]/\\\r\n]+\.(?:pdf|txt|md|csv))\]/gi;
    let cursor = 0;

    for (const match of text.matchAll(fileReference)) {
      const index = match.index;
      const fileName = match[1];
      if (index === undefined || !fileName) continue;

      if (index > cursor) {
        segments.push({ text: text.slice(cursor, index), fileName: null, downloadUrl: null });
      }

      segments.push({
        text: '',
        fileName,
        downloadUrl: `${environment.apiUrl}/download/${encodeURIComponent(fileName)}`,
      });
      cursor = index + match[0].length;
    }

    if (cursor < text.length || segments.length === 0) {
      segments.push({ text: text.slice(cursor), fileName: null, downloadUrl: null });
    }

    return segments;
  }
}
