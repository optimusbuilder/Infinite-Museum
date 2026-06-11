import * as THREE from 'three';
import { CAMERA, PLAYER_CONFIG } from './Constants.js';
import { eventBus, Events } from './EventBus.js';
import { gameState } from './GameState.js';
import { GalleryBuilder } from '../level/GalleryBuilder.js';
import { RoomManager } from '../room/RoomManager.js';
import { InputSystem } from '../systems/InputSystem.js';
import { CollisionBounds, PlayerController } from '../systems/PlayerController.js';
import { tickArtifactIdle } from '../artifacts/ProceduralArtifact.js';
import { EntryScreen, HintUI } from '../ui/EntryScreen.js';
import { PlaqueUI } from '../ui/PlaqueUI.js';

export class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.galleryBuilder = new GalleryBuilder();
    this.roomManager = new RoomManager();
    this.currentGallery = null;
    this.collisionBounds = null;
    this.transitioning = false;

    this.init();
  }

  async init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupSystems();
    this.setupUI();
    this.setupEventListeners();

    await this.roomManager.init();

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

  setupUI() {
    this.entryScreen = new EntryScreen();
    this.plaqueUI = new PlaqueUI();
    this.hintUI = new HintUI();
  }

  setupSystems() {
    this.input = new InputSystem(this.renderer.domElement);
    this.player = new PlayerController(this.camera, this.input);
  }

  setupEventListeners() {
    eventBus.on(Events.GAME_ENTER, () => {
      gameState.game.entered = true;
      this.input.enable();
    });

    eventBus.on(Events.ROOM_LOADED, (bundle) => {
      this.applyRoom(bundle);
    });

    eventBus.on(Events.ROOM_TRANSITION, async ({ direction }) => {
      if (this.transitioning || direction !== 'forward') return;
      this.transitioning = true;
      await this.roomManager.goForward();
      this.transitioning = false;
    });
  }

  applyRoom(bundle) {
    if (this.currentGallery) {
      this.scene.remove(this.currentGallery.group);
      this.disposeGroup(this.currentGallery.group);
    }

    this.currentGallery = this.galleryBuilder.build(bundle.themeId, bundle);
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
    if (!this.currentGallery || !gameState.game.entered) return;

    const px = gameState.player.position.x;
    const pz = gameState.player.position.z;
    const interactDist = PLAYER_CONFIG.INTERACT_DISTANCE;

    const artifactPos = this.currentGallery.artifactMesh.userData.interactPosition;
    const artifactDist = Math.hypot(px - artifactPos.x, pz - artifactPos.z);
    const nearArtifact = artifactDist < interactDist;

    if (nearArtifact !== gameState.player.nearArtifact) {
      gameState.player.nearArtifact = nearArtifact;
      eventBus.emit(nearArtifact ? Events.PLAYER_NEAR_ARTIFACT : Events.PLAYER_LEAVE_ARTIFACT, {
        room: gameState.museum.currentRoom,
      });
    }

    const exitPos = this.currentGallery.exitDoor.userData.interactPosition;
    const exitDist = Math.hypot(px - exitPos.x, pz - exitPos.z);
    const nearExit = exitDist < interactDist;

    if (nearExit !== gameState.player.nearExit) {
      gameState.player.nearExit = nearExit;
      eventBus.emit(nearExit ? Events.PLAYER_NEAR_EXIT : Events.PLAYER_LEAVE_EXIT);
    }

    if (nearExit && this.input.isDown('KeyE') && !this.transitioning) {
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
    if (this.collisionBounds && gameState.game.entered) {
      this.player.update(delta, this.collisionBounds);
    }
    if (this.currentGallery?.artifactMesh) {
      tickArtifactIdle(this.currentGallery.artifactMesh, delta);
    }
    this.checkProximity();
    this.renderer.render(this.scene, this.camera);
  }
}
