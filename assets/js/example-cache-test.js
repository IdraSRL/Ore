/**
 * File JavaScript di esempio per testare il cache-busting
 * 
 * Questo script dimostra come il sistema di versioning funziona con i file JS:
 * - Ogni volta che cambi APP_VERSION in version.js
 * - Questo file verrà ricaricato con il nuovo parametro ?v=NUOVA_VERSIONE
 * - Permettendo di eseguire immediatamente il nuovo codice JavaScript
 */

// Test di cache-busting - cambia questo messaggio per verificare il funzionamento
const CACHE_TEST_MESSAGE = "🚀 JavaScript Cache-Busting Test v2.0.0 - Funziona!";

/**
 * Funzione di test per verificare il cache-busting
 */
function testCacheBusting() {
  console.log(CACHE_TEST_MESSAGE);
  
  // Crea un elemento di test nella pagina
  const testElement = document.createElement('div');
  testElement.className = 'cache-test-element';
  testElement.textContent = CACHE_TEST_MESSAGE;
  
  // Aggiunge l'elemento al body se esiste
  if (document.body) {
    document.body.appendChild(testElement);
    
    // Rimuove l'elemento dopo 5 secondi
    setTimeout(() => {
      if (testElement.parentNode) {
        testElement.parentNode.removeChild(testElement);
      }
    }, 5000);
  }
}

/**
 * Mostra informazioni di debug sul versioning
 */
function showVersionDebug() {
  // Aspetta che il sistema di cache-busting sia inizializzato
  setTimeout(() => {
    if (window.cacheBustingSystem) {
      const version = window.cacheBustingSystem.getVersion();
      const isLoaded = window.cacheBustingSystem.isLoaded();
      
      console.log('📊 Debug Versioning:', {
        version: version,
        loaded: isLoaded,
        timestamp: new Date().toISOString()
      });
      
      // Crea elemento di debug visuale
      const debugElement = document.createElement('div');
      debugElement.className = 'version-debug';
      debugElement.innerHTML = `
        <div>Versione: ${version || 'N/A'}</div>
        <div>Caricato: ${isLoaded ? '✅' : '❌'}</div>
        <div>Timestamp: ${new Date().toLocaleTimeString()}</div>
      `;
      
      document.body.appendChild(debugElement);
      
      // Rimuove dopo 10 secondi
      setTimeout(() => {
        if (debugElement.parentNode) {
          debugElement.parentNode.removeChild(debugElement);
        }
      }, 10000);
    }
  }, 1000);
}

/**
 * Inizializzazione quando il DOM è pronto
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎯 Cache-busting test script caricato');
  
  // Esegue i test
  testCacheBusting();
  showVersionDebug();
  
  // Test periodico ogni 30 secondi (per debug)
  setInterval(() => {
    console.log('🔄 Test periodico cache-busting:', new Date().toLocaleTimeString());
  }, 30000);
});

// Esporta funzioni per uso globale (debug)
window.cacheTestUtils = {
  test: testCacheBusting,
  debug: showVersionDebug,
  message: CACHE_TEST_MESSAGE
};