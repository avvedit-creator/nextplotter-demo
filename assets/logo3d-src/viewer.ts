import * as THREE from 'three';
import {
  createNextplotterIsotipoModel,
  createNextplotterIsotipoLookDevLights,
  createNextplotterIsotipoEnvironment,
  frameNextplotterIsotipoCamera,
  configureNextplotterIsotipoRenderer,
} from './createLogoModel';

function initLogo3D(canvas: HTMLCanvasElement): void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  configureNextplotterIsotipoRenderer(renderer);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.background = null;

  const model = createNextplotterIsotipoModel({ qualityPriority: 'reference-fidelity' });
  scene.add(model);
  scene.add(createNextplotterIsotipoLookDevLights('neutral'));
  scene.environment = createNextplotterIsotipoEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);

  function resize(): void {
    const size = canvas.clientWidth || canvas.parentElement?.clientWidth || 240;
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    frameNextplotterIsotipoCamera(camera, model, { azimuthDeg: currentAzimuth, elevationDeg: 26, margin: 1.35 });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentAzimuth = 25;
  const rotationDegPerSecond = 10; // one slow, lazy turn roughly every 36s
  let lastTime = performance.now();

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  resize();

  function tick(now: number): void {
    const deltaSeconds = (now - lastTime) / 1000;
    lastTime = now;
    if (!reduceMotion) {
      currentAzimuth = (currentAzimuth + rotationDegPerSecond * deltaSeconds) % 360;
      frameNextplotterIsotipoCamera(camera, model, { azimuthDeg: currentAzimuth, elevationDeg: 26, margin: 1.35 });
    }
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
