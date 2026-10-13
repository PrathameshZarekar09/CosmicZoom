import * as THREE from 'three';
import { audio } from '../audio.js';

export class CellStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.atpCount = 0;
    this.interactables = [];
    this.atpParticles = [];

    this.buildCellMembrane();
    this.buildNucleus();
    this.buildMitochondria();
    this.buildEndoplasmicReticulum();
    this.buildFloatingOrganelles();

    this.group.position.set(0, 1.3, -0.85);
    this.scene.add(this.group);
  }

  buildCellMembrane() {
    // Stylized semi-transparent cell membrane
    const memGeo = new THREE.SphereGeometry(0.38, 32, 28);
    const memMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.35,
      wireframe: true
    });
    this.membrane = new THREE.Mesh(memGeo, memMat);
    this.group.add(this.membrane);
  }

  buildNucleus() {
    // Glowing central nucleus housing DNA
    this.nucleusGroup = new THREE.Group();
    const nucGeo = new THREE.SphereGeometry(0.12, 24, 24);
    const nucMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.4
    });
    this.nucMesh = new THREE.Mesh(nucGeo, nucMat);
    this.nucleusGroup.add(this.nucMesh);

    // Nucleolus core
    const coreGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.nucleusGroup.add(core);

    this.nucleusGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        audio.playClick();
        audio.playChirp('excited');
        if (window.__cosmicJumpStage) window.__cosmicJumpStage(6); // Jump to DNA / Molecules!
      },
      onHoverStart: () => this.nucleusGroup.scale.setScalar(1.3),
      onHoverEnd: () => this.nucleusGroup.scale.setScalar(1.0)
    };
    this.interactables.push(this.nucleusGroup);
    this.group.add(this.nucleusGroup);
  }

  buildMitochondria() {
    // Mitochondria - "Powerhouse of the Cell"
    this.mitoGroup = new THREE.Group();

    const mitoGeo = new THREE.CapsuleGeometry(0.04, 0.11, 8, 16);
    const mitoMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0xd97706,
      emissiveIntensity: 0.5
    });
    this.mitoMesh = new THREE.Mesh(mitoGeo, mitoMat);
    this.mitoMesh.rotation.z = 0.6;
    this.mitoGroup.add(this.mitoMesh);

    // Inner cristae folds wireframe
    const cristaeGeo = new THREE.CapsuleGeometry(0.032, 0.09, 6, 12);
    const cristaeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, wireframe: true });
    const cristae = new THREE.Mesh(cristaeGeo, cristaeMat);
    cristae.rotation.z = 0.6;
    this.mitoGroup.add(cristae);

    this.mitoGroup.position.set(0.18, -0.09, 0.08);

    this.mitoGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        this.spawnATP();
        audio.playClick();
        audio.playChirp('happy');
      },
      onHoverStart: () => this.mitoGroup.scale.setScalar(1.35),
      onHoverEnd: () => this.mitoGroup.scale.setScalar(1.0)
    };
    this.interactables.push(this.mitoGroup);
    this.group.add(this.mitoGroup);
  }

  buildEndoplasmicReticulum() {
    // Curving folds of rough ER around nucleus
    const erGeo = new THREE.TorusGeometry(0.19, 0.02, 12, 32, Math.PI * 1.2);
    const erMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.4
    });
    this.er1 = new THREE.Mesh(erGeo, erMat);
    this.er1.position.set(-0.04, 0.06, 0.02);
    this.er1.rotation.x = 0.4;
    this.group.add(this.er1);
  }

  buildFloatingOrganelles() {
    // Lysosomes, Ribosomes, and Peroxisomes
    const organelleGeo = new THREE.SphereGeometry(0.022, 12, 12);
    const organelleMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2 });

    for (let i = 0; i < 7; i++) {
      const org = new THREE.Mesh(organelleGeo, organelleMat);
      const angle = (i / 7) * Math.PI * 2;
      const r = 0.24 + Math.random() * 0.06;
      org.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 0.16, Math.sin(angle) * r);
      this.group.add(org);
    }
  }

  spawnATP() {
    this.atpCount++;
    const atpGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const atpMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const p = new THREE.Mesh(atpGeo, atpMat);
    p.position.copy(this.mitoGroup.position);
    p.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.25,
      0.15 + Math.random() * 0.15,
      (Math.random() - 0.5) * 0.25
    );
    p.userData.life = 1.0;
    this.atpParticles.push(p);
    this.group.add(p);
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.membrane) {
      this.membrane.rotation.y += delta * 0.08;
      this.membrane.rotation.x += delta * 0.05;
    }

    if (this.mitoGroup) {
      this.mitoGroup.scale.setScalar(1.0 + Math.sin(this.time * 3.5) * 0.06);
    }

    // Update floating ATP spark particles
    for (let i = this.atpParticles.length - 1; i >= 0; i--) {
      const p = this.atpParticles[i];
      p.position.addScaledVector(p.userData.vel, delta);
      p.userData.life -= delta * 0.9;
      p.scale.setScalar(p.userData.life);
      if (p.userData.life <= 0) {
        this.group.remove(p);
        this.atpParticles.splice(i, 1);
      }
    }
  }
}
