import * as THREE from 'three';
import { CAMERA, COLORS, PLAYER_CONFIG } from './Constants.js';
import { eventBus, Events } from './EventBus.js';
import { gameState } from './GameState.js';
import { GalleryBuilder } from '../level/GalleryBuilder.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CollisionBounds, PlayerController } from '../systems/PlayerController.js';

export class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.galleryBuilder = new GalleryBuilder();
    this.currentGallery = null;
    this.collisionBounds = null;

    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupSystems();
    this.setupEventListeners();
    this.loadRoom('victorian');
    this.renderer.setAnimationLoop(() => this.animate());
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this.onResize());
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(this.ambientLight);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      CAMERA.FOV,
      window.innerWidth / window.innerHeight,
      CAMERA.NEAR,
      CAMERA.FAR,
    );
  }

  setupSystems() {
    this.input = new InputSystem(this.renderer.domElement);
    this.player = new PlayerController(this.camera, this.input);

    // Auto-enter for greybox — entry screen added in a later commit.
    gameState.game.entered = true;
    this.input.enable();
  }

  setupEventListeners() {
    eventBus.on(Events.GAME_ENTER, () => {
      gameState.game.entered = true;
      this.input.enable();
    });
  }

  loadRoom(themeId) {
    if (this.currentGallery) {
      this.scene.remove(this.currentGallery.group);
      this.disposeGroup(this.currentGallery.group);
    }

    this.currentGallery = this.galleryBuilder.build(themeId);
    this.scene.add(this.currentGallery.group);

    this.scene.background = new THREE.Color(this.currentGallery.fogColor);
    this.scene.fog = new THREE.FogExp2(this.currentGallery.fogColor, this.currentGallery.fogDensity);
    this.ambientLight.intensity = this.currentGallery.ambientIntensity;

    const b = this.currentGallery.collisionBounds;
    this.collisionBounds = new CollisionBounds(b.minX, b.maxX, b.minZ, b.maxZ);

    const spawn = this.currentGallery.spawnPosition;
    this.player.setPosition(spawn.x, spawn.y, spawn.z);
  }

  checkProximity() {
    if (!this.currentGallery) return;

    const px = gameState.player.position.x;
    const pz = gameState.player.position.z;
    const interactDist = PLAYER_CONFIG.INTERACT_DISTANCE;

    const artifactPos = this.currentGallery.artifactMesh.userData.interactPosition;
    const artifactDist = Math.hypot(px - artifactPos.x, pz - artifactPos.z);
    const nearArtifact = artifactDist < interactDist;

    if (nearArtifact !== gameState.player.nearArtifact) {
      gameState.player.nearArtifact = nearArtifact;
      eventBus.emit(nearArtifact ? Events.PLAYER_NEAR_ARTIFACT : Events.PLAYER_LEAVE_ARTIFACT);
    }

    const exitPos = this.currentGallery.exitDoor.userData.interactPosition;
    const exitDist = Math.hypot(px - exitPos.x, pz - exitPos.z);
    const nearExit = exitDist < interactDist;

    if (nearExit !== gameState.player.nearExit) {
      gameState.player.nearExit = nearExit;
      eventBus.emit(nearExit ? Events.PLAYER_NEAR_EXIT : Events.PLAYER_LEAVE_EXIT);
    }

    if (nearExit && this.input.isDown('KeyE')) {
      eventBus.emit(Events.ROOM_TRANSITION, { direction: 'forward' });
    }
  }

  disposeGroup(group) {
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    const delta = this.clock.getDelta();
    if (this.collisionBounds) {
      this.player.update(delta, this.collisionBounds);
    }
    this.checkProximity();
    this.renderer.render(this.scene, this.camera);
  }
}
