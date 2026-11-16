import React, { useMemo, useState } from 'react';
import { Camera, Compass, Image as ImageIcon } from 'lucide-react';
import type { TravelPhoto, TravelPin } from '../types/travel';
import { formatCoords } from '../utils/geoMath';

interface GalleryViewProps {
  photos: TravelPhoto[];
  pins: TravelPin[];
  onOpenLightbox: (list: TravelPhoto[], index: number) => void;
  onFocusPin: (pinId: string) => void;
  onOpenPhotoImporter: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  photos,
  pins,
  onOpenLightbox,
  onFocusPin,
  onOpenPhotoImporter,
}) => {
  const [countryFilter, setCountryFilter] = useState<string>('Todos');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const countryOptions = useMemo(() => {
    const names = Array.from(new Set(photos.map((ph) => ph.countryName))).sort((a, b) =>
      a.localeCompare(b, 'es'),
    );
    return ['Todos', ...names];
  }, [photos]);

  const visiblePhotos = useMemo(() => {
    if (countryFilter === 'Todos') return photos;
    return photos.filter((ph) => ph.countryName === countryFilter);
  }, [countryFilter, photos]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs text-[#F5B742]">Archivo visual georreferenciado</p>
          <h2 className="font-display text-3xl font-semibold text-[#F4F6FA] mt-1">
            Galería fotográfica del atlas
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono-tabular">
            {visiblePhotos.length} fotografía{visiblePhotos.length === 1 ? '' : 's'} · {pins.length} destinos marcados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenPhotoImporter}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F5B742] text-[#07090F] hover:bg-[#FCD34D] transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            Cargar nuevas fotos
          </button>

          {countryOptions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCountryFilter(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                countryFilter === c
                  ? 'bg-[#1C253A] text-[#FCD34D] border border-[#F5B742]/40'
                  : 'bg-[#0F1420] border border-white/10 text-slate-400 hover:text-slate-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {visiblePhotos.length === 0 ? (
        <div className="bg-[#0F1420] border border-white/10 rounded-2xl p-10 text-center space-y-2">
          <p className="font-display text-xl text-slate-200">
            Aún no hay fotografías en este filtro
          </p>
          <p className="text-xs text-slate-400">
            Usa el botón &quot;Cargar nuevas fotos&quot; para importar desde Google Drive o subir imágenes con metadata GPS.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visiblePhotos.map((photo, index) => (
            <article
              key={photo.id}
              className={`bg-[#0F1420] border border-white/10 rounded-2xl overflow-hidden flex flex-col ${
                index === 0 ? 'sm:col-span-2' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onOpenLightbox(visiblePhotos, index)}
                className={`relative w-full overflow-hidden bg-[#12192A] ${
                  index === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'
                }`}
              >
                {failedImages[photo.id] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#121A2C] to-[#080C15]">
                    <ImageIcon className="w-7 h-7 text-[#F5B742]/70" />
                    <span className="text-xs text-slate-300">{photo.cityName}</span>
                  </div>
                ) : (
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption || `${photo.cityName}, ${photo.countryName}`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [photo.id]: true }))
                    }
                    className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                  />
                )}
              </button>

              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 truncate">
                    {photo.countryName} · {photo.cityName}
                  </p>
                  <p className="text-sm text-slate-100 truncate mt-0.5">
                    {photo.caption || `Recuerdo en ${photo.cityName}`}
                  </p>
                  <p className="font-mono-tabular text-[11px] text-[#F5B742] truncate mt-0.5">
                    {formatCoords(photo.lat, photo.lng)}
                    {photo.takenAt ? ` · ${photo.takenAt}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onFocusPin(photo.pinId)}
                  title={`Ver ${photo.cityName} en el globo`}
                  className="p-2 rounded-lg border border-white/10 text-slate-300 hover:text-[#FCD34D] hover:border-[#F5B742]/50 transition-colors shrink-0"
                >
                  <Compass className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
