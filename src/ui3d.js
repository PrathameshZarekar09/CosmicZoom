import * as THREE from 'three';
import { audio } from './audio.js';

export class UI3DManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();

    this.currentStage = 0;
    this.interactables = [];
    this.onStageSelect = null; // (stageIndex) => {}

    this.stageNames = [
      '10²⁶ m • Universe',
      '10²¹ m • Milky Way',
      '10¹² m • Solar System',
      '10⁷ m • Earth',
      '10⁰ m • Human Body',
      '10⁻⁵ m • Cell Biology',
      '10⁻⁹ m • DNA & Molecules',
      '10⁻¹⁰ m • Atom & Orbitals',
      '10⁻¹⁸ m • Quantum Finale'
    ];

    // Canvas for floating scale label
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 512;
    this.labelCanvas.height = 128;
    this.labelCtx = this.labelCanvas.getContext('2d');
    this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);

    // Canvas for Palm / Wrist HUD
    this.palmCanvas = document.createElement('canvas');
    this.palmCanvas.width = 512;
    this.palmCanvas.height = 512;
    this.palmCtx = this.palmCanvas.getContext('2d');
    this.palmTexture = new THREE.CanvasTexture(this.palmCanvas);

    this.buildScaleSlider();
    this.buildFloatingStageLabel();
    this.buildPalmHUD();
    this.buildWarpTunnel();
    this.renderStageLabel();
    this.renderPalmHUD();

    this.scene.add(this.group);
  }

  buildScaleSlider() {
    this.sliderGroup = new THREE.Group();
    this.sliderWidth = 0.88;

    // Glowing Rail
    const railGeo = new THREE.CylinderGeometry(0.005, 0.005, this.sliderWidth, 16);
    railGeo.rotateZ(Math.PI / 2);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5
    });
    const rail = new THREE.Mesh(railGeo, railMat);
    this.sliderGroup.add(rail);

    // Stage Tick Marks along slider
    this.tickMeshes = [];
    const tickGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.035, 8);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });

    for (let i = 0; i < 9; i++) {
      const x = -this.sliderWidth * 0.5 + (i / 8) * this.sliderWidth;
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(x, 0, 0);
      this.sliderGroup.add(tick);
      this.tickMeshes.push(tick);
    }

    // Draggable Slider Bead Handle
    const beadGeo = new THREE.SphereGeometry(0.024, 20, 20);
    const beadMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x00f2fe,
      emissiveIntensity: 0.6
    });
    this.bead = new THREE.Mesh(beadGeo, beadMat);
    this.bead.position.x = -this.sliderWidth * 0.5;

    this.bead.userData = {
      isInteractive: true,
      onPinchGrab: () => {
        this.bead.scale.setScalar(1.5);
        audio.playPinch();
      },
      onPinchRelease: () => {
        this.bead.scale.setScalar(1.0);
      },
      onHoverStart: () => this.bead.scale.setScalar(1.3),
      onHoverEnd: () => this.bead.scale.setScalar(1.0)
    };

    this.interactables.push(this.bead);
    this.sliderGroup.add(this.bead);

    // Position slider comfortably in front of user
    this.sliderGroup.position.set(0, 0.85, -0.65);
    this.group.add(this.sliderGroup);
  }

  buildFloatingStageLabel() {
    const planeGeo = new THREE.PlaneGeometry(0.72, 0.18);
    const planeMat = new THREE.MeshBasicMaterial({
      map: this.labelTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.labelMesh = new THREE.Mesh(planeGeo, planeMat);
    this.labelMesh.position.set(0, 1.82, -0.9);
    this.group.add(this.labelMesh);
  }

  renderStageLabel() {
    const ctx = this.labelCtx;
    const w = this.labelCanvas.width;
    const h = this.labelCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Glass pill container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 24);
    ctx.fill();
    ctx.stroke();

    // Scale title
    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 32px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.stageNames[this.currentStage] || 'Cosmic Scale', w / 2, 54);

    // Progress dots
    const dotSpacing = 32;
    const startX = w / 2 - (8 * dotSpacing) / 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * dotSpacing, 92, i === this.currentStage ? 8 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === this.currentStage ? '#00f2fe' : (i < this.currentStage ? '#38bdf8' : '#475569');
      ctx.fill();
    }

    this.labelTexture.needsUpdate = true;
  }

  buildPalmHUD() {
    // Open-Palm Hologram Wrist Navigator
    this.palmGroup = new THREE.Group();
    const hudPlaneGeo = new THREE.PlaneGeometry(0.24, 0.24);
    const hudPlaneMat = new THREE.MeshBasicMaterial({
      map: this.palmTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.palmMesh = new THREE.Mesh(hudPlaneGeo, hudPlaneMat);
    this.palmGroup.add(this.palmMesh);

    this.palmGroup.visible = false; // Hidden until palm faces camera
    this.scene.add(this.palmGroup);

    // Make palm HUD interactive
    this.palmMesh.userData = {
      isInteractive: true,
      onPinchGrab: (pos) => {
        // Jump to next stage on tap
        const next = (this.currentStage + 1) % 9;
        this.setStage(next);
        if (this.onStageSelect) this.onStageSelect(next);
        audio.playClick();
      }
    };
    this.interactables.push(this.palmMesh);
  }

  renderPalmHUD() {
    const ctx = this.palmCtx;
    const w = this.palmCanvas.width;
    const h = this.palmCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Glowing cyber wrist disk
    ctx.fillStyle = 'rgba(10, 16, 32, 0.92)';
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(16, 16, w - 32, h - 32, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 36px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛸 PALM NAVIGATOR', w / 2, 70);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '28px "Outfit", sans-serif';
    ctx.fillText(`Scale: ${this.stageNames[this.currentStage]}`, w / 2, 130);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '24px "Outfit", sans-serif';
    ctx.fillText('• Pinch slider to glide scales', w / 2, 210);
    ctx.fillText('• Two-hand pull to zoom', w / 2, 260);
    ctx.fillText('• Poke objects to interact', w / 2, 310);
    ctx.fillText('• Poke Cosmo for fun facts', w / 2, 360);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 26px "Space Grotesk", sans-serif';
    ctx.fillText('🏆 Tap to Advance Scale ➔', w / 2, 440);

    this.palmTexture.needsUpdate = true;
  }

  buildWarpTunnel() {
    // Warp speed hyperdrive tunnel stars
    const starCount = 350;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4.0;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4.0;
      positions[i * 3 + 2] = -Math.random() * 8.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.warpStars = new THREE.Points(geo, mat);
    this.scene.add(this.warpStars);
    this.isWarping = false;
    this.warpProgress = 0;
  }

  triggerWarp() {
    this.isWarping = true;
    this.warpProgress = 0;
    audio.playZoom();
  }

  setStage(index) {
    this.currentStage = Math.max(0, Math.min(index, 8));
    const targetX = -this.sliderWidth * 0.5 + (this.currentStage / 8) * this.sliderWidth;
    this.bead.position.x = targetX;
    this.renderStageLabel();
    this.renderPalmHUD();
    this.triggerWarp();
  }

  handlePinchDrag(deltaMove) {
    // Horizontal sliding movement
    const newX = this.bead.position.x + deltaMove.x;
    const minX = -this.sliderWidth * 0.5;
    const maxX = this.sliderWidth * 0.5;
    this.bead.position.x = Math.max(minX, Math.min(newX, maxX));

    const t = (this.bead.position.x - minX) / this.sliderWidth;
    const stageIdx = Math.round(t * 8);
    if (stageIdx !== this.currentStage) {
      this.currentStage = stageIdx;
      this.renderStageLabel();
      this.renderPalmHUD();
      if (this.onStageSelect) this.onStageSelect(this.currentStage);
      audio.playClick();
    }
  }

  updatePalmTransform(isFacing, palmPos, palmNormal) {
    if (isFacing && palmPos) {
      this.palmGroup.visible = true;
      this.palmGroup.position.copy(palmPos).addScaledVector(palmNormal, 0.08);
      this.palmGroup.lookAt(this.camera.position);
    } else {
      this.palmGroup.visible = false;
    }
  }

  getInteractables() {
    return this.interactables;
  }

  update(delta) {
    // Warp tunnel animation
    if (this.isWarping) {
      this.warpProgress += delta * 2.2;
      this.warpStars.material.opacity = Math.sin(Math.min(1.0, this.warpProgress) * Math.PI) * 0.85;

      const positions = this.warpStars.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += delta * 14.0;
        if (positions[i + 2] > 1.0) positions[i + 2] = -8.0;
      }
      this.warpStars.geometry.attributes.position.needsUpdate = true;

      if (this.warpProgress >= 1.0) {
        this.isWarping = false;
        this.warpStars.material.opacity = 0.0;
      }
    }
  }
}
