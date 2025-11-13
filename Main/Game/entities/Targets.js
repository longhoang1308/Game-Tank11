import * as THREE from 'three'

export class TargetBox {
  static idCounter = 0
  
  constructor(scene, position, color) {
    this.id = TargetBox.idCounter++
    this.initialPosition = position.clone()
    this.boundingBox = new THREE.Box3()
    this.hitTargets = new Set()
    this.scene = scene

    // Respawn
    this.respawnTimer = 0
    this.isDestroyed = false
    this.wasHitInRound = false
    this.life = 1 // EntityManager compatibility

    const geo = new THREE.BoxGeometry(2, 2, 2)
    this.material = new THREE.MeshStandardMaterial({ 
      color, 
      metalness: 0.3, 
      roughness: 0.6 
    })

    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.position.copy(position)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.scene.add(this.mesh)
    this.boundingBox.setFromObject(this.mesh)
    this.respawn()
  }
  hit() {
    if (this.isDestroyed) return null

    this.isDestroyed = true
    this.respawnTimer = 2
    this.mesh.visible = false
    this.boundingBox.makeEmpty()

    const hitData = {
      position: this.mesh.position.clone(), 
      id: this.id
    }

    // SCORE
    if (!this.wasHitInRound) {
      this.wasHitInRound = true
      return hitData
    }
    return null
  }
  respawn() {
    this.isDestroyed = false
    this.wasHitInRound = false
    this.mesh.visible = true
    this.mesh.position.copy(this.initialPosition)
    this.boundingBox.setFromObject(this.mesh)
  }
  update(deltaTime) {
    if (this.isDestroyed && this.respawnTimer > 0) {
      this.respawnTimer -= deltaTime
      if (this.respawnTimer <= 0) {
        this.respawn()
      }
    }
  }
}

export class PhysicsBox {
  constructor(scene, position, color) {
    this.scene = scene
    this.boundingBox = new THREE.Box3()

    const geo = new THREE.BoxGeometry(2.5, 2.5, 2.5)
    this.material = new THREE.MeshStandardMaterial({ 
      color, 
      metalness: 0.4, 
      roughness: 0.5 
    })

    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.position.copy(position)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.scene.add(this.mesh)
    this.boundingBox.setFromObject(this.mesh)
  }
}

export class PushableBox {
  constructor(scene, position, color) {
    this.scene = scene
    this.boundingBox = new THREE.Box3()

    const geo = new THREE.BoxGeometry(2.5, 2.5, 2.5)
    this.material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.2,
      roughness: 0.7
    })

    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.position.copy(position)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.scene.add(this.mesh)
    this.boundingBox.setFromObject(this.mesh)
  }
}

export class RoundTarget {
  constructor(scene, position, color) {
    this.scene = scene
    this.boundingBox = new THREE.Box3()
    this.group = new THREE.Group()
    this.group.position.copy(position)

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 2, 12)
    const poleMat = new THREE.MeshStandardMaterial({ color })
    const pole = new THREE.Mesh(poleGeo, poleMat)

    // Disk
    const diskGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 32)
    const diskMat = new THREE.MeshStandardMaterial({ 
      color, 
      metalness: 0.3, 
      roughness: 0.6 
    })
    this.disk = new THREE.Mesh(diskGeo, diskMat)
    this.disk.position.y = 2.2
    this.disk.castShadow = true
    this.disk.receiveShadow = true
    this.disk.rotation.x = Math.PI / 2

    this.group.add(pole, this.disk)
    this.boundingBox.setFromObject(this.group)
    this.material = diskMat
    this.scene.add(this.group)
    
    // Spin properties
    this.isSpinning = false
    this.spinSpeed = 0
    this.maxSpinSpeed = 0.6
    this.spinDecay = 0.95
  }
  
  startSpin() {
    this.isSpinning = true
    this.spinSpeed = this.maxSpinSpeed
  }
  
  update(deltaTime) {
    if (this.isSpinning) {
      this.disk.rotation.z += this.spinSpeed * deltaTime * 60
      this.spinSpeed *= this.spinDecay
      if (this.spinSpeed < 0.01) {
        this.isSpinning = false
        this.spinSpeed = 0
      }
    }
  }
}