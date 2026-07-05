// ==================== Input Handler ====================

export class InputHandler {
  constructor() {
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.boosting = false;
    this._zoomHandlers = [];
    this._init();
  }

  _init() {
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.boosting = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.boosting = false;
    });

    // Touch support
    window.addEventListener('touchstart', (e) => {
      this.boosting = e.touches.length >= 2; // 2-finger = boost
      const t = e.touches[0];
      this.mouseX = t.clientX;
      this.mouseY = t.clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      this.mouseX = t.clientX;
      this.mouseY = t.clientY;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.boosting = false;
    }, { passive: true });

    // Scroll zoom
    window.addEventListener('wheel', (e) => {
      const delta = e.deltaY > 0 ? -1 : 1;
      this._zoomHandlers.forEach(fn => fn(delta));
    }, { passive: true });
  }

  onZoom(fn) {
    this._zoomHandlers.push(fn);
  }

  /**
   * Get angle from canvas center to mouse position
   * @param {number} cx canvas center X
   * @param {number} cy canvas center Y
   * @returns {number} angle in radians
   */
  getAngle(cx, cy) {
    return Math.atan2(this.mouseY - cy, this.mouseX - cx);
  }
}
