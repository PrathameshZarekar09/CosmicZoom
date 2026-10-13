import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audio } from '../audio.js';

/**
 * QuantumStage - The Grand Quantum World & Double-Slit Experiment Finale
 * Featuring Quantum Foam, Interactive Double-Slit Optical Bench,
 * Real-time Wave Interference vs Wavefunction Collapse Observer effect!
 */
export class QuantumStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactables = [];

    // Double slit state
    this.isObserverActive = false;
    this.isEmitting = true;
    this.emissionTimer = 0;
    this.activeParticles = [];
    this.totalHits = 0;

    // Phosphor detector screen texture canvas
    this.canvasWidth = 512;
    this.canvasHeight = 256;
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = this.canvasWidth;
    this.screenCanvas.height = this.canvasHeight;
    this.screenCtx = this.screenCanvas.getContext('2d');
    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.clearDetectorScreen();

    this.buildQuantumFoam();
    this.buildDoubleSlitApparatus();
    this.buildObserverEye();
    this.buildControlPanels();
    this.loadYDSEModel();
    this.loadQuarkModel();

    this.group.position.set(0, 1.25, -1.05);
    this.scene.add(this.group);
  }

  clearDetectorScreen() {
    this.screenCtx.fillStyle = '#060a14';
    this.screenCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Grid lines
    this.screenCtx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    this.screenCtx.lineWidth = 1;
    this.screenCtx.beginPath();
    for (let x = 32; x < this.canvasWidth; x += 32) {
      this.screenCtx.moveTo(x, 0);
      this.screenCtx.lineTo(x, this.canvasHeight);
    }
    for (let y = 32; y < this.canvasHeight; y += 32) {
      this.screenCtx.moveTo(0, y);
      this.screenCtx.lineTo(this.canvasWidth, y);
    }
    this.screenCtx.stroke();

    this.screenTexture.needsUpdate = true;
    this.totalHits = 0;
  }

  buildQuantumFoam() {
    // Quantum vacuum fluctuation bubbles appearing and popping
    const bubbleCount = 45;
    this.foamBubbles = [];
    const bubbleGeo = new THREE.SphereGeometry(0.025, 12, 12);

    for (let i = 0; i < bubbleCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x00f2fe : 0xff007f,
        wireframe: true,
        transparent: true,
        opacity: 0.4
      });
      const bubble = new THREE.Mesh(bubbleGeo, mat);
      bubble.position.set(
        (Math.random() - 0.5) * 2.8,
        (Math.random() - 0.5) * 1.6 + 0.2,
        (Math.random() - 0.5) * 2.8 - 0.2
      );
      bubble.userData = {
        baseScale: 0.4 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        speed: 2.0 + Math.random() * 3.0
      };
      this.foamBubbles.push(bubble);
      this.group.add(bubble);
    }
  }

  buildDoubleSlitApparatus() {
    // Optical bench support rail
    const railGeo = new THREE.BoxGeometry(0.08, 0.04, 1.3);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, -0.22, 0);
    this.group.add(rail);

    // 1. Quantum Emitter Gun (Z = 0.55)
    this.emitterGroup = new THREE.Group();
    const barrelGeo = new THREE.CylinderGeometry(0.024, 0.035, 0.16, 16);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4
    });
    this.emitterMesh = new THREE.Mesh(barrelGeo, barrelMat);
    this.emitterGroup.add(this.emitterMesh);
    this.emitterGroup.position.set(0, 0, 0.52);

    this.emitterGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        this.fireSingleQuantum();
        audio.playClick();
      }
    };
    this.interactables.push(this.emitterGroup);
    this.group.add(this.emitterGroup);

    // 2. Double-Slit Barrier (Z = 0.08)
    this.barrierGroup = new THREE.Group();
    const plateGeo = new THREE.BoxGeometry(0.36, 0.24, 0.012);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.4 });
    const barrier = new THREE.Mesh(plateGeo, plateMat);
    this.barrierGroup.add(barrier);

    // Glowing slits
    const slitGeo = new THREE.BoxGeometry(0.008, 0.12, 0.015);
    const slitMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const slitLeft = new THREE.Mesh(slitGeo, slitMat);
    slitLeft.position.set(-0.045, 0, 0);
    const slitRight = new THREE.Mesh(slitGeo, slitMat);
    slitRight.position.set(0.045, 0, 0);
    this.barrierGroup.add(slitLeft, slitRight);
    this.barrierGroup.position.set(0, 0, 0.08);
    this.group.add(this.barrierGroup);

    // 3. Phosphor Detector Screen (Z = -0.48)
    const screenGeo = new THREE.PlaneGeometry(0.48, 0.28);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.screenTexture,
      side: THREE.DoubleSide
    });
    this.detectorScreen = new THREE.Mesh(screenGeo, screenMat);
    this.detectorScreen.position.set(0, 0, -0.46);
    this.group.add(this.detectorScreen);
  }

  buildObserverEye() {
    // The Quantum Observer Detector
    this.observerGroup = new THREE.Group();

    const eyeBaseGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const eyeBaseMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const eyeBase = new THREE.Mesh(eyeBaseGeo, eyeBaseMat);
    this.observerGroup.add(eyeBase);

    // Lens sensor
    const lensGeo = new THREE.SphereGeometry(0.024, 16, 16);
    this.lensMat = new THREE.MeshBasicMaterial({ color: 0x64748b }); // Dull gray when OFF, glowing crimson when ON
    this.lensMesh = new THREE.Mesh(lensGeo, this.lensMat);
    this.lensMesh.position.set(0, 0, 0.035);
    this.observerGroup.add(this.lensMesh);

    // Observer laser beam targeting the slits
    const beamGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.22, 8);
    beamGeo.rotateX(Math.PI / 2);
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.0
    });
    this.observerBeam = new THREE.Mesh(beamGeo, this.beamMat);
    this.observerBeam.position.set(0, 0, 0.12);
    this.observerGroup.add(this.observerBeam);

    this.observerGroup.position.set(0.19, 0.08, 0.08);

    this.observerGroup.userData = {
      isInteractive: true,
      onPinchGrab: () => this.toggleObserver(),
      onHoverStart: () => this.observerGroup.scale.setScalar(1.25),
      onHoverEnd: () => this.observerGroup.scale.setScalar(1.0)
    };
    this.interactables.push(this.observerGroup);
    this.group.add(this.observerGroup);
  }

  buildControlPanels() {
    // 3D VR buttons for Observer, Emitter, and Clear
    const btnGeo = new THREE.BoxGeometry(0.12, 0.045, 0.025);

    // Observer toggle button
    const obsMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x991b1b,
      emissiveIntensity: 0.3
    });
    this.obsBtn = new THREE.Mesh(btnGeo, obsMat);
    this.obsBtn.position.set(-0.24, -0.16, 0.35);

    this.obsBtn.userData = {
      name: 'Toggle Observer',
      isInteractive: true,
      onPinchGrab: () => this.toggleObserver()
    };
    this.interactables.push(this.obsBtn);
    this.group.add(this.obsBtn);

    // Clear Screen button
    const clearMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.3,
      metalness: 0.2
    });
    this.clearBtn = new THREE.Mesh(btnGeo, clearMat);
    this.clearBtn.position.set(0.24, -0.16, 0.35);

    this.clearBtn.userData = {
      name: 'Clear Detector',
      isInteractive: true,
      onPinchGrab: () => {
        this.clearDetectorScreen();
        audio.playClick();
      }
    };
    this.interactables.push(this.clearBtn);
    this.group.add(this.clearBtn);
  }

  loadYDSEModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/YDSE1.glb', (gltf) => {
        this.ydseMesh = gltf.scene;
        this.ydseMesh.scale.setScalar(0.45);
        this.ydseMesh.position.set(0, -0.22, 0);
        this.group.add(this.ydseMesh);
      }, undefined, (err) => {
        console.log('YDSE1.glb model load note (procedural apparatus used seamlessly):', err);
      });
    } catch (e) {
      console.warn('GLTFLoader load note:', e);
    }
  }

  loadQuarkModel() {
    try {
      const loader = new GLTFLoader();
      loader.load('./models/Quark.glb', (gltf) => {
        this.quarkMesh = gltf.scene;
        // Clean Object MaxDim is ~6.07m; scaling to ~0.35m
        this.quarkMesh.scale.setScalar(0.06);
        this.quarkMesh.position.set(-0.38, 0.18, 0.22);

        this.quarkMesh.traverse((child) => {
          // Hide any backdrop/studio mesh
          if (/floor|studio|background/i.test(child.name)) {
            child.visible = false;
            return;
          }

          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.quarkMesh.userData = {
          name: 'Quark Cluster (Proton & Neutron)',
          isInteractive: true,
          onPinchGrab: () => {
            audio.playClick();
            audio.playChirp('excited');
            this.quarkMesh.scale.setScalar(0.08);
            setTimeout(() => this.quarkMesh.scale.setScalar(0.06), 400);
          }
        };
        this.interactables.push(this.quarkMesh);

        this.group.add(this.quarkMesh);
      }, undefined, (err) => {
        console.warn('Quark.glb load note:', err);
      });
    } catch (e) {
      console.warn('Error loading Quark.glb:', e);
    }
  }

  toggleObserver() {
    this.isObserverActive = !this.isObserverActive;
    if (this.isObserverActive) {
      this.lensMat.color.setHex(0xef4444);
      this.beamMat.opacity = 0.85;
      audio.playQuantumHit(true);
      audio.playChirp('excited');
    } else {
      this.lensMat.color.setHex(0x64748b);
      this.beamMat.opacity = 0.0;
      audio.playQuantumHit(false);
      audio.playChirp('happy');
    }
    this.clearDetectorScreen();
  }

  fireSingleQuantum() {
    // Spawn a photon/electron wavepacket particle
    const pGeo = new THREE.SphereGeometry(0.009, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({
      color: this.isObserverActive ? 0xff007f : 0x00f2fe
    });
    const particle = new THREE.Mesh(pGeo, pMat);
    particle.position.set(0, 0, 0.52);

    // Target slit calculation
    let targetX;
    if (this.isObserverActive) {
      // Wave function collapses! Chooses slit A or B with certainty
      const chosenSlit = Math.random() > 0.5 ? -0.045 : 0.045;
      // Slight classical Gaussian spread behind the chosen slit
      targetX = chosenSlit + (Math.random() + Math.random() - 1.0) * 0.035;
    } else {
      // Wave passes through both slits! Interference probability distribution:
      // I(x) ~ cos^2(k * x)
      let found = false;
      let testX = 0;
      while (!found) {
        testX = (Math.random() - 0.5) * 0.38;
        const phase = (testX / 0.04) * Math.PI;
        const prob = Math.cos(phase) * Math.cos(phase);
        if (Math.random() < prob) {
          targetX = testX;
          found = true;
        }
      }
    }

    const targetY = (Math.random() - 0.5) * 0.18;
    const targetZ = -0.46;

    particle.userData = {
      target: new THREE.Vector3(targetX, targetY, targetZ),
      progress: 0,
      isCollapsed: this.isObserverActive
    };

    this.activeParticles.push(particle);
    this.group.add(particle);
    audio.playQuantumHit(this.isObserverActive);
  }

  recordScreenHit(targetX, targetY, isCollapsed) {
    this.totalHits++;
    // Convert world targetX (-0.24 to 0.24) and targetY (-0.14 to 0.14) to canvas coordinates
    const px = Math.floor(((targetX + 0.24) / 0.48) * this.canvasWidth);
    const py = Math.floor(((-targetY + 0.14) / 0.28) * this.canvasHeight);

    this.screenCtx.fillStyle = isCollapsed ? 'rgba(239, 68, 68, 0.85)' : 'rgba(0, 242, 254, 0.85)';
    this.screenCtx.beginPath();
    this.screenCtx.arc(px, py, 2.5, 0, Math.PI * 2);
    this.screenCtx.fill();

    this.screenTexture.needsUpdate = true;
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    // Quantum foam bubbling
    this.foamBubbles.forEach((b) => {
      const scale = b.userData.baseScale * (0.5 + 0.5 * Math.sin(this.time * b.userData.speed + b.userData.phase));
      b.scale.setScalar(scale);
      b.rotation.x += delta * 0.8;
      b.rotation.y += delta * 1.2;
    });

    if (this.quarkMesh) {
      this.quarkMesh.rotation.y += delta * 0.4;
      this.quarkMesh.rotation.x = Math.sin(this.time * 0.8) * 0.15;
    }

    // Continuous beam emitter
    if (this.isEmitting) {
      this.emissionTimer += delta;
      if (this.emissionTimer > 0.065) {
        this.emissionTimer = 0;
        this.fireSingleQuantum();
      }
    }

    // Move active flying quantum particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.userData.progress += delta * 3.5;

      const t = Math.min(1.0, p.userData.progress);
      p.position.z = 0.52 - t * (0.52 - (-0.46));
      p.position.x = p.userData.target.x * t;
      p.position.y = p.userData.target.y * t;

      if (t >= 1.0) {
        this.recordScreenHit(p.userData.target.x, p.userData.target.y, p.userData.isCollapsed);
        this.group.remove(p);
        this.activeParticles.splice(i, 1);
      }
    }
  }
}
