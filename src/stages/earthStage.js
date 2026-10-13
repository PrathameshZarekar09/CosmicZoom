import * as THREE from 'three';
import { audio } from '../audio.js';

export class EarthStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];

    this.buildEarthGlobe();
    this.buildCloudSphere();
    this.buildAtmosphereGlow();
    this.buildISS();
    this.buildMoon();
    this.buildContinentTarget();

    this.group.position.set(0, 1.3, -0.85);
    this.scene.add(this.group);
  }

  buildEarthGlobe() {
    // Procedural Earth surface with stylized oceans & continents canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep ocean blue
    ctx.fillStyle = '#0f386b';
    ctx.fillRect(0, 0, 1024, 512);

    // Stylized continent landmasses (cartoon vibrant greens and golds)
    ctx.fillStyle = '#10b981';
    // Africa / Europe
    ctx.beginPath();
    ctx.ellipse(540, 240, 95, 130, 0.2, 0, Math.PI * 2);
    ctx.ellipse(510, 140, 80, 60, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Americas
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.ellipse(260, 150, 90, 80, -0.3, 0, Math.PI * 2);
    ctx.ellipse(320, 320, 70, 120, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Asia & Australia
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.ellipse(740, 170, 140, 90, 0.1, 0, Math.PI * 2);
    ctx.ellipse(820, 350, 60, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Antarctica ice cap
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 470, 1024, 42);
    ctx.fillRect(0, 0, 1024, 25);

    const texture = new THREE.CanvasTexture(canvas);

    const earthGeo = new THREE.SphereGeometry(0.32, 36, 36);
    const earthMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.6,
      metalness: 0.1
    });
    this.earth = new THREE.Mesh(earthGeo, earthMat);

    this.earth.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        this.earth.rotation.y += 0.8;
        audio.playClick();
      }
    };
    this.interactables.push(this.earth);
    this.group.add(this.earth);
  }

  buildCloudSphere() {
    const cloudGeo = new THREE.SphereGeometry(0.326, 32, 32);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      wireframe: true
    });
    this.clouds = new THREE.Mesh(cloudGeo, cloudMat);
    this.group.add(this.clouds);
  }

  buildAtmosphereGlow() {
    const atmGeo = new THREE.SphereGeometry(0.342, 32, 32);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide
    });
    const atm = new THREE.Mesh(atmGeo, atmMat);
    this.group.add(atm);
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
    this.moon.position.set(1.1, 0.25, -0.3);
    this.group.add(this.moon);
  }

  buildContinentTarget() {
    // Glowing focal landing target on landmass to zoom into Human Body
    const targetGeo = new THREE.RingGeometry(0.025, 0.04, 24);
    const targetMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.targetMarker = new THREE.Mesh(targetGeo, targetMat);
    this.targetMarker.position.set(0.12, 0.18, 0.26);
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
    this.earth.add(this.targetMarker);
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.earth) {
      this.earth.rotation.y += delta * 0.12;
    }
    if (this.clouds) {
      this.clouds.rotation.y += delta * 0.15;
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
      this.moon.position.set(Math.cos(mAngle) * 1.05, 0.15, Math.sin(mAngle) * 1.05);
    }
  }
}
