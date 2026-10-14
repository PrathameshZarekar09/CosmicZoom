import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { audio } from './audio.js';

/**
 * HandTrackingManager
 * Dedicated WebXR Hand Tracking system for Meta Quest 3.
 * Supports Pinch, Two-Hand Scale Zoom, Point-to-Select, Index Poking, and Open-Palm HUD.
 */
export class HandTrackingManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.handModelFactory = new XRHandModelFactory();

    // Hand state tracking
    this.hands = [
      { hand: null, middleTip: null, thumbTip: null, palm: null, isPinching: false, pinchPos: new THREE.Vector3(), prevPinchPos: new THREE.Vector3(), pinchJustStarted: false },
      { hand: null, middleTip: null, thumbTip: null, palm: null, isPinching: false, pinchPos: new THREE.Vector3(), prevPinchPos: new THREE.Vector3(), pinchJustStarted: false }
    ];

    // Two-hand gesture state
    this.twoHandActive = false;
    this.initialTwoHandDist = 0;
    this.prevTwoHandDist = 0;

    // Palm facing state
    this.isLeftPalmFacing = false;
    this.isRightPalmFacing = false;

    // Interactive targets & raycasting
    this.interactables = [];
    this.hoveredObject = null;
    this.draggedObject = null;

    // Callbacks
    this.onTwoHandZoom = null;       // (deltaDist) => {}
    this.onSinglePinchDrag = null;   // (handIndex, deltaMove, worldPos) => {}
    this.onSingleHandRotate = null;  // (handIndex, deltaX, deltaY) => {}  — thumb+middle single hand
    this.onObjectClick = null;       // (obj, hit) => {}
    this.onPalmStateChange = null;   // (isFacing, handIndex, palmTransform) => {}

    this.setupHands();
    this.setupVisualMarkers();
  }

  setupHands() {
    for (let i = 0; i < 2; i++) {
      const hand = this.renderer.xr.getHand(i);
      hand.add(this.handModelFactory.createHandModel(hand, 'mesh'));
      this.scene.add(hand);
      this.hands[i].hand = hand;

      // Event listeners for selectstart/selectend on XR controllers / simulated hands
      const controller = this.renderer.xr.getController(i);
      controller.addEventListener('selectstart', () => this.handleControllerSelectStart(i));
      controller.addEventListener('selectend', () => this.handleControllerSelectEnd(i));
      this.scene.add(controller);
    }
  }

  setupVisualMarkers() {
    // Glowing fingertip pinch markers
    const markerGeo = new THREE.SphereGeometry(0.012, 16, 16);
    const markerMat0 = new THREE.MeshBasicMaterial({ color: 0x00f2fe, wireframe: true });
    const markerMat1 = new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true });

    this.markerLeft = new THREE.Mesh(markerGeo, markerMat0);
    this.markerRight = new THREE.Mesh(markerGeo, markerMat1);
    this.markerLeft.visible = false;
    this.markerRight.visible = false;
    this.scene.add(this.markerLeft);
    this.scene.add(this.markerRight);

    // Two-hand energy line when scaling together
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, linewidth: 2 });
    this.twoHandLine = new THREE.Line(lineGeo, lineMat);
    this.twoHandLine.visible = false;
    this.scene.add(this.twoHandLine);

    // Index pointing rays
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 6.0;

    const rayGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 1.0, 8);
    rayGeo.translate(0, 0.5, 0);
    rayGeo.rotateX(Math.PI / 2);
    const rayMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });
    this.pointerRay = new THREE.Mesh(rayGeo, rayMat);
    this.pointerRay.visible = false;
    this.scene.add(this.pointerRay);

    // Reticle dot
    const reticleGeo = new THREE.RingGeometry(0.015, 0.025, 24);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide });
    this.reticle = new THREE.Mesh(reticleGeo, reticleMat);
    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  setInteractables(list) {
    this.interactables = list;
  }

  update(delta) {
    let rightPointing = false;

    for (let i = 0; i < 2; i++) {
      const h = this.hands[i];
      if (!h.hand || !h.hand.joints) continue;

      const joints = h.hand.joints;
      const middleTip = joints['middle-finger-tip'];
      const thumbTip = joints['thumb-tip'];
      const wrist = joints['wrist'];
      const middleMetacarpal = joints['middle-finger-metacarpal'];

      if (!middleTip || !thumbTip) continue;

      const marker = i === 0 ? this.markerLeft : this.markerRight;
      marker.visible = true;
      marker.position.copy(middleTip.position);

      // 1. Pinch Detection: THUMB TIP to MIDDLE FINGER TIP < 3.5cm
      const dist = thumbTip.position.distanceTo(middleTip.position);
      const isPinch = dist < 0.035;

      // Pinch position = midpoint between thumb and middle finger
      h.pinchPos.copy(thumbTip.position).add(middleTip.position).multiplyScalar(0.5);

      if (isPinch && !h.isPinching) {
        // Pinch started
        h.isPinching = true;
        h.pinchJustStarted = true;
        h.prevPinchPos.copy(h.pinchPos);
        marker.scale.setScalar(1.8);
        audio.playPinch(i === 0 ? 0.9 : 1.1);

        this.checkPinchInteractionStart(i, h.pinchPos);
      } else if (!isPinch && h.isPinching) {
        // Pinch ended
        h.isPinching = false;
        marker.scale.setScalar(1.0);
        this.checkPinchInteractionEnd(i);
      } else if (isPinch && h.isPinching) {
        // Continuous pinch drag
        const deltaMove = new THREE.Vector3().subVectors(h.pinchPos, h.prevPinchPos);
        if (!this.twoHandActive) {
          // Single-hand pinch: fire rotation callback
          if (this.onSingleHandRotate && deltaMove.lengthSq() > 0.000001) {
            this.onSingleHandRotate(i, deltaMove.x, deltaMove.y);
          }
          // Also fire drag callback for UI elements (e.g. slider bead)
          if (this.onSinglePinchDrag) {
            this.onSinglePinchDrag(i, deltaMove, h.pinchPos, this.draggedObject);
          }
        }
        h.prevPinchPos.copy(h.pinchPos);
      }

      // 2. Open-Palm Detection (Facing head)
      if (wrist && middleMetacarpal) {
        const palmPos = new THREE.Vector3().copy(wrist.position).add(middleMetacarpal.position).multiplyScalar(0.5);
        const palmToHead = new THREE.Vector3().subVectors(this.camera.position, palmPos).normalize();
        
        // Approximate palm normal using wrist and metacarpals
        const vUp = new THREE.Vector3().subVectors(middleMetacarpal.position, wrist.position).normalize();
        const vRight = new THREE.Vector3();
        if (joints['index-finger-metacarpal'] && joints['pinky-finger-metacarpal']) {
          vRight.subVectors(joints['pinky-finger-metacarpal'].position, joints['index-finger-metacarpal'].position).normalize();
        } else {
          vRight.set(1, 0, 0);
        }
        const palmNormal = new THREE.Vector3().crossVectors(vUp, vRight).normalize();
        if (i === 1) palmNormal.negate(); // Hand symmetry adjustment

        const facingDot = palmNormal.dot(palmToHead);
        const isFacing = facingDot > 0.45 && palmPos.distanceTo(this.camera.position) < 0.85;

        if (i === 0) {
          if (isFacing !== this.isLeftPalmFacing) {
            this.isLeftPalmFacing = isFacing;
            if (this.onPalmStateChange) this.onPalmStateChange(isFacing, 0, palmPos, palmNormal);
          }
        } else {
          if (isFacing !== this.isRightPalmFacing) {
            this.isRightPalmFacing = isFacing;
            if (this.onPalmStateChange) this.onPalmStateChange(isFacing, 1, palmPos, palmNormal);
          }
        }
      }

      // Index-finger pointing ray is disabled — removed per user request
      // (right-hand ray-cast removed; middle-finger pinch gestures handle all interaction)
    }

    // Pointer ray is disabled — keep hidden always
    this.pointerRay.visible = false;
    this.reticle.visible = false;

    // 4. Two-Hand Distance Gesture (Both Hands Pinching simultaneously)
    const bothPinching = this.hands[0].isPinching && this.hands[1].isPinching;
    if (bothPinching) {
      const currentDist = this.hands[0].pinchPos.distanceTo(this.hands[1].pinchPos);
      if (!this.twoHandActive) {
        this.twoHandActive = true;
        this.initialTwoHandDist = currentDist;
        this.prevTwoHandDist = currentDist;
        this.twoHandLine.visible = true;
        // Fire start callback so callers can snapshot the model's base scale
        if (this.onTwoHandStart) this.onTwoHandStart();
      } else {
        const deltaDist = currentDist - this.prevTwoHandDist;
        if (Math.abs(deltaDist) > 0.001) {
          if (this.onTwoHandZoom) {
            this.onTwoHandZoom(deltaDist);
          }
        }
        this.prevTwoHandDist = currentDist;
      }

      // Update energy line
      const positions = this.twoHandLine.geometry.attributes.position.array;
      positions[0] = this.hands[0].pinchPos.x;
      positions[1] = this.hands[0].pinchPos.y;
      positions[2] = this.hands[0].pinchPos.z;
      positions[3] = this.hands[1].pinchPos.x;
      positions[4] = this.hands[1].pinchPos.y;
      positions[5] = this.hands[1].pinchPos.z;
      this.twoHandLine.geometry.attributes.position.needsUpdate = true;
    } else {
      if (this.twoHandActive) {
        this.twoHandActive = false;
        this.twoHandLine.visible = false;
      }
    }
  }

  updatePointingRay(origin, direction) {
    this.raycaster.set(origin, direction);
    this.pointerRay.visible = true;
    this.pointerRay.position.copy(origin);
    this.pointerRay.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    const intersects = this.raycaster.intersectObjects(this.interactables, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      this.pointerRay.scale.set(1, 1, hit.distance);
      this.reticle.visible = true;
      this.reticle.position.copy(hit.point);
      this.reticle.lookAt(this.camera.position);

      let target = hit.object;
      while (target && !target.userData?.isInteractive && target.parent) {
        target = target.parent;
      }
      if (this.hoveredObject !== target) {
        if (this.hoveredObject?.userData?.onHoverEnd) this.hoveredObject.userData.onHoverEnd();
        this.hoveredObject = target;
        if (this.hoveredObject?.userData?.onHoverStart) this.hoveredObject.userData.onHoverStart();
      }
    } else {
      this.pointerRay.scale.set(1, 1, 2.0);
      this.reticle.visible = false;
      if (this.hoveredObject) {
        if (this.hoveredObject.userData?.onHoverEnd) this.hoveredObject.userData.onHoverEnd();
        this.hoveredObject = null;
      }
    }
  }

  checkPinchInteractionStart(handIdx, pinchPos) {
    // 1. Check if pinch hits raycasted hovered object
    if (this.hoveredObject) {
      this.draggedObject = this.hoveredObject;
      if (this.draggedObject.userData?.onPinchGrab) {
        this.draggedObject.userData.onPinchGrab(pinchPos);
      }
      if (this.onObjectClick) {
        this.onObjectClick(this.draggedObject);
      }
      return;
    }

    // 2. Direct proximity check (within 0.15m of pinch point)
    let closestObj = null;
    let minDist = 0.16;
    for (const obj of this.interactables) {
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      const d = worldPos.distanceTo(pinchPos);
      if (d < minDist) {
        minDist = d;
        closestObj = obj;
      }
    }

    if (closestObj) {
      this.draggedObject = closestObj;
      if (this.draggedObject.userData?.onPinchGrab) {
        this.draggedObject.userData.onPinchGrab(pinchPos);
      }
      if (this.onObjectClick) {
        this.onObjectClick(this.draggedObject);
      }
    }
  }

  checkPinchInteractionEnd(handIdx) {
    if (this.draggedObject) {
      if (this.draggedObject.userData?.onPinchRelease) {
        this.draggedObject.userData.onPinchRelease();
      }
      this.draggedObject = null;
    }
  }

  handleControllerSelectStart(idx) {
    // Controller / Desktop fallback trigger
    const h = this.hands[idx];
    h.isPinching = true;
    audio.playPinch();
    if (this.hoveredObject && this.onObjectClick) {
      this.onObjectClick(this.hoveredObject);
    }
  }

  handleControllerSelectEnd(idx) {
    const h = this.hands[idx];
    h.isPinching = false;
    if (this.draggedObject) {
      this.draggedObject = null;
    }
  }
}
