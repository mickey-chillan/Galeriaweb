import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  getDriveAccessToken,
  googleProvider,
  handleFirestoreError,
  OperationType,
  setDriveAccessToken,
} from '../firebase';
import {
  buildGuestStarterState,
  STARTER_COUNTRIES,
  STARTER_PHOTOS,
  STARTER_PINS,
  STARTER_REFERENCES,
} from '../data/starterDestinations';
import type {
  CountryRecord,
  NewPinDraft,
  TravelPhoto,
  TravelPin,
  TravelReference,
  TravelRegion,
} from '../types/travel';
import { toSafeDocId } from '../utils/geoMath';
import { compressImageToDataUrl } from '../utils/imageCompression';
import {
  cleanFileCaption,
  detectCountryFromCoordinates,
  extractPhotoExifMetadata,
  findNearestPin,
} from '../utils/photoMetadata';

export interface GeorefPhotoInput {
  blob: Blob;
  filename: string;
  caption?: string;
  overrideLat?: number | null;
  overrideLng?: number | null;
  overrideTakenAt?: string;
  overridePinId?: string | null;
}

export interface ImportPhotosResult {
  importedCount: number;
  georeferencedCount: number;
  createdPinsCount: number;
  targetPin: TravelPin | null;
}

export function useTravelAtlas() {
  const [user, setUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(() => getDriveAccessToken());
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [syncingStarter, setSyncingStarter] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const guestState = useMemo(() => buildGuestStarterState(), []);
  const [countries, setCountries] = useState<CountryRecord[]>(guestState.countries);
  const [pins, setPins] = useState<TravelPin[]>(guestState.pins);
  const [references, setReferences] = useState<TravelReference[]>(guestState.references);
  const [photos, setPhotos] = useState<TravelPhoto[]>(guestState.photos);

  const seededUidRef = useRef<string | null>(null);

  // Ensure user profile exists and seed starter South America + Europe catalog on first login
  const ensureUserSeeded = useCallback(async (currentUser: User) => {
    if (seededUidRef.current === currentUser.uid) return;
    seededUidRef.current = currentUser.uid;

    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists() && snap.data()?.seededStarter === true) {
        return;
      }

      setSyncingStarter(true);
      const displayName = (currentUser.displayName || currentUser.email || 'Viajero').slice(0, 120);
      const email = (currentUser.email || 'viajero@ejemplo.com').slice(0, 200);

      // Step 1: Create/update profile + seed countries first so exists() passes for pins
      const batch1 = writeBatch(db);
      if (!snap.exists()) {
        batch1.set(userDocRef, {
          uid: currentUser.uid,
          displayName,
          email,
          seededStarter: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const c of STARTER_COUNTRIES) {
        batch1.set(doc(db, 'users', currentUser.uid, 'countries', c.id), {
          id: c.id,
          ownerId: currentUser.uid,
          name: c.name,
          region: c.region,
          code: c.code,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch1.commit();

      // Step 2: Seed all 34 city pins now that parent countries exist
      const batch2 = writeBatch(db);
      for (const p of STARTER_PINS) {
        batch2.set(doc(db, 'users', currentUser.uid, 'pins', p.id), {
          id: p.id,
          ownerId: currentUser.uid,
          countryId: p.countryId,
          countryName: p.countryName,
          cityName: p.cityName,
          region: p.region,
          lat: p.lat,
          lng: p.lng,
          visitDate: p.visitDate,
          notes: p.notes,
          routeGroup: p.routeGroup,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch2.commit();

      // Step 3: Seed starter references + generated showcase photos + mark seededStarter = true
      const batch3 = writeBatch(db);
      for (const r of STARTER_REFERENCES) {
        batch3.set(doc(db, 'users', currentUser.uid, 'references', r.id), {
          id: r.id,
          ownerId: currentUser.uid,
          pinId: r.pinId,
          title: r.title,
          detail: r.detail,
          url: r.url,
          createdAt: serverTimestamp(),
        });
      }
      for (const ph of STARTER_PHOTOS) {
        batch3.set(doc(db, 'users', currentUser.uid, 'photos', ph.id), {
          id: ph.id,
          ownerId: currentUser.uid,
          pinId: ph.pinId,
          cityName: ph.cityName,
          countryName: ph.countryName,
          imageUrl: ph.imageUrl,
          caption: ph.caption,
          lat: ph.lat,
          lng: ph.lng,
          takenAt: ph.takenAt,
          hasGps: ph.hasGps,
          createdAt: serverTimestamp(),
        });
      }
      batch3.update(userDocRef, {
        seededStarter: true,
        updatedAt: serverTimestamp(),
      });
      await batch3.commit();

      setStatusMessage('Tu colección inicial de Sudamérica y Europa se sincronizó en la nube.');
    } catch (error) {
      seededUidRef.current = null;
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    } finally {
      setSyncingStarter(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        seededUidRef.current = null;
        setDriveAccessToken(null);
        setDriveToken(null);
        setCountries(guestState.countries);
        setPins(guestState.pins);
        setReferences(guestState.references);
        setPhotos(guestState.photos);
      } else {
        void ensureUserSeeded(nextUser);
      }
    });
    return () => unsub();
  }, [ensureUserSeeded, guestState]);

  // Attach real-time Firestore listeners only when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    const uid = user.uid;
    const countriesPath = `users/${uid}/countries`;
    const pinsPath = `users/${uid}/pins`;
    const refsPath = `users/${uid}/references`;
    const photosPath = `users/${uid}/photos`;

    const qCountries = query(collection(db, countriesPath), where('ownerId', '==', uid));
    const qPins = query(collection(db, pinsPath), where('ownerId', '==', uid));
    const qRefs = query(collection(db, refsPath), where('ownerId', '==', uid));
    const qPhotos = query(collection(db, photosPath), where('ownerId', '==', uid));

    const unsubCountries = onSnapshot(
      qCountries,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as CountryRecord)
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));
        setCountries(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, countriesPath),
    );

    const unsubPins = onSnapshot(
      qPins,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as TravelPin)
          .sort((a, b) => a.cityName.localeCompare(b.cityName, 'es'));
        setPins(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, pinsPath),
    );

    const unsubRefs = onSnapshot(
      qRefs,
      (snap) => {
        setReferences(snap.docs.map((d) => d.data() as TravelReference));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, refsPath),
    );

    const unsubPhotos = onSnapshot(
      qPhotos,
      (snap) => {
        setPhotos(snap.docs.map((d) => d.data() as TravelPhoto));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, photosPath),
    );

    return () => {
      unsubCountries();
      unsubPins();
      unsubRefs();
      unsubPhotos();
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    setAuthBusy(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      setDriveAccessToken(token);
      setDriveToken(token);
      return token;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible iniciar sesión con Google.',
      );
      return null;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthBusy(true);
    setErrorMessage(null);
    try {
      await signOut(auth);
      setDriveAccessToken(null);
      setDriveToken(null);
      setStatusMessage('Sesión cerrada. Estás en vista previa local.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Error al cerrar sesión.',
      );
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const addCountry = useCallback(
    async (
      name: string,
      region: TravelRegion,
      code: string,
      existingList?: CountryRecord[],
    ): Promise<CountryRecord | null> => {
      const cleanName = name.trim().slice(0, 80);
      const cleanCode = (code.trim().toUpperCase() || cleanName.slice(0, 2).toUpperCase()).slice(0, 3);
      if (!cleanName) return null;

      const pool = existingList || countries;
      const existingCountry = pool.find(
        (c) => c.name.toLowerCase() === cleanName.toLowerCase(),
      );
      if (existingCountry) return existingCountry;

      const id = toSafeDocId('c', cleanName);

      if (!user) {
        const localCountry: CountryRecord = {
          id,
          ownerId: 'guest',
          name: cleanName,
          region,
          code: cleanCode.length >= 2 ? cleanCode : 'XX',
        };
        setCountries((prev) => [...prev, localCountry].sort((a, b) => a.name.localeCompare(b.name, 'es')));
        return localCountry;
      }

      const path = `users/${user.uid}/countries/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'countries', id), {
          id,
          ownerId: user.uid,
          name: cleanName,
          region,
          code: cleanCode.length >= 2 ? cleanCode : 'XX',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return {
          id,
          ownerId: user.uid,
          name: cleanName,
          region,
          code: cleanCode.length >= 2 ? cleanCode : 'XX',
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [countries, user],
  );

  const addPin = useCallback(
    async (
      draft: NewPinDraft,
      existingCountries?: CountryRecord[],
    ): Promise<TravelPin | null> => {
      const cleanCity = draft.cityName.trim().slice(0, 100);
      const cleanCountry = draft.countryName.trim().slice(0, 80);
      if (!cleanCity || !cleanCountry) return null;

      const countryPool = existingCountries || countries;
      let targetCountry = countryPool.find(
        (c) => c.name.toLowerCase() === cleanCountry.toLowerCase(),
      );
      if (!targetCountry) {
        targetCountry =
          (await addCountry(cleanCountry, draft.region, draft.countryCode, countryPool)) ??
          undefined;
      }
      if (!targetCountry) return null;

      const pinId = toSafeDocId('pin', `${targetCountry.code}-${cleanCity}`);
      const lat = Math.max(-90, Math.min(90, Number(draft.lat) || 0));
      const lng = Math.max(-180, Math.min(180, Number(draft.lng) || 0));
      const visitDate = draft.visitDate.trim().slice(0, 60);
      const notes = draft.notes.trim().slice(0, 8000);
      const routeGroup = draft.routeGroup.trim().slice(0, 80);

      if (!user) {
        const localPin: TravelPin = {
          id: pinId,
          ownerId: 'guest',
          countryId: targetCountry.id,
          countryName: targetCountry.name,
          cityName: cleanCity,
          region: targetCountry.region,
          lat,
          lng,
          visitDate: visitDate || 'Viaje registrado',
          notes,
          routeGroup,
        };
        setPins((prev) => [...prev, localPin]);
        return localPin;
      }

      const path = `users/${user.uid}/pins/${pinId}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'pins', pinId), {
          id: pinId,
          ownerId: user.uid,
          countryId: targetCountry.id,
          countryName: targetCountry.name,
          cityName: cleanCity,
          region: targetCountry.region,
          lat,
          lng,
          visitDate: visitDate || 'Viaje registrado',
          notes,
          routeGroup,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return {
          id: pinId,
          ownerId: user.uid,
          countryId: targetCountry.id,
          countryName: targetCountry.name,
          cityName: cleanCity,
          region: targetCountry.region,
          lat,
          lng,
          visitDate: visitDate || 'Viaje registrado',
          notes,
          routeGroup,
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [addCountry, countries, user],
  );

  const updatePinNotes = useCallback(
    async (pinId: string, notes: string, visitDate: string, routeGroup: string) => {
      const cleanNotes = notes.slice(0, 8000);
      const cleanDate = visitDate.trim().slice(0, 60);
      const cleanRoute = routeGroup.trim().slice(0, 80);

      if (!user) {
        setPins((prev) =>
          prev.map((p) =>
            p.id === pinId
              ? { ...p, notes: cleanNotes, visitDate: cleanDate, routeGroup: cleanRoute }
              : p,
          ),
        );
        setStatusMessage('Nota actualizada en vista previa.');
        return;
      }

      const path = `users/${user.uid}/pins/${pinId}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'pins', pinId), {
          notes: cleanNotes,
          visitDate: cleanDate,
          routeGroup: cleanRoute,
          updatedAt: serverTimestamp(),
        });
        setStatusMessage('Notas personales guardadas en la nube.');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [user],
  );

  const deletePin = useCallback(
    async (pinId: string) => {
      if (!user) {
        setPins((prev) => prev.filter((p) => p.id !== pinId));
        setReferences((prev) => prev.filter((r) => r.pinId !== pinId));
        setPhotos((prev) => prev.filter((ph) => ph.pinId !== pinId));
        setStatusMessage('Pincho eliminado de la vista previa.');
        return;
      }

      const path = `users/${user.uid}/pins/${pinId}`;
      try {
        const relatedRefs = references.filter((r) => r.pinId === pinId);
        const relatedPhotos = photos.filter((ph) => ph.pinId === pinId);
        const batch = writeBatch(db);
        for (const r of relatedRefs) {
          batch.delete(doc(db, 'users', user.uid, 'references', r.id));
        }
        for (const ph of relatedPhotos) {
          batch.delete(doc(db, 'users', user.uid, 'photos', ph.id));
        }
        batch.delete(doc(db, 'users', user.uid, 'pins', pinId));
        await batch.commit();
        setStatusMessage('Pincho y sus recuerdos asociados eliminados.');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [photos, references, user],
  );

  const addReference = useCallback(
    async (pinId: string, title: string, detail: string, url: string) => {
      const cleanTitle = title.trim().slice(0, 140);
      if (!cleanTitle) return;
      const cleanDetail = detail.trim().slice(0, 500);
      const cleanUrl = url.trim().slice(0, 500);
      const id = toSafeDocId('ref', cleanTitle);

      if (!user) {
        setReferences((prev) => [
          ...prev,
          { id, ownerId: 'guest', pinId, title: cleanTitle, detail: cleanDetail, url: cleanUrl },
        ]);
        setStatusMessage('Referencia añadida en vista previa.');
        return;
      }

      const path = `users/${user.uid}/references/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'references', id), {
          id,
          ownerId: user.uid,
          pinId,
          title: cleanTitle,
          detail: cleanDetail,
          url: cleanUrl,
          createdAt: serverTimestamp(),
        });
        setStatusMessage('Referencia guardada.');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [user],
  );

  const deleteReference = useCallback(
    async (refId: string) => {
      if (!user) {
        setReferences((prev) => prev.filter((r) => r.id !== refId));
        return;
      }
      const path = `users/${user.uid}/references/${refId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'references', refId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [user],
  );

  /**
   * Core georeferenced photo ingestion pipeline for both local files (EXIF) and Google Drive images.
   * Matches extracted GPS metadata to the nearest pin within 55km, or automatically creates a
   * new country & pin at those exact coordinates on the 3D globe.
   */
  const importGeoreferencedPhotos = useCallback(
    async (
      items: GeorefPhotoInput[],
      fallbackPin: TravelPin | null,
      autoGeoref = true,
    ): Promise<ImportPhotosResult> => {
      let importedCount = 0;
      let georeferencedCount = 0;
      let createdPinsCount = 0;
      let lastTargetPin: TravelPin | null = fallbackPin;

      // Mutable working copies so consecutive photos in the same batch reuse newly created countries/pins
      const workingCountries = [...countries];
      const workingPins = [...pins];

      for (const item of items) {
        const exif = await extractPhotoExifMetadata(item.blob);
        const compressedUrl = await compressImageToDataUrl(item.blob);

        const lat =
          typeof item.overrideLat === 'number' && Number.isFinite(item.overrideLat)
            ? item.overrideLat
            : exif.lat;
        const lng =
          typeof item.overrideLng === 'number' && Number.isFinite(item.overrideLng)
            ? item.overrideLng
            : exif.lng;
        const hasGps = lat !== null && lng !== null;
        const takenAt = (item.overrideTakenAt || exif.takenAt || '').slice(0, 60);

        let targetPin: TravelPin | null = item.overridePinId
          ? workingPins.find((p) => p.id === item.overridePinId) || null
          : null;

        if (!targetPin && hasGps && autoGeoref && lat !== null && lng !== null) {
          const nearest = findNearestPin(lat, lng, workingPins, 55);
          if (nearest) {
            targetPin = nearest.pin;
          } else {
            const detected = detectCountryFromCoordinates(lat, lng);
            let matchedCountry = workingCountries.find(
              (c) => c.name.toLowerCase() === detected.countryName.toLowerCase(),
            );
            if (!matchedCountry) {
              matchedCountry =
                (await addCountry(
                  detected.countryName,
                  detected.region,
                  detected.countryCode,
                  workingCountries,
                )) ?? undefined;
              if (matchedCountry) {
                workingCountries.push(matchedCountry);
              }
            }

            const baseLabel = cleanFileCaption(item.filename);
            const autoCityName =
              baseLabel && baseLabel.length >= 2 && !/^img|^dsc|^pxl|^photo/i.test(baseLabel)
                ? baseLabel.slice(0, 60)
                : `${detected.countryName} (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;

            const createdPin = await addPin(
              {
                countryName: matchedCountry?.name || detected.countryName,
                countryCode: matchedCountry?.code || detected.countryCode,
                region: matchedCountry?.region || detected.region,
                cityName: autoCityName,
                lat,
                lng,
                visitDate: takenAt || 'Georreferenciada por fotografía',
                notes: `Pincho creado automáticamente a partir de la metadata GPS de "${item.filename}".`,
                routeGroup: '',
              },
              workingCountries,
            );

            if (createdPin) {
              workingPins.push(createdPin);
              targetPin = createdPin;
              createdPinsCount += 1;
            }
          }
        }

        if (!targetPin) {
          targetPin = fallbackPin || workingPins[0] || null;
        }
        if (!targetPin) continue;

        const finalLat = hasGps && lat !== null ? lat : targetPin.lat;
        const finalLng = hasGps && lng !== null ? lng : targetPin.lng;
        if (hasGps) georeferencedCount += 1;

        const id = toSafeDocId('ph', `${targetPin.cityName}-${item.filename}`);
        const caption = (
          item.caption?.trim() ||
          cleanFileCaption(item.filename) ||
          targetPin.cityName
        ).slice(0, 240);

        if (!user) {
          setPhotos((prev) => [
            {
              id,
              ownerId: 'guest',
              pinId: targetPin!.id,
              cityName: targetPin!.cityName,
              countryName: targetPin!.countryName,
              imageUrl: compressedUrl,
              caption,
              lat: finalLat,
              lng: finalLng,
              takenAt,
              hasGps,
            },
            ...prev,
          ]);
        } else {
          const path = `users/${user.uid}/photos/${id}`;
          try {
            await setDoc(doc(db, 'users', user.uid, 'photos', id), {
              id,
              ownerId: user.uid,
              pinId: targetPin.id,
              cityName: targetPin.cityName.slice(0, 100),
              countryName: targetPin.countryName.slice(0, 80),
              imageUrl: compressedUrl,
              caption,
              lat: finalLat,
              lng: finalLng,
              takenAt,
              hasGps,
              createdAt: serverTimestamp(),
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
          }
        }

        importedCount += 1;
        lastTargetPin = targetPin;
      }

      if (importedCount > 0) {
        const parts = [`${importedCount} fotografía(s) cargada(s)`];
        if (georeferencedCount > 0) {
          parts.push(`${georeferencedCount} georreferenciada(s) por metadata GPS`);
        }
        if (createdPinsCount > 0) {
          parts.push(`${createdPinsCount} nuevo(s) pincho(s) colocado(s) en el globo`);
        }
        setStatusMessage(parts.join(' · '));
      }

      return {
        importedCount,
        georeferencedCount,
        createdPinsCount,
        targetPin: lastTargetPin,
      };
    },
    [addCountry, addPin, countries, pins, user],
  );

  const uploadPhotos = useCallback(
    async (
      pin: TravelPin,
      files: FileList | File[],
      captionInput = '',
      autoGeoref = true,
    ): Promise<ImportPhotosResult> => {
      const inputs: GeorefPhotoInput[] = Array.from(files).map((file) => ({
        blob: file,
        filename: file.name,
        caption: captionInput,
      }));
      return importGeoreferencedPhotos(inputs, pin, autoGeoref);
    },
    [importGeoreferencedPhotos],
  );

  const updatePhotoCaption = useCallback(
    async (photoId: string, caption: string) => {
      const cleanCaption = caption.trim().slice(0, 240);
      if (!user) {
        setPhotos((prev) =>
          prev.map((ph) => (ph.id === photoId ? { ...ph, caption: cleanCaption } : ph)),
        );
        return;
      }

      const path = `users/${user.uid}/photos/${photoId}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'photos', photoId), {
          caption: cleanCaption,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [user],
  );

  const deletePhoto = useCallback(
    async (photoId: string) => {
      if (!user) {
        setPhotos((prev) => prev.filter((ph) => ph.id !== photoId));
        return;
      }
      const path = `users/${user.uid}/photos/${photoId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'photos', photoId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    [user],
  );

  return {
    user,
    driveToken,
    authReady,
    authBusy,
    syncingStarter,
    statusMessage,
    errorMessage,
    clearStatus: () => setStatusMessage(null),
    clearError: () => setErrorMessage(null),
    countries,
    pins,
    references,
    photos,
    signInWithGoogle,
    signOutUser,
    addCountry,
    addPin,
    updatePinNotes,
    deletePin,
    addReference,
    deleteReference,
    uploadPhotos,
    importGeoreferencedPhotos,
    updatePhotoCaption,
    deletePhoto,
  };
}
