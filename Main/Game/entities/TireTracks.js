import * as THREE from 'three'

export class TireTrackSystem {
  constructor(scene, ground) {
    this.scene = scene
    this.ground = ground
    this.tracks = []
    this.trackSpacing = 0.3 // Distance between track marks
    this.lastTrackPositions = {
      left: null,
      right: null
    }
    this.trackWidth = 0.4
    this.trackLength = 0.8
    this.maxTracks = 200 // Maximum number of track marks
    
    // Create track material
    this.trackMaterial = new THREE.MeshStandardMaterial({
      color: '#2d2d2d',
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7
    })
  }

  createTrackMark(position, rotation) {
    // Create a simple quad for the track mark
    const geometry = new THREE.PlaneGeometry(this.trackWidth, this.trackLength)
    const mesh = new THREE.Mesh(geometry, this.trackMaterial)
    
    // Position on ground (slightly above to avoid z-fighting)
    mesh.position.copy(position)
    mesh.position.y = 0.01
    
    // Rotate to lie flat on ground and align with tank direction
    mesh.rotation.x = -Math.PI / 2
    mesh.rotation.y = rotation
    
    this.scene.add(mesh)
    this.tracks.push(mesh)
    
    // Remove oldest tracks if exceeding max
    if (this.tracks.length > this.maxTracks) {
      const oldestTrack = this.tracks.shift()
      if (oldestTrack.geometry) oldestTrack.geometry.dispose()
      if (oldestTrack.material) oldestTrack.material.dispose()
      this.scene.remove(oldestTrack)
    }
    
    return mesh
  }

  update(tank, isBoosting, deltaTime, angularVelocity = 0) {
    if (!isBoosting || !tank.group) return
    
    // Get tank position and rotation
    const tankPosition = tank.group.position.clone()
    const tankRotation = tank.group.rotation.y
    
    // Get tank's linear velocity to determine movement direction
    const linVel = tank.rigidBody ? tank.rigidBody.linvel() : null
    const speed = linVel ? Math.sqrt(linVel.x * linVel.x + linVel.z * linVel.z) : 0
    
    // Calculate track positions based on turning radius
    const trackOffset = 0.8 // Distance from center to track
    const trackWidth = trackOffset * 2 // Total width between tracks
    
    // Calculate turning radius (if turning)
    const isTurning = Math.abs(angularVelocity) > 0.01 && speed > 0.01
    let leftTrackPos, rightTrackPos, leftRotation, rightRotation
    
    if (isTurning) {
      // Calculate turning radius: R = v / ω
      const turningRadius = speed / Math.abs(angularVelocity)
      
      // Determine which track is inner (tighter radius) and which is outer
      const turnDirection = Math.sign(angularVelocity) // Positive = right turn, negative = left turn
      const innerRadius = turningRadius - trackOffset
      const outerRadius = turningRadius + trackOffset
      
      // Calculate turn center (perpendicular to velocity direction)
      const forward = new THREE.Vector3(0, 0, -1)
      forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), tankRotation)
      
      const velocityDir = linVel ? new THREE.Vector3(linVel.x, 0, linVel.z).normalize() : forward
      const right = new THREE.Vector3(1, 0, 0)
      right.applyAxisAngle(new THREE.Vector3(0, 1, 0), tankRotation)
      
      // Turn center is perpendicular to velocity, offset by turning radius
      const perpendicular = new THREE.Vector3(-velocityDir.z, 0, velocityDir.x).multiplyScalar(turnDirection)
      const turnCenter = tankPosition.clone().add(perpendicular.multiplyScalar(turningRadius))
      
      // Calculate angles for inner and outer tracks
      const toTank = tankPosition.clone().sub(turnCenter).normalize()
      const angleToTank = Math.atan2(toTank.x, toTank.z)
      
      // Inner track position (tighter curve)
      const innerAngle = angleToTank
      const innerPos = turnCenter.clone()
      innerPos.x += Math.sin(innerAngle) * innerRadius
      innerPos.z += Math.cos(innerAngle) * innerRadius
      
      // Outer track position (wider curve)
      const outerAngle = angleToTank
      const outerPos = turnCenter.clone()
      outerPos.x += Math.sin(outerAngle) * outerRadius
      outerPos.z += Math.cos(outerAngle) * outerRadius
      
      // Calculate track rotation (tangential to the curve)
      // The rotation should follow the direction of movement along the curve
      const trackRotation = Math.atan2(velocityDir.x, velocityDir.z)
      
      // Determine left/right based on turn direction
      if (turnDirection > 0) {
        // Right turn: left track is inner, right track is outer
        leftTrackPos = innerPos
        rightTrackPos = outerPos
      } else {
        // Left turn: right track is inner, left track is outer
        leftTrackPos = outerPos
        rightTrackPos = innerPos
      }
      
      // Both tracks rotate tangentially to the curve
      leftRotation = trackRotation
      rightRotation = trackRotation
    } else {
      // Moving straight: parallel tracks
      const forward = new THREE.Vector3(0, 0, -1)
      forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), tankRotation)
      
      const right = new THREE.Vector3(1, 0, 0)
      right.applyAxisAngle(new THREE.Vector3(0, 1, 0), tankRotation)
      
      leftTrackPos = tankPosition.clone().add(right.clone().multiplyScalar(-trackOffset))
      rightTrackPos = tankPosition.clone().add(right.clone().multiplyScalar(trackOffset))
      leftRotation = tankRotation
      rightRotation = tankRotation
    }
    
    // Check if we should create new track marks
    let shouldCreateLeft = false
    let shouldCreateRight = false
    
    if (!this.lastTrackPositions.left) {
      shouldCreateLeft = true
      shouldCreateRight = true
    } else {
      const leftDistance = leftTrackPos.distanceTo(this.lastTrackPositions.left)
      const rightDistance = rightTrackPos.distanceTo(this.lastTrackPositions.right)
      
      if (leftDistance >= this.trackSpacing) {
        shouldCreateLeft = true
      }
      if (rightDistance >= this.trackSpacing) {
        shouldCreateRight = true
      }
    }
    
    // Create track marks
    if (shouldCreateLeft) {
      this.createTrackMark(leftTrackPos, leftRotation)
      this.lastTrackPositions.left = leftTrackPos.clone()
    }
    
    if (shouldCreateRight) {
      this.createTrackMark(rightTrackPos, rightRotation)
      this.lastTrackPositions.right = rightTrackPos.clone()
    }
  }

  clear() {
    this.tracks.forEach(track => {
      if (track.geometry) track.geometry.dispose()
      // Don't dispose shared material
      this.scene.remove(track)
    })
    this.tracks = []
    this.lastTrackPositions.left = null
    this.lastTrackPositions.right = null
  }
  
  dispose() {
    this.clear()
    if (this.trackMaterial) {
      this.trackMaterial.dispose()
    }
  }
}

