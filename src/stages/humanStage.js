import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

export class HumanStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.heartRate = 1.2; // beats per sec
    this.lastBeatTime = 0;
    this.interactables = [];

    this.group.position.set(0, 1.2, -0.85);
    this.scene.add(this.group);

    this.buildBeatingHeart();
    this.buildDermalMagnifier();
    this.loadHumanModel();
  }

  buildBeatingHeart() {
    // 3D Glowing Anatomical Heart inside chest
    this.heartGroup = new THREE.Group();
    const heartGeo = new THREE.DodecahedronGeometry(0.045, 1);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });
    this.heartMesh = new THREE.Mesh(heartGeo, heartMat);
    this.heartGroup.add(this.heartMesh);

    // Pulsing energy aura
    const auraGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    this.heartAura = new THREE.Mesh(auraGeo, auraMat);
    this.heartGroup.add(this.heartAura);

    this.heartGroup.position.set(-0.02, 0.16, 0.08);

    this.heartGroup.userData = {
      name: 'Heart',
      isInteractive: true,
      onPinchGrab: () => {
        this.heartRate = this.heartRate > 2.2 ? 1.0 : this.heartRate + 0.5;
        audio.playHeartbeat();
        audio.playChirp('curious');
      },
      onHoverStart: () => this.heartGroup.scale.setScalar(1.3),
      onHoverEnd: () => this.heartGroup.scale.setScalar(1.0)
    };
    this.interactables.push(this.heartGroup);
    this.group.add(this.heartGroup);
  }

  buildDermalMagnifier() {
    // Glowing lens targeting skin tissue to shrink into cell scale
    this.lensGroup = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.045, 0.006, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    const glassGeo = new THREE.CircleGeometry(0.042, 24);
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);

    this.lensGroup.add(ring, glass);
    this.lensGroup.position.set(0.18, 0.08, 0.14);

    this.lensGroup.userData = {
      name: 'Skin Magnifier',
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        if (window.__cosmicJumpStage) window.__cosmicJumpStage(5); // Jump to Cell!
      },
      onHoverStart: () => this.lensGroup.scale.setScalar(1.4),
      onHoverEnd: () => this.lensGroup.scale.setScalar(1.0)
    };
    this.interactables.push(this.lensGroup);
    this.group.add(this.lensGroup);
  }

  loadHumanModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/human.glb', (gltf) => {
        this.model = gltf.scene;
        // Clean Object MaxDim is ~2.0m; scaling to ~0.85m height
        this.model.scale.setScalar(0.42);
        this.model.position.set(0, -0.42, 0);

        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.model.userData = {
          isInteractive: true,
          onPinchGrab: () => {
            audio.playHeartbeat();
            this.model.rotation.y += 0.4;
          }
        };
        this.interactables.push(this.model);

        this.group.add(this.model);
      }, undefined, (err) => {
        console.warn('human.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading human.glb:', e);
    }
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    // Heartbeat pulse cycle
    const beatInterval = 1.0 / this.heartRate;
    if (this.time - this.lastBeatTime > beatInterval) {
      this.lastBeatTime = this.time;
      audio.playHeartbeat();
    }

    const phase = (this.time - this.lastBeatTime) / beatInterval;
    let pulseScale = 1.0;
    if (phase < 0.12) {
      pulseScale = 1.0 + Math.sin((phase / 0.12) * Math.PI) * 0.35;
    } else if (phase < 0.28) {
      pulseScale = 1.0 + Math.sin(((phase - 0.12) / 0.16) * Math.PI) * 0.2;
    }

    if (this.heartMesh) {
      this.heartMesh.scale.setScalar(pulseScale);
    }
    if (this.heartAura) {
      this.heartAura.scale.setScalar(pulseScale * 1.15);
    }
    if (this.lensGroup) {
      this.lensGroup.rotation.z += delta * 0.8;
    }
  }
}
