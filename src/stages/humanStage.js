import * as THREE from 'three';
import { audio } from '../audio.js';

export class HumanStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.heartRate = 1.2; // beats per sec
    this.lastBeatTime = 0;
    this.interactables = [];

    this.buildHumanSilhouette();
    this.buildBeatingHeart();
    this.buildVascularNetwork();
    this.buildDermalMagnifier();

    this.group.position.set(0, 1.2, -0.9);
    this.scene.add(this.group);
  }

  buildHumanSilhouette() {
    // Stylized low-poly futuristic human explorer figure
    const torsoGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.42, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      wireframe: true
    });
    this.torso = new THREE.Mesh(torsoGeo, bodyMat);
    this.torso.position.y = 0.15;
    this.group.add(this.torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 0.44;
    this.group.add(head);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.38, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.21, 0.12, 0);
    armL.rotation.z = 0.18;
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.21, 0.12, 0);
    armR.rotation.z = -0.18;
    this.group.add(armL, armR);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.52, 8);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.08, -0.32, 0);
    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.08, -0.32, 0);
    this.group.add(legL, legR);
  }

  buildBeatingHeart() {
    // 3D Stylized Heart
    this.heartGroup = new THREE.Group();
    const heartGeo = new THREE.DodecahedronGeometry(0.055, 1);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    this.heartMesh = new THREE.Mesh(heartGeo, heartMat);
    this.heartGroup.add(this.heartMesh);

    // Pulsing aura
    const auraGeo = new THREE.SphereGeometry(0.075, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.25,
      wireframe: true
    });
    this.heartAura = new THREE.Mesh(auraGeo, auraMat);
    this.heartGroup.add(this.heartAura);

    this.heartGroup.position.set(-0.02, 0.19, 0.04);

    this.heartGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        this.heartRate = this.heartRate > 2.2 ? 1.0 : this.heartRate + 0.5;
        audio.playHeartbeat();
        audio.playChirp('curious');
      },
      onHoverStart: () => this.heartGroup.scale.setScalar(1.3),
      onHoverEnd: () => this.heartGroup.scale.setScalar(1.0)
    };
    this.interactables.push(this.heartGroup);
    this.group.add(this.heartGroup);
  }

  buildVascularNetwork() {
    // Glowing vascular branch lines
    const linePositions = [];
    const colorList = [];

    // Main aorta and branching vessels
    const branches = [
      { from: [-0.02, 0.19, 0.04], to: [-0.02, 0.36, 0.02], isArtery: true }, // Carotid up
      { from: [-0.02, 0.19, 0.04], to: [-0.18, 0.15, 0.01], isArtery: true }, // Left arm
      { from: [-0.02, 0.19, 0.04], to: [0.18, 0.15, 0.01], isArtery: false }, // Right arm
      { from: [-0.02, 0.19, 0.04], to: [-0.01, -0.08, 0.02], isArtery: true }, // Abdomen
      { from: [-0.01, -0.08, 0.02], to: [-0.08, -0.32, 0.02], isArtery: true }, // Left leg
      { from: [-0.01, -0.08, 0.02], to: [0.08, -0.32, 0.02], isArtery: false } // Right leg
    ];

    branches.forEach((b) => {
      linePositions.push(...b.from, ...b.to);
      const c = b.isArtery ? [0.95, 0.2, 0.2] : [0.2, 0.5, 0.95];
      colorList.push(...c, ...c);
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colorList, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
    this.vessels = new THREE.LineSegments(geo, mat);
    this.group.add(this.vessels);
  }

  buildDermalMagnifier() {
    // Glowing lens targeting skin tissue to shrink into cell scale
    this.lensGroup = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.048, 0.007, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    const glassGeo = new THREE.CircleGeometry(0.046, 24);
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);

    this.lensGroup.add(ring, glass);
    this.lensGroup.position.set(0.18, 0.22, 0.12);

    this.lensGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        if (window.__cosmicJumpStage) window.__cosmicJumpStage(5); // Jump to Cell!
      },
      onHoverStart: () => this.lensGroup.scale.setScalar(1.4),
      onHoverEnd: () => this.lensGroup.scale.setScalar(1.0)
    };
    this.interactables.push(this.lensGroup);
    this.group.add(this.lensGroup);
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    // Heartbeat pulse cycle
    const beatInterval = 1.0 / this.heartRate;
    if (this.time - this.lastBeatTime > beatInterval) {
      this.lastBeatTime = this.time;
      audio.playHeartbeat();
    }

    const phase = (this.time - this.lastBeatTime) / beatInterval;
    let pulseScale = 1.0;
    if (phase < 0.12) {
      pulseScale = 1.0 + Math.sin((phase / 0.12) * Math.PI) * 0.35;
    } else if (phase < 0.28) {
      pulseScale = 1.0 + Math.sin(((phase - 0.12) / 0.16) * Math.PI) * 0.2;
    }

    if (this.heartMesh) {
      this.heartMesh.scale.setScalar(pulseScale);
    }
    if (this.heartAura) {
      this.heartAura.scale.setScalar(pulseScale * 1.15);
    }
    if (this.lensGroup) {
      this.lensGroup.rotation.z += delta * 0.8;
    }
  }
}
