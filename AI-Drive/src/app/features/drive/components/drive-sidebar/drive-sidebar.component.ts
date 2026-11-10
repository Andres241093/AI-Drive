import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { DriveFileKind } from '../../models/drive-file.model';

@Component({
  selector: 'app-drive-sidebar',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './drive-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriveSidebarComponent {
  readonly activeSection = input.required<string>();
  readonly sectionSelected = output<string>();
  readonly uploadRequested = output<void>();
  readonly itemCreationRequested = output<DriveFileKind>();
  readonly notificationRequested = output<string>();
  protected readonly showNewMenu = signal(false);

  protected toggleNewMenu(): void {
    this.showNewMenu.update((isOpen) => !isOpen);
  }

  protected requestUpload(): void {
    this.showNewMenu.set(false);
    this.uploadRequested.emit();
  }

  protected requestItemCreation(kind: DriveFileKind): void {
    this.showNewMenu.set(false);
    this.itemCreationRequested.emit(kind);
  }
}
