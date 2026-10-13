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
    this.mixer = null;

    this.group.position.set(0, 1.25, -0.9);
    this.scene.add(this.group);

    this.buildSurroundingNebula();
    this.loadGalaxyModel();
  }

  buildSurroundingNebula() {
    // Ambient cosmic starfield and satellite clouds
    const starCount = 1500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 0.8 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (r * Math.sin(phi) * Math.sin(theta)) * 0.25;
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.25, 0.9, 0.7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    this.nebulaStars = new THREE.Points(geo, mat);
    this.group.add(this.nebulaStars);

    // Orion Spur beacon marker (location of our Solar System in the Milky Way)
    this.orionGroup = new THREE.Group();
    const markerGeo = new THREE.SphereGeometry(0.022, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    this.orionBeacon = new THREE.Mesh(markerGeo, markerMat);

    const ringGeo = new THREE.RingGeometry(0.03, 0.045, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    this.orionRing = new THREE.Mesh(ringGeo, ringMat);

    this.orionGroup.add(this.orionBeacon, this.orionRing);
    this.orionGroup.position.set(0.42, 0.02, 0.25);

    this.orionGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        if (window.__cosmicJumpStage) window.__cosmicJumpStage(2); // Jump to Solar System!
      },
      onHoverStart: () => this.orionGroup.scale.setScalar(1.5),
      onHoverEnd: () => this.orionGroup.scale.setScalar(1.0)
    };

    this.interactables.push(this.orionGroup);
    this.group.add(this.orionGroup);
  }

  loadGalaxyModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/Galaxy.glb', (gltf) => {
        this.model = gltf.scene;
        // Clean Object MaxDim is ~10.7m; scaling to ~0.9m
        this.model.scale.setScalar(0.085);
        this.model.position.set(0, 0, 0);

        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.transparent = true;
              child.material.opacity = 0.95;
            }
          }
        });

        // Make model interactive (pinch to spin faster)
        this.model.userData = {
          isInteractive: true,
          onPinchGrab: () => {
            audio.playClick();
            audio.playChirp('happy');
            this.model.scale.setScalar(0.1);
            setTimeout(() => this.model.scale.setScalar(0.085), 400);
          }
        };
        this.interactables.push(this.model);

        this.group.add(this.model);
      }, undefined, (err) => {
        console.warn('Galaxy.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading Galaxy.glb:', e);
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
    if (this.nebulaStars) {
      this.nebulaStars.rotation.y += delta * 0.02;
    }
    if (this.orionRing) {
      this.orionRing.scale.setScalar(1.0 + Math.sin(this.time * 4.0) * 0.25);
    }
  }
}
