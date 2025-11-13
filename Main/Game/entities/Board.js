import * as THREE from 'three'
import { eventBus } from '../utils/EventBus.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'

export class Board {
  constructor(scene, position) {
    this.scene = scene
    this.group = new THREE.Group()
    this.group.position.copy(position)
    this.boundingBox = new THREE.Box3()

    // Board
    const boardGeo = new THREE.BoxGeometry(8, 4, 0.2)
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf7fafc })
    const board = new THREE.Mesh(boardGeo, boardMat)
    board.position.y = 3
    board.castShadow = true

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.2, 0.2, 2, 8)
    const legMat = new THREE.MeshStandardMaterial({ color: 0xa0aec0 })
    const leg1 = new THREE.Mesh(legGeo, legMat)
    leg1.position.set(-2.5, 1, 0)
    leg1.castShadow = true
    const leg2 = new THREE.Mesh(legGeo, legMat)
    leg2.position.set(2.5, 1, 0)
    leg2.castShadow = true

    this.group.add(board, leg1, leg2)
    // Bounding Box
    this.boundingBox.setFromObject(this.group)
    this.scene.add(this.group)
    
    this.loadFontAndAddText()
  }
  loadFontAndAddText() {
    const loader = new FontLoader()
    loader.load(
      'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json',
      (font) => {
        const textGeo = new TextGeometry('Long Hoang', {
          font,
          size: 0.8,
          depth: 0.2,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.03,
          bevelSize: 0.02,
          bevelOffset: 0,
          bevelSegments: 5
        })

        const textMat = new THREE.MeshStandardMaterial({ color: '#2d3748' })
        const textMesh = new THREE.Mesh(textGeo, textMat)
        textMesh.position.set(-3, 2.6, 0.11)

        this.group.add(textMesh)
        this.group.updateMatrixWorld(true)
        this.boundingBox.setFromObject(this.group)
      }
    )
  }
}

export class PortfolioPopup {
  constructor() {
    this.portfolioPopup = document.getElementById('portfolio-popup')
    this.popupContent = document.getElementById('portfolio-popup-content')
    this.closePopupBtn = document.getElementById('close-popup-btn')
    this.receiveEvent()
  }
  showPopup() {
    if (!this.portfolioPopup || !this.popupContent) return
    if (!this.portfolioPopup.classList.contains('hidden')) return
    this.portfolioPopup.classList.remove('hidden')
    // this.portfolioPopup.style.display = 'flex'
    const tl = gsap.timeline()
    tl.fromTo(
      this.portfolioPopup,
      { opacity: 0 }, 
      { 
        opacity: 1, 
        duration: 0.3, 
        ease: 'power2.inOut' 
      }
    );
    tl.fromTo(
      this.popupContent, { 
        opacity: 0, 
        scale: 0.95, 
        y: 20 
      }, 
      { 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        duration: 0.4, 
        ease: 'power2.out' 
      }, '-=0.2'
    )
  }
  hidePopup() {
    if (!this.portfolioPopup || !this.popupContent) return
    if (this.portfolioPopup.classList.contains('hidden')) return
    const tl = gsap.timeline({
      onComplete: () => {
        this.portfolioPopup.classList.add('hidden')
        // this.portfolioPopup.style.display = 'none'
      }
    })
    
    tl.to(this.popupContent, {
      opacity: 0, 
      scale: 0.95,
      y: 20,
      duration: 0.3,
      ease: 'power2.in'
    })
    tl.to(this.portfolioPopup, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.inOut'
    }, '-=0.1')
  }
  receiveEvent() {
    eventBus.on('boardHit', () => {
      this.showPopup()
    })
  }
}