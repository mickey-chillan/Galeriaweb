import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Compass, X } from 'lucide-react';
import type { TravelPhoto } from '../types/travel';
import { formatCoords } from '../utils/geoMath';

interface PhotoLightboxProps {
  photos: TravelPhoto[];
  activeIndex: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  onFocusPin?: (pinId: string) => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  activeIndex,
  onClose,
  onNavigate,
  onFocusPin,
}) => {
  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && photos.length > 1) {
        onNavigate((activeIndex + 1) % photos.length);
      }
      if (e.key === 'ArrowLeft' && photos.length > 1) {
        onNavigate((activeIndex - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, onClose, onNavigate, photos.length]);

  if (activeIndex === null || !photos[activeIndex]) return null;
  const photo = photos[activeIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#05070C]/95 flex flex-col justify-between p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Fotografía de ${photo.cityName}`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">
            {photo.countryName} · {activeIndex + 1} / {photos.length}
          </p>
          <h3 className="font-display text-2xl font-semibold text-[#F4F6FA] truncate">
            {photo.cityName}
          </h3>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {onFocusPin && (
            <button
              type="button"
              onClick={() => {
                onFocusPin(photo.pinId);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#F5B742]/40 text-[#FCD34D] hover:bg-[#F5B742]/15 transition-colors whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5" />
              Ver en el globo
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar visor"
            className="w-10 h-10 rounded-lg border border-white/15 bg-[#0F1420] text-slate-200 hover:text-white hover:border-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Image */}
      <div className="relative flex-1 flex items-center justify-center my-4 min-h-0">
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => onNavigate((activeIndex - 1 + photos.length) % photos.length)}
            aria-label="Fotografía anterior"
            className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-lg bg-[#0F1420]/90 border border-white/15 text-slate-200 hover:text-[#FCD34D] flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={photo.imageUrl}
          alt={photo.caption || `${photo.cityName}, ${photo.countryName}`}
          referrerPolicy="no-referrer"
          className="max-h-full max-w-full object-contain rounded-xl border border-white/10"
        />

        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => onNavigate((activeIndex + 1) % photos.length)}
            aria-label="Fotografía siguiente"
            className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-lg bg-[#0F1420]/90 border border-white/15 text-slate-200 hover:text-[#FCD34D] flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Caption & Georeference Metadata */}
      <div className="text-center max-w-2xl mx-auto space-y-1">
        <p className="text-sm text-slate-200">
          {photo.caption || `Recuerdo en ${photo.cityName}, ${photo.countryName}`}
        </p>
        <p className="font-mono-tabular text-xs text-[#F5B742]">
          {formatCoords(photo.lat, photo.lng)}
          {photo.takenAt ? ` · ${photo.takenAt}` : ''}
        </p>
      </div>
    </div>
  );
};
