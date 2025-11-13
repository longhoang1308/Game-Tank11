// Auto clear cache
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name))
  })
}

import Game from './Game/Game.js'

const game = new Game(document.querySelector('canvas.webgl'))