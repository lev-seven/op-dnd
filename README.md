# 🎲 DnD Manager — Setup GitHub Pages

## Struttura del repository

Carica i file su GitHub con questa struttura:

```
dnd-manager/
├── index.html          ← L'app principale
├── data/
│   ├── manifest.json   ← Lista account e personaggi
│   ├── master/         ← Cartella PG del Master
│   ├── ciccio/         ← Cartella PG di Ciccio
│   │   └── eliah_pucci.json
│   └── pata/           ← Cartella PG di Pata
```

## Setup passo-passo

### 1. Crea il repository
- Vai su github.com → "New repository"
- Nome: `dnd-manager`
- Public (necessario per GitHub Pages)
- Clicca "Create repository"

### 2. Carica i file
- Clicca "Add file" → "Upload files"
- Carica `index.html` nella root
- Crea la cartella `data/` e carica `manifest.json`
- Crea `data/ciccio/` e carica `eliah_pucci.json`
- Crea `data/master/` e `data/pata/` (vuote per ora)

### 3. Configura l'URL nell'app
- Apri `index.html` su GitHub
- Clicca l'icona matita (Edit)
- Cerca la riga: `window.GITHUB_BASE = "";`
- Sostituisci con: `window.GITHUB_BASE = "https://TUONOME.github.io/dnd-manager";`
- Commit changes

### 4. Attiva GitHub Pages
- Settings → Pages → Source: "Deploy from a branch"
- Branch: `main`, cartella `/ (root)` → Save
- Aspetta 2 minuti, il sito sarà su `https://TUONOME.github.io/dnd-manager/`

### 5. Installa sul telefono
- Apri il link in Chrome/Safari
- Menu → "Aggiungi a schermata Home"

## Come funziona a sessione

### Prima della sessione
1. Apri l'app → password → scegli account
2. I tuoi PG compaiono automaticamente (caricati da GitHub)
3. Tocca il PG per aprirlo → gioca!

### A fine sessione
1. Premi 💾 Esporta PG → scarica il JSON aggiornato
2. Vai su GitHub → `data/tuonome/` → clicca il file del PG
3. Clicca l'icona matita → "Replace file" o incolla il contenuto
4. Commit → fatto! Alla prossima sessione sarà aggiornato

### Aggiungere un nuovo PG
1. Nell'app: "Nuovo PG" → compilalo → Esporta
2. Carica il JSON su GitHub nella tua cartella `data/tuonome/`
3. Modifica `data/manifest.json` aggiungendo il nuovo PG alla lista

### Aggiungere un nuovo giocatore
1. Modifica `data/manifest.json` aggiungendo l'account
2. Crea la cartella `data/nuovonome/` su GitHub
3. Il nuovo giocatore comparirà nell'app

## Esempio manifest.json

```json
{
  "accounts": [
    { "id": "master", "name": "Master", "color": "#c8a95e", "isMaster": true },
    { "id": "ciccio", "name": "Ciccio", "color": "#e74c3c", "isMaster": false },
    { "id": "pata", "name": "Pata", "color": "#3498db", "isMaster": false }
  ],
  "characters": {
    "master": [],
    "ciccio": [
      { "file": "eliah_pucci.json", "name": "Eliah Pucci", "preview": "Skypiean · Lv 7" }
    ],
    "pata": []
  }
}
```

Per aggiungere un PG di Pata:
```json
"pata": [
  { "file": "nome_pg.json", "name": "Nome PG", "preview": "Razza · Lv X" }
]
```
