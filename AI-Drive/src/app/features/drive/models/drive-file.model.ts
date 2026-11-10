export type DriveFileKind = 'folder' | 'drawing' | 'image' | 'spreadsheet' | 'document';

export interface DriveFile {
  id: number;
  name: string;
  owner: string;
  modified: string;
  size: string;
  kind: DriveFileKind;
  icon: string;
  file?: File;
  storedAs?: string;
  downloadUrl?: string;
}
