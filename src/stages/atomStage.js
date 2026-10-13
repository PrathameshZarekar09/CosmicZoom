import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

export class AtomStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.currentOrbital = '1s';
    this.showQuantumCloud = true;
    this.interactables = [];
    this.orbitalPoints = null;
    this.mixer = null;

    this.group.position.set(0, 1.25, -0.85);
    this.scene.add(this.group);

    this.buildProbabilityCloud();
    this.buildOrbitalSelectors();
    this.loadAtomModel();
  }

  loadAtomModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/Atom.glb', (gltf) => {
        this.model = gltf.scene;
        // Clean Object MaxDim is ~6.54m; scaling to ~0.78m
        this.model.scale.setScalar(0.12);
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

            // Nucleus interaction to jump to quantum stage
            if (/nucleus/i.test(child.name)) {
              child.userData = {
                name: 'Atomic Nucleus',
                isInteractive: true,
                onPinchGrab: () => {
                  audio.playClick();
                  audio.playChirp('excited');
                  if (window.__cosmicJumpStage) window.__cosmicJumpStage(8); // Jump to Quantum!
                }
              };
              this.interactables.push(child);
            }
          }
        });

        // Setup electron animations
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          gltf.animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            action.play();
          });
        }

        this.model.userData = {
          name: 'Atom Model',
          isInteractive: true,
          onPinchGrab: () => {
            audio.playClick();
            audio.playOrbitalShift();
          }
        };
        this.interactables.push(this.model);

        this.group.add(this.model);
      }, undefined, (err) => {
        console.warn('Atom.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading Atom.glb:', e);
    }
  }

  buildProbabilityCloud() {
    this.cloudCount = 3000;
    this.cloudGeo = new THREE.BufferGeometry();
    this.cloudPositions = new Float32Array(this.cloudCount * 3);
    this.cloudColors = new Float32Array(this.cloudCount * 3);

    this.generateOrbitalPositions('1s');

    this.cloudGeo.setAttribute('position', new THREE.BufferAttribute(this.cloudPositions, 3));
    this.cloudGeo.setAttribute('color', new THREE.BufferAttribute(this.cloudColors, 3));

    const cloudMat = new THREE.PointsMaterial({
      size: 0.014,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    this.orbitalPoints = new THREE.Points(this.cloudGeo, cloudMat);
    this.group.add(this.orbitalPoints);
  }

  generateOrbitalPositions(type) {
    this.currentOrbital = type;

    for (let i = 0; i < this.cloudCount; i++) {
      let x, y, z;

      if (type === '1s') {
        const u = Math.random();
        const r = -0.5 * Math.log(1 - u * 0.96) * 0.16 + 0.03;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);

        this.cloudColors[i * 3] = 0.0;
        this.cloudColors[i * 3 + 1] = 0.95;
        this.cloudColors[i * 3 + 2] = 1.0;
      } else if (type === '2p') {
        const r = (Math.random() + Math.random()) * 0.22 + 0.04;
        const lobe = Math.random() > 0.5 ? 1 : -1;
        const spread = 0.08;

        y = lobe * (0.05 + r * 0.7);
        x = (Math.random() - 0.5) * spread * (r + 0.1);
        z = (Math.random() - 0.5) * spread * (r + 0.1);

        this.cloudColors[i * 3] = lobe > 0 ? 0.95 : 0.6;
        this.cloudColors[i * 3 + 1] = 0.2;
        this.cloudColors[i * 3 + 2] = 0.95;
      } else {
        const angle = Math.floor(Math.random() * 4) * (Math.PI / 2) + (Math.random() - 0.5) * 0.6;
        const r = 0.12 + Math.random() * 0.22;

        x = Math.cos(angle) * r;
        y = Math.sin(angle) * r;
        z = (Math.random() - 0.5) * 0.06;

        this.cloudColors[i * 3] = 1.0;
        this.cloudColors[i * 3 + 1] = 0.65;
        this.cloudColors[i * 3 + 2] = 0.1;
      }

      this.cloudPositions[i * 3] = x;
      this.cloudPositions[i * 3 + 1] = y;
      this.cloudPositions[i * 3 + 2] = z;
    }

    if (this.cloudGeo && this.cloudGeo.attributes && this.cloudGeo.attributes.position) {
      this.cloudGeo.attributes.position.needsUpdate = true;
      this.cloudGeo.attributes.color.needsUpdate = true;
    }
  }

  buildOrbitalSelectors() {
    // 3 holographic dials to switch orbital shapes
    const orbitals = [
      { name: '1s (Spherical)', key: '1s', color: 0x00f2fe, x: -0.22 },
      { name: '2p (Dumbbell)', key: '2p', color: 0xa855f7, x: 0 },
      { name: '3d (Cloverleaf)', key: '3d', color: 0xf59e0b, x: 0.22 }
    ];

    const btnGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.015, 20);

    orbitals.forEach((orb) => {
      const mat = new THREE.MeshStandardMaterial({
        color: orb.color,
        roughness: 0.3,
        metalness: 0.4,
        emissive: orb.color,
        emissiveIntensity: 0.3
      });
      const btn = new THREE.Mesh(btnGeo, mat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(orb.x, -0.36, 0.15);

      btn.userData = {
        name: orb.name,
        isInteractive: true,
        onPinchGrab: () => {
          this.setOrbital(orb.key);
          audio.playOrbitalShift();
          btn.scale.setScalar(1.4);
          setTimeout(() => btn.scale.setScalar(1.0), 300);
        },
        onHoverStart: () => btn.scale.setScalar(1.2),
        onHoverEnd: () => btn.scale.setScalar(1.0)
      };

      this.interactables.push(btn);
      this.group.add(btn);
    });
  }

  setOrbital(type) {
    this.generateOrbitalPositions(type);
    if (window.__cosmoGuide) {
      window.__cosmoGuide.pokeCosmo();
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
    }

    if (this.orbitalPoints) {
      this.orbitalPoints.rotation.y += delta * 0.3;
      this.orbitalPoints.rotation.z += delta * 0.15;
    }
  }
}
