import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-drive-topbar',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './drive-topbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriveTopbarComponent {
  readonly searchTerm = input.required<string>();
  readonly searchChanged = output<string>();
  readonly searchCleared = output<void>();

  protected onSearchInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.searchChanged.emit(target.value);
  }
}
