import * as THREE from 'three';
import { audio } from '../audio.js';

export class AtomStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.currentOrbital = '1s'; // '1s' | '2p' | '3d'
    this.interactables = [];
    this.orbitalPoints = null;

    this.buildNucleus();
    this.buildProbabilityCloud();
    this.buildOrbitalSelectors();

    this.group.position.set(0, 1.3, -0.85);
    this.scene.add(this.group);
  }

  buildNucleus() {
    this.nucleusGroup = new THREE.Group();

    // Dense cluster of protons (red) and neutrons (blue)
    const pGeo = new THREE.SphereGeometry(0.016, 12, 12);
    const pMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.2, roughness: 0.3 });
    const nMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.2, roughness: 0.3 });

    // 6 protons and 6 neutrons (Carbon-12 nucleus)
    for (let i = 0; i < 12; i++) {
      const isProton = i < 6;
      const sphere = new THREE.Mesh(pGeo, isProton ? pMat : nMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.022 + Math.random() * 0.018;

      sphere.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      this.nucleusGroup.add(sphere);
    }

    this.nucleusGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        if (window.__cosmicJumpStage) window.__cosmicJumpStage(8); // Jump to Quantum Finale!
      },
      onHoverStart: () => this.nucleusGroup.scale.setScalar(1.5),
      onHoverEnd: () => this.nucleusGroup.scale.setScalar(1.0)
    };
    this.interactables.push(this.nucleusGroup);
    this.group.add(this.nucleusGroup);
  }

  buildProbabilityCloud() {
    this.cloudCount = 3500;
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
      opacity: 0.8,
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
        // Spherical probability distribution: |psi_1s|^2 ~ e^(-2r)
        // Highest density near center, exponentially decaying outwards
        const u = Math.random();
        const r = -0.5 * Math.log(1 - u * 0.96) * 0.16 + 0.03;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);

        // Cyan glow
        this.cloudColors[i * 3] = 0.0;
        this.cloudColors[i * 3 + 1] = 0.95;
        this.cloudColors[i * 3 + 2] = 1.0;
      } else if (type === '2p') {
        // Dumbbell lobe distribution: |psi_2p|^2 ~ r^2 * e^(-r) * cos^2(theta)
        // Two lobes along Y-axis with nodal plane at y = 0
        const r = (Math.random() + Math.random()) * 0.22 + 0.04;
        const lobe = Math.random() > 0.5 ? 1 : -1;
        const spread = 0.08;

        y = lobe * (0.05 + r * 0.7);
        x = (Math.random() - 0.5) * spread * (r + 0.1);
        z = (Math.random() - 0.5) * spread * (r + 0.1);

        // Magenta/violet glow for 2p
        this.cloudColors[i * 3] = lobe > 0 ? 0.95 : 0.6;
        this.cloudColors[i * 3 + 1] = 0.2;
        this.cloudColors[i * 3 + 2] = 0.95;
      } else {
        // 3d orbital (cloverleaf 4 lobes in XY plane)
        const angle = Math.floor(Math.random() * 4) * (Math.PI / 2) + (Math.random() - 0.5) * 0.6;
        const r = 0.12 + Math.random() * 0.22;

        x = Math.cos(angle) * r;
        y = Math.sin(angle) * r;
        z = (Math.random() - 0.5) * 0.06;

        // Electric amber glow for 3d
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

    if (this.orbitalPoints) {
      this.orbitalPoints.rotation.y += delta * 0.3;
      this.orbitalPoints.rotation.z += delta * 0.15;
    }

    if (this.nucleusGroup) {
      this.nucleusGroup.rotation.x += delta * 0.4;
      this.nucleusGroup.rotation.y += delta * 0.6;
    }
  }
}
