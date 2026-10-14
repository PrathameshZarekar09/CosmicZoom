import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

export class GalaxyStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];

    this.group.position.set(0, 1.25, -0.9);
    this.scene.add(this.group);

    this.loadGalaxyModel();
  }

  loadGalaxyModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/MilkyWay.glb', (gltf) => {
        this.model = gltf.scene;
        this.model.scale.setScalar(0.0065);
        this.model.position.set(0, 0, 0);

        this.model.traverse((child) => {
          if (/floor|studio|background/i.test(child.name)) {
            child.visible = false;
            return;
          }
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.transparent = true;
              child.material.opacity = 0.95;
            }
          }
        });

        this.model.userData = {
          isInteractive: true,
          onPinchGrab: () => {
            audio.playClick();
            audio.playChirp('happy');
            this.model.scale.setScalar(0.008);
            setTimeout(() => this.model.scale.setScalar(0.0065), 400);
          }
        };
        this.interactables.push(this.model);

        this.group.add(this.model);
      }, undefined, (err) => {
        console.warn('MilkyWay.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading MilkyWay.glb:', e);
    }
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.model) {
      this.model.rotation.y += delta * 0.08;
    }
  }
}
