import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UploadDocumentResponse {
  message: string;
  file: {
    name: string;
    size: number;
    indexed: boolean;
    chunks: number;
  };
}

export interface ChatResponse {
  reply: string;
}

export interface ListedDocument {
  name: string;
  size: number;
  storedAs: string;
  updatedAt: string;
  downloadUrl: string;
}

export interface ListDocumentsResponse {
  files: ListedDocument[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class DriveApiService {
  private readonly http = inject(HttpClient);

  listDocuments(): Observable<ListDocumentsResponse> {
    return this.http.get<ListDocumentsResponse>(`${environment.apiUrl}/documents`);
  }

  uploadDocument(file: File): Observable<UploadDocumentResponse> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<UploadDocumentResponse>(`${environment.apiUrl}/documents/upload`, body);
  }

  ask(question: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${environment.apiUrl}/chat`, { message: question });
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;

  const serverMessage = error.error?.error;
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
  if (error.status === 0) return 'No se pudo conectar con el servidor. Verifica que esté en ejecución.';
  return `${fallback} (HTTP ${error.status}).`;
}
