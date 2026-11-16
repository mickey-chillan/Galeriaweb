export const DEFAULT_DRIVE_FOLDER_ID = '1PwzIyxuoEPX9sdlmlUpxszm1Ze6XTeSB';
export const DEFAULT_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1PwzIyxuoEPX9sdlmlUpxszm1Ze6XTeSB?usp=sharing';

export interface DriveImageFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  createdTime?: string;
  imageMediaMetadata?: {
    time?: string;
    width?: number;
    height?: number;
    cameraMake?: string;
    cameraModel?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
    };
  };
}

/**
 * Extracts a Google Drive folder ID from either a full Drive folder URL or a raw ID.
 */
export function parseDriveFolderId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_DRIVE_FOLDER_ID;
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '') || DEFAULT_DRIVE_FOLDER_ID;
}

/**
 * Lists image files inside a Google Drive folder using the Drive v3 API.
 */
export async function listDriveFolderImages(
  folderId: string,
  accessToken: string,
): Promise<DriveImageFile[]> {
  const safeFolderId = folderId.replace(/'/g, '');
  const query = encodeURIComponent(
    `'${safeFolderId}' in parents and trashed = false and mimeType contains 'image/'`,
  );
  const fields = encodeURIComponent(
    'files(id,name,mimeType,thumbnailLink,createdTime,imageMediaMetadata(time,width,height,cameraMake,cameraModel,location(latitude,longitude,altitude)))',
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=createdTime%20asc&pageSize=40&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error(
        'La sesión de Google Drive expiró. Vuelve a pulsar "Conectar con Google Drive" para renovar el permiso.',
      );
    }
    if (response.status === 404) {
      throw new Error(
        'No se encontró la carpeta de Google Drive indicada o no tienes acceso a ella con esta cuenta.',
      );
    }
    throw new Error(
      `No se pudo leer la carpeta de Google Drive (${response.status}): ${bodyText.slice(0, 140)}`,
    );
  }

  const data = (await response.json()) as { files?: DriveImageFile[] };
  return data.files || [];
}

/**
 * Downloads the raw binary Blob of a Google Drive image file for EXIF GPS parsing and compression.
 */
export async function downloadDriveImageBlob(
  fileId: string,
  accessToken: string,
): Promise<Blob> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('La autorización de Google Drive caducó. Reconecta tu cuenta.');
    }
    throw new Error(`No se pudo descargar la imagen (${response.status}).`);
  }

  return response.blob();
}
