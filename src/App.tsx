import { useCallback, useMemo, useState } from 'react';
import { Camera, Cloud, LogIn, LogOut, MapPin, X } from 'lucide-react';
import { AddPinModal } from './components/AddPinModal';
import { CountriesDirectory } from './components/CountriesDirectory';
import { DestinationDetail } from './components/DestinationDetail';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GalleryView } from './components/GalleryView';
import { GlobeViewport, type GlobeFocusRequest } from './components/GlobeViewport';
import { PhotoImporterModal } from './components/PhotoImporterModal';
import { PhotoLightbox } from './components/PhotoLightbox';
import { useTravelAtlas, type ImportPhotosResult } from './hooks/useTravelAtlas';
import type {
  ActiveNavView,
  CountryRecord,
  NewPinDraft,
  TravelPhoto,
  TravelPin,
} from './types/travel';

function NoctisAtlasApp() {
  const {
    user,
    driveToken,
    authBusy,
    syncingStarter,
    statusMessage,
    errorMessage,
    clearStatus,
    clearError,
    countries,
    pins,
    references,
    photos,
    signInWithGoogle,
    signOutUser,
    addPin,
    updatePinNotes,
    deletePin,
    addReference,
    deleteReference,
    uploadPhotos,
    importGeoreferencedPhotos,
    updatePhotoCaption,
    deletePhoto,
  } = useTravelAtlas();

  const [activeView, setActiveView] = useState<ActiveNavView>('globo');
  const [regionFilter, setRegionFilter] = useState<'Todas' | 'Sudamérica' | 'Europa' | 'Otras'>('Todas');
  const [selectedPinId, setSelectedPinId] = useState<string | null>('pe-cusco');
  const [isPlacingPin, setIsPlacingPin] = useState(false);

  const [focusRequest, setFocusRequest] = useState<GlobeFocusRequest | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCoords, setModalCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [modalCountry, setModalCountry] = useState<CountryRecord | null>(null);

  const [importerOpen, setImporterOpen] = useState(false);

  const [lightboxPhotos, setLightboxPhotos] = useState<TravelPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const triggerFocus = useCallback((lat: number, lng: number, distance: number) => {
    setFocusRequest({ lat, lng, distance, nonce: Date.now() + Math.random() });
  }, []);

  const selectedPin = useMemo(() => {
    if (!pins.length) return null;
    return pins.find((p) => p.id === selectedPinId) || pins[0];
  }, [pins, selectedPinId]);

  const activePinReferences = useMemo(() => {
    if (!selectedPin) return [];
    return references.filter((r) => r.pinId === selectedPin.id);
  }, [references, selectedPin]);

  const activePinPhotos = useMemo(() => {
    if (!selectedPin) return [];
    return photos.filter((ph) => ph.pinId === selectedPin.id);
  }, [photos, selectedPin]);

  const handleSelectPinById = useCallback(
    (pinId: string) => {
      const target = pins.find((p) => p.id === pinId);
      if (!target) return;
      setSelectedPinId(target.id);
      setActiveView((prev) => (prev === 'galeria' ? 'globo' : prev));
      triggerFocus(target.lat, target.lng, 1.85);
    },
    [pins, triggerFocus],
  );

  const handleSelectPinObject = useCallback(
    (pin: TravelPin) => {
      setSelectedPinId(pin.id);
      triggerFocus(pin.lat, pin.lng, 1.85);
    },
    [triggerFocus],
  );

  const handleFocusRegion = useCallback(
    (region: 'sudamerica' | 'europa' | 'global') => {
      if (region === 'sudamerica') {
        triggerFocus(-18, -63, 2.35);
      } else if (region === 'europa') {
        triggerFocus(47, 6, 2.05);
      } else {
        triggerFocus(-12, -48, 3.05);
      }
    },
    [triggerFocus],
  );

  const handleNavClick = (view: ActiveNavView) => {
    setActiveView(view);
    if (view === 'sudamerica') {
      setRegionFilter('Sudamérica');
      handleFocusRegion('sudamerica');
      const firstSA = pins.find((p) => p.region === 'Sudamérica');
      if (firstSA) setSelectedPinId(firstSA.id);
    } else if (view === 'europa') {
      setRegionFilter('Europa');
      handleFocusRegion('europa');
      const firstEU = pins.find((p) => p.region === 'Europa');
      if (firstEU) setSelectedPinId(firstEU.id);
    } else if (view === 'globo') {
      setRegionFilter('Todas');
      handleFocusRegion('global');
    }
  };

  const handlePickCoordinates = useCallback((lat: number, lng: number) => {
    setIsPlacingPin(false);
    setModalCountry(null);
    setModalCoords({ lat, lng });
    setModalOpen(true);
  }, []);

  const handleAddPinSubmit = async (draft: NewPinDraft) => {
    const created = await addPin(draft);
    if (created) {
      setSelectedPinId(created.id);
      setActiveView('globo');
      triggerFocus(created.lat, created.lng, 1.8);
    }
  };

  const handleDeletePin = async (pinId: string) => {
    await deletePin(pinId);
    const remaining = pins.filter((p) => p.id !== pinId);
    setSelectedPinId(remaining[0]?.id || null);
  };

  const handleAfterImport = (result: ImportPhotosResult) => {
    if (result.targetPin) {
      setSelectedPinId(result.targetPin.id);
      triggerFocus(result.targetPin.lat, result.targetPin.lng, 1.8);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090F] text-[#F4F6FA] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-[65px] bg-[#07090F]/95 border-b border-white/10 px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('globo')}
          className="font-display text-2xl font-semibold tracking-tight text-[#F4F6FA] hover:text-[#FCD34D] transition-colors whitespace-nowrap shrink-0"
        >
          Noctis Atlas
        </button>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {(
            [
              { id: 'globo', label: 'Globo' },
              { id: 'sudamerica', label: 'Sudamérica' },
              { id: 'europa', label: 'Europa' },
              { id: 'galeria', label: 'Galería' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b ${
                activeView === item.id
                  ? 'text-[#FCD34D] border-[#F5B742]'
                  : 'text-slate-400 border-transparent hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => {
              setModalCoords(null);
              setModalCountry(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#F5B742] text-[#07090F] hover:bg-[#FCD34D] transition-colors whitespace-nowrap shrink-0"
          >
            <MapPin className="w-3.5 h-3.5" />
            Añadir pincho
          </button>
        </div>
      </header>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex items-center gap-4 px-4 py-2.5 border-b border-white/10 bg-[#0B0F19] overflow-x-auto">
        {(
          [
            { id: 'globo', label: 'Globo' },
            { id: 'sudamerica', label: 'Sudamérica' },
            { id: 'europa', label: 'Europa' },
            { id: 'galeria', label: 'Galería' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item.id)}
            className={`text-xs font-medium whitespace-nowrap shrink-0 pb-1 border-b ${
              activeView === item.id
                ? 'text-[#FCD34D] border-[#F5B742]'
                : 'text-slate-400 border-transparent'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Split Workspace: 1/3 Vertical Globe + 2/3 Editorial Travel Journal */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Vertical One-Third: Interactive 3D Night Globe */}
        <aside className="lg:col-span-4 h-[440px] sm:h-[500px] lg:h-[calc(100vh-65px)] lg:sticky lg:top-[65px] border-b lg:border-b-0 lg:border-r border-white/10">
          <GlobeViewport
            pins={pins}
            selectedPinId={selectedPin?.id || null}
            focusRequest={focusRequest}
            isPlacingPin={isPlacingPin}
            onSelectPin={handleSelectPinById}
            onTogglePlacingPin={() => setIsPlacingPin((prev) => !prev)}
            onPickCoordinates={handlePickCoordinates}
            onFocusRegion={handleFocusRegion}
          />
        </aside>

        {/* Right Two-Thirds: Account Sync, Cargar nuevas fotos, Active Destination, Directory & Gallery */}
        <div className="lg:col-span-8 p-5 sm:p-8 lg:p-10 space-y-8 max-w-5xl w-full mx-auto">
          {/* Cloud Sync & Photo Repository Toolbar */}
          <div className="bg-[#0F1420] border border-white/10 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Cloud
                className={`w-4 h-4 shrink-0 ${
                  user ? 'text-[#F5B742]' : 'text-slate-400'
                }`}
              />
              <div className="min-w-0">
                {user ? (
                  <p className="text-xs text-slate-200 truncate">
                    Sincronizado con Google ·{' '}
                    <span className="text-slate-400">
                      {user.displayName || user.email}
                    </span>
                    {syncingStarter && (
                      <span className="text-[#FCD34D]"> · Cargando destinos iniciales...</span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-slate-300">
                    Vista previa con tus destinos · Conecta Google para guardar y acceder a tu repositorio de Drive
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setImporterOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#161D2E] border border-[#F5B742]/50 text-[#FCD34D] hover:bg-[#F5B742]/15 transition-colors whitespace-nowrap"
              >
                <Camera className="w-3.5 h-3.5" />
                Cargar nuevas fotos
              </button>

              {user ? (
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void signOutUser()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/25 transition-colors whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              ) : (
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void signInWithGoogle()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-white/15 text-slate-200 hover:border-white/30 transition-colors whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {authBusy ? 'Conectando...' : 'Conectar con Google'}
                </button>
              )}
            </div>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="bg-rose-950/50 border border-rose-400/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-rose-200">{errorMessage}</p>
              <button
                type="button"
                onClick={clearError}
                aria-label="Cerrar aviso"
                className="text-rose-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {statusMessage && (
            <div className="bg-[#12192A] border border-[#F5B742]/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[#FDE68A]">{statusMessage}</p>
              <button
                type="button"
                onClick={clearStatus}
                aria-label="Cerrar notificación"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeView === 'galeria' ? (
            <GalleryView
              photos={photos}
              pins={pins}
              onOpenLightbox={(list, idx) => {
                setLightboxPhotos(list);
                setLightboxIndex(idx);
              }}
              onFocusPin={handleSelectPinById}
              onOpenPhotoImporter={() => setImporterOpen(true)}
            />
          ) : (
            <>
              {selectedPin && (
                <DestinationDetail
                  pin={selectedPin}
                  references={activePinReferences}
                  photos={activePinPhotos}
                  onCenterGlobe={(p) => triggerFocus(p.lat, p.lng, 1.75)}
                  onSaveNotes={updatePinNotes}
                  onDeletePin={handleDeletePin}
                  onAddReference={addReference}
                  onDeleteReference={deleteReference}
                  onUploadPhotos={async (pinArg, files, caption) => {
                    const res = await uploadPhotos(pinArg, files, caption, true);
                    handleAfterImport(res);
                  }}
                  onOpenPhotoImporter={() => setImporterOpen(true)}
                  onUpdatePhotoCaption={updatePhotoCaption}
                  onDeletePhoto={deletePhoto}
                  onOpenLightbox={(list, idx) => {
                    setLightboxPhotos(list);
                    setLightboxIndex(idx);
                  }}
                />
              )}

              <CountriesDirectory
                countries={countries}
                pins={pins}
                photos={photos}
                selectedPinId={selectedPin?.id || null}
                regionFilter={regionFilter}
                onChangeRegionFilter={setRegionFilter}
                onSelectPin={handleSelectPinObject}
                onAddCityToCountry={(country) => {
                  setModalCoords(null);
                  setModalCountry(country);
                  setModalOpen(true);
                }}
                onOpenNewPinModal={() => {
                  setModalCoords(null);
                  setModalCountry(null);
                  setModalOpen(true);
                }}
              />
            </>
          )}
        </div>
      </main>

      {/* Modals & Lightbox */}
      <AddPinModal
        isOpen={modalOpen}
        initialCoords={modalCoords}
        initialCountry={modalCountry}
        countries={countries}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddPinSubmit}
      />

      <PhotoImporterModal
        isOpen={importerOpen}
        driveToken={driveToken}
        authBusy={authBusy}
        pins={pins}
        activePin={selectedPin}
        onClose={() => setImporterOpen(false)}
        onConnectGoogleDrive={signInWithGoogle}
        onImportPhotos={importGeoreferencedPhotos}
        onAfterImport={handleAfterImport}
      />

      <PhotoLightbox
        photos={lightboxPhotos}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(next) => setLightboxIndex(next)}
        onFocusPin={handleSelectPinById}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NoctisAtlasApp />
    </ErrorBoundary>
  );
}
