import * as THREE from 'three';
import { audio } from '../audio.js';

export class MoleculeStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];
    this.waterMolecules = [];

    this.buildDNAHelix();
    this.buildWaterMolecules();
    this.buildAtomZoomTarget();

    this.group.position.set(0, 1.3, -0.85);
    this.scene.add(this.group);
  }

  buildDNAHelix() {
    this.dnaGroup = new THREE.Group();
    const pairsCount = 28;
    const height = 0.9;
    const radius = 0.14;
    const twist = Math.PI * 3.5;

    const baseColors = [
      { name: 'A-T', c1: 0x00f2fe, c2: 0x3b82f6 }, // Adenine - Thymine
      { name: 'C-G', c1: 0xff007f, c2: 0xfbbf24 }  // Cytosine - Guanine
    ];

    const sphereGeo = new THREE.SphereGeometry(0.016, 12, 12);
    const rungGeo = new THREE.CylinderGeometry(0.005, 0.005, radius * 2, 8);
    rungGeo.rotateZ(Math.PI / 2);

    for (let i = 0; i < pairsCount; i++) {
      const t = i / pairsCount;
      const angle = t * twist;
      const y = (t - 0.5) * height;

      // Backbone node 1
      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const node1 = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
      node1.position.set(x1, y, z1);
      this.dnaGroup.add(node1);

      // Backbone node 2
      const x2 = Math.cos(angle + Math.PI) * radius;
      const z2 = Math.sin(angle + Math.PI) * radius;
      const node2 = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0xa855f7 }));
      node2.position.set(x2, y, z2);
      this.dnaGroup.add(node2);

      // Base pair bridge rung
      const pair = baseColors[i % 2];
      const rung = new THREE.Mesh(rungGeo, new THREE.MeshStandardMaterial({
        color: pair.c1,
        emissive: pair.c1,
        emissiveIntensity: 0.3
      }));
      rung.position.set(0, y, 0);
      rung.rotation.y = -angle;

      rung.userData = {
        name: pair.name,
        isInteractive: true,
        onPinchGrab: () => {
          rung.scale.setScalar(1.6);
          setTimeout(() => rung.scale.setScalar(1.0), 400);
          audio.playClick();
          audio.playChirp('happy');
        }
      };
      this.interactables.push(rung);
      this.dnaGroup.add(rung);
    }

    this.group.add(this.dnaGroup);
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

      // Hydrogen 1 (104.5 deg angle)
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

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.dnaGroup) {
      this.dnaGroup.rotation.y += delta * 0.45;
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
