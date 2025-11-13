import GUI from 'lil-gui'

export default class Debug {
  constructor(game) {
    const gui = new GUI()

    //Color
    const colorsFolder = gui.addFolder('colors')
    colorsFolder.addColor(game.world.params, 'groundColor').name('Ground Color').onChange(
      value => {
        game.world.ground.material.color.set(value)
      }
    )
    colorsFolder.addColor(game.world.params, 'targetBoxColor').name('Target Box Color').onChange(
      value => {
        game.world.targetBoxes.forEach(box => {
          box.material.color.set(value)
        })
        game.world.roundTarget.material.color.set(value)
      }
    )
    colorsFolder.addColor(game.world.params, 'pushableBoxColor').name('Pushable Box Color').onChange(
      value => {
        game.world.pushableBox.material.color.set(value)
      }
    )
    colorsFolder.addColor(game.world.params, 'physicsBoxColor').name('Physics Box Color').onChange(
      value => {
        game.world.physicsBox.material.color.set(value)
      }
    )

    //Tank
    const tankFolder = gui.addFolder('tank')
    tankFolder.add(game.world.tank, 'speed').name('Speed').min(0).max(10).step(0.1).onChange(
      value => {
        game.world.tank.speed = value
      }
    )
    tankFolder.add(game.world.tank, 'boostSpeed').name('Boost Speed').min(0).max(10).step(0.1).onChange(
      value => {
        game.world.tank.boostSpeed = value
      }
    )
    tankFolder.add(game.world.tank, 'turretDamping').name('Turret Damping').min(0).max(1).step(0.01).onChange(
      value => {
        game.world.tank.turretDamping = value
      }
    )
    tankFolder.add(game.world.tank, 'fireRate').name('Fire Rate').min(0).max(1).step(0.01).onChange(
      value => {
        game.world.tank.fireRate = value
      }
    )
    tankFolder.add(game.world.tank, 'projectileSpread').name('Projectile Spread').min(0).max(1).step(0.01).onChange(
      value => {
        game.world.tank.projectileSpread = value
      }
    )
    tankFolder.add(game.world.tank, 'projectilePerShot').name('Projectile Per Shot').min(0).max(10).step(1).onChange(
      value => {
        game.world.tank.projectilePerShot = value
      }
    )
  }
}