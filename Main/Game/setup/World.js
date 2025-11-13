import * as THREE from 'three'
import { Tank, PushableBox, PhysicsBox, TargetBox, RoundTarget, Board, PortfolioPopup } from '../entities/index.js'

export default class World {
  constructor(game) {
    this.game = game
    this.scene = this.game.scene
    this.sectionWidth = 40
    this.groundDepth = 80
    this.worldBounds = null
    
    // Portal transition properties
    this.portalTriggered = false
    this.isTransitioning = false
    this.cameraInitialStates = {}

    // Param
    this.params = {
      groundColor: '#ffffff',
      pushableBoxColor: '#e53e3e',
      physicsBoxColor: '#3182ce',
      targetBoxColor: '#334155'
    }

    // Tank
    this.tank = new Tank(this.scene)

    // Hit tracking
    this.hitTargets = new Set()

    // Targets
    this.pushableBox = new PushableBox(
      this.scene, 
      new THREE.Vector3(5, 1.25, -25), 
      this.params.pushableBoxColor
    )
    this.physicsBox = new PhysicsBox(
      this.scene, 
      new THREE.Vector3(-10, 1.25, -20), 
      this.params.physicsBoxColor
    )
    this.targetBoxes = [
      new TargetBox(this.scene, new THREE.Vector3(0, 1, -10), this.params.targetBoxColor),
      new TargetBox(this.scene, new THREE.Vector3(-28, 1, -5), this.params.targetBoxColor),
      new TargetBox(this.scene, new THREE.Vector3(-25, 1, -15), this.params.targetBoxColor),
      new TargetBox(this.scene, new THREE.Vector3(-15, 1, -15), this.params.targetBoxColor)
    ]
    this.roundTarget = new RoundTarget(
      this.scene, 
      new THREE.Vector3(-10, 0, -5), 
      this.params.targetBoxColor
    )

    // Board
    this.board = new Board(this.scene, new THREE.Vector3(-5, 0, -25))
    this.portfolioPopup = new PortfolioPopup()
    this.init()
  }
  init() {
    // Light
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.5)
    const directionalLight = new THREE.DirectionalLight('#ffffff', 1)
    directionalLight.position.set(15, 20, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -35
    directionalLight.shadow.camera.right = 35
    directionalLight.shadow.camera.top = 35
    directionalLight.shadow.camera.bottom = -35
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    this.scene.add(ambientLight, directionalLight)

    // Helpers
    const axesHelper = new THREE.AxesHelper(100)
    this.scene.add(axesHelper)

    // Geometry
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.sectionWidth * 3, this.groundDepth),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.params.groundColor),
        side: THREE.DoubleSide
      })
    )
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.ground.position.x = -this.sectionWidth
    this.scene.add(this.ground)

    // World Bounds - Extended to allow tank to reach door
    this.worldBounds = {
      xMin: -this.sectionWidth * 2 - (this.sectionWidth / 2) - 10, // Extended left to reach door at x=-40
      xMax: this.sectionWidth / 2,
      zMin: -50, // Extended to allow reaching door at z=-15
      zMax: 40
    }
  }
}