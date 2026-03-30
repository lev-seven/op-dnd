# 🎲 DnD Manager — Setup GitHub Pages

## Struttura del repository

Carica i file su GitHub con questa struttura:

```
dnd-manager/
├── index.html          ← L'app principale
├── data/
│   ├── manifest.json   ← Lista account e personaggi
│   ├── master/         ← Cartella PG del Master
│   ├── lev/         ← Cartella PG di Lev
│   │   └── eliah_pucci.json
```

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
    { "id": "lev", "name": "Lev", "color": "#e74c3c", "isMaster": false }
  ],
  "characters": {
    "master": [],
    "lev": [
      { "file": "eliah_pucci.json", "name": "Eliah Pucci", "preview": "Skypiean · Lv 7" }
    ]
  }
}
```

Per aggiungere un PG di Pata:
```json
"pata": [
  { "file": "nome_pg.json", "name": "Nome PG", "preview": "Razza · Lv X" }
]
```
