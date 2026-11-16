import React, { useMemo, useState } from 'react';
import { MapPin, Plus, Search } from 'lucide-react';
import type { CountryRecord, TravelPhoto, TravelPin } from '../types/travel';

interface CountriesDirectoryProps {
  countries: CountryRecord[];
  pins: TravelPin[];
  photos: TravelPhoto[];
  selectedPinId: string | null;
  regionFilter: 'Todas' | 'Sudamérica' | 'Europa' | 'Otras';
  onChangeRegionFilter: (filter: 'Todas' | 'Sudamérica' | 'Europa' | 'Otras') => void;
  onSelectPin: (pin: TravelPin) => void;
  onAddCityToCountry: (country: CountryRecord) => void;
  onOpenNewPinModal: () => void;
}

export const CountriesDirectory: React.FC<CountriesDirectoryProps> = ({
  countries,
  pins,
  photos,
  selectedPinId,
  regionFilter,
  onChangeRegionFilter,
  onSelectPin,
  onAddCityToCountry,
  onOpenNewPinModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const photoCountByPin = useMemo(() => {
    const map = new Map<string, number>();
    for (const ph of photos) {
      map.set(ph.pinId, (map.get(ph.pinId) || 0) + 1);
    }
    return map;
  }, [photos]);

  const groupedCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return countries
      .filter((country) => {
        if (regionFilter === 'Sudamérica') return country.region === 'Sudamérica';
        if (regionFilter === 'Europa') return country.region === 'Europa';
        if (regionFilter === 'Otras') {
          return country.region !== 'Sudamérica' && country.region !== 'Europa';
        }
        return true;
      })
      .map((country) => {
        const countryPins = pins.filter((p) => p.countryId === country.id);
        const matchingPins = q
          ? countryPins.filter(
              (p) =>
                p.cityName.toLowerCase().includes(q) ||
                country.name.toLowerCase().includes(q) ||
                p.notes.toLowerCase().includes(q),
            )
          : countryPins;

        const countryMatches = country.name.toLowerCase().includes(q);
        return {
          country,
          pins: countryMatches && q ? countryPins : matchingPins,
          visible: !q || countryMatches || matchingPins.length > 0,
        };
      })
      .filter((entry) => entry.visible);
  }, [countries, pins, regionFilter, searchQuery]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#F4F6FA]">
            Países y ciudades visitadas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono-tabular">
            {countries.length} países · {pins.length} pinchos en el globo
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewPinModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#161D2E] border border-white/15 text-slate-100 hover:border-[#F5B742]/50 hover:text-[#FCD34D] transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo país o ciudad
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#0F1420] border border-white/10 rounded-lg overflow-x-auto">
          {(['Todas', 'Sudamérica', 'Europa', 'Otras'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onChangeRegionFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                regionFilter === tab
                  ? 'bg-[#1C253A] text-[#FCD34D]'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar país, ciudad o nota..."
            className="w-full bg-[#0F1420] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-[#F4F6FA] placeholder:text-slate-500 focus:outline-none focus:border-[#F5B742]"
          />
        </div>
      </div>

      {/* Country Grid */}
      {groupedCountries.length === 0 ? (
        <div className="bg-[#0F1420] border border-white/10 rounded-xl p-8 text-center space-y-2">
          <p className="text-sm text-slate-300">
            No encontramos países o ciudades con ese filtro.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              onChangeRegionFilter('Todas');
            }}
            className="text-xs font-medium text-[#F5B742] hover:text-[#FCD34D]"
          >
            Mostrar todos los destinos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupedCountries.map(({ country, pins: countryPins }) => (
            <article
              key={country.id}
              className="bg-[#0F1420] border border-white/10 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-slate-400">
                      {country.region} · {country.code}
                    </p>
                    <h3 className="font-display text-2xl font-semibold text-[#F4F6FA]">
                      {country.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddCityToCountry(country)}
                    title={`Añadir ciudad en ${country.name}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-white/10 text-slate-300 hover:border-[#F5B742]/50 hover:text-[#FCD34D] transition-colors shrink-0 whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" />
                    Ciudad
                  </button>
                </div>

                <div className="h-px bg-white/10" />

                {countryPins.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Sin ciudades marcadas aún en {country.name}.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {countryPins.map((pin) => {
                      const isSelected = pin.id === selectedPinId;
                      const picCount = photoCountByPin.get(pin.id) || 0;
                      return (
                        <li key={pin.id}>
                          <button
                            type="button"
                            onClick={() => onSelectPin(pin)}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                              isSelected
                                ? 'bg-[#1B2438] text-[#FCD34D]'
                                : 'text-slate-200 hover:bg-white/5'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <MapPin
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isSelected ? 'text-[#F5B742]' : 'text-slate-500'
                                }`}
                              />
                              <span className="text-sm font-medium truncate">
                                {pin.cityName}
                              </span>
                            </span>
                            <span className="font-mono-tabular text-[11px] text-slate-400 shrink-0">
                              {picCount > 0 ? `${picCount} foto${picCount === 1 ? '' : 's'}` : 'Ver'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
