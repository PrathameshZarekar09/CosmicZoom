import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

/**
 * QuantumStage - Quark model showcase at the deepest scale (10^-18 m)
 */
export class QuantumStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];

    this.group.position.set(0, 1.25, -1.05);
    this.scene.add(this.group);

    this.loadQuarkModel();
  }

  loadQuarkModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/Quark.glb', (gltf) => {
        this.model = gltf.scene;
        // Scale to a comfortable viewing size (~0.35m)
        this.model.scale.setScalar(0.06);
        this.model.position.set(0, 0, 0);

        this.model.traverse((child) => {
          if (/floor|studio|background/i.test(child.name)) {
            child.visible = false;
            return;
          }
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.model.userData = {
          name: 'Quark Cluster (Proton & Neutron)',
          isInteractive: true,
          onPinchGrab: () => {
            audio.playClick();
            audio.playChirp('excited');
            this.model.scale.setScalar(0.08);
            setTimeout(() => this.model.scale.setScalar(0.06), 400);
          }
        };
        this.interactables.push(this.model);

        this.group.add(this.model);
      }, undefined, (err) => {
        console.warn('Quark.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading Quark.glb:', e);
    }
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.model) {
      this.model.rotation.y += delta * 0.4;
      this.model.rotation.x = Math.sin(this.time * 0.8) * 0.15;
    }
  }
}
