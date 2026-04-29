const { contextBridge } = require('electron');

// Disable zooming via keyboard and mouse wheel
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '-' || e.key === '0')) {
    e.preventDefault();
  }
});

window.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
  }
}, { passive: false });

// Expose a safe API to the renderer if needed
contextBridge.exposeInMainWorld('kiosk', {
  // Add any needed secure communication here
});
