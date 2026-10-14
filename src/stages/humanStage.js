import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

export class HumanStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];

    this.group.position.set(0, 1.2, -0.85);
    this.scene.add(this.group);

    this.buildDermalMagnifier();
    this.loadHumanModel();
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
            audio.playClick();
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

    if (this.lensGroup) {
      this.lensGroup.rotation.z += delta * 0.8;
    }
  }
}
