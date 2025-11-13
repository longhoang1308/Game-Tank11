import * as THREE from 'three'

export class updateCameraFollow {
  constructor(game) {
    this.game = game
    this.offset = null // will be computed on first follow call
    this.enabled = true // Add enabled flag
  }

  follow(tank) {
    // Only follow if enabled
    if (!this.enabled) return
    
    // Compute fixed offset once: cameraPosition - tankPosition
    if (!this.offset) {
      this.offset = this.game.camera.position.clone().sub(tank.group.position)
    }
    const targetPosition = tank.group.position.clone().add(this.offset)
    this.game.camera.position.copy(targetPosition)
    this.game.camera.lookAt(tank.group.position)
  }
}

export class InputHandler {
  constructor(game) {
    this.game = game
    this.keysPressed = {}
    this.mouse = new THREE.Vector2()
    this.shootRequested = false

    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.key.toLowerCase()] = true
    })
    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.key.toLowerCase()] = false
    })
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    })

    // Control Shoot
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.shootRequested = true
      }
    })
    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'CANVAS') {
        this.shootRequested = true
      }
    })
  }

  // Get current input state
  getInputState() {
    return {
      forward: this.keysPressed['w'] || false,
      backward: this.keysPressed['s'] || false,
      left: this.keysPressed['a'] || false,
      right: this.keysPressed['d'] || false,
      boost: this.keysPressed['shift'] || false,
      mouse: this.mouse.clone()
    }
  }
}
