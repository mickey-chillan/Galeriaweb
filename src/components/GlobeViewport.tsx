import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Compass,
  Crosshair,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react';
import type { TravelPin } from '../types/travel';
import { formatCoords, latLngToVector3, vector3ToLatLng } from '../utils/geoMath';
import { createNightEarthTextures } from '../utils/globeTexture';

export interface GlobeFocusRequest {
  lat: number;
  lng: number;
  distance: number;
  nonce: number;
}

interface GlobeViewportProps {
  pins: TravelPin[];
  selectedPinId: string | null;
  focusRequest: GlobeFocusRequest | null;
  isPlacingPin: boolean;
  onSelectPin: (pinId: string) => void;
  onTogglePlacingPin: () => void;
  onPickCoordinates: (lat: number, lng: number) => void;
  onFocusRegion: (region: 'sudamerica' | 'europa' | 'global') => void;
}

const GLOBE_RADIUS = 1;
const MIN_ZOOM_DIST = 1.45;
const MAX_ZOOM_DIST = 4.9;

// Pre-allocated scratch math objects (zero GC in render loop)
const _vecTarget = new THREE.Vector3();
const _vecCurrent = new THREE.Vector3();
const _vecDesired = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _quatPin = new THREE.Quaternion();
const _midPoint = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  const probeCanvas = document.createElement('canvas');
  const gl = probeCanvas.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export const GlobeViewport: React.FC<GlobeViewportProps> = ({
  pins,
  selectedPinId,
  focusRequest,
  isPlacingPin,
  onSelectPin,
  onTogglePlacingPin,
  onPickCoordinates,
  onFocusRegion,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [webglError, setWebglError] = useState(false);
  const [hoveredPin, setHoveredPin] = useState<{
    cityName: string;
    countryName: string;
    x: number;
    y: number;
  } | null>(null);

  // Mutable refs so Three.js loop reads latest React state without tearing down WebGL
  const pinsRef = useRef<TravelPin[]>(pins);
  pinsRef.current = pins;

  const selectedPinIdRef = useRef<string | null>(selectedPinId);
  selectedPinIdRef.current = selectedPinId;

  const isPlacingPinRef = useRef<boolean>(isPlacingPin);
  isPlacingPinRef.current = isPlacingPin;

  const autoRotateRef = useRef<boolean>(autoRotate);
  autoRotateRef.current = autoRotate;

  const callbacksRef = useRef({
    onSelectPin,
    onPickCoordinates,
  });
  callbacksRef.current = { onSelectPin, onPickCoordinates };

  const sceneRefs = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    controls?: OrbitControls;
    earthMesh?: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
    pinsGroup?: THREE.Group;
    arcsGroup?: THREE.Group;
    hitTargets: THREE.Object3D[];
    pinGroupById: Map<string, THREE.Group>;
    flightTarget: { lat: number; lng: number; distance: number } | null;
    isSoftwareGl: boolean;
    maxAnisotropy: number;
    rebuildPinsAndTextures?: () => void;
  }>({
    hitTargets: [],
    pinGroupById: new Map(),
    flightTarget: null,
    isSoftwareGl: false,
    maxAnisotropy: 4,
  });

  // Initialize Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    sceneRefs.current.isSoftwareGl = isSoftwareGl;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = Math.max(container.clientWidth, 280);
    const height = Math.max(container.clientHeight, 320);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x07090f, 1);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    sceneRefs.current.maxAnisotropy = maxAnisotropy;
    sceneRefs.current.renderer = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const handleContextRestored = () => {
      setWebglError(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090f);
    sceneRefs.current.scene = scene;

    // Studio environment reflection for metallic golden pin parts
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTexture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    // Start oriented toward South America & Atlantic-Europe corridor
    latLngToVector3(-12, -48, 3.05, camera.position);
    camera.lookAt(0, 0, 0);
    sceneRefs.current.camera = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = MIN_ZOOM_DIST;
    controls.maxDistance = MAX_ZOOM_DIST;
    controls.zoomSpeed = 0.85;
    controls.rotateSpeed = 0.65;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
    controls.autoRotateSpeed = 0.35;
    sceneRefs.current.controls = controls;

    controls.addEventListener('start', () => {
      // Cancel scripted camera fly-to as soon as user interacts
      sceneRefs.current.flightTarget = null;
    });

    // Warm/cool 3-point lighting rig
    const hemiLight = new THREE.HemisphereLight(0x4f75b8, 0x090d16, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe7b8, 1.85);
    keyLight.position.set(4, 3, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf5b742, 0.9);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    // Subtle deep-space starfield
    const starCount = 520;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 14 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.06,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Earth Sphere
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 72, 72);
    const initialTex = createNightEarthTextures(pinsRef.current, maxAnisotropy);
    const earthMat = new THREE.MeshStandardMaterial({
      map: initialTex.albedoMap,
      emissive: new THREE.Color(0xffc966),
      emissiveMap: initialTex.emissiveMap,
      emissiveIntensity: 1.35,
      roughness: 0.72,
      metalness: 0.14,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);
    sceneRefs.current.earthMesh = earthMesh;

    // Atmospheric Fresnel Rim Glow
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.045, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0x3b6db8) },
        goldRim: { value: new THREE.Color(0xf5b742) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        uniform vec3 glowColor;
        uniform vec3 goldRim;
        void main() {
          float intensity = pow(0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
          vec3 col = mix(glowColor, goldRim, 0.28);
          gl_FragColor = vec4(col, 1.0) * clamp(intensity, 0.0, 0.65);
        }
      `,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // Groups for pins and route arcs
    const arcsGroup = new THREE.Group();
    scene.add(arcsGroup);
    sceneRefs.current.arcsGroup = arcsGroup;

    const pinsGroup = new THREE.Group();
    scene.add(pinsGroup);
    sceneRefs.current.pinsGroup = pinsGroup;

    // Shared geometries & materials for composite 3D pins
    const ringGeo = new THREE.RingGeometry(0.011, 0.017, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const stemGeo = new THREE.CylinderGeometry(0.0022, 0.0014, 0.042, 10);
    stemGeo.translate(0, 0.021, 0);
    const headGeo = new THREE.SphereGeometry(0.0125, 16, 16);
    headGeo.translate(0, 0.046, 0);
    const collarGeo = new THREE.TorusGeometry(0.0135, 0.0018, 8, 20);
    collarGeo.rotateX(Math.PI / 2);
    collarGeo.translate(0, 0.046, 0);
    const hitGeo = new THREE.SphereGeometry(0.036, 10, 10);
    hitGeo.translate(0, 0.034, 0);

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0xe5c16c,
      metalness: 0.92,
      roughness: 0.2,
    });
    const normalHeadMat = new THREE.MeshStandardMaterial({
      color: 0xf5b742,
      emissive: 0xd97706,
      emissiveIntensity: 0.55,
      metalness: 0.4,
      roughness: 0.28,
    });
    const selectedHeadMat = new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.5,
      metalness: 0.25,
      roughness: 0.15,
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf5b742,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const selectedRingMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const arcMat = new THREE.LineBasicMaterial({
      color: 0xf5b742,
      transparent: true,
      opacity: 0.36,
    });

    const rebuildPinsAndTextures = () => {
      // Clear existing pins
      while (pinsGroup.children.length > 0) {
        pinsGroup.remove(pinsGroup.children[0]);
      }
      sceneRefs.current.hitTargets = [];
      sceneRefs.current.pinGroupById.clear();

      // Clear existing arcs
      while (arcsGroup.children.length > 0) {
        const child = arcsGroup.children[0] as THREE.Line;
        child.geometry.dispose();
        arcsGroup.remove(child);
      }

      const activePins = pinsRef.current;
      const activeId = selectedPinIdRef.current;

      // Refresh Earth emissive & albedo city lights
      const nextTex = createNightEarthTextures(activePins, maxAnisotropy);
      const oldMap = earthMat.map;
      const oldEmissive = earthMat.emissiveMap;
      earthMat.map = nextTex.albedoMap;
      earthMat.emissiveMap = nextTex.emissiveMap;
      earthMat.needsUpdate = true;
      oldMap?.dispose();
      oldEmissive?.dispose();

      // Build composite 4-part pins
      for (const pin of activePins) {
        const isSelected = pin.id === activeId;
        const pinContainer = new THREE.Group();
        const surfacePos = latLngToVector3(pin.lat, pin.lng, GLOBE_RADIUS);
        pinContainer.position.copy(surfacePos);

        const normalDir = surfacePos.clone().normalize();
        _quatPin.setFromUnitVectors(_upAxis, normalDir);
        pinContainer.quaternion.copy(_quatPin);

        const baseRing = new THREE.Mesh(ringGeo, isSelected ? selectedRingMat : ringMat);
        baseRing.position.y = 0.002;

        const stem = new THREE.Mesh(stemGeo, stemMat);
        const head = new THREE.Mesh(headGeo, isSelected ? selectedHeadMat : normalHeadMat);
        const collar = new THREE.Mesh(collarGeo, stemMat);

        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.layers.set(1);
        hitMesh.userData = {
          pinId: pin.id,
          cityName: pin.cityName,
          countryName: pin.countryName,
        };

        const scale = isSelected ? 1.42 : 1.0;
        pinContainer.scale.setScalar(scale);

        pinContainer.add(baseRing, stem, head, collar, hitMesh);
        pinsGroup.add(pinContainer);
        sceneRefs.current.hitTargets.push(hitMesh);
        sceneRefs.current.pinGroupById.set(pin.id, pinContainer);
      }

      // Connect pins sharing the same routeGroup with subtle golden great-circle arcs
      const byRoute = new Map<string, TravelPin[]>();
      for (const pin of activePins) {
        if (!pin.routeGroup) continue;
        const list = byRoute.get(pin.routeGroup) || [];
        list.push(pin);
        byRoute.set(pin.routeGroup, list);
      }

      for (const groupPins of byRoute.values()) {
        if (groupPins.length < 2) continue;
        for (let i = 0; i < groupPins.length - 1; i++) {
          const a = latLngToVector3(groupPins[i].lat, groupPins[i].lng, GLOBE_RADIUS);
          const b = latLngToVector3(groupPins[i + 1].lat, groupPins[i + 1].lng, GLOBE_RADIUS);
          const dist = a.distanceTo(b);
          if (dist < 0.015) continue;
          _midPoint.addVectors(a, b).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS + Math.min(0.16, dist * 0.25));
          const curve = new THREE.QuadraticBezierCurve3(a, _midPoint.clone(), b);
          const curveGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(28));
          const line = new THREE.Line(curveGeo, arcMat);
          arcsGroup.add(line);
        }
      }
    };

    sceneRefs.current.rebuildPinsAndTextures = rebuildPinsAndTextures;
    rebuildPinsAndTextures();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting interaction (click pin OR pick coordinates in placement mode)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverTime = 0;

    const updateNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      return rect;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;

      if (isPlacingPinRef.current) {
        renderer.domElement.style.cursor = 'crosshair';
        setHoveredPin(null);
        return;
      }

      const rect = updateNdc(e.clientX, e.clientY);
      raycaster.layers.set(1);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(sceneRefs.current.hitTargets, false);

      if (hits.length > 0) {
        const data = hits[0].object.userData as {
          pinId: string;
          cityName: string;
          countryName: string;
        };
        renderer.domElement.style.cursor = 'pointer';
        setHoveredPin({
          cityName: data.cityName,
          countryName: data.countryName,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredPin(null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const moveDist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y,
      );
      if (moveDist > 6) return; // Ignore orbit drags

      updateNdc(e.clientX, e.clientY);

      if (isPlacingPinRef.current) {
        raycaster.layers.set(0);
        raycaster.setFromCamera(pointerNdc, camera);
        const globeHits = raycaster.intersectObject(earthMesh, false);
        if (globeHits.length > 0) {
          const { lat, lng } = vector3ToLatLng(globeHits[0].point);
          callbacksRef.current.onPickCoordinates(lat, lng);
        }
        return;
      }

      raycaster.layers.set(1);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(sceneRefs.current.hitTargets, false);
      if (hits.length > 0) {
        const pinId = hits[0].object.userData.pinId as string;
        callbacksRef.current.onSelectPin(pinId);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver for crisp 1/3 vertical column adaptation
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 200);
        const h = Math.max(entry.contentRect.height, 200);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // Animation loop with software WebGL pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);

      // Smooth damped camera flight toward selected destination or continent
      const flight = sceneRefs.current.flightTarget;
      if (flight) {
        latLngToVector3(flight.lat, flight.lng, flight.distance, _vecDesired);
        const dampFactor = 1 - Math.exp(-4.5 * delta);
        _vecCurrent.copy(camera.position);
        const currentLen = _vecCurrent.length();
        const targetLen = _vecDesired.length();

        _vecCurrent.normalize();
        _vecTarget.copy(_vecDesired).normalize();
        _vecCurrent.lerp(_vecTarget, dampFactor).normalize();
        const nextLen = THREE.MathUtils.lerp(currentLen, targetLen, dampFactor);
        camera.position.copy(_vecCurrent.multiplyScalar(nextLen));
        camera.lookAt(0, 0, 0);

        if (camera.position.distanceTo(_vecDesired) < 0.025) {
          camera.position.copy(_vecDesired);
          sceneRefs.current.flightTarget = null;
        }
      }

      controls.autoRotate = !isSoftwareGl && autoRotateRef.current && !flight && !isPlacingPinRef.current;
      controls.update();

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      controls.dispose();
      earthGeo.dispose();
      earthMat.map?.dispose();
      earthMat.emissiveMap?.dispose();
      earthMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      ringGeo.dispose();
      stemGeo.dispose();
      headGeo.dispose();
      collarGeo.dispose();
      hitGeo.dispose();
      stemMat.dispose();
      normalHeadMat.dispose();
      selectedHeadMat.dispose();
      ringMat.dispose();
      selectedRingMat.dispose();
      hitMat.dispose();
      arcMat.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  // Update 3D pins and emissive city lights whenever pins or active selection changes
  useEffect(() => {
    sceneRefs.current.rebuildPinsAndTextures?.();
  }, [pins, selectedPinId]);

  // Trigger smooth camera flight when focusRequest changes
  useEffect(() => {
    if (!focusRequest) return;
    sceneRefs.current.flightTarget = {
      lat: focusRequest.lat,
      lng: focusRequest.lng,
      distance: THREE.MathUtils.clamp(focusRequest.distance, MIN_ZOOM_DIST, MAX_ZOOM_DIST),
    };
  }, [focusRequest]);

  const handleZoomStep = (factor: number) => {
    const cam = sceneRefs.current.camera;
    if (!cam) return;
    const currentDist = cam.position.length();
    const { lat, lng } = vector3ToLatLng(cam.position);
    const nextDist = THREE.MathUtils.clamp(currentDist * factor, MIN_ZOOM_DIST, MAX_ZOOM_DIST);
    sceneRefs.current.flightTarget = { lat, lng, distance: nextDist };
  };

  const selectedPin = pins.find((p) => p.id === selectedPinId) || null;

  return (
    <div className="relative w-full h-full bg-[#07090F] overflow-hidden select-none">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full"
        aria-label="Globo terráqueo interactivo 3D"
      />

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#07090F] z-20">
          <div className="max-w-xs text-center space-y-2 border border-white/10 bg-[#0F1420] rounded-xl p-5">
            <Compass className="w-7 h-7 text-[#F5B742] mx-auto" />
            <p className="font-display text-lg font-semibold text-[#F4F6FA]">
              Vista 3D no disponible
            </p>
            <p className="text-xs text-slate-400">
              Tu navegador suspendió WebGL. Puedes seguir explorando tus países y fotografías en el diario lateral.
            </p>
          </div>
        </div>
      )}

      {/* Top Overlay: Active Coordinates & Placement Banner (Zero Backdrop-Blur over WebGL) */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 z-10 flex items-start justify-between gap-3">
        <div className="bg-[#0B101B]/95 border border-white/10 rounded-lg px-3 py-2 max-w-[72%]">
          <p className="text-[11px] text-slate-400 truncate">
            {selectedPin
              ? `${selectedPin.countryName} · ${selectedPin.region}`
              : 'Atlas Nocturno 3D'}
          </p>
          <p className="font-display text-lg font-semibold text-[#F4F6FA] leading-tight truncate">
            {selectedPin ? selectedPin.cityName : 'Explora tus viajes'}
          </p>
          {selectedPin && (
            <p className="font-mono-tabular text-[11px] text-[#F5B742] mt-0.5">
              {formatCoords(selectedPin.lat, selectedPin.lng)}
            </p>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => handleZoomStep(0.78)}
            title="Acercar zoom"
            aria-label="Acercar zoom"
            className="w-9 h-9 rounded-lg bg-[#0B101B]/95 border border-white/10 text-slate-200 hover:text-[#FCD34D] hover:border-[#F5B742]/50 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoomStep(1.25)}
            title="Alejar zoom"
            aria-label="Alejar zoom"
            className="w-9 h-9 rounded-lg bg-[#0B101B]/95 border border-white/10 text-slate-200 hover:text-[#FCD34D] hover:border-[#F5B742]/50 flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            title={autoRotate ? 'Pausar rotación' : 'Reanudar rotación'}
            aria-label={autoRotate ? 'Pausar rotación' : 'Reanudar rotación'}
            className="w-9 h-9 rounded-lg bg-[#0B101B]/95 border border-white/10 text-slate-200 hover:text-[#FCD34D] hover:border-[#F5B742]/50 flex items-center justify-center transition-colors"
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Hover Tooltip on Pin */}
      {hoveredPin && !isPlacingPin && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full pb-2"
          style={{ left: hoveredPin.x, top: hoveredPin.y }}
        >
          <div className="bg-[#0B101B] border border-[#F5B742]/50 rounded-md px-2.5 py-1 shadow-lg whitespace-nowrap">
            <span className="text-xs font-medium text-[#F4F6FA]">{hoveredPin.cityName}</span>
            <span className="text-xs text-slate-400"> · {hoveredPin.countryName}</span>
          </div>
        </div>
      )}

      {/* Placement Mode Prompt */}
      {isPlacingPin && (
        <div className="pointer-events-none absolute top-24 left-4 right-4 z-10 flex justify-center">
          <div className="bg-[#161D2E]/95 border border-[#F5B742] rounded-lg px-3.5 py-2 text-center shadow-lg">
            <p className="text-xs font-medium text-[#FCD34D]">
              Haz clic sobre cualquier punto del globo para clavar tu pincho
            </p>
          </div>
        </div>
      )}

      {/* Unified Bottom Control Dock */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-[#0B101B]/95 border border-white/10 rounded-xl p-2 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onFocusRegion('sudamerica')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-200 hover:bg-white/10 hover:text-[#FCD34D] transition-colors whitespace-nowrap shrink-0"
            >
              Sudamérica
            </button>
            <button
              type="button"
              onClick={() => onFocusRegion('europa')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-200 hover:bg-white/10 hover:text-[#FCD34D] transition-colors whitespace-nowrap shrink-0"
            >
              Europa
            </button>
            <button
              type="button"
              onClick={() => onFocusRegion('global')}
              title="Vista global"
              aria-label="Restablecer vista global"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-100 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onTogglePlacingPin}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              isPlacingPin
                ? 'bg-[#F5B742] text-[#07090F]'
                : 'bg-[#161D2E] text-[#FCD34D] border border-[#F5B742]/40 hover:bg-[#F5B742]/15'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            {isPlacingPin ? 'Cancelar pincho' : 'Marcar en el globo'}
          </button>
        </div>
      </div>
    </div>
  );
};
