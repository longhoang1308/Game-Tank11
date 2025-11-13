import * as THREE from 'three'
export class getGun {
  constructor(game) {
    this.game = game
    this.tank = game.world.tank
  }
  getGunPosDir() {
    const position = new THREE.Vector3()
    const direction = new THREE.Vector3()
    this.tank.turret.getWorldPosition(position)
    this.tank.turret.getWorldDirection(direction)
    direction.negate()
    return {
      basePos: position, 
      baseDir:direction,
    }
  }
}

export class shootBurstSystem {
  constructor(game) {
    this.game = game
    this.tank = game.world.tank
    this.gun = new getGun(game)
    this.projectiles = []
    this.muzzleParticles = []
  }
  shootBurst() {
    if(this.tank.shootCooldown > 0) return
    this.tank.shootCooldown = this.tank.fireRate
    const shots = Math.max(1, this.tank.projectilePerShot || 1)
    const spread = this.tank.projectileSpread || 0
    const {basePos, baseDir} = this.gun.getGunPosDir()
    const upAxis = new THREE.Vector3(0, 1, 0)
    
    for (let i = 0; i < shots; i++) {
      const dir = baseDir.clone()
      const yaw = (Math.random() - 0.5) * 2 * spread
      dir.applyAxisAngle(upAxis, yaw)
      this.projectileParticle(this.game.scene, basePos, dir, this.tank.projectileSpeed)
    }
    this.spawnMuzzleFlash(basePos, baseDir)
  }
  projectileParticle(scene, position, direction, speed) {
    const projectile = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#fefcbf' })
    )
    console.log('Projectile:', projectile)
    projectile.velocity = direction.clone().multiplyScalar(speed)
    projectile.position.copy(position).add(direction.multiplyScalar(1.5))
    projectile.life = 5.0 // 5 giây lifetime
    
    //EntityManager
    projectile.update = (deltaTime) => {
      projectile.position.add(projectile.velocity.clone().multiplyScalar(deltaTime))
      projectile.life -= deltaTime
    }
    
    projectile.destroy = () => {
      if (projectile.geometry) {
        projectile.geometry.dispose()
      }
      
      if (projectile.material) {
        projectile.material.dispose()
      }
      
      scene.remove(projectile)
    }
    scene.add(projectile)
    this.projectiles.push(projectile)
  }
  spawnMuzzleFlash(position, direction) {
    const forward = direction.clone().normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(forward, up)
    if(right.lengthSq() < 0.0001) {
      right = new THREE.Vector3(1, 0, 0)
    } else {
      right.normalize()
    } 
    const realUp = new THREE.Vector3().crossVectors(forward, right)
    const count = Math.max(0, Math.floor(this.tank.muzzleParticles || 0))
    for(let i = 0; i < count; i++) {
      const angle = (Math.random() * 0.3 + 0.1)
      const azimuth = Math.random() * Math.PI * 2
      const spread = right.clone().multiplyScalar(Math.cos(azimuth))
        .add(realUp.clone().multiplyScalar(Math.sin(azimuth)))
        .multiplyScalar(Math.tan(angle))
      const velDir = forward.clone().add(spread).normalize()
      const speed = 6 + Math.random() * 6
      const velocity = velDir.multiplyScalar(speed)
      const startPos = position.clone().add(forward.multiplyScalar(1))
      this.muzzleFlashParticle(this.game.scene, startPos, velocity)
    }
  }
  muzzleFlashParticle(scene, position, velocity) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: '#ffe066' })
    )
    particle.position.copy(position)
    particle.velocity = velocity.clone()
    particle.life = 0.45 + Math.random() * 0.15
    scene.add(particle)

    //EntityManager
    particle.update = (deltaTime) => {
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime))
      particle.life -= deltaTime
    }
    
    particle.destroy = () => {
      if (particle.geometry) {
        particle.geometry.dispose()
      }
      
      if (particle.material) {
        particle.material.dispose()
      }
      
      scene.remove(particle)
    }
    
    this.muzzleParticles.push(particle)
  }
}

export class laserSystem {
  constructor(game) {
    this.game = game
    this.scene = game.scene
    this.gun = new getGun(game)
    this.laserMesh = []
  }
  laserBeam() {
    const {basePos, baseDir} = this.gun.getGunPosDir()
    this.length = 80
    this.life = 0.18
    this.totalLife = this.life
    this.pos = basePos.clone()
    this.dir = baseDir.clone().normalize()

    const geo = new THREE.CylinderGeometry(0.08, 0.08, 1, 16, 1, true)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0},
        uOpacity: { value: 1},
        uColor: { value: new THREE.Color('#68d391')}
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vPos;
        void main() {
          vUv = uv;
          vPos = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float core = smoothstep(0.0, 0.2, 1.0 - abs(vUv.x - 0.5) * 2.0);
          float glow = smoothstep(0.0, 1.0, 1.0 - abs(vUv.x - 0.5) * 1.2);
          vec3 col = uColor * (0.8 * glow + 0.6 * core);
          gl_FragColor = vec4(col, uOpacity * (0.7 * glow + 0.3 * core));
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.life = this.life
    this.scene.add(mesh)
    this.laserMesh.push(mesh)
    this.setLength(this.length)
    this.align()

    //EntityManager
    mesh.update = (deltaTime) => {
      mesh.life -= deltaTime
      mesh.material.uniforms.uTime.value += deltaTime
      mesh.material.uniforms.uOpacity.value = Math.max(0, mesh.life / this.totalLife)
    }
    mesh.destroy = () => {
      if (mesh.geometry) {
        mesh.geometry.dispose()
      }
      if (mesh.material) {
        mesh.material.dispose()
      }
      this.scene.remove(mesh)
    }
  }
  setLength(length) {
    const mesh = this.laserMesh[this.laserMesh.length - 1]
    mesh.scale.set(1, length, 1)
    const mid = this.pos.clone().add(this.dir.clone().multiplyScalar(length * 0.5))
    mesh.position.copy(mid)
  }
  align() {
    const mesh = this.laserMesh[this.laserMesh.length - 1]
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.dir)
    mesh.quaternion.copy(quaternion)
  }

}