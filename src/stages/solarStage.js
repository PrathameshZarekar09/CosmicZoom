import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

export class SolarStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];
    this.mixer = null;
    this.timeScale = 1.0;

    this.group.position.set(0, 1.25, -0.9);
    this.scene.add(this.group);

    this.buildTimeDial();
    this.loadSolarSystemModel();
  }

  buildTimeDial() {
    // 3D holographic time speed dial console
    const dialGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.015, 24);
    const dialMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4
    });
    this.dialMesh = new THREE.Mesh(dialGeo, dialMat);
    this.dialMesh.position.set(0.65, -0.22, 0.2);

    this.dialMesh.userData = {
      name: 'Time Dial',
      isInteractive: true,
      onPinchGrab: () => {
        this.timeScale = this.timeScale >= 4.0 ? 0.5 : this.timeScale * 2;
        if (this.mixer) this.mixer.timeScale = this.timeScale;
        audio.playClick();
        audio.playChirp('happy');
      },
      onHoverStart: () => this.dialMesh.scale.setScalar(1.2),
      onHoverEnd: () => this.dialMesh.scale.setScalar(1.0)
    };
    this.interactables.push(this.dialMesh);
    this.group.add(this.dialMesh);
  }

  loadSolarSystemModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/SolarSystem.glb', (gltf) => {
        this.model = gltf.scene;
        // Clean Object MaxDim is ~41.97m; scaling to ~1.0m diameter
        this.model.scale.setScalar(0.024);
        this.model.position.set(0, 0, 0);

        // Setup planetary animations
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          this.mixer.timeScale = this.timeScale;
          gltf.animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            action.play();
          });
        }

        // Enable shadows and interactions on children
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Make Earth pinchable to zoom to Earth stage
            if (/earth/i.test(child.name)) {
              child.userData = {
                isInteractive: true,
                onPinchGrab: () => {
                  audio.playClick();
                  audio.playChirp('excited');
                  if (window.__cosmicJumpStage) window.__cosmicJumpStage(3); // Jump to Earth!
                }
              };
              this.interactables.push(child);
            }
          }
        });

        // Make whole solar system pinchable
        this.model.userData = {
          isInteractive: true,
          onPinchGrab: () => {
            audio.playClick();
            this.timeScale = (this.timeScale % 3) + 1;
            if (this.mixer) this.mixer.timeScale = this.timeScale;
          }
        };
        this.interactables.push(this.model);

        this.group.add(this.model);
      }, undefined, (err) => {
        console.warn('SolarSystem.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading SolarSystem.glb:', e);
    }
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.mixer) {
      this.mixer.update(delta);
    } else if (this.model) {
      this.model.rotation.y += delta * 0.15 * this.timeScale;
    }

    if (this.dialMesh) {
      this.dialMesh.rotation.y += delta * 0.8 * this.timeScale;
    }
  }
}
