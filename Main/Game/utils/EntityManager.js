export class EntityManager {
  static updateEntities(entities, deltaTime) {
    if (!entities || !Array.isArray(entities)) {
      return
    }
    entities.forEach((entity, i) => {
      if (entity && typeof entity.update === 'function') {
        entity.update(deltaTime)
      }
      if (entity && entity.life !== undefined && entity.life <= 0) {
        if (typeof entity.destroy === 'function') {
          entity.destroy()
        }
        entities.splice(i, 1)
      }
    })
  }

  static clearEntities(entities) {
    if (!entities || !Array.isArray(entities)) {
      return
    }
    entities.forEach(entity => entity.destroy())
    entities.length = 0
  }
}

//Cập nhật tất cả entity theo deltaTime và loại bỏ entity “chết” (life <= 0).