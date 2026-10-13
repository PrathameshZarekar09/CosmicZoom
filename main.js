import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { audio } from './src/audio.js';
import { HandTrackingManager } from './src/handTracking.js';
import { CosmoGuide } from './src/cosmoGuide.js';
import { UI3DManager } from './src/ui3d.js';

import { UniverseStage } from './src/stages/universeStage.js';
import { GalaxyStage } from './src/stages/galaxyStage.js';
import { SolarStage } from './src/stages/solarStage.js';
import { EarthStage } from './src/stages/earthStage.js';
import { HumanStage } from './src/stages/humanStage.js';
import { CellStage } from './src/stages/cellStage.js';
import { MoleculeStage } from './src/stages/moleculeStage.js';
import { AtomStage } from './src/stages/atomStage.js';
import { QuantumStage } from './src/stages/quantumStage.js';

// =============================================================================
// SCENE, CAMERA & RENDERER SETUP
// =============================================================================
const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040711);
scene.fog = new THREE.FogExp2(0x040711, 0.05);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 1.35, 0.65);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

// =============================================================================
// WEBXR SESSION SETUP (QUEST 3 HAND TRACKING & IMMERSIVE-VR)
// =============================================================================
async function setupWebXRSession(renderer) {
  const headerBtn = document.getElementById('btn-header-vr');
  const floatingBtn = document.getElementById('btn-floating-vr');
  const toast = document.getElementById('vr-toast');
  const httpsBanner = document.getElementById('https-warning-banner');

  const vrButtons = [headerBtn, floatingBtn].filter(Boolean);

  function setButtonText(text) {
    vrButtons.forEach(btn => {
      const txt = btn.querySelector('.vr-btn-text');
      if (txt) txt.textContent = text;
      else btn.textContent = text;
    });
  }

  function setButtonsDisabled(disabled) {
    vrButtons.forEach(btn => {
      btn.disabled = disabled;
      if (disabled) btn.classList.add('disabled');
      else btn.classList.remove('disabled');
    });
  }

  function showToast(msg, duration = 5000, isError = false) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'vr-toast ' + (isError ? 'error' : 'info');
    toast.style.display = 'block';
    if (duration > 0) {
      setTimeout(() => { toast.style.display = 'none'; }, duration);
    }
  }

  // 1. Check HTTPS (Secure Context)
  if (!window.isSecureContext) {
    const httpsPort = '3443';
    const httpsUrl = `https://${window.location.hostname}:${httpsPort}${window.location.pathname}`;
    setButtonText('⚠️ HTTPS REQUIRED');
    if (httpsBanner) {
      httpsBanner.style.display = 'flex';
      httpsBanner.innerHTML = `
        <span>🔒 WebXR requires HTTPS on Quest 3.</span>
        <a href="${httpsUrl}">Switch to HTTPS (Port ${httpsPort}) ➔</a>
      `;
    }
    vrButtons.forEach(btn => {
      btn.onclick = () => { window.location.href = httpsUrl; };
    });
    return;
  }

  // 2. Check navigator.xr
  if (!('xr' in navigator)) {
    setButtonText('❌ WEBXR NOT SUPPORTED');
    setButtonsDisabled(true);
    showToast('WebXR is not available in this browser. Please open in Meta Quest Browser on Quest 3.', 6000, true);
    return;
  }

  // 3. Check immersive-vr support
  try {
    const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!vrSupported) {
      setButtonText('❌ VR NOT SUPPORTED');
      setButtonsDisabled(true);
      showToast('immersive-vr is not supported on this device.', 5000, true);
      return;
    }
  } catch (err) {
    console.warn('isSessionSupported error:', err);
    setButtonText('❌ XR PERMISSION ERROR');
    showToast('WebXR check error: ' + err.message, 5000, true);
    return;
  }

  // Ready for VR
  setButtonText('🥽 ENTER VR');
  let currentSession = null;

  async function onSessionStarted(session) {
    session.addEventListener('end', onSessionEnded);
    await renderer.xr.setSession(session);
    setButtonText('EXIT VR');
    currentSession = session;
    showToast('🎉 WebXR VR Session Active! Put on your headset.', 3000);
    audio.ensureContext();
    audio.playSuccess();
  }

  function onSessionEnded() {
    currentSession.removeEventListener('end', onSessionEnded);
    setButtonText('🥽 ENTER VR');
    currentSession = null;
    showToast('VR session ended.', 3000);
  }

  async function toggleVRSession() {
    audio.ensureContext();

    if (currentSession === null) {
      setButtonText('⏳ STARTING VR...');
      showToast('Requesting immersive-vr session with hand tracking...');

      const featureTiers = [
        {
          name: 'Hand Tracking + Local Floor + Bounded Floor',
          options: {
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
          }
        },
        {
          name: 'Hand Tracking + Local Floor',
          options: {
            optionalFeatures: ['local-floor', 'hand-tracking']
          }
        },
        {
          name: 'Local Floor Basic',
          options: {
            optionalFeatures: ['local-floor']
          }
        }
      ];

      let started = false;
      let lastError = null;

      for (const tier of featureTiers) {
        try {
          console.log(`Attempting WebXR session with: ${tier.name}...`);
          const session = await navigator.xr.requestSession('immersive-vr', tier.options);
          await onSessionStarted(session);
          started = true;
          break;
        } catch (err) {
          console.warn(`Feature tier "${tier.name}" failed:`, err);
          lastError = err;
        }
      }

      if (!started) {
        setButtonText('🥽 ENTER VR');
        showToast(`Could not start VR session: ${lastError?.message || 'Unknown error'}. Check Quest boundary or permissions.`, 8000, true);
      }
    } else {
      currentSession.end();
    }
  }

  vrButtons.forEach(btn => {
    btn.onclick = toggleVRSession;
  });
}

setupWebXRSession(renderer);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.25, -0.8);
controls.minDistance = 0.2;
controls.maxDistance = 5.0;
controls.update();

// =============================================================================
// LIGHTING SETUP
// =============================================================================
const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.75);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(2.5, 4.5, 2.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;
scene.add(keyLight);

const cyanFill = new THREE.PointLight(0x00f2fe, 1.8, 8);
cyanFill.position.set(-1.8, 2.0, 0.8);
scene.add(cyanFill);

const violetRim = new THREE.PointLight(0xa855f7, 1.8, 8);
violetRim.position.set(1.8, 1.8, -1.2);
scene.add(violetRim);

// =============================================================================
// MANAGERS & STAGES
// =============================================================================
const handTracking = new HandTrackingManager(renderer, scene, camera);
const cosmo = new CosmoGuide(scene, camera);
window.__cosmoGuide = cosmo;

const ui3d = new UI3DManager(scene, camera);

// 9 Stages of Scale
const stages = [
  new UniverseStage(scene),   // 0: 10^26 m
  new GalaxyStage(scene),     // 1: 10^21 m
  new SolarStage(scene),      // 2: 10^12 m
  new EarthStage(scene),      // 3: 10^7 m
  new HumanStage(scene),      // 4: 10^0 m
  new CellStage(scene),       // 5: 10^-5 m
  new MoleculeStage(scene),   // 6: 10^-9 m
  new AtomStage(scene),       // 7: 10^-10 m
  new QuantumStage(scene)     // 8: 10^-18 m
];

let activeStageIndex = 0;
let accumulatedZoomDelta = 0;

function switchStage(newIndex) {
  if (newIndex < 0 || newIndex >= stages.length) return;
  if (newIndex === activeStageIndex && stages[activeStageIndex].group.visible) return;

  // Hide old stage
  stages[activeStageIndex].group.visible = false;

  // Show new stage
  activeStageIndex = newIndex;
  stages[activeStageIndex].group.visible = true;

  // Update audio, cosmo, and UI
  audio.updateStageAmbient(activeStageIndex);
  cosmo.setStage(activeStageIndex);
  ui3d.setStage(activeStageIndex);

  // Update interactables for hand tracking
  refreshInteractables();

  // Update 2D desktop HUD badge if present
  const stageBadge = document.getElementById('hud-stage-name');
  if (stageBadge) {
    stageBadge.innerText = ui3d.stageNames[activeStageIndex];
  }
}

function refreshInteractables() {
  const currentInteractables = [
    ...ui3d.getInteractables(),
    ...stages[activeStageIndex].getInteractables(),
    cosmo.head
  ];
  handTracking.setInteractables(currentInteractables);
}

// Global hook for stages to jump
window.__cosmicJumpStage = (idx) => switchStage(idx);

// =============================================================================
// HAND TRACKING GESTURE BINDINGS
// =============================================================================

// 1. Two-Hand Zoom (Pulling apart zooms in toward quantum realm, pushing together zooms out)
handTracking.onTwoHandZoom = (deltaDist) => {
  accumulatedZoomDelta += deltaDist;
  if (accumulatedZoomDelta > 0.08) {
    // Zoom in toward quantum
    accumulatedZoomDelta = 0;
    if (activeStageIndex < stages.length - 1) {
      switchStage(activeStageIndex + 1);
    }
  } else if (accumulatedZoomDelta < -0.08) {
    // Zoom out toward universe
    accumulatedZoomDelta = 0;
    if (activeStageIndex > 0) {
      switchStage(activeStageIndex - 1);
    }
  }
};

// 2. Single Pinch Drag on Slider Bead
handTracking.onSinglePinchDrag = (handIdx, deltaMove, worldPos, draggedObj) => {
  if (draggedObj === ui3d.bead) {
    ui3d.handlePinchDrag(deltaMove);
  }
};

// 3. Object Clicks
handTracking.onObjectClick = (obj) => {
  if (obj?.userData?.onPinchGrab) {
    obj.userData.onPinchGrab();
  }
};

// 4. Open-Palm Navigator Detection
handTracking.onPalmStateChange = (isFacing, handIdx, palmPos, palmNormal) => {
  ui3d.updatePalmTransform(isFacing, palmPos, palmNormal);
};

// Slider stage change callback
ui3d.onStageSelect = (idx) => {
  switchStage(idx);
};

// =============================================================================
// DESKTOP INTERACTION FALLBACK (MOUSE & KEYBOARD)
// =============================================================================
const mouseRaycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isMouseDown = false;
let draggedBeadDesktop = false;

window.addEventListener('pointerdown', (e) => {
  audio.ensureContext();
  isMouseDown = true;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  mouseRaycaster.setFromCamera(mouse, camera);
  const currentInteractables = [
    ...ui3d.getInteractables(),
    ...stages[activeStageIndex].getInteractables(),
    cosmo.head
  ];
  const hits = mouseRaycaster.intersectObjects(currentInteractables, true);

  if (hits.length > 0) {
    let cur = hits[0].object;
    while (cur && !cur.userData?.isInteractive && cur.parent) cur = cur.parent;
    if (cur && cur.userData?.onPinchGrab) {
      if (cur === ui3d.bead) draggedBeadDesktop = true;
      cur.userData.onPinchGrab(hits[0].point);
    }
  }
});

window.addEventListener('pointermove', (e) => {
  if (draggedBeadDesktop && isMouseDown) {
    const deltaX = e.movementX * 0.002;
    ui3d.handlePinchDrag(new THREE.Vector3(deltaX, 0, 0));
  }
});

window.addEventListener('pointerup', () => {
  isMouseDown = false;
  draggedBeadDesktop = false;
});

// Keyboard shortcuts for quick stage jumping & testing
window.addEventListener('keydown', (e) => {
  audio.ensureContext();
  const num = parseInt(e.key, 10);
  if (!isNaN(num) && num >= 1 && num <= 9) {
    switchStage(num - 1);
  } else if (e.code === 'Space') {
    // Space toggles Quantum Observer
    if (stages[8].toggleObserver) stages[8].toggleObserver();
  } else if (e.key === 'g' || e.key === 'G') {
    // Summon Cosmo
    cosmo.pokeCosmo();
  } else if (e.key === 'm' || e.key === 'M') {
    // Mute/unmute
    audio.toggleMute();
  }
});

// Initialize first stage
switchStage(0);

// =============================================================================
// ANIMATION & RENDER LOOP
// =============================================================================
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);

  // Update Hand Tracking
  handTracking.update(delta);

  // Update Companion Guide & 3D UI
  cosmo.update(delta);
  ui3d.update(delta);

  // Update Active Stage
  if (stages[activeStageIndex]) {
    stages[activeStageIndex].update(delta);
  }

  // Update Orbit controls when not in VR
  if (!renderer.xr.isPresenting) {
    controls.update();
  }

  renderer.render(scene, camera);
});

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// VR Session event audio trigger
renderer.xr.addEventListener('sessionstart', () => {
  audio.ensureContext();
  audio.playSuccess();
});
