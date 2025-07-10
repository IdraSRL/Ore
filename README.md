# Sistema Gestione Ore e Bigliettini BnB

**Versione:** 1.0.0  
**Build:** 2025-01-27

## Sistema di Versioning

Questo progetto implementa un sistema di versioning per garantire il corretto caricamento delle risorse e facilitare gli aggiornamenti.

### Struttura Versioning

- **Versione App:** 1.0.0 (formato semver) 
- **Versione CSS:** v=1.0.0
- **Versione JavaScript:** v=1.0.0
- **Build Date:** 2025-01-27

### File di Configurazione

- `version.json` - Contiene le informazioni di versione centrali
- `assets/js/common/version.js` - Script per gestire e visualizzare le versioni

### Implementazione

Tutti i file CSS e JavaScript includono il parametro di versione nell'URL:
```html
<link rel="stylesheet" href="assets/css/style.css?v=1.0.0">
<script type="module" src="assets/js/common/version.js?v=1.0.0"></script>
```

### Visualizzazione Versione

La versione è visibile in tutte le pagine dell'applicazione:
- **Pagina principale:** Angolo in basso a destra
- **Pannello Admin:** Nella navbar
- **Pagine di login:** In fondo al form
- **Pagine appartamenti:** Sotto i pulsanti di navigazione

### Aggiornamento Versioni

Per aggiornare la versione:

1. Modificare `version.json`
2. Aggiornare il parametro `?v=1.0.0` in tutti i link CSS/JS tramite cerca e sostituisci
3. Aggiornare la versione in `assets/js/common/version.js`

### Benefici

- **Cache Busting:** Forza il reload delle risorse quando cambiano
- **Tracciabilità:** Versione sempre visibile per debugging
- **Manutenzione:** Gestione centralizzata delle versioni
- **Controllo:** Evita problemi di cache del browser

## Struttura Progetto

```
/
├── version.json
├── assets/
│   ├── css/
│   │   ├── style.css?v=1.0.0
│   │   ├── style_bnb.css?v=1.0.0
│   │   └── style_gradimento.css?v=1.0.0
│   └── js/
│       ├── common/
│       │   ├── version.js?v=1.0.0
│       │   └── ...
│       └── ...
├── pages/
│   ├── admin.html
│   ├── timeEntry.html
│   └── ...
└── README.md
```

## Funzionalità Principali

- Gestione ore dipendenti
- Bigliettini BnB
- Sistema di gradimento clienti
- Calcolo preventivi biancheria
- Gestione appartamenti e allarmi
- Pannello amministrativo completo