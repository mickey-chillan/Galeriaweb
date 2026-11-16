import React, { useEffect, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { QUICK_CITY_PRESETS } from '../data/starterDestinations';
import {
  TRAVEL_REGIONS,
  type CountryRecord,
  type NewPinDraft,
  type TravelRegion,
} from '../types/travel';
import { inferRegionFromLatLng } from '../utils/globeTexture';

interface AddPinModalProps {
  isOpen: boolean;
  initialCoords: { lat: number; lng: number } | null;
  initialCountry: CountryRecord | null;
  countries: CountryRecord[];
  onClose: () => void;
  onSubmit: (draft: NewPinDraft) => Promise<void>;
}

export const AddPinModal: React.FC<AddPinModalProps> = ({
  isOpen,
  initialCoords,
  initialCountry,
  countries,
  onClose,
  onSubmit,
}) => {
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [region, setRegion] = useState<TravelRegion>('Sudamérica');
  const [cityName, setCityName] = useState('');
  const [lat, setLat] = useState('0');
  const [lng, setLng] = useState('0');
  const [visitDate, setVisitDate] = useState('');
  const [routeGroup, setRouteGroup] = useState('');
  const [notes, setNotes] = useState('');
  const [presetQuery, setPresetQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialCoords) {
      setLat(initialCoords.lat.toFixed(4));
      setLng(initialCoords.lng.toFixed(4));
      setRegion(inferRegionFromLatLng(initialCoords.lat, initialCoords.lng));
    } else if (initialCountry) {
      setCountryName(initialCountry.name);
      setCountryCode(initialCountry.code);
      setRegion(initialCountry.region);
      setLat('0');
      setLng('0');
    } else {
      setCountryName('');
      setCountryCode('');
      setRegion('Sudamérica');
      setLat('-13.5319');
      setLng('-71.9675');
    }
    setCityName('');
    setVisitDate('');
    setRouteGroup('');
    setNotes('');
    setPresetQuery('');
  }, [initialCoords, initialCountry, isOpen]);

  if (!isOpen) return null;

  const filteredPresets = presetQuery.trim()
    ? QUICK_CITY_PRESETS.filter(
        (p) =>
          p.city.toLowerCase().includes(presetQuery.toLowerCase()) ||
          p.country.toLowerCase().includes(presetQuery.toLowerCase()),
      ).slice(0, 6)
    : [];

  const handleApplyPreset = (preset: (typeof QUICK_CITY_PRESETS)[number]) => {
    setCityName(preset.city);
    setCountryName(preset.country);
    setCountryCode(preset.code);
    setRegion(preset.region);
    setLat(preset.lat.toFixed(4));
    setLng(preset.lng.toFixed(4));
    setPresetQuery('');
  };

  const handleSelectExistingCountry = (countryId: string) => {
    const found = countries.find((c) => c.id === countryId);
    if (!found) return;
    setCountryName(found.name);
    setCountryCode(found.code);
    setRegion(found.region);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityName.trim() || !countryName.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        countryName: countryName.trim(),
        countryCode: (countryCode.trim() || countryName.trim().slice(0, 2)).toUpperCase(),
        region,
        cityName: cityName.trim(),
        lat: Number(lat) || 0,
        lng: Number(lng) || 0,
        visitDate: visitDate.trim(),
        notes: notes.trim(),
        routeGroup: routeGroup.trim(),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#05070C]/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Añadir nuevo destino y pincho"
    >
      <div className="w-full max-w-xl bg-[#0F1420] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <p className="text-xs text-[#F5B742]">Nuevo registro geográfico</p>
            <h2 className="font-display text-2xl font-semibold text-[#F4F6FA]">
              Incorporar país, ciudad y pincho
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

        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Quick city coordinate search */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Sugerencia rápida de coordenadas (opcional)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={presetQuery}
                onChange={(e) => setPresetQuery(e.target.value)}
                placeholder="Buscar ciudad (ej. Santiago, Lisboa, Tokio, Cartagena)..."
                className="w-full bg-[#07090F] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-[#F4F6FA] placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742]"
              />
            </div>
            {filteredPresets.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {filteredPresets.map((preset) => (
                  <button
                    key={`${preset.country}-${preset.city}`}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-left px-3 py-2 rounded-lg bg-[#161D2E] hover:bg-[#1E273D] border border-white/10 transition-colors"
                  >
                    <p className="text-xs font-medium text-[#F4F6FA]">{preset.city}</p>
                    <p className="text-[11px] text-slate-400">{preset.country}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-white/10" />

          {/* Existing country quick pick */}
          {countries.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Elegir un país ya incorporado o escribir uno nuevo abajo
              </label>
              <select
                value={
                  countries.find((c) => c.name.toLowerCase() === countryName.toLowerCase())?.id || ''
                }
                onChange={(e) => handleSelectExistingCountry(e.target.value)}
                className="w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#F5B742]"
              >
                <option value="">Escribir un país nuevo...</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.region})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                País *
              </label>
              <input
                type="text"
                required
                value={countryName}
                onChange={(e) => setCountryName(e.target.value)}
                placeholder="Ej. Chile, Portugal, Perú"
                className="w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#F5B742]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Ciudad o lugar *
              </label>
              <input
                type="text"
                required
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Ej. Valparaíso, Oporto"
                className="w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#F5B742]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Región
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as TravelRegion)}
                className="w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#F5B742]"
              >
                {TRAVEL_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Latitud
              </label>
              <input
                type="number"
                step="any"
                min={-90}
                max={90}
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="font-mono-tabular w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#F5B742]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Longitud
              </label>
              <input
                type="number"
                step="any"
                min={-180}
                max={180}
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="font-mono-tabular w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#F5B742]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Fecha o etapa del viaje
              </label>
              <input
                type="text"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                placeholder="Ej. Octubre 2024"
                className="w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#F5B742]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Ruta o circuito (conecta pinchos)
              </label>
              <input
                type="text"
                value={routeGroup}
                onChange={(e) => setRouteGroup(e.target.value)}
                placeholder="Ej. Titicaca a La Paz"
                className="w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#F5B742]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Notas personales
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Impresiones, barrios favoritos, sensaciones o recuerdos..."
              className="w-full bg-[#07090F] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F4F6FA] placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[#F5B742] text-[#07090F] hover:bg-[#FCD34D] disabled:opacity-60 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              {submitting ? 'Guardando...' : 'Clavar pincho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
