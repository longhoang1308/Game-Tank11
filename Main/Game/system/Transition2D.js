import * as THREE from 'three'
import { gsap } from 'gsap'

export class createTransition {
  constructor() {
    this.door = null
    this.plane = null
  }
  createDoor(scene) {
    const geo = new THREE.BoxGeometry( 5, 10, 0.2)
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.8
    })
    this.door = new THREE.Mesh(geo, mat)
    this.door.position.set(-40, 5, -15)
    scene.add(this.door)
    this.door.boundingBox = new THREE.Box3().setFromObject(this.door)
    const light = new THREE.PointLight('#ffffff', 5, 15)
    light.position.copy(this.door.position)
    scene.add(light)
  }
  
  createPlane(scene) {
    const geo = new THREE.PlaneGeometry(5, 10)
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff'})
    this.plane = new THREE.Mesh(geo, mat)
    this.plane.visible = false
    scene.add(this.plane)
  }
}

export class switchTo2D {
  constructor(game) {
    this.game = game
    this.world = game.world
    this.tank = game.world.tank
    this.timeline = null
    this.object = new createTransition()
    this.webViewContainer = document.getElementById('web-view-container')
    this.gameContainer = document.getElementById('game-container')
  }
  triggerPortal() {
    if(this.object.door && !this.world.isTransitioning) {
      const doorPos = this.object.door.position
      const doorTriggerZ = doorPos.z
      const doorXMin = doorPos.x - 2.5
      const doorXMax = doorPos.x + 2.5
      const tankPos = this.tank.group.position
  
      const distanceToDoor = Math.abs(tankPos.z - doorTriggerZ)
      const isInTriggerZone = distanceToDoor < 3 && tankPos.x > doorXMin && tankPos.x < doorXMax

      if(isInTriggerZone && !this.world.portalTriggered) {
        this.world.portalTriggered = true
        this.switchTo2DView()
      } else if(!isInTriggerZone && this.world.portalTriggered) {
        this.world.portalTriggered = false
      }
    }
  }
  switchTo2DView() {
    if(this.world.isTransitioning || !this.object.door || !this.object.plane) return
    
    const durationCameraMove = 1.2
    const durationPlaneScale = 0.6
    const targetZoom = this.game.frustumSize / 10
    const viewportAspect = window.innerWidth / window.innerHeight
    const doorAspect = 5 / 10
    const targetScaleX = (viewportAspect / doorAspect) * 1.1
    const targetScaleY = 1.1
    const qProxy = { t: 0}

    this.world.isTransitioning = true
    this.tank.group.visible = false
    this.object.door.visible = false  // Ẩn door khi animation bắt đầu
    
    // Disable camera follow during transition
    this.game.updateCameraFollow.enabled = false
    
    this.world.cameraInitialStates = {
      position: this.game.camera.position.clone(),
      quaternion: this.game.camera.quaternion.clone(),
      zoom: this.game.camera.zoom
    }
    
    const targetPos = this.object.door.position.clone().add(new THREE.Vector3(0, 0 , 10))
    const tempCam = this.game.camera.clone()
    tempCam.position.copy(targetPos)
    tempCam.lookAt(this.object.door.position)
    const targetQuaternion = tempCam.quaternion.clone()
    
    // Debug quaternion values
    console.log('Initial quaternion:', this.world.cameraInitialStates.quaternion)
    console.log('Target quaternion:', targetQuaternion)
    console.log('Target position:', targetPos)
    
    this.object.plane.scale.set(0.1, 0.1, 0.1)  // Bắt đầu với scale nhỏ
    this.object.plane.visible = true
    this.object.plane.quaternion.copy(targetQuaternion)
    this.object.plane.position.copy(this.object.door.position)
    
    // Set initial opacity for fade-in animation
    this.object.plane.material.opacity = 0
    this.object.plane.material.transparent = true
    
    if(this.timeline) {
      this.timeline.kill()
    }
    
    this.timeline = gsap.timeline({
      onComplete: () => {
        this.world.isTransitioning = false
        this.object.plane.visible = false
        this.object.door.visible = true  // Hiện lại door sau khi animation kết thúc
        
        // Re-enable camera follow
        this.game.updateCameraFollow.enabled = true

        if(this.gameContainer) {
          this.gameContainer.classList.add('hidden')
          this.gameContainer.style.display = 'none'
        }

        if(this.webViewContainer) {
          this.webViewContainer.classList.remove('hidden')
          this.webViewContainer.style.display ='block'
        }
        document.body.style.overflow = 'auto'
      }
    })
    
    this.timeline
      .to(this.object.door, {
        visible: false,
        duration: 0.1
      }, 0)
      .to(this.object.plane.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.6,
        ease: 'back.out(1.7)'
      }, 0.2)  // Scale animation với bounce effect
      .to(this.object.plane.material, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out'
      }, 0.2)  // Fade-in cùng lúc với scale
      .to(this.game.camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        duration: durationCameraMove,
        ease: 'power3.inOut'
      }, 0)
      .to(qProxy, {
        t: 1,
        duration: durationCameraMove,
        ease: 'power3.inOut',
        onUpdate: () => {
          this.game.camera.quaternion.slerpQuaternions(this.world.cameraInitialStates.quaternion, targetQuaternion, qProxy.t)
        }
      }, 0)
      .to(this.game.camera, {
        zoom: targetZoom,
        duration: durationCameraMove,
        ease: 'power3.inOut',
        onUpdate: () => {
          this.game.camera.updateProjectionMatrix()
        }
      }, 0)
      .to(this.object.plane.scale, {
        x: targetScaleX,
        y: targetScaleY,
        duration: durationPlaneScale,
        ease: 'power2.in'
      }, `-=${durationPlaneScale * 0.8}`)
  }
}

export class switchTo3D {
  constructor(game) {
    this.game = game
    this.world = game.world
    this.tank = game.world.tank
    this.timeline = null
    this.object = game.transition2D
    this.webViewContainer = document.getElementById('web-view-container')
    this.gameContainer = document.getElementById('game-container')
  }

  switchTo3DView() {
    if (this.world.isTransitioning) {
      return
    }

    this.world.isTransitioning = true
    if (this.timeline) {
      this.timeline.kill()
    }

    // Disable camera follow during transition
    this.game.updateCameraFollow.enabled = false

    // Ensure we have valid camera state for transition
    if (!this.world.cameraInitialStates.position || !this.world.cameraInitialStates.quaternion) {
      console.warn('Camera initial state not found, resetting to default')
      this.world.cameraInitialStates = {
        position: new THREE.Vector3(20, 20, 20),
        quaternion: new THREE.Quaternion(),
        zoom: this.game.frustumSize
      }
    }

    // Show game container, hide web view
    if (this.webViewContainer) {
      this.webViewContainer.classList.add('hidden')
      this.webViewContainer.style.display = 'none'
    }
    if (this.gameContainer) {
      this.gameContainer.classList.remove('hidden')
      this.gameContainer.style.display = 'block'
    }
    document.body.style.overflow = 'hidden'

    // Get current camera state (from 2D view)
    const currentPos = this.game.camera.position.clone()
    const currentQuat = this.game.camera.quaternion.clone()
    const currentZoom = this.game.camera.zoom

    // Calculate target position and quaternion (ngược lại switchTo2D)
    const targetPos = this.object.door.position.clone().add(new THREE.Vector3(0, 0, 10))
    const tempCam = this.game.camera.clone()
    tempCam.position.copy(targetPos)
    tempCam.lookAt(this.object.door.position)
    const targetQuaternion = tempCam.quaternion.clone()

    const viewportAspect = window.innerWidth / window.innerHeight
    const doorAspect = 5 / 10
    const startScaleX = (viewportAspect / doorAspect) * 1.1
    const startScaleY = 1.1

    this.object.plane.scale.set(startScaleX, startScaleY, 1)
    this.object.plane.position.copy(this.object.door.position)
    this.object.plane.quaternion.copy(targetQuaternion)
    this.object.plane.visible = true

    // Hide door initially for reverse animation
    this.object.door.visible = false

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.world.isTransitioning = false
        this.world.isIn2DView = false // Reset flag để enable sound lại
        this.tank.group.position.z += 5
        this.tank.group.visible = true
        this.world.portalTriggered = false
        this.object.plane.visible = false
        this.object.door.visible = true
        
        // Re-enable camera follow
        this.game.updateCameraFollow.enabled = true
      }
    })

    const durationCameraMove = 1.2
    const durationPlaneScale = 0.6
    const qProxy = { t: 1 }

    // Animation ngược lại switchTo2D với timing chính xác
    this.timeline
      // Plane scale animation (ngược lại switchTo2D)
      .to(this.object.plane.scale, {
        x: 0.1,
        y: 0.1,
        z: 0.1,
        duration: durationPlaneScale,
        ease: 'back.in(1.7)'  // Reverse của back.out
      }, 0.2)  // Delay để sync với camera movement
      // Camera movement ngược lại (từ 2D view về 3D view)
      .to(this.game.camera.position, {
        x: this.world.cameraInitialStates.position.x,
        y: this.world.cameraInitialStates.position.y,
        z: this.world.cameraInitialStates.position.z,
        duration: durationCameraMove,
        ease: 'power3.inOut'
      }, 0)
      .to(qProxy, {
        t: 0,
        duration: durationCameraMove,
        ease: 'power3.inOut',
        onUpdate: () => {
          this.game.camera.quaternion.slerpQuaternions(currentQuat, this.world.cameraInitialStates.quaternion, qProxy.t)
        }
      }, 0)
      .to(this.game.camera, {
        zoom: this.world.cameraInitialStates.zoom,
        duration: durationCameraMove,
        ease: 'power3.inOut',
        onUpdate: () => this.game.camera.updateProjectionMatrix()
      }, 0)
      // Show door at the end (reverse of hiding door in switchTo2D)
      .to(this.object.door, {
        visible: true,
        duration: 0.1
      }, `-=${durationPlaneScale * 0.8}`)
  }

  async switchTo3DAsync() {
    return this.switchTo3DView()
  }
}
