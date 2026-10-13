import * as THREE from 'three';
import { audio } from './audio.js';

/**
 * CosmoGuide - The Friendly Robot Companion Drone
 * Stylized cartoon futuristic companion with procedural mesh, expressive eye screen,
 * floating physics, sound chirps, and stage-by-stage educational facts.
 */
export class CosmoGuide {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.group = new THREE.Group();
    this.targetOffset = new THREE.Vector3(0.55, 0.15, -1.1); // Position relative to camera view
    this.currentPos = new THREE.Vector3(0.55, 1.4, -1.1);
    this.speechGroup = new THREE.Group();

    this.time = 0;
    this.currentStage = 0;
    this.isSpinning = false;
    this.spinProgress = 0;

    // Eye screen canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext('2d');
    this.eyeTexture = new THREE.CanvasTexture(this.canvas);
    this.eyeMood = 'happy'; // 'happy' | 'curious' | 'excited' | 'blink' | 'wink'

    // Speech text billboard canvas
    this.speechCanvas = document.createElement('canvas');
    this.speechCanvas.width = 512;
    this.speechCanvas.height = 256;
    this.speechCtx = this.speechCanvas.getContext('2d');
    this.speechTexture = new THREE.CanvasTexture(this.speechCanvas);

    this.fullText = '';
    this.displayedText = '';
    this.charIndex = 0;
    this.typewriterTimer = 0;

    this.buildRobotMesh();
    this.buildSpeechBubble();
    this.setupStageDialogues();
    this.updateEyeDisplay();

    this.scene.add(this.group);
  }

  buildRobotMesh() {
    // 1. Robot Head (Chubby glossy capsule/sphere)
    const headGeo = new THREE.SphereGeometry(0.12, 32, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.1,
    });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.group.add(this.head);

    // 2. Visor Screen (Curved front screen for digital eyes)
    const visorGeo = new THREE.SphereGeometry(0.118, 24, 16, 0, Math.PI, 0, Math.PI * 0.55);
    const visorMat = new THREE.MeshBasicMaterial({
      map: this.eyeTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.visor = new THREE.Mesh(visorGeo, visorMat);
    this.visor.rotation.x = Math.PI / 2;
    this.visor.rotation.z = -Math.PI / 2;
    this.visor.position.set(0, 0, 0.015);
    this.head.add(this.visor);

    // 3. Antennae
    const antGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.07, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
    const tipGeo = new THREE.SphereGeometry(0.014, 16, 16);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });

    const antLeft = new THREE.Group();
    const rodLeft = new THREE.Mesh(antGeo, antMat);
    rodLeft.position.y = 0.035;
    const bulbLeft = new THREE.Mesh(tipGeo, tipMat);
    bulbLeft.position.y = 0.07;
    antLeft.add(rodLeft, bulbLeft);
    antLeft.position.set(-0.065, 0.1, 0);
    antLeft.rotation.z = 0.35;
    this.head.add(antLeft);

    const antRight = antLeft.clone();
    antRight.position.set(0.065, 0.1, 0);
    antRight.rotation.z = -0.35;
    this.head.add(antRight);

    // 4. Anti-Gravity Ring Body
    const ringGeo = new THREE.TorusGeometry(0.14, 0.02, 16, 36);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.7,
      roughness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = -0.11;
    this.group.add(this.ring);

    // 5. Thruster Glow
    const thrusterGeo = new THREE.ConeGeometry(0.06, 0.15, 16, 1, true);
    thrusterGeo.rotateX(Math.PI);
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    this.thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    this.thruster.position.y = -0.18;
    this.group.add(this.thruster);

    // Make Cosmo clickable / interactive
    this.head.userData = {
      isInteractive: true,
      onPinchGrab: () => this.pokeCosmo(),
      onHoverStart: () => { this.eyeMood = 'curious'; this.updateEyeDisplay(); },
      onHoverEnd: () => { this.eyeMood = 'happy'; this.updateEyeDisplay(); }
    };
  }

  buildSpeechBubble() {
    const planeGeo = new THREE.PlaneGeometry(0.65, 0.32);
    const planeMat = new THREE.MeshBasicMaterial({
      map: this.speechTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.speechMesh = new THREE.Mesh(planeGeo, planeMat);
    this.speechMesh.position.set(0.48, 0.22, 0);
    this.group.add(this.speechMesh);
  }

  setupStageDialogues() {
    this.stageData = [
      {
        title: "10²⁶ m • Observable Universe",
        text: "Hi! I'm Cosmo! 🚀 We're looking at EVERYTHING: 93 billion light-years! Those glowing threads are the Cosmic Web—galaxy superclusters separated by vast cosmic voids!",
        fact: "Fun Fact: The observable universe contains over 2 TRILLION galaxies! You are currently looking at all of existence!",
        mood: 'excited'
      },
      {
        title: "10²¹ m • The Milky Way",
        text: "Zooming in! Here is our spiral home: 100,000 light-years across, spinning around a supermassive black hole named Sagittarius A*!",
        fact: "Fun Fact: It takes our solar system 230 million years to orbit the galaxy once—a 'Galactic Year'!",
        mood: 'happy'
      },
      {
        title: "10¹² m • The Solar System",
        text: "Our cozy neighborhood! 8 planets dancing around the Sun. Try pinching planets or speed up orbital time with your hands!",
        fact: "Fun Fact: Saturn's density is so low that if you had a bathtub big enough, it would float like a rubber duck!",
        mood: 'curious'
      },
      {
        title: "10⁷ m • Planet Earth",
        text: "Home sweet home! ~12,742 km wide. The only planet known to harbor life, oceans, and delicious tacos!",
        fact: "Fun Fact: Earth's atmosphere is paper-thin—like the skin on an apple compared to the fruit!",
        mood: 'happy'
      },
      {
        title: "10⁰ m • The Human Body",
        text: "Here we are at 1 meter! A human explorer made of 37 trillion cells working in perfect harmony to let you walk, think, and explore VR!",
        fact: "Fun Fact: Your heart beats over 100,000 times a day, pumping enough blood to fill an Olympic pool in a lifetime!",
        mood: 'curious'
      },
      {
        title: "10⁻⁵ m • Cellular Biology",
        text: "Inside a living cell! Behold the Mitochondria—the powerhouse of the cell! Tap it to produce sparkling ATP fuel molecules!",
        fact: "Fun Fact: You produce and recycle your own body weight in ATP molecules every single day!",
        mood: 'excited'
      },
      {
        title: "10⁻⁹ m • DNA & Molecules",
        text: "The nanometer realm! This twisting double helix is DNA—the 3-billion letter code of life—surrounded by dancing H₂O water molecules!",
        fact: "Fun Fact: If uncoiled, all DNA in your body would stretch from Earth to Pluto and back twice!",
        mood: 'happy'
      },
      {
        title: "10⁻¹⁰ m • Atom & Probability Orbitals",
        text: "Look closely! Real physics alert: electrons do NOT orbit like little planets! They are fuzzy Quantum Probability Clouds (orbitals: s, p, d)!",
        fact: "Fun Fact: Atoms are 99.999999999% empty space! If the nucleus were a marble in a stadium, electrons would be in the top bleachers!",
        mood: 'curious'
      },
      {
        title: "10⁻¹⁸ m • Quantum Double-Slit Finale",
        text: "The quantum floor of reality! When unobserved, electrons travel as waves through BOTH slits! Observe them, and the wave function collapses!",
        fact: "Mind-Blower: You are literally watching quantum reality choose its path right in front of your eyes!",
        mood: 'excited'
      }
    ];
  }

  setStage(index) {
    this.currentStage = Math.max(0, Math.min(index, this.stageData.length - 1));
    const data = this.stageData[this.currentStage];

    this.fullText = `${data.title}\n\n${data.text}\n\n💡 ${data.fact}`;
    this.displayedText = '';
    this.charIndex = 0;
    this.typewriterTimer = 0;
    this.eyeMood = data.mood || 'happy';

    audio.playChirp(this.eyeMood);
    this.updateEyeDisplay();
    this.renderSpeechBubble();
  }

  pokeCosmo() {
    this.isSpinning = true;
    this.spinProgress = 0;
    this.eyeMood = 'excited';
    this.updateEyeDisplay();
    audio.playChirp('excited');

    const bonusFacts = [
      "Beep boop! You found Cosmo's tickle sensor! ✨",
      "Did you know? Quantum particles can be entangled across light years!",
      "I love exploring the cosmos with you! Let's zoom even deeper!",
      "Cosmo Fact: 99.99% of your mass comes from proton binding energy!"
    ];
    const fact = bonusFacts[Math.floor(Math.random() * bonusFacts.length)];
    this.fullText = `🤖 Cosmo:\n\n${fact}`;
    this.displayedText = '';
    this.charIndex = 0;
  }

  updateEyeDisplay() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a1020';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 15;

    const eyeY = h * 0.5;
    const eyeSize = 24;

    if (this.eyeMood === 'happy') {
      // Curved happy arch eyes
      ctx.beginPath();
      ctx.arc(w * 0.32, eyeY + 6, eyeSize, Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#00f2fe';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w * 0.68, eyeY + 6, eyeSize, Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.stroke();
    } else if (this.eyeMood === 'excited') {
      // Sparkling wide round eyes
      ctx.beginPath();
      ctx.arc(w * 0.32, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(w * 0.68, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w * 0.34, eyeY - 7, 7, 0, Math.PI * 2);
      ctx.arc(w * 0.70, eyeY - 7, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.eyeMood === 'curious') {
      // One wide eye, one slightly raised eye
      ctx.beginPath();
      ctx.arc(w * 0.32, eyeY - 4, eyeSize * 1.1, 0, Math.PI * 2);
      ctx.arc(w * 0.68, eyeY + 2, eyeSize * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    this.eyeTexture.needsUpdate = true;
  }

  renderSpeechBubble() {
    const ctx = this.speechCtx;
    const w = this.speechCanvas.width;
    const h = this.speechCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Glassmorphism card background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 20);
    ctx.fill();
    ctx.stroke();

    // Robot tag
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px "Space Grotesk", sans-serif';
    ctx.fillText('🤖 GUIDE: COSMO', 26, 42);

    // Dialogue text wrapping
    ctx.fillStyle = '#f8fafc';
    ctx.font = '19px "Outfit", sans-serif';

    const words = this.displayedText.split(' ');
    let line = '';
    let y = 74;
    const lineHeight = 26;
    const maxWidth = w - 52;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (testLine.includes('\n')) {
        const parts = testLine.split('\n');
        ctx.fillText(parts[0], 26, y);
        y += lineHeight;
        line = parts[1] || '';
      } else if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, 26, y);
        line = words[i] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 26, y);

    this.speechTexture.needsUpdate = true;
  }

  update(delta) {
    this.time += delta;

    // Typewriter effect
    if (this.charIndex < this.fullText.length) {
      this.typewriterTimer += delta;
      if (this.typewriterTimer > 0.02) {
        this.typewriterTimer = 0;
        this.charIndex += 2;
        this.displayedText = this.fullText.substring(0, this.charIndex);
        this.renderSpeechBubble();
      }
    }

    // Floating bobbing physics
    const bob = Math.sin(this.time * 2.2) * 0.035;
    const tilt = Math.cos(this.time * 1.5) * 0.04;

    // Target smooth following camera
    const camPos = this.camera.position;
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const right = new THREE.Vector3().crossVectors(camDir, this.camera.up).normalize();
    const target = new THREE.Vector3()
      .copy(camPos)
      .addScaledVector(camDir, 1.25)
      .addScaledVector(right, 0.48);
    target.y = camPos.y + 0.08 + bob;

    this.group.position.lerp(target, 0.06);
    this.group.lookAt(camPos.x, this.group.position.y, camPos.z);
    this.group.rotation.y += Math.PI; // Face towards camera

    // Spin animation if poked
    if (this.isSpinning) {
      this.spinProgress += delta * 7.0;
      this.group.rotation.y += this.spinProgress;
      if (this.spinProgress >= Math.PI * 2) {
        this.isSpinning = false;
        this.spinProgress = 0;
        this.eyeMood = 'happy';
        this.updateEyeDisplay();
      }
    } else {
      this.group.rotation.z = tilt;
    }

    // Ring spin
    if (this.ring) {
      this.ring.rotation.z += delta * 1.8;
    }

    // Thruster flicker
    if (this.thruster) {
      this.thruster.scale.y = 0.85 + Math.sin(this.time * 18.0) * 0.2;
    }
  }
}
