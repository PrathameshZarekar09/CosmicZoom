import * as THREE from 'three';
import { audio } from '../audio.js';

export class SolarStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.orbitSpeedMultiplier = 1.0;
    this.interactables = [];
    this.planets = [];

    this.buildSun();
    this.buildPlanets();
    this.buildAsteroidBelt();
    this.buildTimeDial();

    this.group.position.set(0, 1.25, -0.9);
    this.scene.add(this.group);
  }

  buildSun() {
    // Stylized Glowing Sun
    const sunGeo = new THREE.SphereGeometry(0.14, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);

    // Corona flare shell
    const coronaGeo = new THREE.SphereGeometry(0.175, 24, 24);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.45,
      wireframe: true
    });
    this.corona = new THREE.Mesh(coronaGeo, coronaMat);
    this.sun.add(this.corona);

    this.sun.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        this.orbitSpeedMultiplier = (this.orbitSpeedMultiplier % 3) + 1;
      }
    };
    this.interactables.push(this.sun);
    this.group.add(this.sun);
  }

  buildPlanets() {
    const planetData = [
      { name: 'Mercury', r: 0.24, size: 0.016, color: 0xa1a1aa, speed: 4.1 },
      { name: 'Venus', r: 0.34, size: 0.024, color: 0xfbbf24, speed: 2.8 },
      { name: 'Earth', r: 0.46, size: 0.028, color: 0x38bdf8, speed: 2.0, hasMoon: true },
      { name: 'Mars', r: 0.60, size: 0.022, color: 0xef4444, speed: 1.5 },
      { name: 'Jupiter', r: 0.82, size: 0.065, color: 0xf97316, speed: 0.9 },
      { name: 'Saturn', r: 1.04, size: 0.052, color: 0xfef08a, speed: 0.65, hasRings: true },
      { name: 'Uranus', r: 1.26, size: 0.038, color: 0x67e8f9, speed: 0.45 },
      { name: 'Neptune', r: 1.48, size: 0.036, color: 0x3b82f6, speed: 0.3 }
    ];

    planetData.forEach((p) => {
      // Orbital trajectory circle
      const orbitGeo = new THREE.RingGeometry(p.r - 0.003, p.r + 0.003, 64);
      orbitGeo.rotateX(Math.PI / 2);
      const orbitMat = new THREE.MeshBasicMaterial({
        color: 0x475569,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35
      });
      const orbitLine = new THREE.Mesh(orbitGeo, orbitMat);
      this.group.add(orbitLine);

      // Planet Mesh
      const meshGeo = new THREE.SphereGeometry(p.size, 20, 20);
      const meshMat = new THREE.MeshStandardMaterial({
        color: p.color,
        roughness: 0.4,
        metalness: 0.1
      });
      const planetMesh = new THREE.Mesh(meshGeo, meshMat);

      // Saturn Rings
      if (p.hasRings) {
        const ringGeo = new THREE.RingGeometry(p.size * 1.4, p.size * 2.3, 32);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xe2e8f0,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const rings = new THREE.Mesh(ringGeo, ringMat);
        rings.rotation.z = 0.35;
        planetMesh.add(rings);
      }

      // Earth Moon
      if (p.hasMoon) {
        const moonGeo = new THREE.SphereGeometry(p.size * 0.3, 12, 12);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.position.set(p.size * 2.1, 0, 0);
        planetMesh.add(moon);
        planetMesh.userData.moon = moon;
      }

      planetMesh.userData = {
        name: p.name,
        isInteractive: true,
        onPinchGrab: () => {
          audio.playClick();
          if (p.name === 'Earth') {
            audio.playChirp('excited');
            if (window.__cosmicJumpStage) window.__cosmicJumpStage(3); // Jump to Earth!
          } else {
            audio.playChirp('happy');
            planetMesh.scale.setScalar(2.0);
            setTimeout(() => planetMesh.scale.setScalar(1.0), 600);
          }
        },
        onHoverStart: () => planetMesh.scale.setScalar(1.4),
        onHoverEnd: () => planetMesh.scale.setScalar(1.0)
      };

      this.planets.push({
        mesh: planetMesh,
        r: p.r,
        speed: p.speed,
        angle: Math.random() * Math.PI * 2
      });

      this.interactables.push(planetMesh);
      this.group.add(planetMesh);
    });
  }

  buildAsteroidBelt() {
    const count = 450;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 0.68 + Math.random() * 0.08;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 0.04;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.008,
      transparent: true,
      opacity: 0.6
    });
    this.asteroidBelt = new THREE.Points(geo, mat);
    this.group.add(this.asteroidBelt);
  }

  buildTimeDial() {
    // 3D holographic time speed dial
    const dialGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.015, 24);
    const dialMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      metalness: 0.8,
      roughness: 0.2
    });
    this.dialMesh = new THREE.Mesh(dialGeo, dialMat);
    this.dialMesh.position.set(0.65, -0.22, 0.2);

    this.dialMesh.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        this.orbitSpeedMultiplier = this.orbitSpeedMultiplier >= 4.0 ? 0.5 : this.orbitSpeedMultiplier * 2;
        audio.playClick();
        audio.playChirp('happy');
      }
    };
    this.interactables.push(this.dialMesh);
    this.group.add(this.dialMesh);
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.corona) {
      this.corona.rotation.y += delta * 0.4;
      this.corona.rotation.z += delta * 0.3;
    }

    // Orbit planetary bodies
    this.planets.forEach((p) => {
      p.angle += delta * p.speed * 0.2 * this.orbitSpeedMultiplier;
      p.mesh.position.set(
        Math.cos(p.angle) * p.r,
        0,
        Math.sin(p.angle) * p.r
      );
      p.mesh.rotation.y += delta * 1.5;

      if (p.mesh.userData.moon) {
        const moon = p.mesh.userData.moon;
        const mAngle = this.time * 4.0;
        moon.position.set(Math.cos(mAngle) * 0.065, 0, Math.sin(mAngle) * 0.065);
      }
    });

    if (this.asteroidBelt) {
      this.asteroidBelt.rotation.y += delta * 0.04 * this.orbitSpeedMultiplier;
    }
  }
}
