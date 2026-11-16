import React, { useCallback, useEffect, useState } from 'react';
import {
  Camera,
  Check,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  MapPin,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import type { GeorefPhotoInput, ImportPhotosResult } from '../hooks/useTravelAtlas';
import type { TravelPin } from '../types/travel';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_DRIVE_FOLDER_URL,
  downloadDriveImageBlob,
  listDriveFolderImages,
  parseDriveFolderId,
  type DriveImageFile,
} from '../utils/driveApi';
import { formatCoords } from '../utils/geoMath';
import {
  detectCountryFromCoordinates,
  extractPhotoExifMetadata,
  findNearestPin,
} from '../utils/photoMetadata';

interface PhotoImporterModalProps {
  isOpen: boolean;
  driveToken: string | null;
  authBusy: boolean;
  pins: TravelPin[];
  activePin: TravelPin | null;
  onClose: () => void;
  onConnectGoogleDrive: () => Promise<string | null>;
  onImportPhotos: (
    items: GeorefPhotoInput[],
    fallbackPin: TravelPin | null,
    autoGeoref?: boolean,
  ) => Promise<ImportPhotosResult>;
  onAfterImport: (result: ImportPhotosResult) => void;
}

interface LocalFilePreview {
  file: File;
  previewUrl: string;
  lat: number | null;
  lng: number | null;
  takenAt: string;
  hasGps: boolean;
  matchLabel: string;
}

export const PhotoImporterModal: React.FC<PhotoImporterModalProps> = ({
  isOpen,
  driveToken,
  authBusy,
  pins,
  activePin,
  onClose,
  onConnectGoogleDrive,
  onImportPhotos,
  onAfterImport,
}) => {
  const [activeTab, setActiveTab] = useState<'drive' | 'local'>('drive');

  // Google Drive repository state
  const [folderInput, setFolderInput] = useState(DEFAULT_DRIVE_FOLDER_URL);
  const [driveFiles, setDriveFiles] = useState<DriveImageFile[]>([]);
  const [selectedDriveIds, setSelectedDriveIds] = useState<Record<string, boolean>>({});
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [importingDrive, setImportingDrive] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  // Local EXIF uploader state
  const [localPreviews, setLocalPreviews] = useState<LocalFilePreview[]>([]);
  const [fallbackPinId, setFallbackPinId] = useState<string>(activePin?.id || pins[0]?.id || '');
  const [parsingLocal, setParsingLocal] = useState(false);
  const [importingLocal, setImportingLocal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFallbackPinId(activePin?.id || pins[0]?.id || '');
  }, [activePin?.id, isOpen, pins]);

  // Clean up object URLs on unmount or clear
  useEffect(() => {
    return () => {
      for (const item of localPreviews) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, [localPreviews]);

  const fetchDriveFiles = useCallback(
    async (tokenOverride?: string | null) => {
      const token = tokenOverride ?? driveToken;
      if (!token) return;
      setLoadingDrive(true);
      setDriveError(null);
      try {
        const folderId = parseDriveFolderId(folderInput || DEFAULT_DRIVE_FOLDER_ID);
        const files = await listDriveFolderImages(folderId, token);
        setDriveFiles(files);

        // Pre-select the first 6 images cleanly for quick loading
        const initialSelection: Record<string, boolean> = {};
        files.slice(0, 6).forEach((f) => {
          initialSelection[f.id] = true;
        });
        setSelectedDriveIds(initialSelection);
      } catch (err) {
        setDriveError(
          err instanceof Error
            ? err.message
            : 'No se pudo consultar el directorio de Google Drive.',
        );
      } finally {
        setLoadingDrive(false);
      }
    },
    [driveToken, folderInput],
  );

  // Auto-load Drive folder when modal opens and token is available
  useEffect(() => {
    if (isOpen && activeTab === 'drive' && driveToken && driveFiles.length === 0 && !loadingDrive) {
      void fetchDriveFiles(driveToken);
    }
  }, [activeTab, driveFiles.length, driveToken, fetchDriveFiles, isOpen, loadingDrive]);

  if (!isOpen) return null;

  const handleConnectDriveClick = async () => {
    setDriveError(null);
    const token = await onConnectGoogleDrive();
    if (token) {
      await fetchDriveFiles(token);
    }
  };

  const handleImportDriveBatch = async (filesToImport: DriveImageFile[]) => {
    if (!driveToken || filesToImport.length === 0) return;
    setImportingDrive(true);
    setDriveError(null);

    try {
      const prepared: GeorefPhotoInput[] = [];
      for (let i = 0; i < filesToImport.length; i++) {
        const file = filesToImport[i];
        setImportProgress(
          `Descargando y leyendo metadata (${i + 1}/${filesToImport.length}): ${file.name}`,
        );
        const blob = await downloadDriveImageBlob(file.id, driveToken);
        const driveLoc = file.imageMediaMetadata?.location;
        const driveLat =
          typeof driveLoc?.latitude === 'number' && Number.isFinite(driveLoc.latitude)
            ? driveLoc.latitude
            : null;
        const driveLng =
          typeof driveLoc?.longitude === 'number' && Number.isFinite(driveLoc.longitude)
            ? driveLoc.longitude
            : null;

        prepared.push({
          blob,
          filename: file.name,
          overrideLat: driveLat,
          overrideLng: driveLng,
          overrideTakenAt: file.imageMediaMetadata?.time || '',
        });
      }

      setImportProgress('Georreferenciando y guardando en el atlas...');
      const fallback = pins.find((p) => p.id === fallbackPinId) || activePin || pins[0] || null;
      const result = await onImportPhotos(prepared, fallback, true);
      onAfterImport(result);
      onClose();
    } catch (err) {
      setDriveError(
        err instanceof Error
          ? err.message
          : 'Error al importar las fotografías desde Google Drive.',
      );
    } finally {
      setImportingDrive(false);
      setImportProgress(null);
    }
  };

  const handleSelectLocalFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setParsingLocal(true);

    try {
      const nextPreviews: LocalFilePreview[] = [];
      for (const file of Array.from(files)) {
        const meta = await extractPhotoExifMetadata(file);
        let matchLabel = 'Sin GPS en EXIF · usará ciudad destino';
        if (meta.hasGps && meta.lat !== null && meta.lng !== null) {
          const nearest = findNearestPin(meta.lat, meta.lng, pins, 55);
          if (nearest) {
            matchLabel = `Pin cercano: ${nearest.pin.cityName}, ${nearest.pin.countryName}`;
          } else {
            const country = detectCountryFromCoordinates(meta.lat, meta.lng);
            matchLabel = `Nuevo pincho en ${country.countryName}`;
          }
        }
        nextPreviews.push({
          file,
          previewUrl: URL.createObjectURL(file),
          lat: meta.lat,
          lng: meta.lng,
          takenAt: meta.takenAt,
          hasGps: meta.hasGps,
          matchLabel,
        });
      }
      setLocalPreviews((prev) => [...prev, ...nextPreviews]);
    } finally {
      setParsingLocal(false);
    }
  };

  const handleImportLocalBatch = async () => {
    if (localPreviews.length === 0) return;
    setImportingLocal(true);
    try {
      const fallback = pins.find((p) => p.id === fallbackPinId) || activePin || pins[0] || null;
      const inputs: GeorefPhotoInput[] = localPreviews.map((item) => ({
        blob: item.file,
        filename: item.file.name,
        overrideLat: item.lat,
        overrideLng: item.lng,
        overrideTakenAt: item.takenAt,
      }));
      const result = await onImportPhotos(inputs, fallback, true);
      setLocalPreviews([]);
      onAfterImport(result);
      onClose();
    } finally {
      setImportingLocal(false);
    }
  };

  const selectedDriveList = driveFiles.filter((f) => selectedDriveIds[f.id]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#05070C]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cargar nuevas fotos y georreferenciar por metadata"
    >
      <div className="w-full max-w-3xl bg-[#0F1420] border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <p className="text-xs text-[#F5B742]">
              Georreferenciación automática por metadata EXIF GPS
            </p>
            <h2 className="font-display text-2xl font-semibold text-[#F4F6FA]">
              Cargar nuevas fotos
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-9 h-9 rounded-lg border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Tabs */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-[#07090F] border border-white/10 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('drive')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'drive'
                  ? 'bg-[#1C253A] text-[#FCD34D]'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Repositorio Google Drive
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('local')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'local'
                  ? 'bg-[#1C253A] text-[#FCD34D]'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Subir desde dispositivo
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Fallback Destination Selector (for photos lacking GPS EXIF) */}
          <div className="bg-[#07090F] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-200">
                Destino de respaldo si una foto no incluye GPS en su metadata
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Si la imagen tiene coordenadas EXIF, se ubicará automáticamente en su latitud y longitud exactas.
              </p>
            </div>
            <select
              value={fallbackPinId}
              onChange={(e) => setFallbackPinId(e.target.value)}
              className="bg-[#0F1420] border border-white/15 rounded-lg px-3 py-2 text-xs text-[#F4F6FA] focus:outline-none focus:border-[#F5B742] sm:w-56 shrink-0"
            >
              {pins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cityName} · {p.countryName}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'drive' ? (
            <div className="space-y-4">
              {/* Drive Folder URL / ID Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={folderInput}
                  onChange={(e) => setFolderInput(e.target.value)}
                  placeholder="URL o ID de carpeta de Google Drive"
                  className="flex-1 bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono-tabular focus:outline-none focus:border-[#F5B742]"
                />
                {driveToken && (
                  <button
                    type="button"
                    disabled={loadingDrive}
                    onClick={() => void fetchDriveFiles()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-white/15 text-slate-200 hover:border-[#F5B742]/50 hover:text-[#FCD34D] transition-colors shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDrive ? 'animate-spin' : ''}`} />
                    Actualizar carpeta
                  </button>
                )}
              </div>

              {driveError && (
                <div className="bg-rose-950/50 border border-rose-400/40 rounded-xl px-4 py-3 text-xs text-rose-200">
                  {driveError}
                </div>
              )}

              {!driveToken ? (
                <div className="bg-[#07090F] border border-white/10 rounded-xl p-8 text-center space-y-4">
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="font-display text-2xl font-semibold text-[#F4F6FA]">
                      Conecta tu carpeta de Google Drive
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Autoriza el acceso de lectura a Google Drive para listar las fotografías de tu repositorio compartido, leer su metadata GPS e importar las primeras imágenes al globo 3D.
                    </p>
                  </div>

                  {/* Official Google Sign-in button styling */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={() => void handleConnectDriveClick()}
                      className="inline-flex items-center gap-3 px-5 py-2.5 rounded-md bg-white text-[#1F1F1F] hover:bg-slate-100 text-sm font-medium shadow-sm transition-colors disabled:opacity-60"
                    >
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="w-4 h-4 shrink-0"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      <span>{authBusy ? 'Conectando...' : 'Sign in with Google'}</span>
                    </button>
                  </div>
                </div>
              ) : loadingDrive ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-300">
                  <Loader2 className="w-6 h-6 text-[#F5B742] animate-spin" />
                  <p className="text-xs">Consultando imágenes en Google Drive...</p>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="bg-[#07090F] border border-white/10 rounded-xl p-8 text-center space-y-2">
                  <p className="text-sm text-slate-200">
                    No se encontraron imágenes en esta carpeta.
                  </p>
                  <p className="text-xs text-slate-400">
                    Verifica que el enlace corresponda a una carpeta compartida contigo o con fotografías en formato JPG/PNG/HEIC.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-300 font-mono-tabular">
                      {driveFiles.length} imagen(es) encontrada(s) · {selectedDriveList.length} seleccionada(s)
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={importingDrive}
                        onClick={() => void handleImportDriveBatch(driveFiles.slice(0, 6))}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#161D2E] border border-[#F5B742]/50 text-[#FCD34D] hover:bg-[#F5B742]/15 disabled:opacity-50 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Cargar primeras imágenes ({Math.min(6, driveFiles.length)})
                      </button>

                      <button
                        type="button"
                        disabled={importingDrive || selectedDriveList.length === 0}
                        onClick={() => void handleImportDriveBatch(selectedDriveList)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#F5B742] text-[#07090F] hover:bg-[#FCD34D] disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Importar seleccionadas ({selectedDriveList.length})
                      </button>
                    </div>
                  </div>

                  {importProgress && (
                    <div className="bg-[#12192A] border border-[#F5B742]/40 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-[#FDE68A]">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>{importProgress}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {driveFiles.map((file) => {
                      const isChecked = Boolean(selectedDriveIds[file.id]);
                      const loc = file.imageMediaMetadata?.location;
                      const hasDriveGps =
                        typeof loc?.latitude === 'number' && typeof loc?.longitude === 'number';
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() =>
                            setSelectedDriveIds((prev) => ({
                              ...prev,
                              [file.id]: !prev[file.id],
                            }))
                          }
                          className={`text-left p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                            isChecked
                              ? 'bg-[#161D2E] border-[#F5B742]/70'
                              : 'bg-[#07090F] border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="w-16 h-14 rounded-lg overflow-hidden bg-[#12192A] shrink-0 flex items-center justify-center">
                            {file.thumbnailLink ? (
                              <img
                                src={file.thumbnailLink}
                                alt={file.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs font-medium text-[#F4F6FA] truncate">
                              {file.name}
                            </p>
                            <p className="font-mono-tabular text-[11px] text-[#F5B742] truncate">
                              {hasDriveGps
                                ? formatCoords(loc!.latitude!, loc!.longitude!)
                                : 'Leerá EXIF al importar'}
                            </p>
                            {file.imageMediaMetadata?.time && (
                              <p className="text-[11px] text-slate-400 truncate">
                                {file.imageMediaMetadata.time}
                              </p>
                            )}
                          </div>
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? 'bg-[#F5B742] border-[#F5B742] text-[#07090F]'
                                : 'border-white/25'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block w-full py-8 px-6 rounded-xl border border-dashed border-white/20 bg-[#07090F] hover:border-[#F5B742]/60 transition-colors cursor-pointer text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleSelectLocalFiles}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-[#F5B742] mx-auto mb-2" />
                <p className="text-sm font-medium text-[#F4F6FA]">
                  {parsingLocal
                    ? 'Extrayendo metadata GPS de tus fotografías...'
                    : 'Seleccionar fotografías con o sin metadata GPS'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Las coordenadas EXIF se detectan automáticamente para ubicar cada pincho en el globo 3D.
                </p>
              </label>

              {localPreviews.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300 font-mono-tabular">
                      {localPreviews.length} archivo(s) listo(s)
                    </p>
                    <button
                      type="button"
                      disabled={importingLocal}
                      onClick={() => void handleImportLocalBatch()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#F5B742] text-[#07090F] hover:bg-[#FCD34D] disabled:opacity-60 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {importingLocal
                        ? 'Georreferenciando...'
                        : `Georreferenciar e importar (${localPreviews.length})`}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {localPreviews.map((item, idx) => (
                      <div
                        key={`${item.file.name}-${idx}`}
                        className="p-3 rounded-xl bg-[#07090F] border border-white/10 flex items-center gap-3"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-16 h-14 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-medium text-[#F4F6FA] truncate">
                            {item.file.name}
                          </p>
                          <p className="font-mono-tabular text-[11px] text-[#F5B742] truncate">
                            {item.hasGps && item.lat !== null && item.lng !== null
                              ? formatCoords(item.lat, item.lng)
                              : 'Sin coordenadas EXIF'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.matchLabel}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
