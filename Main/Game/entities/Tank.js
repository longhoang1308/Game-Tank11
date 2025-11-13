import * as THREE from 'three'

export class Tank {
  constructor(scene) {
    this.scene = scene
    this.portalTriggered = false
    this.isTransitioning = false
    this.cameraInitialStates = {}

    //Properties
    this.speed = 2
    this.boostSpeed = 2
    this.rotationSpeed = 1.5

    this.turretDamping = 0.08
    this.fireRate = 0.5
    this.shootCooldown = 0
    this.projectileSpeed = 15
    this.projectilePerShot = 1
    this.projectileSpread = 0.08
    this.tankspeed = 5
    this.muzzleParticles = 30
    this.collisionPadding = 0.15
    this.isColliding = false

    //Group
    this.group = new THREE.Group()
    this.group.position.y = 0.5
    this.boundingBox = new THREE.Box3()

    //Body
    const bodyGeo = new THREE.BoxGeometry(1.5, 0.5, 2.5)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#3d3d3d'
    })
    this.body = new THREE.Mesh(bodyGeo, bodyMat)
    this.body.castShadow = true
    this.body.receiveShadow = true
    this.group.add(this.body)

    //Tracks
    this.leftTrackPlates = []
    this.rightTrackPlates = []
    this.leftTrackOffset = 0
    this.rightTrackOffset = 0

    this.trackPath = this.createTrackPath()
    this.createCaterpillarTracks()

    //Wheels
    this.leftWheels = []
    this.rightWheels = []
    const wheelRadius = 0.35
    const wheelWidth = 0.2
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24)
    const wheelMat = new THREE.MeshStandardMaterial({color: '#b2b2b2'})

    const wheelPositions = [-1.0, 1.0]
    wheelPositions.forEach(zPos => {
      const wheelL = new THREE.Mesh(wheelGeo, wheelMat)
      const wheelR = new THREE.Mesh(wheelGeo, wheelMat)
      wheelL.rotation.z = Math.PI / 2
      wheelR.rotation.z = Math.PI / 2
      wheelL.position.set(-0.8, -0.1, zPos)
      wheelR.position.set(0.8, -0.1, zPos)
      wheelL.castShadow = true
      wheelR.castShadow = true

      this.group.add(wheelL, wheelR)
      this.leftWheels.push(wheelL)
      this.rightWheels.push(wheelR)
    })

    //Turret
    const turretGeo = new THREE.BoxGeometry(1, 0.5, 1)
    const turretMat = new THREE.MeshStandardMaterial({ 
      color: '#5e5e5e'
    });
    this.turret = new THREE.Mesh(turretGeo, turretMat);
    this.turret.position.y = 0.5;
    this.turret.castShadow = true;
    this.turret.receiveShadow = true;
    this.group.add(this.turret);

    //Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 16);
    const barrelMat = new THREE.MeshStandardMaterial({ 
      color: '#b2b2b2' 
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.z = -1.25;
    barrel.rotation.x = Math.PI / 2;
    barrel.castShadow = true;
    this.turret.add(barrel);

    //Bounding Box
    this.boundingBox.setFromObject(this.group)
    this.boundingBox.expandByScalar(-this.collisionPadding)
    this.scene.add(this.group)
  }
  createTrackPath() {
    const path = new THREE.Path()
    const wheelRadius = 0.35
    const wheelCenterZFront = 1.0
    const wheelCenterZBack = -1.0
    const wheelCenterY = -0.1

    path.moveTo(wheelCenterZBack, wheelCenterY + wheelRadius)
    path.lineTo(wheelCenterZFront, wheelCenterY + wheelRadius)
    path.absarc(wheelCenterZFront, wheelCenterY, wheelRadius, Math.PI / 2, -Math.PI / 2, true)
    path.lineTo(wheelCenterZBack, wheelCenterY - wheelRadius)
    path.absarc(wheelCenterZBack, wheelCenterY, wheelRadius, -Math.PI / 2, Math.PI / 2, true)

    return path
  }
  positionAndOrientTread(tread, u) {
    const point2D = this.trackPath.getPoint(u)
    const tangent2D = this.trackPath.getTangent(u)

    tread.position.set(0, point2D.y, point2D.x)
    const angle = Math.atan2(tangent2D.y, tangent2D.x)
    tread.rotation.set(angle * 0.1, 0, 0)
  }
  createCaterpillarTracks() {
    const numberOfPlates = 45
    const treadMat = new THREE.MeshStandardMaterial({
      color: '#f4f4f4',
      metalness: 0.2,
      roughness: 0.8
    })

    const createTrack = (xOffset, plateArray) => {
      const trackGroup = new THREE.Group()
      trackGroup.position.x = xOffset

      //Prams
      const baseWidth = 0.38
      const baseHeight = 0.05
      const baseDepth = 0.22
      const gripHeight = 0.15
      const gripDepth = 0.08

      const baseGeo = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth)
      const gripGeo = new THREE.BoxGeometry(baseWidth, gripHeight, gripDepth)
      const innerConnectorGeo = new THREE.BoxGeometry(0.1, 0.1, 0.3)

      for(let i = 0; i< numberOfPlates; i++) {
        const tread = new THREE.Group()

        //Rubber
        const baseMesh = new THREE.Mesh(baseGeo, treadMat)
        baseMesh.castShadow = true
        tread.add(baseMesh)

        // Grip
        const grip1 = new THREE.Mesh(gripGeo, treadMat)
        grip1.castShadow = true
        grip1.position.z = 0.06
        grip1.position.y = (gripHeight - baseHeight) / 2
        tread.add(grip1)

        const grip2 = grip1.clone()
        grip2.position.z = -0.06
        tread.add(grip2)

        //Connector
        const innerConnector = new THREE.Mesh(innerConnectorGeo, treadMat)
        innerConnector.position.y = -0.02
        tread.add(innerConnector)

        const u = i / numberOfPlates
        this.positionAndOrientTread(tread, u)

        trackGroup.add(tread)
        plateArray.push(tread)
      }
      this.group.add(trackGroup)
    }
    createTrack(-0.8, this.leftTrackPlates)
    createTrack(0.8, this.rightTrackPlates)
  }
}