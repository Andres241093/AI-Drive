import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach } from 'vitest';
import { App } from './app';

function initializeEmptyFileList(): void {
  const request = TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/api/documents');
  expect(request.request.method).toBe('GET');
  request.flush({ files: [], total: 0 });
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    initializeEmptyFileList();
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the file manager', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    initializeEmptyFileList();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Mi unidad');
  });

  it('should list documents returned by the backend', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const request = TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/api/documents');
    expect(request.request.method).toBe('GET');
    request.flush({
      files: [
        {
          name: 'guia.txt',
          size: 2048,
          storedAs: '123-guia.txt',
          updatedAt: '2026-11-10T12:00:00.000Z',
          downloadUrl: '/api/download/123-guia.txt',
        },
      ],
      total: 1,
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.file-name')?.textContent?.trim()).toBe('guia.txt');
    expect(compiled.querySelector('.file-size')?.textContent?.trim()).toBe('2 KB');
    expect(compiled.querySelector('.list-footer')?.textContent).toContain('1 elemento');
  });

  it('should show a list loading error and allow retrying', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/api/documents')
      .flush({ error: 'No se pudieron consultar los archivos.' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.file-list-error')?.textContent).toContain('No se pudieron consultar los archivos.');
    compiled.querySelector<HTMLButtonElement>('.file-list-error button')?.click();

    const retry = TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/api/documents');
    retry.flush({ files: [], total: 0 });
    fixture.detectChanges();
    expect(compiled.querySelector('.empty-state')?.textContent).toContain('No se encontraron archivos');
    expect(compiled.querySelector('.file-list-error')).toBeNull();
  });

  it('should upload supported file extensions using multipart form data', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="file"]') as HTMLInputElement;
    initializeEmptyFileList();
    const files = [
      new File(['document'], 'reserva.pdf', { type: 'application/pdf' }),
      new File(['text'], 'notas.md', { type: 'text/markdown' }),
    ];

    Object.defineProperty(input, 'files', { configurable: true, value: files });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    const requests = http.match('http://localhost:3000/api/documents/upload');
    expect(requests).toHaveLength(2);
    for (const [index, request] of requests.entries()) {
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBeInstanceOf(FormData);
      expect((request.request.body as FormData).get('file')).toBe(files[index]);
      expect(request.request.headers.has('Content-Type')).toBe(false);
    }

    requests[0].flush({
      message: 'Archivo cargado correctamente.',
      file: { name: 'reserva.pdf', size: 8, indexed: true, chunks: 2 },
    });
    requests[1].flush({
      message: 'Archivo cargado correctamente.',
      file: { name: 'notas.md', size: 4, indexed: true, chunks: 1 },
    });
    const refreshedList = http.expectOne('http://localhost:3000/api/documents');
    expect(refreshedList.request.method).toBe('GET');
    refreshedList.flush({
      files: [
        {
          name: 'reserva.pdf',
          size: 8,
          storedAs: 'abc-reserva.pdf',
          updatedAt: '2026-11-10T12:00:00.000Z',
          downloadUrl: '/api/download/abc-reserva.pdf',
        },
        {
          name: 'notas.md',
          size: 4,
          storedAs: 'def-notas.md',
          updatedAt: '2026-11-10T12:01:00.000Z',
          downloadUrl: '/api/download/def-notas.md',
        },
      ],
      total: 2,
    });
    fixture.detectChanges();

    const rows = Array.from(compiled.querySelectorAll('.file-name')).map((element) => element.textContent?.trim());
    expect(input.accept).toBe('.pdf,.txt,.md,.csv');
    expect(rows).toContain('reserva.pdf');
    expect(rows).toContain('notas.md');
    expect(compiled.querySelector('.toast')?.textContent).toContain('2 fragmentos indexados');
  });

  it('should reject unsupported files and announce the reason', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="file"]') as HTMLInputElement;
    initializeEmptyFileList();

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['executable'], 'program.exe', { type: 'application/octet-stream' })],
    });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(compiled.querySelector('.file-name')?.textContent ?? '').not.toContain('program.exe');
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('formato no compatible');
  });

  it('should reject files larger than 25 MB', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="file"]') as HTMLInputElement;
    initializeEmptyFileList();
    const file = new File(['text'], 'large.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { configurable: true, value: 25 * 1024 * 1024 + 1 });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('superan el límite de 25 MB');
  });

  it('should show backend upload errors for unreadable PDFs', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="file"]') as HTMLInputElement;
    initializeEmptyFileList();
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['scan'], 'escaneado.pdf', { type: 'application/pdf' })],
    });

    input.dispatchEvent(new Event('change'));
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/api/documents/upload')
      .flush({ error: 'El PDF no contiene texto seleccionable.' }, { status: 422, statusText: 'Unprocessable Entity' });
    fixture.detectChanges();

    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('El PDF no contiene texto seleccionable.');
  });

  it('should send chat questions to the backend and render its reply', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('.assistant-input input') as HTMLInputElement;
    initializeEmptyFileList();
    input.value = '¿Qué información dicen los documentos?';
    input.closest('form')?.dispatchEvent(new Event('submit'));

    const request = TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/api/chat');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ message: '¿Qué información dicen los documentos?' });
    request.flush({
      reply: 'Los documentos tratan sobre reservas [guia.txt]. <img src=x onerror=alert(1)> [archivo.exe]',
    });
    fixture.detectChanges();

    const link = compiled.querySelector<HTMLAnchorElement>('.assistant-reply a.document-link');
    expect(link?.textContent).toContain('guia.txt');
    expect(link?.href).toBe('http://localhost:3000/api/download/guia.txt');
    expect(link?.download).toBe('guia.txt');
    expect(compiled.querySelector('.assistant-reply p')?.textContent).toContain('<img src=x onerror=alert(1)> [archivo.exe]');
    expect(compiled.querySelector('.assistant-reply img')).toBeNull();
  });
});
