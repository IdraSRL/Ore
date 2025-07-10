// version.js v1.0
export const VERSION = {
  app: "1.0.0",
  build: "2025-01-27",
  js: "1.0.0",
  css: "1.0.0"
};

// Funzione per mostrare la versione nell'interfaccia
export function displayVersion() {
  const versionElements = document.querySelectorAll('.version-display');
  versionElements.forEach(el => {
    el.textContent = `v${VERSION.app}`;
  });
}

// Auto-inizializzazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', displayVersion);