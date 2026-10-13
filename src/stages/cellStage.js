import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

export class CellStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.atpCount = 0;
    this.interactables = [];
    this.atpParticles = [];

    this.group.position.set(0, 1.25, -0.85);
    this.scene.add(this.group);

    this.loadCellModel();
  }

  loadCellModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/cell.glb', (gltf) => {
        this.model = gltf.scene;
        // Clean Object MaxDim is ~10.61m; scaling to ~0.8m
        this.model.scale.setScalar(0.075);
        this.model.position.set(0, 0, 0);

        this.model.traverse((child) => {
          // Hide any backdrop/floor mesh
          if (/floor|studio|background/i.test(child.name)) {
            child.visible = false;
            return;
          }

          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Make nucleus zoom to DNA
            if (/nucleus|nucleolus/i.test(child.name)) {
              child.userData = {
                isInteractive: true,
                onPinchGrab: () => {
                  audio.playClick();
                  audio.playChirp('excited');
                  if (window.__cosmicJumpStage) window.__cosmicJumpStage(6); // Jump to DNA!
                }
              };
              this.interactables.push(child);
            }
          }
        });

        // Make whole cell interactive to spawn ATP particles
        this.model.userData = {
          isInteractive: true,
          onPinchGrab: (pos) => {
            this.spawnATP(pos || new THREE.Vector3(0, 1.25, -0.85));
            audio.playClick();
            audio.playChirp('happy');
          }
        };
        this.interactables.push(this.model);

        this.group.add(this.model);
      }, undefined, (err) => {
        console.warn('cell.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading cell.glb:', e);
    }
  }

  spawnATP(origin) {
    this.atpCount++;
    const atpGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const atpMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const p = new THREE.Mesh(atpGeo, atpMat);
    p.position.set(
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15
    );
    p.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      0.15 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.3
    );
    p.userData.life = 1.0;
    this.atpParticles.push(p);
    this.group.add(p);
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.model) {
      this.model.rotation.y += delta * 0.08;
      this.model.rotation.x = Math.sin(this.time * 0.6) * 0.04;
    }

    // Update floating ATP spark particles
    for (let i = this.atpParticles.length - 1; i >= 0; i--) {
      const p = this.atpParticles[i];
      p.position.addScaledVector(p.userData.vel, delta);
      p.userData.life -= delta * 0.85;
      p.scale.setScalar(Math.max(0.01, p.userData.life));
      if (p.userData.life <= 0) {
        this.group.remove(p);
        this.atpParticles.splice(i, 1);
      }
    }
  }
}
