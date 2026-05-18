// ============================================================
//  TTRPG App — Classic System (D&D 5e Homebrew)
//  classic-data.js — Schema Compendio
//
//  Popola gli array SPELLS_5E e ABILITIES_5E con i tuoi
//  contenuti homebrew seguendo il formato indicato nei commenti.
//
//  IMPORTANTE: usa sempre var (non const/let) — il codice
//  accede ai dati tramite window.SPELLS_5E, window.ABILITIES_5E
// ============================================================


// ═══════════════════════════════════════════════════════════
//  TAG — Etichette usate per filtrare nel Compendio
//  Aggiungi, rimuovi o rinomina liberamente.
// ═══════════════════════════════════════════════════════════
var TAG_LABELS_5E = {
  // chiave: 'label visibile nel filtro'
  // Esempio:
  // Haki:    '👊 Haki',
  // Frutto:  '🌀 Frutto del Diavolo',
  // Marziale:'⚔ Marziale',
  // Divino:  '✨ Divino',
  // Arcano:  '🔮 Arcano',
};


// ═══════════════════════════════════════════════════════════
//  MAGIE — SPELLS_5E
//
//  Ogni entry viene aggiunta alla tab Magie del PG tramite
//  il bottone "📚 Compendio" nella scheda.
//  I campi marcati (*) sono obbligatori.
//
//  Formato entry:
//  {
//    id:            string (*) — univoco, es. 'c_001'
//    name:          string (*) — nome della magia
//    level:         number (*) — 0 = cantrip, 1–9 = livello
//    school:        string (*) — es. 'Evocazione', 'Abiurazione'
//    castingTime:   string (*) — 'action' | 'bonus' | 'reaction' |
//                                '1 minuto' | '10 minuti' | '1 ora' | 'ritual'
//    range:         string (*) — es. '9m', 'Tocco', 'Sé stesso'
//    components:    object (*) — { v: bool, s: bool, m: string|null }
//    duration:      string (*) — es. 'Istantanea', 'Concentrazione, 1 minuto'
//    concentration: bool   (*) — true se richiede concentrazione
//    ritual:        bool   (*) — true se può essere lanciata come rituale
//    desc:          string (*) — testo dell'effetto (mostrato nella scheda)
//    higherLevels:  string|null — effetto con slot superiori (opzionale)
//    tags:          string[]    — chiavi da TAG_LABELS_5E per il filtro
//  }
// ═══════════════════════════════════════════════════════════
var SPELLS_5E = [

  // ── Cantrip (level: 0) ──────────────────────────────────


  // ── Livello 1 ───────────────────────────────────────────


  // ── Livello 2 ───────────────────────────────────────────


  // ── Livello 3 ───────────────────────────────────────────


  // ── Livello 4 ───────────────────────────────────────────


  // ── Livello 5+ ──────────────────────────────────────────


];


// ═══════════════════════════════════════════════════════════
//  ABILITÀ — ABILITIES_5E
//
//  Ogni entry viene aggiunta alla tab Azioni del PG tramite
//  il bottone "📚 Compendio" nella scheda.
//
//  Il campo `originTag` collega l'abilità alla provenienza
//  (origin) corrispondente nel PG. Se vuoto ('') viene
//  assegnato automaticamente alla prima provenienza disponibile.
//
//  Formato entry:
//  {
//    id:         string (*) — univoco, es. 'ha_01'
//    name:       string (*) — nome dell'abilità
//    type:       string (*) — 'Azione' | 'Azione bonus' |
//                             'Reazione' | 'Passiva' | 'Rituale'
//    originTag:  string     — id origin: 'haki_arm' | 'haki_oss' |
//                             'haki_re' | 'fdd' | '' (prima disponibile)
//    desc:       string (*) — testo dell'effetto (mostrato nella scheda)
//    maxUses:    number (*) — -1 = illimitato, >0 = usi con contatore
//    rest:       string|null — 'breve' | 'lungo' | null
//                              (rilevante solo se maxUses > 0)
//    cdStat:     string|null — stat per calcolo CD automatico:
//                              'FOR'|'DES'|'COS'|'INT'|'SAG'|'CAR'|'custom'|null
//    cdCustom:   number|null — valore CD fisso (solo se cdStat === 'custom')
//    tags:       string[]    — chiavi da TAG_LABELS_5E per il filtro
//  }
// ═══════════════════════════════════════════════════════════
var ABILITIES_5E = [

  // ── Haki Armatura (originTag: 'haki_arm') ───────────────


  // ── Haki Osservazione (originTag: 'haki_oss') ───────────


  // ── Haki del Re (originTag: 'haki_re') ──────────────────


  // ── Frutto del Diavolo (originTag: 'fdd') ───────────────


  // ── Generiche / Marziali (originTag: '') ────────────────


];