import * as THREE from 'three';
import { audio } from '../audio.js';

export class UniverseStage {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.time = 0;
    this.interactiveNodes = [];

    this.buildStarfield();
    this.buildCosmicWeb();
    this.buildSuperclusterCores();

    this.group.position.set(0, 1.25, -0.9);
    this.scene.add(this.group);
  }

  buildStarfield() {
    // Vibrant deep-space distant galaxies particle cloud
    const starCount = 3000;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 1.5 + Math.random() * 5.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.35, 0.9, 0.7);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.starPoints = new THREE.Points(geo, mat);
    this.group.add(this.starPoints);
  }

  buildCosmicWeb() {
    // Interconnected glowing cosmic filaments connecting superclusters
    this.filamentsGroup = new THREE.Group();
    const nodeCount = 36;
    this.nodes = [];

    for (let i = 0; i < nodeCount; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 2.2,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 2.2
      );
      this.nodes.push(pos);
    }

    const linePositions = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const d = this.nodes[i].distanceTo(this.nodes[j]);
        if (d < 0.95) {
          linePositions.push(this.nodes[i].x, this.nodes[i].y, this.nodes[i].z);
          linePositions.push(this.nodes[j].x, this.nodes[j].y, this.nodes[j].z);
        }
      }
    }

    const filamentGeo = new THREE.BufferGeometry();
    filamentGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const filamentMat = new THREE.LineBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    this.filaments = new THREE.LineSegments(filamentGeo, filamentMat);
    this.filamentsGroup.add(this.filaments);
    this.group.add(this.filamentsGroup);
  }

  buildSuperclusterCores() {
    // Glowing galaxy cluster spheres at key filament vertices
    const sphereGeo = new THREE.SphereGeometry(0.045, 16, 16);
    this.nodes.slice(0, 16).forEach((pos, idx) => {
      const color = idx % 2 === 0 ? 0x00f2fe : 0xff007f;
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.6,
        roughness: 0.2
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.position.copy(pos);

      // Glowing outer halo
      const haloGeo = new THREE.SphereGeometry(0.065, 12, 12);
      const haloMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.35,
        wireframe: true
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      mesh.add(halo);

      mesh.userData = {
        isInteractive: true,
        onPinchGrab: () => {
          mesh.scale.setScalar(2.2);
          setTimeout(() => mesh.scale.setScalar(1.0), 500);
          audio.playClick();
          audio.playChirp('excited');
        },
        onHoverStart: () => mesh.scale.setScalar(1.4),
        onHoverEnd: () => mesh.scale.setScalar(1.0)
      };

      this.interactiveNodes.push(mesh);
      this.group.add(mesh);
    });
  }

  getInteractables() {
    return this.interactiveNodes;
  }

  update(delta) {
    if (!this.group.visible) return;
    this.time += delta;

    if (this.filamentsGroup) {
      this.filamentsGroup.rotation.y += delta * 0.05;
    }
    if (this.starPoints) {
      this.starPoints.rotation.y -= delta * 0.02;
    }

    this.interactiveNodes.forEach((node, i) => {
      node.rotation.x += delta * (0.5 + i * 0.05);
      node.rotation.y += delta * (0.8 + i * 0.05);
    });
  }
}
