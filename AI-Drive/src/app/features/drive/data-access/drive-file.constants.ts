import type { DriveFileKind } from '../models/drive-file.model';

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
export const UPLOAD_ACCEPT = '.pdf,.txt,.md,.csv';

export const UPLOADABLE_FILE_TYPES: Record<string, { kind: DriveFileKind; icon: string }> = {
  pdf: { kind: 'document', icon: 'picture_as_pdf' },
  txt: { kind: 'document', icon: 'description' },
  md: { kind: 'document', icon: 'description' },
  csv: { kind: 'document', icon: 'description' },
};
