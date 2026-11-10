import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { DriveFile } from '../../models/drive-file.model';

@Component({
  selector: 'app-drive-file-browser',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './drive-file-browser.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriveFileBrowserComponent {
  readonly files = input.required<DriveFile[]>();
  readonly activeSection = input.required<string>();
  readonly selectedFileId = input<number | null>(null);
  readonly sortAscending = input.required<boolean>();
  readonly loadingFiles = input(false);
  readonly filesError = input('');
  readonly fileSelected = output<DriveFile>();
  readonly fileOpened = output<DriveFile>();
  readonly sortRequested = output<void>();
  readonly filterRequested = output<string>();
  readonly filesDropped = output<File[]>();
  readonly reloadRequested = output<void>();
  protected readonly isDraggingFiles = signal(false);
  private dragDepth = 0;

  protected onDragEnter(event: DragEvent): void {
    if (!this.hasDraggedFiles(event)) return;
    event.preventDefault();
    this.dragDepth++;
    this.isDraggingFiles.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.hasDraggedFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDragLeave(event: DragEvent): void {
    if (!this.hasDraggedFiles(event)) return;
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.isDraggingFiles.set(false);
  }

  protected onDrop(event: DragEvent): void {
    if (!this.hasDraggedFiles(event)) return;
    event.preventDefault();
    this.dragDepth = 0;
    this.isDraggingFiles.set(false);
    if (event.dataTransfer?.files.length) {
      this.filesDropped.emit(Array.from(event.dataTransfer.files));
    }
  }

  private hasDraggedFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
}
