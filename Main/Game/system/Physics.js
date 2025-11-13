import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d-compat'
import { getGun } from '../entities/Projectiles.js'

export class PhysicsWorld {
  constructor(game) {
    this.game = game
    this.world = null
    this.tankRigidBody = null
    this.tankCollider = null
    this.isInitialized = false
    this.eventQueue = null
    this.colliderToEntity = new Map() // Map<ColliderHandle, { type, ref }>
  }

  async init() {
    await RAPIER.init()
    this.world = new RAPIER.World(new RAPIER.Vector3(0.0, -9.81, 0.0))
    // Event queue to receive collision events
    this.eventQueue = new RAPIER.EventQueue(true)
    this.createGround()
    this.isInitialized = true
  }

  createGround() {
    const groundBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(-40, 0, 0)
    )
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(60, 0.1, 40),
      groundBody
    )
  }

  createTankBody(tank) {
    if (!this.isInitialized) return

    const { position, quaternion } = tank.group
    this.tankRigidBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setRotation(new RAPIER.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w))
        .setLinearDamping(0)
        .setAngularDamping(0.1)
        .lockRotations(true, false, true)
    )

    this.tankCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.75, 0.25, 1.25)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.tankRigidBody
    )

    tank.rigidBody = this.tankRigidBody
    tank.collider = this.tankCollider
    this.colliderToEntity.set(this.tankCollider.handle, { type: 'tank', ref: tank })
  }

  update() {
    if (!this.isInitialized) return
    // Step with event queue to capture collision events
    if (this.eventQueue) {
      this.world.step(this.eventQueue)
      this.eventQueue.drainCollisionEvents((h1, h2, started) => {
        const col1 = this.world.getCollider(h1)
        const col2 = this.world.getCollider(h2)
        if (!col1 || !col2) return
        const e1 = this.colliderToEntity.get(h1)
        const e2 = this.colliderToEntity.get(h2)
        // Detect collisions where the tank is involved
        if (started && ((e1?.type === 'tank' && e2) || (e2?.type === 'tank' && e1))) {
          const other = e1?.type === 'tank' ? e2 : e1
          // Simple callback: mark collision on tank or log; extend as needed
          // eslint-disable-next-line no-console
          console.debug('[Rapier] Tank collided with', other?.type || 'unknown')
        }
      })
    } else {
      this.world.step()
    }
  }

  syncTankVisuals(tank) {
    if (!this.tankRigidBody) return

    const translation = this.tankRigidBody.translation()
    const rotation = this.tankRigidBody.rotation()
    
    tank.group.position.set(translation.x, translation.y, translation.z)
    
    const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
    tank.group.quaternion.copy(quat)
    
    tank.boundingBox.setFromObject(tank.group)
    tank.boundingBox.expandByScalar(-tank.collisionPadding)
  }

  createPhysicsBoxBody(physicsBox) {
    if (!this.isInitialized) return

    const { position } = physicsBox.mesh
    const size = 1.25 // Half size of 2.5 box
    
    physicsBox.rigidBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setLinearDamping(0.3)
        .setAngularDamping(0.4)
    )

    physicsBox.collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(size, size, size)
        .setDensity(0.5)
        .setFriction(0.7)
        .setRestitution(0.3)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      physicsBox.rigidBody
    )
    this.colliderToEntity.set(physicsBox.collider.handle, { type: 'physicsBox', ref: physicsBox })
  }

  createPushableBoxBody(pushableBox) {
    if (!this.isInitialized) return

    const { position } = pushableBox.mesh
    const size = 1.25 // Half size of 2.5 box
    
    pushableBox.rigidBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setLinearDamping(0.05) // Minimal damping so it keeps flying
        .setAngularDamping(0.15) // Allow more rotation before slowing
    )

    pushableBox.collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(size, size, size)
        .setDensity(0.05) // Very light so it flies away
        .setFriction(0.4)
        .setRestitution(0.35)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      pushableBox.rigidBody
    )
    this.colliderToEntity.set(pushableBox.collider.handle, { type: 'pushableBox', ref: pushableBox })
  }

  syncPhysicsBoxVisuals(physicsBox) {
    if (!physicsBox.rigidBody) return

    const translation = physicsBox.rigidBody.translation()
    const rotation = physicsBox.rigidBody.rotation()
    
    physicsBox.mesh.position.set(translation.x, translation.y, translation.z)
    
    const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
    physicsBox.mesh.quaternion.copy(quat)
    
    physicsBox.boundingBox.setFromObject(physicsBox.mesh)
  }

  syncPushableBoxVisuals(pushableBox) {
    if (!pushableBox.rigidBody) return

    const translation = pushableBox.rigidBody.translation()
    const rotation = pushableBox.rigidBody.rotation()
    
    pushableBox.mesh.position.set(translation.x, translation.y, translation.z)
    
    const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
    pushableBox.mesh.quaternion.copy(quat)
    
    pushableBox.boundingBox.setFromObject(pushableBox.mesh)
  }

  applyImpulseToPhysicsBox(physicsBox, impulse, point) {
    if (!physicsBox.rigidBody) return
    
    const rapierImpulse = new RAPIER.Vector3(impulse.x, impulse.y, impulse.z)
    const rapierPoint = point ? new RAPIER.Vector3(point.x, point.y, point.z) : null
    
    if (rapierPoint) {
      physicsBox.rigidBody.applyImpulseAtPoint(rapierImpulse, rapierPoint, true)
    } else {
      physicsBox.rigidBody.applyImpulse(rapierImpulse, true)
    }
  }

  applyImpulseToPushableBox(pushableBox, impulse, point) {
    if (!pushableBox.rigidBody) return
    
    const rapierImpulse = new RAPIER.Vector3(impulse.x, impulse.y, impulse.z)
    const rapierPoint = point ? new RAPIER.Vector3(point.x, point.y, point.z) : null
    
    if (rapierPoint) {
      pushableBox.rigidBody.applyImpulseAtPoint(rapierImpulse, rapierPoint, true)
    } else {
      pushableBox.rigidBody.applyImpulse(rapierImpulse, true)
    }
  }

  // Create dynamic rigid bodies for target cubes so they can move when hit by the tank
  createTargetBoxBodies(world) {
    if (!this.isInitialized) return
    if (world?.targetBoxes?.length) {
      world.targetBoxes.forEach(tb => {
        const pos = tb.mesh.position
        tb.rigidBody = this.world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(pos.x, pos.y, pos.z)
            .setLinearDamping(0.25)
            .setAngularDamping(0.35)
        )
        tb.collider = this.world.createCollider(
          RAPIER.ColliderDesc.cuboid(1, 1, 1)
            .setDensity(0.4)
            .setFriction(0.8)
            .setRestitution(0.2)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
          tb.rigidBody
        )
        this.colliderToEntity.set(tb.collider.handle, { type: 'targetBox', ref: tb })
      })
    }
    // Round target stays static (if you want it to move, change to dynamic similar to above)
    if (world?.roundTarget) {
      const pos = world.roundTarget.group.position
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y + 1.1, pos.z))
      const collider = this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(1.2, 1.2, 0.6).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body
      )
      world.roundTarget.rigidBody = body
      world.roundTarget.collider = collider
      this.colliderToEntity.set(collider.handle, { type: 'roundTarget', ref: world.roundTarget })
    }
  }

  // Sync all target boxes visuals from their rigid bodies
  syncTargetBoxes(world) {
    if (!world?.targetBoxes?.length) return
    world.targetBoxes.forEach(tb => {
      if (!tb.rigidBody) return
      const t = tb.rigidBody.translation()
      const r = tb.rigidBody.rotation()
      tb.mesh.position.set(t.x, t.y, t.z)
      tb.mesh.quaternion.set(r.x, r.y, r.z, r.w)
      tb.boundingBox.setFromObject(tb.mesh)
    })
  }
}

export class TankPhysics {
  constructor(game) {
    this.game = game
    this.physicsWorld = game.physicsWorld
    this.inputHandler = game.inputHandler
  }

  updateTank(tank, deltaTime) {
    if (!this.physicsWorld.tankRigidBody) return

    const input = this.inputHandler.getInputState()
    const body = this.physicsWorld.tankRigidBody
    const linVel = body.linvel()
    const angVel = body.angvel()

    // Get forward direction
    const forward = this.getForwardDirection(tank)
    
    // Calculate speeds
    const speed = input.boost ? tank.speed * tank.boostSpeed : tank.speed
    const moveSign = (input.forward ? 1 : 0) + (input.backward ? -1 : 0)
    const rotationInput = (input.left ? 1 : 0) + (input.right ? -1 : 0)

    // Movement
    if (moveSign !== 0) {
      body.applyImpulse(new RAPIER.Vector3(forward.x * speed * moveSign, 0, forward.z * speed * moveSign), true)
      this.clampVelocity(body, linVel, speed * 1.1)
      this.moveTrackWheel(tank, moveSign, moveSign, deltaTime, input.boost ? tank.boostSpeed : 1)
    } else {
      this.applyFriction(tank, body, linVel, forward, tank.speed, deltaTime)
    }

    // Rotation
    if (rotationInput !== 0) {
      const targetAngVel = rotationInput * tank.rotationSpeed * 0.5
      body.setAngvel(new RAPIER.Vector3(0, THREE.MathUtils.lerp(angVel.y, targetAngVel, 0.2), 0), true)
    } else if (Math.abs(angVel.y) > 0.01) {
      body.setAngvel(new RAPIER.Vector3(0, 0, 0), true)
    }

    this.updateTurretRotation(tank, input.mouse)
    this.enforceWorldBounds(tank)
  }

  getForwardDirection(tank) {
    const forward = new THREE.Vector3()
    tank.group.getWorldDirection(forward)
    forward.negate().setY(0).normalize()
    return forward.length() > 0.001 ? forward : new THREE.Vector3(0, 0, -1)
  }

  clampVelocity(body, linVel, maxSpeed) {
    const horizontalVel = new THREE.Vector3(linVel.x, 0, linVel.z)
    const speed = horizontalVel.length()
    if (speed > maxSpeed) {
      const clamped = horizontalVel.normalize().multiplyScalar(maxSpeed)
      body.setLinvel(new RAPIER.Vector3(clamped.x, linVel.y, clamped.z), true)
    }
  }

  applyFriction(tank, body, linVel, forward, baseSpeed, deltaTime) {
    const speed = Math.sqrt(linVel.x * linVel.x + linVel.z * linVel.z)
    if (speed > 0.01) {
      const newSpeed = Math.max(0, speed - 0.01 * deltaTime)
      const ratio = newSpeed / speed
      body.setLinvel(new RAPIER.Vector3(linVel.x * ratio, linVel.y, linVel.z * ratio), true)
      
      const velocityDir = new THREE.Vector3(linVel.x, 0, linVel.z).normalize()
      const trackSpeed = velocityDir.dot(forward) * (speed / baseSpeed)
      this.moveTrackWheel(tank, trackSpeed, trackSpeed, deltaTime, 1)
    } else {
      body.setLinvel(new RAPIER.Vector3(0, linVel.y, 0), true)
    }
  }

  moveTrackWheel(tank, leftSpeed, rightSpeed, deltaTime, boost) {
    const speed = 5 * deltaTime * boost
    const delta = 0.4 * deltaTime * boost

    // Rotate wheels
    tank.leftWheels.forEach(w => w.rotation.x -= leftSpeed * speed)
    tank.rightWheels.forEach(w => w.rotation.x -= rightSpeed * speed)

    // Update track plates
    const updateTrack = (plates, offset, trackSpeed) => {
      offset = (offset - trackSpeed * delta + 1) % 1
      plates.forEach((plate, i) => {
        tank.positionAndOrientTread(plate, ((i / plates.length) + offset + 1) % 1)
      })
      return offset
    }

    tank.leftTrackOffset = updateTrack(tank.leftTrackPlates, tank.leftTrackOffset, leftSpeed)
    tank.rightTrackOffset = updateTrack(tank.rightTrackPlates, tank.rightTrackOffset, rightSpeed)
  }

  updateTurretRotation(tank, mouse) {
    if (!this.game.camera) return
    
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.game.camera)
    const intersectionPoint = new THREE.Vector3()
    
    if (raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), intersectionPoint)) {
      const turretPos = new THREE.Vector3()
      tank.turret.getWorldPosition(turretPos)
      intersectionPoint.y = turretPos.y

      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(turretPos, intersectionPoint, tank.group.up)
      )
      const localQuat = targetQuat.clone().premultiply(tank.group.getWorldQuaternion(new THREE.Quaternion()).invert())
      tank.turret.quaternion.slerp(localQuat, tank.turretDamping)
    }
  }

  enforceWorldBounds(tank) {
    const { worldBounds } = this.game.world
    const margin = 2.5
    const pos = tank.group.position

    const clampedX = THREE.MathUtils.clamp(pos.x, worldBounds.xMin + margin, worldBounds.xMax - margin)
    const clampedZ = THREE.MathUtils.clamp(pos.z, worldBounds.zMin + margin, worldBounds.zMax - margin)

    if (clampedX !== pos.x || clampedZ !== pos.z) {
      const { y } = this.physicsWorld.tankRigidBody.translation()
      this.physicsWorld.tankRigidBody.setTranslation(new RAPIER.Vector3(clampedX, y, clampedZ), true)
    }
  }

  applyRecoil(tank, recoilForce = 2.5) {
    if (!this.physicsWorld.tankRigidBody) return

    const recoilDir = new THREE.Vector3()
    tank.turret.getWorldDirection(recoilDir).setY(0).normalize()
    
    const linVel = this.physicsWorld.tankRigidBody.linvel()
    const newVel = new THREE.Vector3(linVel.x, 0, linVel.z).add(recoilDir.multiplyScalar(recoilForce))
    
    this.physicsWorld.tankRigidBody.setLinvel(new RAPIER.Vector3(newVel.x, linVel.y, newVel.z), true)
  }
}

export class checkCollision {
  constructor(game) {
    this.game = game
  }

  checkTankCollision() {
    return false
  }

  getAllTargets() {
    return [
      this.game.world.pushableBox,
      this.game.world.physicsBox,
      ...this.game.world.targetBoxes,
      this.game.world.roundTarget,
      this.game.world.board
    ]
  }
}

export class explosionSystem {
  constructor() {
    this.fragments = []
  }

  createFragment(scene, position) {
    for (let i = 0; i < 50; i++) {
      const fragment = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshStandardMaterial({ color: '#e53e3e' })
      )
      fragment.position.copy(position)
      fragment.castShadow = true
      scene.add(fragment)

      fragment.life = Math.random() * 2 + 2
      fragment.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 10,
        (Math.random() - 0.5) * 10
      )
      fragment.angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5,
        (Math.random() - 0.5) * 5
      )

      fragment.update = (deltaTime) => {
        fragment.life -= deltaTime
        fragment.velocity.y -= 9.8 * deltaTime
        fragment.position.add(fragment.velocity.clone().multiplyScalar(deltaTime))
        fragment.rotation.x += fragment.angularVelocity.x * deltaTime
        fragment.rotation.y += fragment.angularVelocity.y * deltaTime
        fragment.rotation.z += fragment.angularVelocity.z * deltaTime
        if (fragment.life < 1) {
          fragment.material.transparent = true
          fragment.material.opacity = fragment.life
        }
      }

      fragment.destroy = () => {
        fragment.geometry?.dispose()
        fragment.material?.dispose()
        scene.remove(fragment)
      }

      this.fragments.push(fragment)
    }
  }
}

export class projectileHit {
  constructor(game) {
    this.world = game.world
    this.shootBurstSystem = game.shootBurst
    this.explosionSystem = new explosionSystem()
    this.physicsWorld = game.physicsWorld
  }

  updateHit() {
    if (!this.shootBurstSystem || !this.shootBurstSystem.projectile) return

    const projectiles = this.shootBurstSystem.projectile
    const pushableBox = this.world.pushableBox

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i]
      
      // Check collision with PushableBox
      if (pushableBox && pushableBox.boundingBox && pushableBox.boundingBox.intersectsBox(projectile.boundingBox)) {
        // Calculate hit point and direction
        const hitPoint = projectile.mesh.position.clone()
        const hitDirection = projectile.velocity.clone().normalize()
        
        // Strong impulse to make it fly away
        const impulseStrength = 10.0
        const impulse = hitDirection.clone().multiplyScalar(impulseStrength)
        // Add upward component for flying effect
        impulse.y += 2.0
        
        // Strong angular impulse for rotation
        const angularImpulse = new THREE.Vector3(
          (Math.random() - 0.5) * 5.0,
          (Math.random() - 0.5) * 5.0,
          (Math.random() - 0.5) * 5.0
        )
        
        if (this.physicsWorld && pushableBox.rigidBody) {
          this.physicsWorld.applyImpulseToPushableBox(pushableBox, impulse, hitPoint)
          
          // Apply strong angular impulse for spinning
          const rapierAngular = new RAPIER.Vector3(angularImpulse.x, angularImpulse.y, angularImpulse.z)
          pushableBox.rigidBody.applyTorqueImpulse(rapierAngular, true)
        }
        
        // Destroy projectile
        projectile.destroy()
        projectiles.splice(i, 1)
      }
    }
  }
}

export class fireLaser {
  constructor(game) {
    this.game = game
    this.world = game.world
    this.laserSystem = game.laserBeam
    this.gun = new getGun(game)
    this.explosionSystem = new explosionSystem()
  }

  collisionLaser() {}
}
