import * as THREE from 'three'
import World from './setup/World.js'
import BindUI from './setup/UIEvents.js'
import { updateCameraFollow, InputHandler } from './system/Controller.js'
import { shootBurstSystem, laserSystem } from './entities/Projectiles.js'
import { TireTrackSystem } from './entities/TireTracks.js'
import Debug from './utils/debug.js'
import { EntityManager } from './utils/EntityManager.js'
import { PhysicsWorld, TankPhysics, checkCollision, projectileHit, fireLaser } from './system/Physics.js'
import { createTransition, switchTo2D, switchTo3D } from './system/Transition2D.js'

export default class Game {
  constructor(canvas) {
    // Setup
    this.canvas = canvas
    this.scene = new THREE.Scene()
    this.camera = null
    this.frustumSize = 15
    this.renderer = null
    this.clock = new THREE.Clock()
    this.fireMode = 'particle'

    // Init
    this.init()

    // Initialize physics and game systems
    this.initGame()
  }

  async initGame() {
    // Initialize Rapier Physics
    this.physicsWorld = new PhysicsWorld(this)
    await this.physicsWorld.init()

    // Import
    this.world = new World(this)
    this.BindUI = new BindUI(this)
    this.updateCameraFollow = new updateCameraFollow(this)
    this.inputHandler = new InputHandler(this)
    this.debug = new Debug(this)
    this.shootBurst = new shootBurstSystem(this)
    this.laser = new laserSystem(this)
    this.checkCollision = new checkCollision(this)
    this.projectileHit = new projectileHit(this)
    this.fireLaser = new fireLaser(this)
    
    // Tire Track System
    this.tireTracks = new TireTrackSystem(this.scene, this.world.ground)
    
    // Tank Physics Controller
    this.tankPhysics = new TankPhysics(this)
    
    // Create tank physics body
    this.physicsWorld.createTankBody(this.world.tank)
    
    // Create physics body for PhysicsBox
    this.physicsWorld.createPhysicsBoxBody(this.world.physicsBox)
    
    // Create physics body for PushableBox
    this.physicsWorld.createPushableBoxBody(this.world.pushableBox)

    // Create dynamic bodies for target cubes so they can move when hit
    this.physicsWorld.createTargetBoxBodies(this.world)

    // Transition 2D
    this.transition2D = new createTransition()
    this.transition2D.createDoor(this.scene)
    this.transition2D.createPlane(this.scene)
    this.switchTo2D = new switchTo2D(this)
    this.switchTo3D = new switchTo3D(this)
    // Gán object từ transition2D vào switchTo2D và switchTo3D
    this.switchTo2D.object = this.transition2D
    this.switchTo3D.object = this.transition2D

    // Animate
    this.animate()
    
    // Window resize
    window.addEventListener('resize', () => this.onResize())
    
    console.log('Game:', this)
  }

  init() {
    // Camera
    const aspect = window.innerWidth / window.innerHeight
    this.camera = new THREE.OrthographicCamera(
      this.frustumSize * aspect / -2,
      this.frustumSize * aspect / 2,
      this.frustumSize / 2,
      this.frustumSize / -2,
      1,
      100
    )
    this.camera.position.set(20, 20, 20)
    this.camera.lookAt(0, 0, 0)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  onResize() {
    const aspect = window.innerWidth / window.innerHeight
    this.camera.left = this.frustumSize * aspect / -2
    this.camera.right = this.frustumSize * aspect / 2
    this.camera.top = this.frustumSize / 2
    this.camera.bottom = this.frustumSize / -2
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  animate() {
    window.requestAnimationFrame(this.animate.bind(this))
    this.deltaTime = this.clock.getDelta()

    // Update Physics World
    if (this.physicsWorld && this.physicsWorld.isInitialized) {
      this.physicsWorld.update(this.deltaTime)
    }

    //Transition 2D
    this.switchTo2D.triggerPortal()

    // Tank Control (using Rapier physics)
    if (this.tankPhysics && this.physicsWorld.isInitialized) {
      this.tankPhysics.updateTank(this.world.tank, this.deltaTime)
      // Sync physics body to visual representation
      this.physicsWorld.syncTankVisuals(this.world.tank)
      // Sync PhysicsBox visuals
      this.physicsWorld.syncPhysicsBoxVisuals(this.world.physicsBox)
      // Sync PushableBox visuals
      this.physicsWorld.syncPushableBoxVisuals(this.world.pushableBox)
      // Sync TargetBoxes visuals
      this.physicsWorld.syncTargetBoxes(this.world)
    }
    
    // Update tire tracks when boosting
    if (this.tireTracks) {
      const input = this.inputHandler.getInputState()
      const isBoosting = input.boost
      const isMoving = input.forward || input.backward
      this.tireTracks.update(this.world.tank, isBoosting && isMoving, this.deltaTime)
    }
    
    // Camera Follow
    this.updateCameraFollow.follow(this.world.tank)
    
    // Projectile Collisions
    this.projectileHit.updateHit(this.scene)

    // Shoot
    if (this.inputHandler.shootRequested) {
      // Only apply recoil if not on cooldown
      const canShoot = this.world.tank.shootCooldown <= 0
      
      if (this.fireMode === 'particle') {
        this.shootBurst.shootBurst()
      } else {
        this.laser.laserBeam()
        this.fireLaser.collisionLaser(this.scene)
      }
      
      // Apply recoil physics effect only if actually shot
      if (canShoot && this.tankPhysics && this.physicsWorld.isInitialized) {
        this.tankPhysics.applyRecoil(this.world.tank)
      }
      
      this.inputHandler.shootRequested = false
    }
    if (this.world.tank.shootCooldown > 0) {
      this.world.tank.shootCooldown -= this.deltaTime
    }

    // EntityManager
    EntityManager.updateEntities(this.shootBurst.projectile, this.deltaTime)
    EntityManager.updateEntities(this.shootBurst.muzzleParticles, this.deltaTime)
    EntityManager.updateEntities(this.laser.laserMesh, this.deltaTime)
    // PushableBox is now handled by Rapier physics (synced in syncPushableBoxVisuals)
    EntityManager.updateEntities(this.projectileHit.explosionSystem.fragments, this.deltaTime)
    EntityManager.updateEntities(this.fireLaser.explosionSystem.fragments, this.deltaTime)
    EntityManager.updateEntities(this.world.targetBoxes, this.deltaTime)
    EntityManager.updateEntities([this.world.roundTarget], this.deltaTime)
    
    // Render scene
    this.renderer.render(this.scene, this.camera)
  }
}