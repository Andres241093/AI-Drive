import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DrivePageComponent } from './features/drive/pages/drive-page/drive-page.component';

@Component({
  selector: 'app-root',
  imports: [DrivePageComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
