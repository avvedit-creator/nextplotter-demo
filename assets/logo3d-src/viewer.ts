import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createNextplotterIsotipoModel,
  createNextplotterIsotipoLookDevLights,
  createNextplotterIsotipoEnvironment,
  configureNextplotterIsotipoRenderer,
} from './createLogoModel';

const FRAME_MARGIN = 1.35;
const SWAY_AMPLITUDE_DEG = 32;
const SWAY_PERIOD_SEC = 9;
const IDLE_RESUME_MS = 2200;

function fitDistance(camera: THREE.PerspectiveCamera, object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) * FRAME_MARGIN;
  const fov = (camera.fov * Math.PI) / 180;
  return (maxDim / 2) / Math.tan(fov / 2);
}

function initLogo3D(canvas: HTMLCanvasElement): void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  configureNextplotterIsotipoRenderer(renderer);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.background = null;

  // The reconstructed model has its printed face on local +Y (it was traced/built lying
  // flat, disc-on-a-table). Wrapping it in a group rotated +90 deg on X turns that face
  // to local +Z so it stands up facing the camera like a badge, instead of being seen
  // edge-on / from above.
  const modelRoot = new THREE.Group();
  const model = createNextplotterIsotipoModel({ qualityPriority: 'reference-fidelity' });
  modelRoot.add(model);
  modelRoot.rotation.x = Math.PI / 2;
  scene.add(modelRoot);

  scene.add(createNextplotterIsotipoLookDevLights('neutral'));
  scene.environment = createNextplotterIsotipoEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  const box = new THREE.Box3().setFromObject(modelRoot);
  const center = box.getCenter(new THREE.Vector3());

  const initialAzimuth = (25 * Math.PI) / 180;
  const initialElevation = (18 * Math.PI) / 180;

  function positionCamera(azimuth: number, elevation: number, distance: number): void {
    camera.position.set(
      center.x + Math.sin(azimuth) * Math.cos(elevation) * distance,
      center.y + Math.sin(elevation) * distance,
      center.z + Math.cos(azimuth) * Math.cos(elevation) * distance,
    );
  }
  positionCamera(initialAzimuth, initialElevation, fitDistance(camera, modelRoot));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(center);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.75;
  controls.minPolarAngle = (55 * Math.PI) / 180;
  controls.maxPolarAngle = (105 * Math.PI) / 180;
  controls.update();

  // Gentle side-to-side sway instead of a full spin: a flat disc seen edge-on mid-spin
  // reads as a sliver, which looked broken. The sway keeps the face toward the viewer
  // at all times while still reading as "alive". Free drag (any direction) still works.
  let swaying = !reduceMotion;
  let dragging = false;
  let restAzimuth = initialAzimuth;
  let restPolar = Math.PI / 2 - initialElevation;
  let swayStartTime = performance.now();
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function pauseSway(): void {
    dragging = true;
    swaying = false;
    if (idleTimer) clearTimeout(idleTimer);
  }
  function scheduleResume(): void {
    dragging = false;
    if (idleTimer) clearTimeout(idleTimer);
    if (reduceMotion) return;
    idleTimer = setTimeout(() => {
      restAzimuth = controls.getAzimuthalAngle();
      restPolar = controls.getPolarAngle();
      swayStartTime = performance.now();
      swaying = true;
    }, IDLE_RESUME_MS);
  }

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', () => {
    pauseSway();
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('pointerup', () => {
    canvas.style.cursor = 'grab';
    scheduleResume();
  });

  function resize(): void {
    const size = canvas.clientWidth || canvas.parentElement?.clientWidth || 240;
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    const distance = fitDistance(camera, modelRoot);
    const offset = camera.position.clone().sub(controls.target);
    const currentDistance = offset.length() || distance;
    offset.multiplyScalar(distance / currentDistance);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  resize();

  function tick(): void {
    if (swaying && !dragging) {
      const elapsed = (performance.now() - swayStartTime) / 1000;
      const swayRad = (SWAY_AMPLITUDE_DEG * Math.PI) / 180;
      const azimuth = restAzimuth + swayRad * Math.sin((2 * Math.PI * elapsed) / SWAY_PERIOD_SEC);
      const elevation = Math.PI / 2 - restPolar;
      const distance = camera.position.distanceTo(controls.target);
      positionCamera(azimuth, elevation, distance);
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function boot(): void {
  const canvas = document.getElementById('logo3d') as HTMLCanvasElement | null;
  if (!canvas) return;
  try {
    initLogo3D(canvas);
    canvas.classList.add('is-ready');
    const fallback = document.getElementById('logoMarkFallback');
    if (fallback) fallback.style.display = 'none';
  } catch (error) {
    // WebGL unavailable or another runtime failure -- keep the static <img> fallback visible.
    console.warn('Logo 3D unavailable, falling back to static image.', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
