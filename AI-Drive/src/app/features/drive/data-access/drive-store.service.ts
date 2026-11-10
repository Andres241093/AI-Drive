import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { MAX_UPLOAD_SIZE_BYTES, UPLOADABLE_FILE_TYPES } from './drive-file.constants';
import type { ListedDocument, UploadDocumentResponse } from './drive-api.service';
import { DriveApiService, getApiErrorMessage } from './drive-api.service';
import type { DriveFile, DriveFileKind } from '../models/drive-file.model';
import { environment } from '../../../../environments/environment';

@Injectable()
export class DriveStore implements OnDestroy {
  private readonly driveApi = inject(DriveApiService);

  readonly searchTerm = signal('');
  readonly activeSection = signal('Mi unidad');
  readonly selectedFile = signal<DriveFile | null>(null);
  readonly sortAscending = signal(true);
  readonly toastMessage = signal('');
  readonly toastIsError = signal(false);
  readonly isLoadingFiles = signal(false);
  readonly filesError = signal('');

  readonly files = signal<DriveFile[]>([]);

  readonly filteredFiles = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase();
    const rows = this.files().filter((file) => file.name.toLocaleLowerCase().includes(term));
    return this.sortAscending() ? rows : [...rows].reverse();
  });

  private nextFileId = 1;
  private toastTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoadingFiles.set(true);
    this.filesError.set('');
    this.driveApi
      .listDocuments()
      .pipe(finalize(() => this.isLoadingFiles.set(false)))
      .subscribe({
        next: ({ files }) => {
          this.files.set(files.map((file, index) => this.toDriveFile(file, index + 1)));
          this.nextFileId = files.length + 1;
        },
        error: (error: unknown) => {
          this.filesError.set(getApiErrorMessage(error, 'No se pudieron cargar los archivos'));
        },
      });
  }

  setSearch(term: string): void {
    this.searchTerm.set(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  setSection(section: string): void {
    this.activeSection.set(section);
    this.selectedFile.set(null);
  }

  createItem(kind: DriveFileKind): void {
    const presets: Record<DriveFileKind, { name: string; icon: string; size: string }> = {
      folder: { name: 'Nueva carpeta', icon: 'folder', size: '—' },
      document: { name: 'Documento sin título', icon: 'description', size: '0 KB' },
      spreadsheet: { name: 'Hoja de cálculo sin título', icon: 'table_chart', size: '0 KB' },
      drawing: { name: 'Dibujo sin título', icon: 'draw', size: '0 KB' },
      image: { name: 'Imagen nueva', icon: 'image', size: '0 KB' },
    };
    const preset = presets[kind];
    this.files.update((items) => [
      { id: this.nextFileId++, ...preset, owner: 'yo', modified: 'Ahora', kind },
      ...items,
    ]);
    this.showToast(`${preset.name} creada`);
  }

  selectFile(file: DriveFile): void {
    this.selectedFile.set(file);
  }

  openFile(file: DriveFile): void {
    if (file.kind === 'folder') {
      this.setSection(file.name);
      this.showToast(`Abriendo ${file.name}`);
      return;
    }

    this.selectFile(file);
  }

  sortByName(): void {
    this.sortAscending.update((ascending) => !ascending);
  }

  toggleFilter(filter: string): void {
    this.showToast(`Filtro «${filter}» seleccionado`);
  }

  addFiles(files: readonly File[]): void {
    const supportedFiles: File[] = [];
    let unsupportedCount = 0;
    let oversizedCount = 0;

    for (const file of files) {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        oversizedCount++;
        continue;
      }

      const extension = file.name.split('.').pop()?.toLowerCase();
      const fileType = extension ? UPLOADABLE_FILE_TYPES[extension] : undefined;
      if (!fileType) {
        unsupportedCount++;
        continue;
      }

      supportedFiles.push(file);
    }

    if (supportedFiles.length) {
      forkJoin(
        supportedFiles.map((file) =>
          this.driveApi
            .uploadDocument(file)
            .pipe(
              map((response) => ({ file, response })),
              catchError((error: unknown) => of({ file, error })),
            ),
        ),
      ).subscribe((results) => this.handleUploadResults(results, unsupportedCount, oversizedCount));
    } else {
      this.showUploadValidationErrors(unsupportedCount, oversizedCount);
    }
  }

  showToast(message: string, isError = false): void {
    this.toastMessage.set(message);
    this.toastIsError.set(isError);
    if (this.toastTimeout !== undefined) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastMessage.set(''), 2600);
  }

  ngOnDestroy(): void {
    if (this.toastTimeout !== undefined) clearTimeout(this.toastTimeout);
  }

  private handleUploadResults(
    results: Array<{ file: File; response: UploadDocumentResponse } | { file: File; error: unknown }>,
    unsupportedCount: number,
    oversizedCount: number,
  ): void {
    const succeeded = results.filter(
      (result): result is { file: File; response: UploadDocumentResponse } => 'response' in result,
    );
    const failed = results.filter((result): result is { file: File; error: unknown } => 'error' in result);

    if (succeeded.length) {
      this.loadDocuments();
    }

    const details = [
      ...succeeded.map(({ response }) =>
        `${response.file.name} subido correctamente; ${response.file.chunks} fragmentos indexados`,
      ),
      ...failed.map(({ file, error }) => `${file.name}: ${getApiErrorMessage(error, 'No se pudo subir el archivo')}`),
      ...this.getUploadValidationErrors(unsupportedCount, oversizedCount),
    ];

    if (details.length) {
      this.showToast(details.join('. '), failed.length > 0 || unsupportedCount > 0 || oversizedCount > 0);
    }
  }

  private showUploadValidationErrors(unsupportedCount: number, oversizedCount: number): void {
    const details = this.getUploadValidationErrors(unsupportedCount, oversizedCount);
    if (details.length) this.showToast(`${details.join('; ')}.`, true);
  }

  private getUploadValidationErrors(unsupportedCount: number, oversizedCount: number): string[] {
    return [
      unsupportedCount ? `${unsupportedCount} con formato no compatible` : '',
      oversizedCount ? `${oversizedCount} superan el límite de 25 MB` : '',
    ].filter(Boolean);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
  }

  private toDriveFile(file: ListedDocument, id: number): DriveFile {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const fileType = extension ? UPLOADABLE_FILE_TYPES[extension] : undefined;
    const downloadPath = file.downloadUrl.startsWith('/') ? file.downloadUrl : `/${file.downloadUrl}`;

    return {
      id,
      name: file.name,
      owner: 'yo',
      modified: new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(file.updatedAt)),
      size: this.formatFileSize(file.size),
      kind: fileType?.kind ?? 'document',
      icon: fileType?.icon ?? 'description',
      storedAs: file.storedAs,
      downloadUrl: new URL(downloadPath, environment.apiUrl).toString(),
    };
  }
}
