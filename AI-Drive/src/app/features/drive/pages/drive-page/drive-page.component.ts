import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DriveAssistantComponent } from '../../components/drive-assistant/drive-assistant.component';
import { DriveFileBrowserComponent } from '../../components/drive-file-browser/drive-file-browser.component';
import { DriveSidebarComponent } from '../../components/drive-sidebar/drive-sidebar.component';
import { DriveTopbarComponent } from '../../components/drive-topbar/drive-topbar.component';
import { UPLOAD_ACCEPT } from '../../data-access/drive-file.constants';
import { DriveStore } from '../../data-access/drive-store.service';
import type { DriveFile } from '../../models/drive-file.model';

@Component({
  selector: 'app-drive-page',
  imports: [
    DriveAssistantComponent,
    DriveFileBrowserComponent,
    DriveSidebarComponent,
    DriveTopbarComponent,
  ],
  providers: [DriveStore],
  templateUrl: './drive-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrivePageComponent {
  protected readonly store = inject(DriveStore);
  protected readonly assistantOpen = signal(true);
  protected readonly uploadAccept = UPLOAD_ACCEPT;
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected openFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  protected handleFileInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    this.store.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onFileOpened(file: DriveFile): void {
    this.store.openFile(file);
    if (file.kind !== 'folder') this.assistantOpen.set(true);
  }
}
