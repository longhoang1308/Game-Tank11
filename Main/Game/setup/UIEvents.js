import { PortfolioPopup } from '../entities/Board.js'

export default class BindUI {
  constructor(game) {
    this.game = game
    this.portPopup = new PortfolioPopup()
    
    // Resize
    window.addEventListener('resize', () => {
      this.game.onResize()
    })
    // Có thể dùng parameter Game trực tiếp thay vì dùng this.game

    // Mode Button
    const modeButton = document.getElementById('modeButton')
    if (modeButton) {
      modeButton.addEventListener('click', () => {
        this.game.fireMode = this.game.fireMode === 'particle' ? 'laser' : 'particle'
        modeButton.textContent = `Chế độ: ${this.game.fireMode === 'particle' ? 'Hạt' : 'Laser'}`
      })
    }

    // Portfolio Popup close
    if (this.portPopup.closePopupBtn) {
      this.portPopup.closePopupBtn.addEventListener('click', () => {
        this.portPopup.hidePopup()
      })
    }
    if (this.portPopup.portfolioPopup) {
      this.portPopup.portfolioPopup.addEventListener('click', () => {
        this.portPopup.hidePopup()
      })
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.portPopup.portfolioPopup && !this.portPopup.portfolioPopup.classList.contains('hidden')) {
        this.portPopup.hidePopup()
      }
    })

    // Return to 3D button
    const returnButton = document.getElementById('returnButton')
    if (returnButton) {
      returnButton.addEventListener('click', async () => {
        await this.game.switchTo3D.switchTo3DAsync()
      })
    }
    const webViewContainer = document.getElementById('web-view-container')
    if (webViewContainer) {
      webViewContainer.addEventListener('scroll', () => {
        if(!this.game.world.isTransitionin && webViewContainer.scrollTop === 0) {
          this.game.switchTo3D.switchTo3DAsync()
        }
      })
    }
  }
}