/**
 * Cache-Busting Loader System
 * Sistema di caricamento dinamico con cache-busting automatico
 * 
 * Questo script:
 * 1. Carica la versione corrente da version.js
 * 2. Aggiunge il parametro ?v=VERSION a tutti i file CSS, JS e risorse
 * 3. Gestisce il reload automatico quando la versione cambia
 */

(function() {
  'use strict';

  let APP_VERSION = null;
  let isVersionLoaded = false;

  /**
   * STEP 1: Carica dinamicamente la versione da version.js
   */
  async function loadVersion() {
    try {
      // Importa dinamicamente il modulo version.js
      const versionModule = await import('./version.js?' + Date.now());
      APP_VERSION = versionModule.APP_VERSION;
      isVersionLoaded = true;
      
      console.log('🔄 Versione caricata:', APP_VERSION);
      return APP_VERSION;
    } catch (error) {
      console.error('❌ Errore nel caricamento della versione:', error);
      // Fallback: usa timestamp come versione
      APP_VERSION = Date.now().toString();
      isVersionLoaded = true;
      return APP_VERSION;
    }
  }

  /**
   * STEP 2: Verifica se è necessario un reload per cambio versione
   */
  function checkForVersionUpdate(currentVersion) {
    const storedVersion = localStorage.getItem('app_version');
    
    if (storedVersion && storedVersion !== currentVersion) {
      console.log(`🔄 Aggiornamento versione: ${storedVersion} → ${currentVersion}`);
      localStorage.setItem('app_version', currentVersion);
      
      // Forza il reload completo della pagina
      setTimeout(() => {
        window.location.reload(true);
      }, 100);
      
      return true;
    }
    
    // Salva la versione corrente se non esiste
    if (!storedVersion) {
      localStorage.setItem('app_version', currentVersion);
    }
    
    return false;
  }

  /**
   * STEP 3: Applica cache-busting a tutti i link CSS
   */
  function applyCacheBustingToCSS(version) {
    const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
    let processedCount = 0;
    
    cssLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.includes('?v=') && !href.startsWith('http')) {
        // Rimuove eventuali parametri di versione esistenti
        const cleanHref = href.split('?')[0];
        const newHref = `${cleanHref}?v=${version}`;
        
        link.setAttribute('href', newHref);
        processedCount++;
        
        console.log(`📄 CSS aggiornato: ${href} → ${newHref}`);
      }
    });
    
    return processedCount;
  }

  /**
   * STEP 4: Applica cache-busting a tutti i script JS
   */
  function applyCacheBustingToJS(version) {
    const scripts = document.querySelectorAll('script[src]');
    let processedCount = 0;
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && !src.includes('?v=') && !src.startsWith('http') && !src.includes('loader.js')) {
        // Rimuove eventuali parametri di versione esistenti
        const cleanSrc = src.split('?')[0];
        const newSrc = `${cleanSrc}?v=${version}`;
        
        // Crea un nuovo script element per forzare il reload
        const newScript = document.createElement('script');
        newScript.src = newSrc;
        newScript.type = script.type || 'text/javascript';
        
        // Copia attributi importanti
        if (script.async) newScript.async = true;
        if (script.defer) newScript.defer = true;
        if (script.type === 'module') newScript.type = 'module';
        
        // Sostituisce il vecchio script
        script.parentNode.insertBefore(newScript, script);
        script.remove();
        
        processedCount++;
        console.log(`📜 JS aggiornato: ${src} → ${newSrc}`);
      }
    });
    
    return processedCount;
  }

  /**
   * STEP 5: Applica cache-busting a iframe e altre risorse
   */
  function applyCacheBustingToOtherResources(version) {
    // Iframe
    const iframes = document.querySelectorAll('iframe[src]');
    iframes.forEach(iframe => {
      const src = iframe.getAttribute('src');
      if (src && !src.includes('?v=') && !src.startsWith('http')) {
        const cleanSrc = src.split('?')[0];
        iframe.setAttribute('src', `${cleanSrc}?v=${version}`);
        console.log(`🖼️ Iframe aggiornato: ${src}`);
      }
    });

    // Immagini (opzionale)
    const images = document.querySelectorAll('img[src]');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.includes('?v=') && !src.startsWith('http') && !src.startsWith('data:')) {
        const cleanSrc = src.split('?')[0];
        img.setAttribute('src', `${cleanSrc}?v=${version}`);
        console.log(`🖼️ Immagine aggiornata: ${src}`);
      }
    });
  }

  /**
   * STEP 6: Funzione principale di inizializzazione
   */
  async function initializeCacheBusting() {
    try {
      console.log('🚀 Inizializzazione sistema cache-busting...');
      
      // Carica la versione
      const version = await loadVersion();
      
      // Verifica se serve un reload per cambio versione
      const needsReload = checkForVersionUpdate(version);
      if (needsReload) {
        console.log('🔄 Reload necessario per aggiornamento versione');
        return; // Il reload interromperà l'esecuzione
      }
      
      // Applica cache-busting a tutte le risorse
      const cssCount = applyCacheBustingToCSS(version);
      const jsCount = applyCacheBustingToJS(version);
      applyCacheBustingToOtherResources(version);
      
      console.log(`✅ Cache-busting completato: ${cssCount} CSS, ${jsCount} JS aggiornati`);
      
      // Aggiorna display della versione nell'interfaccia
      updateVersionDisplay(version);
      
    } catch (error) {
      console.error('❌ Errore durante l\'inizializzazione cache-busting:', error);
    }
  }

  /**
   * STEP 7: Aggiorna la visualizzazione della versione nell'UI
   */
  function updateVersionDisplay(version) {
    // Aspetta che il DOM sia completamente caricato
    const updateElements = () => {
      const versionElements = document.querySelectorAll('.version-display');
      versionElements.forEach(el => {
        el.textContent = `v${version}`;
      });
      
      if (versionElements.length > 0) {
        console.log(`📱 Aggiornati ${versionElements.length} elementi di versione nell'UI`);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateElements);
    } else {
      updateElements();
    }
  }

  /**
   * STEP 8: Avvio automatico del sistema
   */
  
  // Avvia immediatamente se il DOM è già pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCacheBusting);
  } else {
    // DOM già pronto, avvia subito
    initializeCacheBusting();
  }

  // Esporta funzioni utili per debug
  window.cacheBustingSystem = {
    getVersion: () => APP_VERSION,
    isLoaded: () => isVersionLoaded,
    forceReload: () => window.location.reload(true),
    clearVersionCache: () => localStorage.removeItem('app_version')
  };

})();