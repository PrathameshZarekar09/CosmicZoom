import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

export class MoleculeStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];
    this.waterMolecules = [];
    this.mixer = null;

    this.group.position.set(0, 1.25, -0.85);
    this.scene.add(this.group);

    this.buildWaterMolecules();
    this.buildAtomZoomTarget();
    this.loadDNAModel();
  }

  buildWaterMolecules() {
    // H2O molecules floating nearby
    const oxyGeo = new THREE.SphereGeometry(0.024, 12, 12);
    const oxyMat = new THREE.MeshStandardMaterial({ color: 0xef4444 }); // Oxygen red

    const hydGeo = new THREE.SphereGeometry(0.014, 12, 12);
    const hydMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // Hydrogen white

    const bondGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.032, 6);

    for (let i = 0; i < 4; i++) {
      const h2o = new THREE.Group();
      const oxy = new THREE.Mesh(oxyGeo, oxyMat);
      h2o.add(oxy);

      // Hydrogen 1
      const hyd1 = new THREE.Mesh(hydGeo, hydMat);
      hyd1.position.set(0.03, 0.022, 0);
      const bond1 = new THREE.Mesh(bondGeo, hydMat);
      bond1.position.set(0.015, 0.011, 0);
      bond1.rotation.z = -0.65;
      h2o.add(hyd1, bond1);

      // Hydrogen 2
      const hyd2 = new THREE.Mesh(hydGeo, hydMat);
      hyd2.position.set(-0.03, 0.022, 0);
      const bond2 = new THREE.Mesh(bondGeo, hydMat);
      bond2.position.set(-0.015, 0.011, 0);
      bond2.rotation.z = 0.65;
      h2o.add(hyd2, bond2);

      const offsetAngle = (i / 4) * Math.PI * 2;
      h2o.position.set(Math.cos(offsetAngle) * 0.32, (i - 1.5) * 0.16, Math.sin(offsetAngle) * 0.28);

      h2o.userData = {
        name: 'H2O',
        isInteractive: true,
        onPinchGrab: () => {
          h2o.scale.setScalar(2.0);
          setTimeout(() => h2o.scale.setScalar(1.0), 400);
          audio.playClick();
        }
      };
      this.interactables.push(h2o);
      this.waterMolecules.push(h2o);
      this.group.add(h2o);
    }
  }

  buildAtomZoomTarget() {
    // Glowing focal ring around a carbon atom to zoom into Atom stage
    this.atomTarget = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.035, 0.05, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    this.atomTarget.add(ring);
    this.atomTarget.position.set(0, 0.32, 0.16);

    this.atomTarget.userData = {
      name: 'Atom Zoom Target',
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        if (window.__cosmicJumpStage) window.__cosmicJumpStage(7); // Jump to Atom!
      },
      onHoverStart: () => this.atomTarget.scale.setScalar(1.4),
      onHoverEnd: () => this.atomTarget.scale.setScalar(1.0)
    };
    this.interactables.push(this.atomTarget);
    this.group.add(this.atomTarget);
  }

  loadDNAModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/DNA.glb', (gltf) => {
        this.model = gltf.scene;
        // Clean Object MaxDim is ~10.42m; scaling to ~0.83m tall
        this.model.scale.setScalar(0.08);
        this.model.position.set(0, -0.4, 0);

        this.model.traverse((child) => {
          // Hide any backdrop/floor mesh
          if (/floor|studio|background|speck/i.test(child.name)) {
            child.visible = false;
            return;
          }

          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Setup DNA Rotation animation
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          gltf.animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            action.play();
          });
        }

        this.model.userData = {
          name: 'DNA Helix',
          isInteractive: true,
          onPinchGrab: () => {
            audio.playClick();
            audio.playChirp('happy');
            this.model.scale.setScalar(0.095);
            setTimeout(() => this.model.scale.setScalar(0.08), 400);
          }
        };
        this.interactables.push(this.model);

        this.group.add(this.model);
      }, undefined, (err) => {
        console.warn('DNA.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading DNA.glb:', e);
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
      this.model.rotation.y += delta * 0.45;
    }

    this.waterMolecules.forEach((h2o, i) => {
      h2o.rotation.x += delta * (0.8 + i * 0.2);
      h2o.rotation.y += delta * (0.6 + i * 0.15);
      h2o.position.y += Math.sin(this.time * 2.0 + i) * 0.001;
    });

    if (this.atomTarget) {
      this.atomTarget.rotation.z += delta * 1.0;
    }
  }
}
