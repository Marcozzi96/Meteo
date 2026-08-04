# Meteo Oggi

## Scopo del progetto
Piccola web app per le previsioni meteo che mostra:
- condizioni attuali;
- qualità dell'aria (AQI europeo, PM2.5, PM10, NO₂, O₃) in un sotto-tab "Aria" all'interno dei detail sheet di condizioni attuali, ore e giorni (quando i dati sono disponibili);
- previsione oraria per le prossime 24 ore;
- previsione giornaliera per i prossimi 7 giorni;
- schede di dettaglio cliccabili per ciascuna sezione.

L'app è pensata per essere **eseguita aprendo direttamente `index.html` in Chrome** (o altro browser moderno), senza server e senza build.

## Stack tecnico
- **HTML5**, **CSS3**, **JavaScript vanilla**.
- Nessun framework, nessun bundler, nessuna dipendenza npm.
- Layout responsive con CSS variables e `env(safe-area-inset-*)`.

## Come eseguire
1. Aprire `index.html` direttamente nel browser (doppio click o trascina su Chrome).
2. Il browser chiederà il permesso di usare la geolocalizzazione; se negato, l'app cerca di stimare la posizione via IP e infine fallback su Roma.
3. Il link si aggiorna automaticamente in formato compatto con sole coordinate (`?p=TOKEN`), per una condivisione più corta.
4. Quando si cerca una città tramite la barra di ricerca o si apre un link con `?c=NomeCittà`, la web app risolve il nome in coordinate tramite geocoding, carica il meteo e mostra nel sottotitolo solo regione e paese (es. `Avezzano` / `Abruzzo, Italia`).
5. Aprendo un link condiviso (`?p=TOKEN`) o con coordinate esplicite (`?lat=...&lon=...`), nome località e dettagli (quartiere/CAP/regione/paese) vengono ricostruiti via reverse geocoding a partire dalle coordinate. Regione e paese compaiono sempre nel sottotitolo.
6. Se il link include anche i parametri `name` e `sub` (es. `?lat=...&lon=...&name=Torino&sub=Mirafiori+Nord`), la web app usa direttamente questi valori per `#locName` e `#locSub` senza chiamare il servizio di reverse geocoding.
7. Se la località viene cercata tramite la barra di ricerca o aperta da un link `?c=NomeCittà`, `#locName` mostra il nome della città scelta e `#locSub` mostra sempre regione e paese (senza quartiere/CAP), perché si intende il meteo di quella città in senso generico.

## Struttura file
```
index.html          # markup, nessuna logica inline
css/style.css       # tutti gli stili, inclusi tema giorno/notte e pannelli orari swipe
js/config.js        # costanti: WMO, giorni, mesi, helper $
js/utils.js         # toast, windDir, fmtTime, uvLabel
js/theme.js         # palette sfondo dinamico (cielo + temperatura) e applicazione tema
js/api.js           # Open-Meteo (meteo e qualità dell'aria), geolocalizzazione, reverse geocoding, fallback IP
js/ui.js            # rendering pagina, schede dettaglio (inclusa qualità dell'aria nel pannello current), pannelli orari/giornalieri, apertura/chiusura sheet
js/touch.js         # gesture swipe-to-close e swipe orizzontale ore/giorni sul detail sheet
js/app.js           # stato globale, eventi, init, orchestrazione, logica ricerca
```

La barra di ricerca include l’input (`#searchInput`), il bottone GPS (`#gpsBtn`) e il bottone per svuotare il campo (`#clearSearch`). La logica di ricerca/pulizia e gli eventi correlati vivono in `js/app.js`; lo stile in `css/style.css`.

Il pulsante ingranaggio (`#settingsBtn`) apre nel detail sheet un pannello con due selettori di modello indipendenti: uno per **condizioni attuali e prossime 24 ore**, uno per **prossimi 7 giorni**. Le opzioni sono Automatico (`best_match` implicito), ECMWF IFS, ICON Seamless, GFS Seamless ed ECMWF AIFS. Le preferenze sono conservate in `localStorage` con chiave `meteo-oggi-models`; il modello non viene aggiunto al link condiviso. Il caricamento iniziale esegue in parallelo una richiesta breve di 2 giorni e una richiesta giornaliera di 7 giorni. Cambiando un selettore viene aggiornata solo la sezione interessata. I campi non disponibili per un modello sono mostrati come `N/D`.

Il pulsante aggiorna (`#refreshBtn`) nell'header ricarica i dati meteorologici e la qualità dell'aria per la posizione corrente (`state.lat`/`state.lon`) senza ricalcolare la località; il nome e il sottotitolo restano invariati.

La strip delle **prossime 24 ore** (`#hourlyScroll`) è scrollabile anche con drag del mouse, gestito in `js/touch.js` con gli stati CSS in `css/style.css`. I detail sheet di **prossime 24 ore** e **prossimi 7 giorni** usano tre pannelli affiancati (precedente, corrente e successivo) generati in `js/ui.js`; gli stili `.hour-sheet-*`/`.day-sheet-*` vivono in `css/style.css` e lo swipe orizzontale tra ore o giorni è gestito in `js/touch.js`. Quando un detail sheet è aperto, `js/ui.js` aggiunge `.sheet-open` a `html` e `body` per bloccare lo scroll della pagina sottostante; `js/touch.js` previene i `touchmove` fuori dallo sheet senza fissare/riposizionare il `body`.

I detail sheet delle sezioni **corrente**, **oraria** e **giornaliera** possono mostrare un sotto-tab "Aria" con i dati Open-Meteo Air Quality. Il tab compare solo quando i dati sono disponibili; il cambio tab è gestito in `js/ui.js` e gli stili in `css/style.css`. I pannelli "Meteo" e "Aria" sono sovrapposti in una griglia a riga unica, in modo che l'altezza del contenitore sia sempre quella del pannello più alto: il cambio tab non produce quindi scatti o ridimensionamenti. Negli sheet orari e giornalieri (quelli con swipe laterale), il tab selezionato rimane attivo anche scorrendo a un'altra ora o giornata.

## Regole e convenzioni
- **File JS classici con `src`**, non moduli ES6: Chrome blocca gli import locali da `file://`.
- **Ordine di caricamento** in `index.html`:
  1. `config.js`
  2. `utils.js`
  3. `theme.js`
  4. `api.js`
  5. `ui.js`
  6. `touch.js`
  7. `app.js`
- Lo **stato** (`lat`, `lon`, `name`, `sub`, `data`, `models`) vive in `app.js` come variabile globale `state`. In `data`, `currentDaily` contiene il riepilogo giornaliero della richiesta breve, mentre `daily` contiene la previsione del modello settimanale.
- Usare sempre il helper `$()` da `config.js` per selezionare elementi DOM (`$("idSenzaCancelletto")`). Se uno stesso elemento viene usato più volte, salvarlo in una costante per evitare selettori duplicati.
- I codici meteo seguono la codifica **WMO** definita in `config.js`.
- Il tema notte si attiva aggiungendo la classe `night` a `<body>`.
- Lo **sfondo dinamico** è gestito da `js/theme.js`: il gradiente di `body` cambia in base alla condizione meteo, al giorno/notte e alla temperatura attuale (freddo = fondo ghiaccio, caldo >30°C = fondo arancione, >35°C = fondo rosso).
- Nella UI giornaliera, l'ordine di visualizzazione delle temperature deve essere sempre **massima / minima** (sia nelle card dei 7 giorni che nel relativo detail sheet).
- A ogni **modifica funzionale** dell'app, aggiornare sempre anche `AGENTS.md` per mantenere allineata la documentazione operativa.

## API esterne
- Dati meteo: **Open-Meteo** (`api.open-meteo.com`)
- Qualità dell'aria: **Open-Meteo Air Quality API** (`air-quality-api.open-meteo.com`)
- Geocoding ricerca: **Open-Meteo Geocoding API**
- Reverse geocoding: **Nominatim** (OpenStreetMap), **BigDataCloud**
- Fallback posizione IP: **ipapi.co**, **ipwho.is**

## Requisiti
- Browser moderno con supporto a `fetch`, `Promise`, CSS variables, backdrop-filter.
- Permesso geolocalizzazione per la posizione GPS precisa.
- Connessione Internet per caricare dati e geocoding.

## Note per modifiche future
- Se aggiungi un nuovo pannello a scomparsa, valuta se estendere `js/touch.js` per supportare lo swipe-to-close.
- Se cambi API meteo o geocoding, modifica solo `js/api.js` e, se necessario, i template in `js/ui.js`.
- Se aggiungi nuove costanti (codici WMO, mesi, ecc.), mettile in `js/config.js`.
- **Non usare moduli ES6 né path assoluti**: l'app deve continuare a funzionare da `file://`.
- Se modifichi la barra di ricerca o il bottone di pulizia, aggiorna `index.html`, `css/style.css` e `js/app.js`.
