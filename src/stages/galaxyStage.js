import * as THREE from 'three';
import { audio } from '../audio.js';

export class GalaxyStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];

    this.buildMilkyWayDisk();
    this.buildCoreBlackHole();
    this.buildOrionSpurMarker();
    this.buildSatelliteGalaxies();

    this.group.position.set(0, 1.3, -1.0);
    this.scene.add(this.group);
  }

  buildMilkyWayDisk() {
    const starCount = 8000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const arms = 4;
    const armSpread = 0.42;

    for (let i = 0; i < starCount; i++) {
      // Distance from galactic core
      const r = Math.pow(Math.random(), 1.8) * 1.6 + 0.08;
      const armIndex = i % arms;
      const armAngle = (armIndex / arms) * Math.PI * 2;
      const spiralAngle = r * 2.8;

      const angle = armAngle + spiralAngle + (Math.random() - 0.5) * armSpread;
      const zSpread = (Math.random() - 0.5) * 0.18 * (1.8 - r * 0.6);

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = zSpread;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      // Color gradient: warm core to cool outer arms
      const hslColor = new THREE.Color();
      if (r < 0.35) {
        hslColor.setHSL(0.12, 0.9, 0.85); // Golden core
      } else if (r < 0.9) {
        hslColor.setHSL(0.55 + Math.random() * 0.15, 0.95, 0.7); // Cyan/blue stellar nurseries
      } else {
        hslColor.setHSL(0.78 + Math.random() * 0.15, 0.85, 0.65); // Magenta outer rim
      }

      colors[i * 3] = hslColor.r;
      colors[i * 3 + 1] = hslColor.g;
      colors[i * 3 + 2] = hslColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.024,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending
    });

    this.diskPoints = new THREE.Points(geometry, material);
    this.group.add(this.diskPoints);
  }

  buildCoreBlackHole() {
    // Sagittarius A* supermassive black hole with accretion ring
    const holeGeo = new THREE.SphereGeometry(0.045, 24, 24);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    this.group.add(hole);

    // Accretion disk
    const diskGeo = new THREE.RingGeometry(0.05, 0.14, 32);
    diskGeo.rotateX(Math.PI / 2);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.accretionDisk = new THREE.Mesh(diskGeo, diskMat);
    this.group.add(this.accretionDisk);
  }

  buildOrionSpurMarker() {
    // The Orion Spur / Sun's location (~26,000 light years from core)
    this.orionGroup = new THREE.Group();
    const markerGeo = new THREE.SphereGeometry(0.028, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    this.orionBeacon = new THREE.Mesh(markerGeo, markerMat);

    const ringGeo = new THREE.RingGeometry(0.04, 0.055, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    this.orionRing = new THREE.Mesh(ringGeo, ringMat);

    this.orionGroup.add(this.orionBeacon, this.orionRing);
    this.orionGroup.position.set(0.72, 0.02, 0.38);

    this.orionGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        if (window.__cosmicJumpStage) window.__cosmicJumpStage(2); // Jump to Solar System!
      },
      onHoverStart: () => this.orionGroup.scale.setScalar(1.6),
      onHoverEnd: () => this.orionGroup.scale.setScalar(1.0)
    };

    this.interactables.push(this.orionGroup);
    this.group.add(this.orionGroup);
  }

  buildSatelliteGalaxies() {
    // Large & Small Magellanic Clouds
    const lmcGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const lmcMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true });
    const lmc = new THREE.Mesh(lmcGeo, lmcMat);
    lmc.position.set(-1.4, 0.45, -0.6);
    this.group.add(lmc);

    const smcGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const smcMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
    const smc = new THREE.Mesh(smcGeo, smcMat);
    smc.position.set(-1.1, -0.35, -0.85);
    this.group.add(smc);
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.diskPoints) {
      this.diskPoints.rotation.y += delta * 0.06;
    }
    if (this.accretionDisk) {
      this.accretionDisk.rotation.y += delta * 0.3;
    }
    if (this.orionRing) {
      this.orionRing.scale.setScalar(1.0 + Math.sin(this.time * 4.0) * 0.25);
    }
  }
}
