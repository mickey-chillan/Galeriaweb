import React, { useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Camera,
  Check,
  Compass,
  ExternalLink,
  Image as ImageIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import type { TravelPhoto, TravelPin, TravelReference } from '../types/travel';
import { formatCoords } from '../utils/geoMath';

interface DestinationDetailProps {
  pin: TravelPin;
  references: TravelReference[];
  photos: TravelPhoto[];
  onCenterGlobe: (pin: TravelPin) => void;
  onSaveNotes: (
    pinId: string,
    notes: string,
    visitDate: string,
    routeGroup: string,
  ) => Promise<void>;
  onDeletePin: (pinId: string) => Promise<void>;
  onAddReference: (pinId: string, title: string, detail: string, url: string) => Promise<void>;
  onDeleteReference: (refId: string) => Promise<void>;
  onUploadPhotos: (pin: TravelPin, files: FileList, caption: string) => Promise<unknown>;
  onOpenPhotoImporter: () => void;
  onUpdatePhotoCaption: (photoId: string, caption: string) => Promise<void>;
  onDeletePhoto: (photoId: string) => Promise<void>;
  onOpenLightbox: (pinPhotos: TravelPhoto[], index: number) => void;
}

export const DestinationDetail: React.FC<DestinationDetailProps> = ({
  pin,
  references,
  photos,
  onCenterGlobe,
  onSaveNotes,
  onDeletePin,
  onAddReference,
  onDeleteReference,
  onUploadPhotos,
  onOpenPhotoImporter,
  onUpdatePhotoCaption,
  onDeletePhoto,
  onOpenLightbox,
}) => {
  const [notes, setNotes] = useState(pin.notes);
  const [visitDate, setVisitDate] = useState(pin.visitDate);
  const [routeGroup, setRouteGroup] = useState(pin.routeGroup);
  const [savingNotes, setSavingNotes] = useState(false);
  const [confirmDeletePin, setConfirmDeletePin] = useState(false);

  const [showRefForm, setShowRefForm] = useState(false);
  const [refTitle, setRefTitle] = useState('');
  const [refDetail, setRefDetail] = useState('');
  const [refUrl, setRefUrl] = useState('');

  const [photoCaptionDraft, setPhotoCaptionDraft] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingCaptionText, setEditingCaptionText] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNotes(pin.notes);
    setVisitDate(pin.visitDate);
    setRouteGroup(pin.routeGroup);
    setConfirmDeletePin(false);
    setShowRefForm(false);
  }, [pin.id, pin.notes, pin.visitDate, pin.routeGroup]);

  const notesDirty =
    notes !== pin.notes ||
    visitDate !== pin.visitDate ||
    routeGroup !== pin.routeGroup;

  const handleSaveNotesClick = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(pin.id, notes, visitDate, routeGroup);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRefSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refTitle.trim()) return;
    await onAddReference(pin.id, refTitle, refDetail, refUrl);
    setRefTitle('');
    setRefDetail('');
    setRefUrl('');
    setShowRefForm(false);
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      await onUploadPhotos(pin, files, photoCaptionDraft);
      setPhotoCaptionDraft('');
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <section className="bg-[#0F1420] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-8">
      {/* Header Metadata (Zero-Pill Discipline) */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>{pin.region}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-200 font-medium">{pin.countryName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-[#F5B742]">
              {formatCoords(pin.lat, pin.lng)}
            </span>
          </div>
          <h2 className="font-display text-4xl font-semibold text-[#F4F6FA] tracking-tight text-balance">
            {pin.cityName}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onCenterGlobe(pin)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#F5B742]/40 text-[#FCD34D] hover:bg-[#F5B742]/15 transition-colors whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5" />
            Centrar en globo
          </button>

          {confirmDeletePin ? (
            <button
              type="button"
              onClick={() => void onDeletePin(pin.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-rose-500/20 border border-rose-400/50 text-rose-200 hover:bg-rose-500/30 transition-colors whitespace-nowrap"
            >
              Confirmar baja
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeletePin(true)}
              title="Eliminar pincho"
              aria-label="Eliminar pincho"
              className="w-9 h-9 rounded-lg border border-white/10 text-slate-400 hover:text-rose-300 hover:border-rose-400/40 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Personal Notes & Visit Metadata */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#F4F6FA]">
            Notas personales del viaje
          </h3>
          {notesDirty && (
            <button
              type="button"
              onClick={handleSaveNotesClick}
              disabled={savingNotes}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F5B742] text-[#07090F] hover:bg-[#FCD34D] transition-colors self-start sm:self-auto"
            >
              <Check className="w-3.5 h-3.5" />
              {savingNotes ? 'Guardando...' : 'Guardar notas'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Fecha o etapa</label>
            <input
              type="text"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              placeholder="Ej. Primavera 2024"
              className="w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742]"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Circuito o ruta en el globo
            </label>
            <input
              type="text"
              value={routeGroup}
              onChange={(e) => setRouteGroup(e.target.value)}
              placeholder="Ej. Titicaca a La Paz"
              className="w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742]"
            />
          </div>
        </div>

        <div>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escribe tus recuerdos, calles recorridas, comidas o detalles que no quieres olvidar..."
            className="w-full bg-[#07090F] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 leading-relaxed placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742]"
          />
        </div>
      </div>

      {/* References & Recommendations */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#F4F6FA]">
              Referencias y lugares recomendados
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Miradores, rutas, alojamientos o enlaces útiles de {pin.cityName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRefForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/15 text-slate-200 hover:border-[#F5B742]/50 hover:text-[#FCD34D] transition-colors whitespace-nowrap"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Añadir referencia
          </button>
        </div>

        {showRefForm && (
          <form
            onSubmit={handleRefSubmit}
            className="bg-[#07090F] border border-white/10 rounded-xl p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={refTitle}
                onChange={(e) => setRefTitle(e.target.value)}
                placeholder="Nombre del lugar o referencia *"
                className="bg-[#0F1420] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742]"
              />
              <input
                type="url"
                value={refUrl}
                onChange={(e) => setRefUrl(e.target.value)}
                placeholder="Enlace opcional (https://...)"
                className="bg-[#0F1420] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742]"
              />
            </div>
            <input
              type="text"
              value={refDetail}
              onChange={(e) => setRefDetail(e.target.value)}
              placeholder="Nota breve (horario, consejo de acceso, qué pedir...)"
              className="w-full bg-[#0F1420] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRefForm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F5B742] text-[#07090F] hover:bg-[#FCD34D]"
              >
                Guardar referencia
              </button>
            </div>
          </form>
        )}

        {references.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aún no hay referencias guardadas en {pin.cityName}.
          </p>
        ) : (
          <ul className="divide-y divide-white/10 border border-white/10 rounded-xl bg-[#07090F]/60">
            {references.map((ref) => (
              <li
                key={ref.id}
                className="px-4 py-3 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#F4F6FA]">{ref.title}</p>
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#F5B742] hover:text-[#FCD34D] inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir
                      </a>
                    )}
                  </div>
                  {ref.detail && (
                    <p className="text-xs text-slate-400 leading-relaxed">{ref.detail}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void onDeleteReference(ref.id)}
                  aria-label={`Eliminar referencia ${ref.title}`}
                  className="p-1.5 text-slate-500 hover:text-rose-300 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* City Photography Gallery */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#F4F6FA]">
              Fotografías de {pin.cityName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {photos.length} imagen{photos.length === 1 ? '' : 'es'} registrada{photos.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={photoCaptionDraft}
              onChange={(e) => setPhotoCaptionDraft(e.target.value)}
              placeholder="Pie de foto opcional..."
              className="bg-[#07090F] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F4F6FA] placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742] w-44"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploadingPhotos}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#161D2E] border border-[#F5B742]/40 text-[#FCD34D] hover:bg-[#F5B742]/15 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5" />
              {uploadingPhotos ? 'Procesando...' : 'Subir fotografías'}
            </button>
            <button
              type="button"
              onClick={onOpenPhotoImporter}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-white/15 text-slate-200 hover:border-[#F5B742]/50 hover:text-[#FCD34D] transition-colors whitespace-nowrap"
            >
              Cargar nuevas fotos
            </button>
          </div>
        </div>

        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-10 px-6 rounded-xl border border-dashed border-white/15 bg-[#07090F]/50 hover:border-[#F5B742]/50 transition-colors flex flex-col items-center justify-center gap-2 text-center"
          >
            <Plus className="w-5 h-5 text-[#F5B742]" />
            <span className="text-sm font-medium text-slate-200">
              Añadir fotografías de {pin.cityName}
            </span>
            <span className="text-xs text-slate-500">
              Se optimizan automáticamente para guardarse en tu atlas en la nube
            </span>
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group bg-[#07090F] border border-white/10 rounded-xl overflow-hidden flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => onOpenLightbox(photos, index)}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-[#12192A] text-left"
                >
                  {failedImages[photo.id] ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-[#121A2C] to-[#080C15]">
                      <ImageIcon className="w-6 h-6 text-[#F5B742]/70" />
                      <span className="text-xs text-slate-400 text-center">
                        {photo.cityName}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={photo.imageUrl}
                      alt={photo.caption || `${pin.cityName}, ${pin.countryName}`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [photo.id]: true }))
                      }
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  )}
                </button>

                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    {editingCaptionId === photo.id ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await onUpdatePhotoCaption(photo.id, editingCaptionText);
                          setEditingCaptionId(null);
                        }}
                        className="flex-1 flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingCaptionText}
                          onChange={(e) => setEditingCaptionText(e.target.value)}
                          className="w-full bg-[#0F1420] border border-[#F5B742]/50 rounded px-2 py-1 text-xs text-[#F4F6FA] focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="text-xs text-[#FCD34D] font-medium px-1.5"
                        >
                          OK
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCaptionId(photo.id);
                          setEditingCaptionText(photo.caption);
                        }}
                        className="text-xs text-slate-300 hover:text-[#FCD34D] text-left truncate flex-1"
                        title="Editar pie de foto"
                      >
                        {photo.caption || 'Sin descripción · Editar'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void onDeletePhoto(photo.id)}
                      aria-label="Eliminar fotografía"
                      className="p-1 text-slate-500 hover:text-rose-300 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-mono-tabular text-[10px] text-slate-400 truncate">
                    {photo.hasGps ? formatCoords(photo.lat, photo.lng) : 'Ubicación heredada del pincho'}
                    {photo.takenAt ? ` · ${photo.takenAt}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
