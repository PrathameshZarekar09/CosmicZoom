import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

export class EarthStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];

    this.group.position.set(0, 1.25, -0.85);
    this.scene.add(this.group);

    this.buildISS();
    this.buildMoon();
    this.buildContinentTarget();
    this.loadEarthModel();
  }

  buildISS() {
    this.issGroup = new THREE.Group();

    // ISS Module & Solar Panels
    const coreGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotateZ(Math.PI / 2);

    const panelGeo = new THREE.BoxGeometry(0.065, 0.002, 0.022);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const panelL = new THREE.Mesh(panelGeo, panelMat);
    panelL.position.x = -0.045;
    const panelR = new THREE.Mesh(panelGeo, panelMat);
    panelR.position.x = 0.045;

    this.issGroup.add(core, panelL, panelR);
    this.issGroup.position.set(0.42, 0, 0);

    this.issGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        this.issGroup.scale.setScalar(2.2);
        setTimeout(() => this.issGroup.scale.setScalar(1.0), 600);
      },
      onHoverStart: () => this.issGroup.scale.setScalar(1.5),
      onHoverEnd: () => this.issGroup.scale.setScalar(1.0)
    };
    this.interactables.push(this.issGroup);
    this.group.add(this.issGroup);
  }

  buildMoon() {
    const moonGeo = new THREE.SphereGeometry(0.07, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.8 });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.moon.position.set(0.85, 0.25, -0.3);
    this.group.add(this.moon);
  }

  buildContinentTarget() {
    // Glowing focal landing target beacon to zoom into Human Body
    const targetGeo = new THREE.RingGeometry(0.025, 0.04, 24);
    const targetMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.targetMarker = new THREE.Mesh(targetGeo, targetMat);
    this.targetMarker.position.set(0.12, 0.18, 0.28);
    this.targetMarker.lookAt(0, 0, 0);

    this.targetMarker.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        if (window.__cosmicJumpStage) window.__cosmicJumpStage(4); // Jump to Human Body!
      },
      onHoverStart: () => this.targetMarker.scale.setScalar(1.5),
      onHoverEnd: () => this.targetMarker.scale.setScalar(1.0)
    };
    this.interactables.push(this.targetMarker);
    this.group.add(this.targetMarker);
  }

  loadEarthModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/earth.glb', (gltf) => {
        this.model = gltf.scene;
        // Clean Object MaxDim is ~6.01m; scaling to ~0.6m diameter
        this.model.scale.setScalar(0.1);
        this.model.position.set(0, 0, 0);

        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Make continents interactive
            child.userData = {
              isInteractive: true,
              onPinchGrab: () => {
                audio.playClick();
                audio.playChirp('happy');
                this.model.rotation.y += 0.5;
              }
            };
            this.interactables.push(child);
          }
        });

        this.group.add(this.model);
      }, undefined, (err) => {
        console.warn('earth.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading earth.glb:', e);
    }
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.model) {
      this.model.rotation.y += delta * 0.12;
    }

    // ISS orbit
    if (this.issGroup) {
      const angle = this.time * 0.8;
      const r = 0.44;
      this.issGroup.position.set(
        Math.cos(angle) * r,
        Math.sin(angle * 0.7) * 0.12,
        Math.sin(angle) * r
      );
      this.issGroup.rotation.y = -angle;
    }

    if (this.moon) {
      const mAngle = this.time * 0.18;
      this.moon.position.set(Math.cos(mAngle) * 0.85, 0.15, Math.sin(mAngle) * 0.85);
    }

    if (this.targetMarker) {
      this.targetMarker.rotation.z += delta * 1.5;
    }
  }
}
