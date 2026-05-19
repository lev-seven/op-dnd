// ============================================================
//  C.O.R.E. — Compact Open Rules Engine
//  core-data.js — File Dati Completo
//  Versione corretta: bonus armi/magie allineati alle costanti app
// ============================================================

var STILI = {
  universale: { lbl:'Universale', icon:'⬡', cls:'sb-un' },
  fantasy:    { lbl:'Fantasy',    icon:'⚔', cls:'sb-fa' },
  cyberpunk:  { lbl:'Cyberpunk',  icon:'◈', cls:'sb-cy' },
  noir:       { lbl:'Noir',       icon:'◉', cls:'sb-no' },
  horror:     { lbl:'Horror',     icon:'☽', cls:'sb-ho' },
  anime:      { lbl:'Anime',      icon:'⚡', cls:'sb-an' },
  'post-ap':  { lbl:'Post-Ap',   icon:'☢', cls:'sb-pa' }
};

// ═══ REGOLE BASE ═══
var CORE_RULES = {
  stats: ['CORPO','MENTE','ANIMA'],
  hpFormula: 'CORPO + MENTE + ANIMA',
  startPoints: 12,
  statMin: 1,
  statCapBase: 7,         // cap al livello 1 (creazione)
  statCapNormal: 10,      // cap standard senza talenti
  statCap12: 12,          // con Limite Elevato
  statCap15: 15,          // con Limite Maestro
  maxTalents: 4,          // massimo talenti acquisibili
  maxAugments: 2,         // massimo miglioramenti fisici
  maxCantrips: 2,
  slotFormula: 'max(MENTE, ANIMA) - 2',
  spellSlotCosts: {ct:0, 1:1, 2:1, 3:2, 4:2}, // L1-L2 costano 1 slot, L3-L4 costano 2 slot
  shortRestSlotRecovery: 'max(1, floor(max(MENTE,ANIMA)/4))',
  baseMovement: 9,
  // Armi: illimitate, bonus fisso per categoria
  // Magie: più forti, ma consumano slot-punti
  weaponBonus: { A:1, B:2, C:3, D:4 },
  spellBonus:  { ct:0, 1:2, 2:4, 3:6, 4:8 },
  spellCost:   { 1:1, 2:2, 3:3, 4:4 },
  spellMinStat:{ 1:6, 2:8, 3:10, 4:12 },
  initiative: '1d12 + stat di competenza + bonus competenza',
  initiativeParita: 'MENTE più alta agisce prima',
  compFormula: 'max(1, floor(stat / 2))',
  compTable: [
    {stat:'1-2',  bonus:1},
    {stat:'3-4',  bonus:2},
    {stat:'5-6',  bonus:3},
    {stat:'7-8',  bonus:4},
    {stat:'9-10', bonus:5},
    {stat:'11-12',bonus:6},
    {stat:'13-15',bonus:7}
  ],
  humanityRules: {
    safe: 2,
    max: 2,
    warning: 'Con 2 Miglioramenti Fisici il personaggio è al limite. Ulteriori solo su scelta narrativa del Master.',
    rules: [
      'Fino a 2 modifiche: nessuna penalità meccanica.',
      'Eventuali modifiche oltre il limite (solo per scelta narrativa del Master): il personaggio è marcatamente non-umano. -1 ANIMA permanente a tutti i tiri sociali con non-modificati.',
      'Se un effetto in gioco riduce ANIMA a 0 mentre si ha 3+ modifiche, il personaggio perde il controllo permanentemente (diventa PNG del GM).'
    ]
  }
};

// ═══ CONDIZIONI (3+ attive: -2 a tutti i tiri) ═══
var CONDITIONS = [
  {id:'stunned',   nome:'Stordito',    effetto:'Salti la prossima azione.',                                    durata:'1 round',                           gravita:'alta'},
  {id:'blinded',   nome:'Accecato',    effetto:'-2 ai tuoi tiri di attacco.',                                  durata:'1-2 round',                         gravita:'media'},
  {id:'poisoned',  nome:'Avvelenato',  effetto:'-1 a tutti i tiri.',                                           durata:'3 round, CORPO vs CD per uscirne',  gravita:'media'},
  {id:'frightened',nome:'Spaventato',  effetto:'-1 a tutti i tiri. Non puoi avvicinarti alla fonte.',           durata:'ANIMA vs CD per uscirne',           gravita:'media'},
  {id:'slowed',    nome:'Rallentato',  effetto:'Movimento dimezzato. -1 iniziativa.',                          durata:'2 round',                           gravita:'bassa'},
  {id:'paralyzed', nome:'Paralizzato', effetto:'Non agisci. Attacchi vs te +2.',                               durata:'1 round, poi CORPO vs CD',          gravita:'alta'},
  {id:'confused',  nome:'Confuso',     effetto:'d6: 1-2 colpisci alleato, 3-4 nulla, 5-6 normale.',            durata:'2 round',                           gravita:'media'},
  {id:'weakened',  nome:'Indebolito',  effetto:'-1 a 1 stat specifica (indicata dall\'effetto).',              durata:'Fino a riposo breve',               gravita:'bassa'}
];

// ═══ ARMATURE ═══
var ARMORS = [
  {id:0, nome:'Nessuna',  bonus:0, penMente:0, penAnima:0, movimento:9, req:0,  note:''},
  {id:1, nome:'Leggera',  bonus:1, penMente:0, penAnima:0, movimento:9, req:0,  note:'Nessuna restrizione.'},
  {id:2, nome:'Media',    bonus:2, penMente:1, penAnima:0, movimento:7, req:4,  note:'-1 tiri MENTE. Movimento 7m. Richiede CORPO 4+.'},
  {id:3, nome:'Pesante',  bonus:3, penMente:1, penAnima:1, movimento:5, req:6,  note:'-1 tiri MENTE, -1 tiri ANIMA. Movimento 5m. No cantrip ANIMA. Richiede CORPO 6+.'}
];

// ═══ ARMI ═══
// bonus = bonus fisso al tiro (illimitato). Le magie hanno bonus maggiori ma consumano slot.
// NOTA: i valori bonus qui sono allineati alle costanti WCAT_BONUS dell'app (A:1 B:2 C:3 D:4).
var WCAT = {
  A:{ nome:'Leggera',    bonus:1, req:null,            svan:'Danno singolo basso. Usare due armi A richiede il talento Doppia Impugnatura.', initMod:0 },
  B:{ nome:'Standard',   bonus:2, req:null,            svan:'Nessuno — bilanciata per eccellenza.', initMod:0 },
  C:{ nome:'Pesante',    bonus:3, req:'armi_pesanti',  svan:'Richiede CORPO≥6 o il talento Armi Pesanti. Ingombrante — difficile nasconderla.', initMod:0 },
  D:{ nome:'Devastante', bonus:4, req:'armi_letali',   svan:'Richiede CORPO≥10 + talento Armi Letali obbligatorio. Due mani: no scudo. -1 iniziativa.', initMod:-1 }
};

var WPERKS = {
  A:[
    {id:'a1',nome:'Velocità',    desc:'Attacca due volte per round. Ogni attacco a -2 al tiro.',              pro:'Ottimo per finire nemici.',             con:'Danno basso contro difese alte.'},
    {id:'a2',nome:'Furtivo',     desc:'+2 al tiro vs bersagli che non ti hanno visto in questo round.',       pro:'Bonus per chi agisce per primo.',       con:'Perso se il nemico è allertato.'},
    {id:'a3',nome:'Sanguinante', desc:'Se colpisci: 1 HP/round per 3 round (cumulabile).',                    pro:'Danno nel tempo.',                      con:'Lento. Curabili con healing.'},
    {id:'a4',nome:'Colpo Basso', desc:'Se colpisci: bersaglio -1 difesa fino al suo prossimo turno.',         pro:'Facilita colpi degli alleati.',         con:'Utile solo se alleati attaccano dopo.'},
    {id:'a5',nome:'Schivata',    desc:'Dopo aver attaccato: +1 difesa tua fino al tuo prossimo turno.',       pro:'Offensivo e difensivo.',                con:'Non aiuta se non attacchi.'}
  ],
  B:[
    {id:'b1',nome:'Affidabilità', desc:'1x/combat: se esci 1-3 sul d12, ritira e tieni il secondo.',         pro:'Elimina i fallimenti brutti.',          con:'1 uso per combat.'},
    {id:'b2',nome:'Parata',       desc:'+1 difesa CORPO mentre impugni questa arma (passivo).',               pro:'Difesa costante.',                      con:'Non aiuta l\'attacco.'},
    {id:'b3',nome:'Spinta',       desc:'Se danno > 5: bersaglio -1 al prossimo tiro.',                        pro:'Debuff su ogni colpo forte.',           con:'Non vs difese altissime.'},
    {id:'b4',nome:'Bilanciamento',desc:'Prima di attaccare: -1 tiro per +2 danno, o +1 tiro per -1 danno.', pro:'Adattabile a ogni situazione.',         con:'Decidi prima del tiro.'},
    {id:'b5',nome:'Rimbalzo',     desc:'Se attacco fa 0 danno: prossimo tiro vs stesso bersaglio +2.',        pro:'Trasforma mancanze in setup.',          con:'Serve un turno sacrificato.'}
  ],
  C:[
    {id:'c1',nome:'Sfondamento',  desc:'Ignora 2 punti di CORPO difensivo del bersaglio.',                    pro:'Contro nemici corazzati.',              con:'Inutile vs CORPO basso.'},
    {id:'c2',nome:'Schianto',     desc:'Se danno > 5: bersaglio destabilizzato, -1 al prossimo tiro.',        pro:'Debuff affidabile.',                    con:'Richiede 6+ danno.'},
    {id:'c3',nome:'Inesorabile',  desc:'Il perk può essere usato 2x/combat.',                                 pro:'Raddoppia qualsiasi perk.',             con:'Dipende dal perk scelto.'},
    {id:'c4',nome:'Terrore',      desc:'Se danno > 7: bersaglio -1 ANIMA per questo combat (max -3).',        pro:'Erode l\'ANIMA nel tempo.',             con:'Richiede danno alto.'},
    {id:'c5',nome:'Spaccaossa',   desc:'1x/combat: se colpisci FERITO o CRITICO, +3 danno.',                  pro:'Finisher potente.',                     con:'1 uso. Solo vs feriti.'}
  ],
  D:[
    {id:'d1',nome:'Impatto',       desc:'Se danno > 8: bersaglio -1 al prossimo tiro.',                       pro:'Scala con tiri alti.',                  con:'Solo se danno >8.'},
    {id:'d2',nome:'Frantumo',      desc:'1x/combat: distruggi scudo nemico o penalizza arma (-1 permanente).', pro:'Elimina vantaggi difensivi.',           con:'1 uso.'},
    {id:'d3',nome:'Esecuzione',    desc:'1x/combat: se bersaglio <= 10 HP, +4 al tiro.',                      pro:'Finisher letale.',                      con:'1 uso.'},
    {id:'d4',nome:"Onda d'Urto",  desc:'1x/combat: colpisci anche bersaglio adiacente per metà danno.',       pro:'Multi-target.',                         con:'1 uso. Bersagli vicini.'},
    {id:'d5',nome:'Fendente Letale',desc:'Se attacco-difesa >= 6: no HP naturali fino a riposo lungo.',       pro:'Nega rigenerazione.',                   con:'Solo con margine 6+.'}
  ]
};

var SHIELDS = [
  {id:0, nome:'Nessuno',    bonus:0, penMente:0, penAnima:0, rest:null,           note:''},
  {id:1, nome:'Piccolo +1', bonus:1, penMente:0, penAnima:0, rest:null,           note:'Nessuna restrizione d\'arma.'},
  {id:2, nome:'Medio +2',   bonus:2, penMente:1, penAnima:0, rest:['A','B','C'], note:'No Cat D. -1 tiri MENTE.'},
  {id:3, nome:'Torre +3',   bonus:3, penMente:1, penAnima:1, rest:['A','B'],     note:'Solo Cat A/B. -1 tiri MENTE, -1 tiri ANIMA.'}
];

// ═══ INCOMPATIBILITÀ ═══
var INCOMPATIBILITIES = [
  {items:['shield_2','shield_3','cat_D'], rule:'Scudo Medio/Torre incompatibile con Cat D (due mani).'},
  {items:['armor_3','cantrip_anima'],     rule:'Armatura Pesante impedisce cantrip ANIMA (troppo ingombro).'},
  {items:['shield','dual_wield'],         rule:'Scudo incompatibile con Doppia Impugnatura (serve mano libera).'},
  {items:['aug_rn','aug_lr'],             rule:'Riflessi Neurali incompatibile con Limitatore Rimosso.'},
  {items:['aug_gate','aug_lr'],           rule:'Gate dell\'Anima incompatibile con Limitatore Rimosso.'}
];

// ═══ MAGIE ═══
// bonus = bonus fisso al tiro d12 (da costanti app: ct:0 L1:+2 L2:+4 L3:+6 L4:+8)
// min   = stat minima richiesta (ct:0 L1:6 L2:8 L3:10 L4:12)
// Le magie sono più potenti delle armi di pari livello, ma consumano slot-punti.
  
var SPELLS = [
  // ── CANTRIP ── bonus:0, min:0, illimitati (max 2 equipaggiati)
  {id:'c01',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Fiamma Minore',     bonus:0,mec:'1d12+MENTE vs CORPO (fuoco). Luce, accende oggetti.',                         pro:'Offensivo e narrativo.',           con:'Danno basso, raggio corto.'},
  {id:'c02',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Scudo Arcano',      bonus:0,mec:'Reazione: +3 difesa vs prossimo attacco magico. 1x/round.',                   pro:'Gratuito, non usa azione.',        con:'Solo vs magie.'},
  {id:'c03',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Messaggio Mentale', bonus:0,mec:'Invia una frase a qualcuno noto entro 1 km. Non intercettabile.',              pro:'Comunicazione segreta.',           con:'Solo frasi brevi.'},
  {id:'c04',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Disturbo',          bonus:0,mec:'1d12+MENTE vs MENTE. Vinci: -1 prossimo tiro bersaglio.',                     pro:'Debuff economico.',                con:'Effetto lieve.'},
  {id:'c05',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Luce',              bonus:0,mec:'Fonte luminosa 10m per 1 ora.',                                                pro:'Sempre utile.',                    con:'Nessun effetto combat.'},
  {id:'c06',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Gelo',              bonus:0,mec:'1d12+MENTE vs CORPO (freddo). Bersaglio -1 difesa per 1 round.',              pro:'Danno + debuff difesa.',           con:'Brevissima durata.'},
  {id:'c07',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Spinta Arcana',     bonus:0,mec:'MENTE vs CORPO. Vinci: spingi 3m (no danno).',                               pro:'Posizionamento tattico.',          con:'Zero danno.'},
  {id:'c08',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Nebbia',            bonus:0,mec:'Nebbia r.3m: -1 tiri in zona per 3 round.',                                   pro:'Ostacola in area.',                con:'Ostacola anche alleati.'},
  {id:'c09',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'noir',      nome:'Occhio di Mente',   bonus:0,mec:'MENTE vs ANIMA. Vinci: conosci pensiero attuale del bersaglio.',              pro:'Info tattica e narrativa.',        con:'Zero danno.'},
  {id:'c10',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Guardia Arcana',    bonus:0,mec:'+1 difesa vs tutti per 1 round. Costa 1 azione.',                             pro:'Buffer rapido.',                   con:'Dura 1 round.'},
  {id:'c11',tipo:'ct',lvl:0,min:0,stat:'ANIMA',stile:'fantasy',   nome:'Benedizione Minore',bonus:0,mec:'ANIMA: +1 prossimo tiro di un alleato vicino.',                               pro:'Supporto immediato gratuito.',     con:'Solo +1, 1 alleato.'},
  {id:'c12',tipo:'ct',lvl:0,min:0,stat:'ANIMA',stile:'fantasy',   nome:'Parola di Conforto',bonus:0,mec:'ANIMA: rimuove condizione Spaventato o Indebolito da un alleato.',             pro:'Utility gratuita.',                con:'Solo condizioni minori.'},
  {id:'c13',tipo:'ct',lvl:0,min:0,stat:'ANIMA',stile:'noir',      nome:'Empatia Arcana',    bonus:0,mec:'ANIMA vs ANIMA. Senti l\'emozione dominante del bersaglio.',                  pro:'Leggi lo stato d\'animo.',         con:'Solo emozioni.'},
  {id:'c14',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'horror',    nome:'Tocco Necrotico',   bonus:0,mec:'1d12+MENTE vs CORPO. Vs non-morti: cura te stesso invece.',                  pro:'Danno e auto-cura dual use.',      con:'Richiede tocco.'},
  {id:'c15',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'cyberpunk', nome:'Impulso Digitale',  bonus:0,mec:'MENTE vs 7: fai glitchare un dispositivo vicino. Narrativo.',                 pro:'Utility digitale gratuita.',       con:'Solo dispositivi semplici.'},
  {id:'c16',tipo:'ct',lvl:0,min:0,stat:'ANIMA',stile:'anime',     nome:'Aura Minacciosa',   bonus:0,mec:'Emanate presenza. +2 al prossimo tiro di intimidazione (ANIMA).',              pro:'Setup confronti.',                 con:'+2 a 1 tiro solo.'},
  {id:'c17',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Veleno di Contatto',bonus:0,mec:'Incanta prossimo attacco fisico con veleno: +1 HP/round per 2 round.',       pro:'Danno nel tempo senza slot.',      con:'Solo 1 attacco.'},
  {id:'c18',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Senso Etereo',      bonus:0,mec:'Rilevi esseri viventi entro 20m per 10 min.',                                 pro:'Esplorazione e sorveglianza.',     con:'Non distingue amici da nemici.'},

  // ── LIVELLO 1 ── bonus:+2, min stat:6, costo:1pt
  {id:'m01',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Dardo Magico',       bonus:2,mec:'1d12+MENTE+2 vs CORPO. Fa sempre minimo 1 danno.',                           pro:'Garantisce danno.',                con:'Danno moderato.'},
  {id:'m02',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Sonno',              bonus:2,mec:'1d12+MENTE+2 vs ANIMA. Vinci: dorme. No su ANIMA >= 8.',                     pro:'Neutralizza senza danno.',         con:'ANIMA alta resiste.'},
  {id:'m03',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Presa Arcana',       bonus:2,mec:'1d12+MENTE+2 vs CORPO. Vinci: Rallentato 1 round.',                          pro:'Controllo del campo.',             con:'CORPO alto resiste.'},
  {id:'m04',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Cura Ferite',        bonus:2,mec:'Ripristina MENTE HP a un bersaglio. Richiede tocco.',                        pro:'Healing diretto.',                 con:'Richiede tocco.'},
  {id:'m05',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Scudo di Forza',     bonus:2,mec:'+2 difesa vs tutti per 2 round.',                                            pro:'Difesa per 2 round.',              con:'Costa 1 azione.'},
  {id:'m06',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Frecce Magiche',     bonus:2,mec:'3 dardi: 1d12+MENTE vs CORPO ciascuno. Distribuibili.',                     pro:'Multi-target.',                    con:'-2 per dardo rispetto a L1 standard.'},
  {id:'m07',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'horror',   nome:'Voce del Terrore',   bonus:2,mec:'1d12+ANIMA+2 vs ANIMA. Vinci: Spaventato 2 round.',                         pro:'Infligge condizione.',             con:'Richiede vittoria.'},
  {id:'m08',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'anime',    nome:'Ispirazione Arcana', bonus:2,mec:'ANIMA: alleato +3 al prossimo tiro (prima del tiro).',                       pro:'Bonus in momenti cruciali.',       con:'Solo 1 tiro.'},
  {id:'m09',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'fantasy',  nome:'Canto di Guarigione',bonus:2,mec:'Ripristina ANIMA HP a un bersaglio. Richiede tocco.',                       pro:'Healing basato su ANIMA.',         con:'Richiede tocco.'},
  {id:'m10',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'cyberpunk',nome:'Aggancio',           bonus:2,mec:'MENTE vs 7: accedi o disabilita sistema digitale semplice.',                 pro:'Utility digitale.',                con:'Solo sistemi semplici.'},
  {id:'m11',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'horror',   nome:'Grido Straniante',   bonus:2,mec:'ANIMA+2 vs ANIMA di tutti entro 5m. Chi perde: Indebolito (ANIMA) 1 round.', pro:'Area burst ANIMA.',               con:'Raggio piccolo.'},
  {id:'m12',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Cura a Distanza',    bonus:2,mec:'Ripristina MENTE HP a bersaglio entro 10m. No tocco.',                      pro:'Healing sicuro a distanza.',       con:'Stessa quantità di Cura Ferite.'},
  {id:'m43',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'horror',   nome:'Maledizione di Setta',bonus:2,mec:'1d12+ANIMA+2 vs ANIMA. Vinci: bersaglio fallisce prossimo tiro vs Spaventato.',pro:'Amplificatore per effetti paura.',con:'Solo vs resistenza, no danno.'},
  {id:'m48',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'anime',    nome:'Analisi Tattica',    bonus:2,mec:'MENTE+2 vs ANIMA. Vinci: conosci cat arma, HP approx, 1 perk. +2 prossimo attacco vs lui.',pro:'Info + bonus attacco.',con:'Solo 1 bersaglio.'},

  // ── LIVELLO 2 ── bonus:+4, min stat:8, costo:2pt
  {id:'m13',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'fantasy',  nome:'Palla di Fuoco',    bonus:4,mec:'1d12+MENTE+4 vs CORPO di TUTTI in raggio. Amici inclusi.',                   pro:'Multi-target, danno elevato.',     con:'Colpisce alleati.'},
  {id:'m14',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'universale',nome:'Invisibilità',     bonus:4,mec:'Invisibile 10 min o fino al prossimo attacco.',                               pro:'Elusione totale.',                 con:'Si annulla al primo attacco.'},
  {id:'m15',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'universale',nome:'Telecinesi',       bonus:4,mec:'1d12+MENTE+4 vs CORPO. Sposta, afferra, disarma. Danno = margine.',          pro:'Versatile.',                       con:'Non vs CORPO altissimo.'},
  {id:'m16',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'fantasy',  nome:'Lama Magica',       bonus:4,mec:'Incanta arma alleata: +3 al prossimo attacco, danno magico.',                pro:'Buff potente.',                    con:'Solo 1 attacco.'},
  {id:'m17',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'noir',     nome:'Blocco del Pensiero',bonus:4,mec:'1d12+MENTE+4 vs MENTE. Vinci: no magie per 2 round.',                      pro:'Silenzia caster.',                 con:'Solo vs caster.'},
  {id:'m18',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'universale',nome:'Volo',             bonus:4,mec:'Voli 10 min. Puoi portare 1 alleato.',                                       pro:'Mobilità aerea.',                  con:'Attacchi fisici lo annullano.'},
  {id:'m19',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'fantasy',  nome:'Benedizione',       bonus:4,mec:'1d12+ANIMA+4: alleati vicini +2 tiri per 3 round.',                          pro:'Buff di gruppo.',                  con:'Richiede alleati vicini.'},
  {id:'m20',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'fantasy',  nome:"Legame dell'Anima", bonus:4,mec:'1d12+ANIMA+4: condividi metà del danno ricevuto da 1 alleato.',              pro:'Protezione per alleato.',          con:'Rischioso se alleato subisce tanto.'},
  {id:'m21',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'noir',     nome:"Voce dell'Autorità",bonus:4,mec:'1d12+ANIMA+4 vs ANIMA. Vinci: trattato come autorità per 10 min.',          pro:'Charm narrativo.',                 con:'Zero danno.'},
  {id:'m22',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'cyberpunk',nome:'Overload Neurale',  bonus:4,mec:'1d12+MENTE+4 vs CORPO. Vs augmentati: augmenti disabilitati 2 round.',       pro:'Counter cyberware.',               con:'Solo vs augmentati.'},
  {id:'m23',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'horror',   nome:'Barriera di Spine', bonus:4,mec:'Chi ti colpisce in mischia subisce 2 danni auto. Dura 3 round.',             pro:'Difesa che punisce.',              con:'Solo mischia.'},
  {id:'m24',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'anime',    nome:"Eco dell'Anima",    bonus:4,mec:'1d12+ANIMA+4: ripeti tipo attacco riuscito di un alleato questo round.',     pro:'Sinergia di gruppo.',              con:'Richiede alleato abbia già colpito.'},
  {id:'m44',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'horror',   nome:'Visione Cosmica',   bonus:4,mec:'1d12+ANIMA+4 vs MENTE. Vinci: Indebolito (MENTE) 2 round.',                 pro:'Debuff MENTE pesante.',            con:'Immune se MENTE >= 7.'},
  {id:'m45',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'horror',   nome:'Rito del Sangue',   bonus:4,mec:'Spendi 3 HP: prossimo tiro magico minimo 8 sul d12.',                        pro:'Elimina fallimenti magici.',       con:'Costa 3 HP. Visibile.'},
  {id:'m49',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'anime',    nome:'Aura di Supremazia',bonus:4,mec:'1d12+ANIMA+4: nemici entro 5m: ANIMA vs tua ANIMA o Indebolito (ANIMA) 2 round.',pro:'Area debuff ANIMA.',           con:'Se ANIMA inferiore, effetto ribaltato.'},
  {id:'m51',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'universale',nome:"Catene dell'Anima",bonus:4,mec:'1d12+ANIMA+4 vs ANIMA. Vinci: Rallentato 2 round.',                         pro:'Controllo del campo.',             con:'Solo rallentamento.'},
  {id:'m52',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'fantasy',  nome:'Patto di Sangue',  bonus:4,mec:'Lega 2 alleati per 3 round: danno ricevuto diviso equamente (arrotonda su).',pro:'Equalizza sopravvivenza.',         con:'Se uno è debole, rischia.'},

  // ── LIVELLO 3 ── bonus:+6, min stat:10, costo:3pt
  {id:'m25',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'fantasy',  nome:'Fulmine',          bonus:6,mec:'1d12+MENTE+6 vs CORPO in linea. Oltre il primo: metà danno.',               pro:'Danno altissimo in linea.',        con:'Richiede allineamento.'},
  {id:'m26',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'horror',   nome:'Controllo Mentale',bonus:6,mec:'1d12+MENTE+6 vs ANIMA. Vinci: 1 ordine semplice non suicida (1 round).',    pro:'Nemico diventa alleato temp.',     con:'1 round.'},
  {id:'m27',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'fantasy',  nome:'Muro di Ghiaccio', bonus:6,mec:'Barriera solida 10 min. Sfondare: CORPO vs 12.',                            pro:'Divide il campo.',                 con:'No danno.'},
  {id:'m28',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'anime',    nome:'Tempesta di Lame', bonus:6,mec:'1d12+MENTE+6 vs CORPO di tutti entro 3m da te.',                            pro:'Area devastante.',                 con:'Colpisce alleati vicini.'},
  {id:'m29',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'horror',   nome:'Maledizione',      bonus:6,mec:'1d12+MENTE+6 vs ANIMA. Vinci: Indebolito (stat a scelta) per intera sessione.',pro:'Debuff permanente.',             con:'Richiede vittoria.'},
  {id:'m30',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'horror',   nome:'Aura di Morte',    bonus:6,mec:'1d12+ANIMA+6: nemici in raggio -1/round in zona (max -3).',                 pro:'Debuff crescente.',                con:'Nemici possono allontanarsi.'},
  {id:'m31',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'horror',   nome:'Anima in Prestito',bonus:6,mec:'1d12+ANIMA+6 vs 15. Richiami alleato caduto QUESTO round (1 HP). 1x/riposo.',pro:'Salvataggio immediato.',          con:'Tiro difficile.'},
  {id:'m32',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'anime',    nome:'Grido di Guerra',  bonus:6,mec:'1d12+ANIMA+6: alleati +2 attacco, ignorano Ferito per 2 round.',             pro:'Buff massiccio.',                  con:'Dura 2 round.'},
  {id:'m33',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'cyberpunk',nome:'Hacking di Massa', bonus:6,mec:'1d12+MENTE+6 vs 10: controllo sistemi digitali entro 20m per 2 round.',      pro:'Dominio tecno in area.',           con:'Organici immuni.'},
  {id:'m34',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'anime',    nome:'Urlo Berserker',   bonus:6,mec:'ANIMA: +4 attacchi per 2 round. Poi Indebolito (CORPO) 1 round.',            pro:'Offensiva devastante.',            con:'Esaurimento post-uso.'},
  {id:'m46',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'horror',   nome:"Richiamo dell'Antico",bonus:6,mec:'1d12+ANIMA+6 vs 10: tutti entro raggio: ANIMA vs 10 o Spaventato 1 round.',pro:'Area paura potentissima.',       con:'Entità può restare (GM).'},
  {id:'m50',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'anime',    nome:'Tecnica Ultimo Stadio',bonus:6,mec:'1d12+ANIMA+6 vs CORPO. Danno massimizzato (d12=12). 1x/sessione.',      pro:'Danno max garantito.',             con:'1 uso per sessione.'},
  {id:'m53',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'universale',nome:'Scudo di Gruppo', bonus:6,mec:'Alleati entro 5m: +2 difesa CORPO per 2 round. Costa la tua azione.',        pro:'Buff difensivo di gruppo.',        con:'Costa azione.'},
  {id:'m54',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'anime',    nome:'Volontà del Conquistatore',bonus:6,mec:'1d12+ANIMA+6 vs ANIMA tutti in 10m. Perdi 5+: Spaventato 2 round. Perdi: -1 prossimo tiro.',pro:'Area intimidazione.',con:'Slot L3 richiesto.'},

  // ── LIVELLO 4 ── bonus:+8, min stat:12, costo:4pt
  {id:'m35',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'fantasy',  nome:'Resurrezione',     bonus:8,mec:'Stabilizza 1 alleato 0 HP -> torna a CORPO HP. 1x/riposo lungo.',            pro:'Salva dalla morte.',               con:'1 uso.'},
  {id:'m36',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'universale',nome:'Teletrasporto',   bonus:8,mec:'Sposta chiunque tocchi in luogo noto. 1x/giorno.',                           pro:'Fuga o riposizionamento.',         con:'Devi conoscere il luogo.'},
  {id:'m37',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'anime',    nome:'Nova Arcana',      bonus:8,mec:'1d12+MENTE+8 vs CORPO in area enorme. Esaurisce TUTTI gli slot.',           pro:'Danno devastante.',                con:'Esaurisce tutto.'},
  {id:'m38',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'universale',nome:'Arresto del Tempo',bonus:8,mec:'Agisci 1 round extra fuori dal tempo. 1x/giorno.',                         pro:'Un round extra.',                  con:'1 uso.'},
  {id:'m39',tipo:'mg',lvl:4,min:12,stat:'ANIMA',stile:'horror',   nome:'Dominio',          bonus:8,mec:'1d12+ANIMA+8 vs ANIMA. Controllo completo per 1 ora. No atti suicidi.',     pro:'Controllo totale.',                con:'Richiede vittoria.'},
  {id:'m40',tipo:'mg',lvl:4,min:12,stat:'ANIMA',stile:'horror',   nome:"Sacrificio d'Anima",bonus:8,mec:'Spendi 2 HP per ogni 1 HP curato agli alleati in raggio. 1x/riposo.',      pro:'Healing massiccio.',               con:'Costa i tuoi HP.'},
  {id:'m41',tipo:'mg',lvl:4,min:12,stat:'ANIMA',stile:'horror',   nome:'Grande Maledizione',bonus:8,mec:'1d12+ANIMA+8 vs ANIMA. Maledizione permanente fino a dispel.',             pro:'Permanente.',                      con:'Effetto specifico col GM.'},
  {id:'m42',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'cyberpunk',nome:'Trasferimento Coscienza',bonus:8,mec:'1d12+MENTE+8 vs MENTE. Scambi coscienza con bersaglio 10 min.',      pro:'Infiltrazione totale.',            con:'Il tuo corpo è vulnerabile.'},
  {id:'m47',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'horror',   nome:'Frammentazione Cosmica',bonus:8,mec:'1d12+MENTE+8 vs MENTE. Fallisce ogni tiro con 1-4 per 2 round.',      pro:'Raddoppia fallimenti critici.',    con:'Se fallisci: -1 MENTE.'},
  {id:'m55',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'universale',nome:'Disintegrazione', bonus:8,mec:'1d12+MENTE+8 vs CORPO. Ignora bonus armatura. Danno = margine x2.',         pro:'Ignora armatura, danno doppio.',   con:'Non ignora scudo.'},


  // ─── NUOVE MAGIE — meccaniche da altri sistemi GDR ───

  // ─ HORROR ─
  {id:'sp_furto_vitale',   tipo:'mg',lvl:2,min:8, stat:'MENTE',stile:'horror',
    nome:'Furto Vitale',   bonus:4,
    mec:'Attacchi in mischia canalizzando energia necromantica verso il bersaglio. Quando colpisci e infliggi almeno un punto di danno, recuperi Punti Vita pari alla metà del danno inflitto, arrotondato per difetto. Se il bersaglio viene abbattuto dal colpo, recuperi Punti Vita pari all\'intero danno.',
    pro:'Autosufficienza in combattimento. Puoi sostenere scontri prolungati senza alleati.',
    con:'Solo attacchi in mischia. Nessuna cura se non si infligge danno.'},

  {id:'sp_paura_abissale', tipo:'mg',lvl:2,min:8, stat:'ANIMA',stile:'horror',
    nome:'Paura Abissale',  bonus:4,
    mec:'Proietti una visione di terrore soprannaturale su tutti i nemici entro cinque metri. Effettua un singolo tiro di attacco usando ANIMA. Ogni bersaglio la cui Difesa viene superata da quel tiro acquisisce la condizione Spaventato per due round.',
    pro:'Colpisce più bersagli con un singolo tiro. Potente contro gregari e creature con bassa ANIMA.',
    con:'Nessun danno diretto. Richiede vicinanza al gruppo nemico. Boss con ANIMA alta spesso resistono.'},

  {id:'sp_velo_oblio',     tipo:'mg',lvl:2,min:8, stat:'ANIMA',stile:'horror',
    nome:"Velo dell'Oblio", bonus:4,
    mec:'Un bersaglio intelligente entro dieci metri deve superare un tiro di MENTE contro il tuo tiro di ANIMA. Se fallisce, dimentica l\'ultimo round di eventi: abbassa le armi, perde il senso del contesto e salta il suo prossimo turno. La magia non lascia tracce visibili.',
    pro:'Rimuove un nemico per un turno intero senza infliggere danno. Efficace contro avversari intelligenti.',
    con:'Solo contro bersagli con memoria e cognizione. Il Master decide il comportamento dopo l\'oblio.'},

  // ─ FANTASY ─
  {id:'sp_canzone_guerra', tipo:'mg',lvl:1,min:6, stat:'ANIMA',stile:'fantasy',
    nome:'Canzone di Guerra',bonus:2,
    mec:'Intoni una melodia di battaglia che persiste per due round. Per tutta la durata, tutti gli alleati entro dieci metri ottengono più uno a tutti i tiri di attacco, sia fisici che magici.',
    pro:'Buff di gruppo che scala con il numero di alleati. Efficace su qualsiasi stile di combattimento.',
    con:'Nessun effetto su te stesso. Richiede alleati nelle vicinanze. Bonus modesto in solitaria.'},

  {id:'sp_colpo_tonante',  tipo:'mg',lvl:1,min:6, stat:'MENTE',stile:'fantasy',
    nome:'Colpo Tonante',   bonus:2,
    mec:'Emetti un\'onda di forza in un cono di tre metri nella direzione scelta. Ogni bersaglio nel cono subisce il danno del tiro e viene spinto indietro di tre metri. Se sbatte contro un ostacolo solido, subisce due punti di danno aggiuntivi.',
    pro:'Controllo del campo. Spinge i nemici lontano dagli alleati o verso posizioni svantaggiate.',
    con:'Breve portata. Poco danno senza ostacoli nelle vicinanze. Solo bersagli di fronte.'},

  // ─ CYBERPUNK ─
  {id:'sp_catena_fulmini', tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'cyberpunk',
    nome:'Catena Fulminante',bonus:6,
    mec:'Lanci un fulmine sul bersaglio principale con tiro normale. Se infliggi almeno un punto di danno, il fulmine salta su un secondo nemico entro cinque metri con tiro a meno due. Se anche questo subisce danno, può saltare su un terzo bersaglio con tiro a meno quattro. Ogni salto richiede un tiro separato.',
    pro:'Potenzialmente devastante contro gruppi ravvicinati. Efficienza crescente con il numero di nemici.',
    con:'I nemici devono essere vicini tra loro. Il terzo salto raramente si concretizza contro avversari competenti.'},

  {id:'sp_scarica_emp',    tipo:'mg',lvl:2,min:8, stat:'MENTE',stile:'cyberpunk',
    nome:'Scarica EMP',     bonus:4,
    mec:'Emetti un impulso elettromagnetico che colpisce tutti i bersagli con componenti cibernetiche entro sei metri. Ogni bersaglio colpito subisce il danno del tiro e perde accesso a qualsiasi capacità speciale derivante da ciberware o tecnologia per un round. Bersagli senza componenti tecnologiche non subiscono alcun effetto.',
    pro:'Area automatica contro nemici cibernetici. Devasta truppe tecnologiche.',
    con:'Inutile contro bersagli biologici puri o creature magiche. Il Master definisce cosa è tecnologico.'},

  // ─ ANIME ─
  {id:'sp_bolla_tempo',    tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'anime',
    nome:'Bolla di Tempo',  bonus:8,
    mec:'Congeli temporalmente un bersaglio per due round: non può agire, muoversi né difendersi attivamente. La sua Difesa scende al solo valore di CORPO per tutta la durata, poiché non può reagire. Alla fine di ogni suo turno, il bersaglio effettua un tiro di MENTE contro la tua MENTE per liberarsi anticipatamente.',
    pro:'Rimuove completamente un bersaglio dalla scena per almeno un round, anche un boss.',
    con:'Singolo bersaglio. Il più costoso del sistema. I nemici con MENTE alta si liberano frequentemente.'},

  // ─ NOIR ─
  {id:'sp_nebbia_londra',  tipo:'mg',lvl:1,min:6, stat:'MENTE',stile:'noir',
    nome:'Nebbia di Londra',bonus:2,
    mec:'Crei una zona di nebbia densa di cinque metri di raggio centrata su un punto entro quindici metri da te. I tiri di attacco diretti all\'interno o attraverso la nebbia subiscono meno tre. La nebbia persiste per tre round o finché non viene dissipata da vento forte o magia specifica.',
    pro:'Protezione di gruppo dal fuoco nemico. Copre ritirate tattiche o avanzate silenziose.',
    con:'Penalizza anche gli alleati che combattono nella nebbia. Nulla ferma i danni da magie ad area.'},

  // ─ CANTRIP ANIMA aggiuntivo ─
  {id:'ct_lamento_oscuro', tipo:'ct',lvl:0,  min:0, stat:'ANIMA',stile:'horror',
    nome:'Lamento Oscuro',  bonus:1,
    mec:'Un urlo di energia oscura si scaglia sul bersaglio, alimentato dall\'ANIMA invece che dalla MENTE. Permette ai personaggi con forte investimento in ANIMA di avere un cantrip offensivo nella loro caratteristica principale senza sacrificare punti in MENTE.',
    pro:'Cantrip offensivo basato su ANIMA. Ideale per build animistiche pure.',
    con:'Stessa efficacia di un cantrip standard. Meccanicamente identico ad altri cantrip, differisce solo per stat.'},


];

// ═══ TALENTI ═══
// NOTA ID CRITICI:
//   armi_pesanti  → sblocca Cat C (cercato da canUseCat nell'app)
//   armi_letali   → sblocca Cat D (cercato da canUseCat nell'app)
//   gate_mb       → sblocca magie L1-L2 (cercato da canLearnSpell e intuizioneMagica)
//   gate_ma       → sblocca magie L3-L4 (cercato da canLearnSpell)
//   cap_12 / cap_15 → alzano cap stat (cercati da talCap)
var TALENTS = [
  // ── ACCESSI ──
  {id:'armi_pesanti',cat:'accesso',stile:'universale',req:null,          nome:'Armi Pesanti',    desc:'Sblocca Cat C e i suoi 5 perk. Utile per personaggi con CORPO<6 che vogliono Cat C. Con CORPO≥6 puoi usare Cat C senza questo talento.',pro:'Accesso a Cat C (+3) senza requisito di CORPO.',con:'Con CORPO≥6 è ridondante. Non più prerequisito per Armi Letali.'},
  {id:'armi_letali', cat:'accesso',stile:'universale',req:null,           nome:'Armi Letali',     desc:'Sblocca Cat D. Richiede CORPO≥10 obbligatoriamente — il talento da solo non basta. Non richiede Armi Pesanti come prerequisito.',pro:'Massimo potere fisico (+4 attacco) con 1 solo talento.',con:'Richiede CORPO≥10 (alto investimento di stat).'},
  {id:'gate_mb',     cat:'accesso',stile:'universale',req:null,          nome:'Magia Base',      desc:'Sblocca magie L1-L2. Slot = max(MENTE,ANIMA)-2. Alternativa: MENTE≥10 (Intuizione Magica) sblocca L1-L2 senza questo talento.',pro:'Accesso alle prime magie.',          con:'Inutile se MENTE≥10 (ridondante).'},
  {id:'gate_ma',     cat:'accesso',stile:'universale',req:'gate_mb',     nome:'Magia Avanzata',  desc:'Sblocca magie L3-L4. Richiede Magia Base. MENTE≥10 NON sostituisce questo talento per L3-L4.',   pro:'Le magie più potenti del sistema.',    con:'Richiede Magia Base.'},
  // ── LIMITI ──
  {id:'cap_12',      cat:'limite', stile:'universale',req:null,          nome:'Limite Elevato',  desc:'Alza il cap delle caratteristiche da 10 a 12.',                                                    pro:'Stat più alte, HP e slot maggiori.',   con:'Costa 1 slot talento.'},
  {id:'cap_15',      cat:'limite', stile:'universale',req:'cap_12',      nome:'Limite Maestro',  desc:'Alza il cap da 12 a 15. Richiede Limite Elevato.',                                                 pro:'Valori massimi del sistema.',           con:'Richiede Limite Elevato.'},
  // ── CORPO ──
  {id:'t01',cat:'corpo',stile:'fantasy',   req:null,nome:'Pelle Dura',          desc:'Riduci di 1 tutti i danni fisici (min 0). Passivo.',                pro:'Riduzione su ogni colpo.',        con:'Inutile vs magie.'},
  {id:'t02',cat:'corpo',stile:'universale',req:null,nome:'Colpo Preciso',       desc:'1x/combat: se superi la difesa, attacco fisico fa minimo 5 danno.',  pro:'Garantisce danno.',               con:'1 uso.'},
  {id:'t03',cat:'corpo',stile:'fantasy',   req:null,nome:'Resistenza Innata',   desc:'Immune a condizione Avvelenato. +3 vs veleni potenti.',              pro:'Potente con veleni.',             con:'Situazionale.'},
  {id:'t04',cat:'corpo',stile:'universale',req:null,nome:'Atletismo Estremo',   desc:'+3 a tiri CORPO non-combat (scalare, nuotare, saltare).',            pro:'Dominante in esplorazione.',      con:'Zero combat.'},
  {id:'t05',cat:'corpo',stile:'universale',req:null,nome:'Sfida',               desc:'Provochi un nemico: deve attaccarti o fallisce ANIMA vs tua ANIMA.', pro:'Protegge alleati.',               con:'Attiri danni.'},
  {id:'t06',cat:'corpo',stile:'anime',     req:null,nome:'Furia',               desc:'Sotto metà HP: +2 ai tiri di attacco fisico. Passivo.',              pro:'Letale in pericolo.',             con:'Richiede essere ferito.'},
  {id:'t07',cat:'corpo',stile:'fantasy',   req:null,nome:'Guarigione Naturale', desc:'+2 HP per round di riposo breve.',                                   pro:'Healing passivo.',                con:'Zero in combat.'},
  {id:'t08',cat:'corpo',stile:'fantasy',   req:null,nome:'Colosso',             desc:'CORPO conta +1 per HP max (non aggiunge alla stat).',                pro:'HP extra senza sacrifici.',       con:'Solo sopravvivenza.'},
  {id:'t48',cat:'corpo',stile:'anime',     req:null,nome:'Superamento del Limite',desc:'Dopo crisi, 1x/sessione: recupera 5 HP, +2 tiri per 2 round.',    pro:'Rimonta potente.',                con:'1 uso. GM decide.'},
  {id:'t51',cat:'corpo',stile:'universale',req:null,nome:'Doppia Impugnatura',  desc:'2 armi Cat A. Attacchi 2x a -3 ciascuno. No scudo. Se entrambi mancano: Indebolito (CORPO) 1 round.',pro:'Potenziale doppio danno.',con:'No scudo, -3 per attacco, rischio.'},
  {id:'t52',cat:'corpo',stile:'universale',req:null,nome:'Colpo Critico',       desc:'Su 12 naturale al d12: +4 danno bonus. Passivo.',                   pro:'Bonus su critico.',               con:'Solo su 12 naturale (8%).'},
  // ── MENTE ──
  {id:'t09',cat:'mente',stile:'noir',      req:null,nome:'Analisi del Nemico',  desc:'Osserva 1 round senza attaccare: GM rivela tratto o debolezza.',     pro:'Info tattica gratuita.',          con:'Sprechi un round.'},
  {id:'t10',cat:'mente',stile:'horror',    req:null,nome:'Resistenza Mentale',  desc:'+3 difesa vs magie mentali. Immune a condizione Confuso.',           pro:'Contro maghi.',                   con:'Solo vs magie mentali.'},
  {id:'t11',cat:'mente',stile:'noir',      req:null,nome:'Memoria Eidettica',   desc:'Ricordi tutto ciò che hai visto/sentito.',                           pro:'Nessuna perdita di info.',        con:'Zero combat.'},
  {id:'t12',cat:'mente',stile:'noir',      req:null,nome:'Polimata',            desc:'+3 a tiri MENTE di conoscenza, ricerca e identificazione.',          pro:'Esperto del sapere.',             con:'Solo conoscenza.'},
  {id:'t13',cat:'mente',stile:'fantasy',   req:null,nome:'Concentrazione',      desc:'Mantieni attivi due effetti magici contemporaneamente.',              pro:'Raddoppia utilità caster.',       con:'Inutile senza magie.'},
  {id:'t14',cat:'mente',stile:'fantasy',   req:null,nome:'Occhio di Falco',     desc:'+2 ai tiri di attacco con armi a distanza.',                        pro:'Specializzazione arcieri.',       con:'Solo distanza.'},
  {id:'t15',cat:'mente',stile:'universale',req:null,nome:'Tattico',             desc:'1x/combat: redirige attacco di un alleato verso bersaglio migliore.', pro:'Ottimizza azioni gruppo.',       con:'1 uso.'},
  {id:'t33',cat:'mente',stile:'cyberpunk', req:null,nome:'Hacker',              desc:'+3 MENTE vs sistemi digitali. Intrusioni senza strumenti.',          pro:'Dominio in ambienti tech.',       con:'Inutile senza tecnologia.'},
  {id:'t34',cat:'mente',stile:'noir',      req:null,nome:'Investigatore',       desc:'Passivo: GM segnala se c\'è qualcosa di nascosto. +2 tiri MENTE deduzione.',pro:'Non sfugge nulla.',        con:'Il GM decide.'},
  {id:'t35',cat:'mente',stile:'universale',req:null,nome:'Adrenalina Innata',   desc:'1x/combat: ritira qualsiasi dado e prendi il migliore.',             pro:'Salva da situazioni critiche.',   con:'1 uso.'},
  {id:'t43',cat:'mente',stile:'horror',    req:null,nome:'Cultista',            desc:'Membro di setta. +3 conoscenza riti. 1x/sessione la setta fornisce risorsa.',pro:'Rete di risorse oscure.',  con:'La setta ti osserva. Compiti dal GM.'},
  {id:'t44',cat:'mente',stile:'horror',    req:null,nome:'Mente Blindata',      desc:'+4 vs follia e orrore cosmico. Immune prima maledizione/sessione.',  pro:'Counter horror cosmico.',         con:'-1 ANIMA passivo.'},
  {id:'t50',cat:'mente',stile:'anime',     req:null,nome:'Discepolo del Maestro',desc:'Hai un maestro. +2 vs tecniche che ti ha insegnato a riconoscere.', pro:'Bonus permanente + narrativa.',   con:'Se il maestro muore, perdi bonus.'},
  {id:'t53',cat:'mente',stile:'fantasy',   req:null,nome:'Metamagia',           desc:'1x/combat: lancia magia a distanza doppia, OPPURE cambia stat difesa bersaglio. Dichiari prima del tiro.',pro:'Flessibilità caster.',con:'1 uso.'},
  // ── ANIMA ──
  {id:'t16',cat:'anima',stile:'universale',req:null,nome:'Aura di Comando',     desc:'Alleati vicini +1 ai tiri quando dai indicazioni come azione.',       pro:'Potenzia il gruppo.',             con:'Richiede la tua azione.'},
  {id:'t17',cat:'anima',stile:'noir',      req:null,nome:'Empatia',             desc:'Sai sempre se qualcuno mente. GM dice "sincero"/"mente" (passivo).',  pro:'Potente in indagini.',            con:'Il GM può giocare su "crede".'},
  {id:'t18',cat:'anima',stile:'anime',     req:null,nome:'Spirito Indomabile',  desc:'Penalità ferite un tier dopo: Ferito=0, Critico=-1.',                 pro:'Efficace più a lungo.',          con:'Non riduce il danno.'},
  {id:'t19',cat:'anima',stile:'universale',req:null,nome:'Ispirazione',         desc:'1x/riposo lungo: +4 al tiro di un alleato.',                         pro:'Cambia momenti cruciali.',        con:'1 uso al giorno.'},
  {id:'t20',cat:'anima',stile:'universale',req:null,nome:'Senso del Pericolo',  desc:'Non puoi essere sorpreso. Sempre la tua azione in imboscata.',        pro:'Nessun agguato.',                con:'Situazionale.'},
  {id:'t21',cat:'anima',stile:'noir',      req:null,nome:'Voce della Ragione',  desc:'+3 a tiri ANIMA di persuasione, diplomazia, negoziazione.',           pro:'Domina contesti sociali.',        con:'Solo social.'},
  {id:'t22',cat:'anima',stile:'noir',      req:null,nome:"Nervi d'Acciaio",     desc:'Immune a condizione Spaventato. +1 vs coercizione.',                 pro:'Inflessibile.',                   con:'Situazionale.'},
  {id:'t36',cat:'anima',stile:'anime',     req:null,nome:'Aura di Ki',          desc:'+2 ANIMA intimidire E ispirare. Nemici ti vedono come minaccia.',     pro:'Doppio beneficio.',               con:'Nemici ti prendono di mira.'},
  {id:'t37',cat:'anima',stile:'horror',    req:null,nome:'Sangue Maledetto',    desc:'1x/sessione: sacrifica fino a 5 HP per +1 tiri per HP speso (resto scena).',pro:'Burst di potere.',          con:'Costa HP. Max +5.'},
  {id:'t45',cat:'anima',stile:'horror',    req:null,nome:"Servo dell'Antico",   desc:'1x/sessione: entità agisce 1 round (GM), poi tu +3 tiri per 1 round.',pro:'Potere enorme.',                 con:'GM controlla entità.'},
  {id:'t46',cat:'anima',stile:'horror',    req:null,nome:'Ritualista',          desc:'Con 10 min e materiali: +5 tiro magico, cura 5 HP, o -2 a bersaglio.',pro:'Potere fuori-combat enorme.',    con:'Materiali richiesti. Fallimenti hanno conseguenze.'},
  {id:'t47',cat:'anima',stile:'anime',     req:null,nome:'Nakama',              desc:'1x/combat: se alleato a <= 1/3 HP, +4 tiri per 1 round.',            pro:'Burst situazionale forte.',       con:'Solo se alleato in pericolo.'},
  {id:'t54',cat:'anima',stile:'horror',    req:null,nome:'Ultimo Respiro',      desc:'Quando alleato a 0 HP entro 5m: reazione, cura ANIMA HP. 1x/riposo lungo.',pro:'Salvataggio clutch.',       con:'1 uso al giorno.'},
  {id:'t55',cat:'anima',stile:'cyberpunk', req:null,nome:'Scarica Adrenalinica',desc:'1x/combat: turno extra immediato. Poi Indebolito (CORPO) 2 round. No cumulo con altri effetti turno-extra.',pro:'Turno extra.',con:'Esaurimento post-uso.'},
  // ── IBRIDO ──
  {id:'t23',cat:'ibrido',stile:'universale',req:null,nome:"Maestro d'Armi",     desc:'Il perk arma può essere usato 2x/combat.',                           pro:'Raddoppia perk.',                con:'Dipende dal perk.'},
  {id:'t24',cat:'ibrido',stile:'universale',req:null,nome:'Contrattacco',       desc:'Quando un nemico fa 0 danno contro di te, rispondi come reazione.',   pro:'Punisce le mancanze nemiche.',   con:'Solo quando il nemico manca.'},
  {id:'t25',cat:'ibrido',stile:'noir',     req:null,nome:'Sangue Freddo',       desc:'Le penalità ferite si applicano un tier dopo.',                       pro:'Efficace più a lungo.',          con:'Non riduce il danno.'},
  {id:'t26',cat:'ibrido',stile:'fantasy',  req:null,nome:'Cacciatore',          desc:'+2 attacchi contro bersaglio già colpito nello stesso combat.',       pro:'Scala contro boss.',              con:'No bonus al primo colpo.'},
  {id:'t27',cat:'ibrido',stile:'universale',req:null,nome:'Adattamento Rapido', desc:'1x/sessione: usa stat diversa per 1 azione (accordo GM).',            pro:'Flessibilità narrativa.',         con:'1 uso.'},
  {id:'t28',cat:'ibrido',stile:'anime',    req:null,nome:'Riflessi Fulminei',   desc:'+2 iniziativa. A parità agisci per primo.',                           pro:'Vantaggio tattico.',              con:'Solo iniziativa.'},
  {id:'t29',cat:'ibrido',stile:'fantasy',  req:null,nome:'Predatore',           desc:'+2 attacchi contro bersagli che si sono già mossi.',                  pro:'Contro unità veloci.',            con:'Inutile vs nemici lenti.'},
  {id:'t30',cat:'ibrido',stile:'anime',    req:null,nome:'Volontà di Ferro',    desc:'Prima volta a 0 HP: agisci ancora 1 round prima di cadere.',          pro:'Ultimo gesto eroico.',            con:'Una sola volta.'},
  {id:'t31',cat:'ibrido',stile:'universale',req:null,nome:'Doppia Minaccia',    desc:'Con Armi Pesanti, alterna perk Cat C e Cat A nello stesso combat.',   pro:'Combina due categorie.',          con:'Richiede Armi Pesanti.'},
  {id:'t32',cat:'ibrido',stile:'universale',req:null,nome:'Presenza Letale',    desc:'Nemici che mancano in mischia: -1 al prossimo tiro. Passivo.',        pro:'Punisce ogni mancanza.',          con:'Solo mischia.'},
  {id:'t38',cat:'ibrido',stile:'universale',req:null,nome:'Sincronia',          desc:'Attacchi stesso bersaglio di un alleato: entrambi +2 al tiro.',       pro:'Sinergia intensa.',               con:'Richiede coordinazione.'},
  {id:'t39',cat:'ibrido',stile:'noir',     req:null,nome:'Cacciatore di Taglie',desc:'+3 a tiri MENTE per tracciare bersaglio già visto.',                 pro:'Tracker infallibile.',            con:'Solo vs bersagli già visti.'},
  {id:'t40',cat:'ibrido',stile:'post-ap', req:null,nome:'Arma Improvvisata',   desc:'Qualsiasi oggetto è Cat B weapon. Senza perk.',                       pro:'Mai disarmato.',                  con:'Nessun perk.'},
  {id:'t41',cat:'ibrido',stile:'horror',   req:null,nome:'Presagio',            desc:'GM ti avverte di pericoli soprannaturali nell\'area immediata.',       pro:'Nessuna sorpresa soprannaturale.',con:'Il GM decide il timing.'},
  {id:'t42',cat:'ibrido',stile:'post-ap', req:null,nome:'Sopravvivenza Estrema',desc:'+3 tiri CORPO sopravvivenza. Non puoi perderti. 1x/giorno trova risorse.',pro:'Indispensabile in aree ostili.', con:'Inutile in ambienti urbani.'},
  {id:'t49',cat:'ibrido',stile:'anime',   req:null,nome:'Tecnica Segreta',     desc:'1x/sessione: dichiara nome tecnica, +5 prossimo tiro. Narrativamente vincolata.',pro:'Bonus enorme nel momento giusto.',con:'1 uso. Deve essere coerente.'},
  {id:'t56',cat:'ibrido',stile:'fantasy',  req:null,nome:'Legame Familiare',    desc:'Hai un familiare. +2 tiri MENTE esplorazione. 1x/combat intercetta 1 attacco (muore, torna dopo riposo lungo).',pro:'Difesa + esplorazione.',con:'Se muore, 1 riposo senza bonus.'},

// ─── TALENTI AZIONE (nuovi: meccaniche da altri sistemi GDR) ───

  // ─ UNIVERSALI ─
  {id:'furia',            cat:'corpo',  stile:'universale',req:null,
    nome:'Furia',
    desc:'Esistono combattenti che non cercano la vittoria con la tecnica, ma con la ferocia pura. Quando entri in stato di furia, il tuo corpo supera ogni limitazione razionale: percepisci il dolore come qualcosa di distante, i tuoi colpi diventano devastanti e imprevedibili. La mente smette di ragionare e il corpo prende il controllo.',
    perk:'1x/combat: entra in furia come azione libera. Per tre round: i tuoi attacchi infliggono due punti di danno aggiuntivi al risultato finale. In compenso, la tua Difesa scende di due punti per tutta la durata. Non puoi spendere slot magici né lanciare incantesimi mentre sei in furia, a meno che una magia non indichi esplicitamente il contrario.',
    pro:'Danno aggiuntivo fisso garantito per tre round.',
    con:'Difesa ridotta di due punti. Nessuna magia per tre round. Non cumulabile con Adrenalina Pura nello stesso turno.'},

  {id:'contrattacco',     cat:'corpo',  stile:'universale',req:'armi_pesanti',
    nome:'Contrattacco',
    desc:'Non tutti i guerrieri aspettano il proprio turno in silenzio. Hai sviluppato un istinto raro: sentire il momento preciso in cui il nemico ha sbagliato l\'angolo di attacco e sfruttarlo prima ancora che lui se ne accorga. La guardia di un avversario impreciso diventa la tua apertura.',
    perk:'1x/combat: quando un nemico ti attacca in mischia e il suo tiro totale è inferiore alla tua Difesa, esegui immediatamente un attacco di risposta fuori dal tuo turno, con tutti i tuoi normali bonus. Non è possibile usare questa risposta contro attacchi a distanza o incantesimi.',
    pro:'Trasforma i mancati nemici in opportunità offensive. Più forte contro avversari aggressivi.',
    con:'Richiede che il nemico ti attacchi in mischia e manchi. Inutile contro combattenti a distanza.'},

  {id:'zufolo_bardico',   cat:'anima',  stile:'universale',req:null,
    nome:'Zufolo Bardico',
    desc:'Che sia una ballata improvvisata, un discorso fulmineo o un gesto nel momento giusto, sai toccare qualcosa di profondo in chi ti sta accanto. Il tuo talento non è distruttivo: è quella voce che fa sembrare possibile l\'impossibile anche a chi non ci crede.',
    perk:'1x/combat: designa un alleato entro dieci metri. Prima che effettui il suo prossimo tiro, aggiunge al risultato un bonus pari al tuo valore di ANIMA. Puoi dichiararlo dopo che il dado è stato tirato ma prima che l\'esito venga risolto.',
    pro:'Bonus scalabile con ANIMA. Applicabile ad attacchi fisici, magici, difese o prove.',
    con:'Richiede alleati in prossimità. Nessun effetto diretto su te stesso. Solo una volta per combattimento.'},

  {id:'marchio_cacciatore',cat:'mente', stile:'universale',req:null,
    nome:'Marchio del Cacciatore',
    desc:'Studiare un bersaglio prima di colpirlo non è codardìa: è professionalità. Hai imparato a osservare i dettagli che contano — la postura, le aperture nell\'equipaggiamento, il ritmo della respirazione. Una volta che hai il tuo bersaglio nel mirino, lo conosci meglio di quanto lui conosca se stesso.',
    perk:'All\'inizio del combattimento, o come azione intera, designa un bersaglio visibile come tua preda. Fino alla fine del combattimento ottieni più due ai tiri di attacco contro di lui e puoi sempre valutare visivamente il suo stato di salute — se ha ferite leggere, gravi o è in condizioni critiche. Il marchio cade alla morte del bersaglio.',
    pro:'Bonus fisso costante contro il bersaglio prioritario. Informazione tattica gratuita.',
    con:'Solo contro un bersaglio alla volta. Cambiarlo richiede un\'azione intera.'},

  {id:'recupero_arcano',  cat:'mente',  stile:'universale',req:'gate_mb',
    nome:'Recupero Arcano',
    desc:'La magia non proviene solo dai libri. Proviene dall\'esperienza, dalla resilienza, dalla capacità di trovare quiete nel caos. Sai meditare anche in condizioni difficili, recuperando le energie spirituali più velocemente degli altri.',
    perk:'1x/sessione: durante o subito dopo un Riposo Breve, recuperi slot magici aggiuntivi pari alla metà del tuo valore di MENTE, arrotondato per difetto (minimo uno).',
    pro:'Con MENTE alta recuperi slot significativi ogni sessione.',
    con:'Una sola volta per sessione, non per ogni Riposo Breve. Richiede Magia Base.'},

  {id:'limite_ultimo',    cat:'ibrido', stile:'universale',req:null,
    nome:'Limite Ultimo',
    desc:'C\'è un fuoco che brucia più forte quando si è sull\'orlo della sconfitta. Ogni ferita subita alimenta una riserva di potere disperato che, al momento giusto, si scatena in un\'esplosione di violenza pura. Non è tecnica: è sopravvivenza.',
    perk:'Guadagni una Carica Limite ogni volta che le tue ferite peggiorano di livello, fino a un massimo di tre cariche. Le cariche si conservano tra un combattimento e l\'altro. Quando hai almeno due cariche, puoi spenderle tutte come azione: il tuo prossimo attacco ottiene un bonus aggiuntivo pari al numero di cariche moltiplicato per quattro. Le cariche si azzerano dopo l\'uso.',
    pro:'Con tre cariche il bonus aggiuntivo è dodici — devastante. Si attiva naturalmente subendo danni.',
    con:'Con tre cariche sei in Stato Critico: meno due a tutti i tiri di base. Richiede di essere feriti per attivarsi.'},

  {id:'patto_abisso',     cat:'mente',  stile:'horror',    req:null,
    nome:'Patto dell\'Abisso',
    desc:'Hai consegnato qualcosa di irrecuperabile in cambio di potere. Forse un momento di disperazione. Forse una scelta ponderata. L\'entità con cui hai stretto questo accordo è reale, presente, e ha un interesse nel tenerti in vita — almeno per ora. I tre Punti Vita che mancano non torneranno mai.',
    pro:'Più uno permanente a tutte le magie. Un slot magico recuperato automaticamente dopo ogni Riposo Breve.',
    con:'Meno tre Punti Vita massimi permanenti — le soglie di ferita cambiano di conseguenza. L\'entità è un antagonista narrativo che il Master utilizza.'},

  {id:'adrenalina_pura',  cat:'corpo',  stile:'universale',req:null,
    nome:'Adrenalina Pura',
    desc:'Ci sono persone che in situazioni normali sono già letali. E poi ci sono quelle che, quando la tensione raggiunge il culmine, trovano una marcia in più che non dovrebbero avere. Non è magia. Non è allenamento. È il corpo che si rifiuta di perdere.',
    perk:'1x/combat: nel tuo turno, dopo aver già effettuato un attacco, esegui immediatamente un secondo attacco con gli stessi bonus. Non è utilizzabile quando sei in Stato Critico.',
    pro:'Doppio attacco in un singolo turno. Con armi di categoria alta il danno potenziale è enorme.',
    con:'Una volta per combattimento. Impossibile in Stato Critico. Non cumulabile con Furia nello stesso turno.'},

  // ─ CYBERPUNK ─
  {id:'interfaccia_neurale',cat:'mente',stile:'cyberpunk',req:null,
    nome:'Interfaccia Neurale',
    desc:'Il tuo sistema nervoso è stato modificato per comunicare direttamente con le reti digitali. Non hai bisogno di terminali o interfacce fisiche. In un mondo dove la tecnologia ha colonizzato ogni superficie, questo ti rende qualcosa di pericolosamente versatile.',
    perk:'1x/combat: hackera un dispositivo tecnologico o un nemico con ciberware entro dieci metri. Effettua un tiro di MENTE contro la sua MENTE. In caso di successo scegli uno: il dispositivo si disattiva per un round, il nemico perde due punti di Difesa per due round, oppure ottieni accesso a informazioni riservate che il bersaglio voleva tenere segrete.',
    pro:'Versatile contro nemici cibernetici. Può fornire informazioni tattiche o vantaggio meccanico.',
    con:'Inutile contro bersagli puramente biologici o magici. La complessità del sistema è decisa dal Master.'},

  {id:'protocollo_emergenza',cat:'corpo',stile:'cyberpunk',req:null,
    nome:'Protocollo di Emergenza',
    desc:'Il tuo corpo incorpora sistemi di stabilizzazione automatica progettati per situazioni estreme. Non è magia: è ingegneria. Quando la situazione diventa critica, entrano in azione senza che tu debba fare nulla.',
    perk:'Passivo: quando entri in Stato Critico per la prima volta in un combattimento, recuperi immediatamente Punti Vita pari a CORPO diviso due, arrotondato per eccesso, e la condizione Rallentato scompare se era attiva. Funziona una sola volta per Riposo Lungo.',
    pro:'Buffer automatico nel momento più pericoloso. Zero costo di azione, si attiva da solo.',
    con:'Solo in Stato Critico. Una volta per Riposo Lungo. Non evita l\'Incapacitazione se il danno è sufficiente in un singolo colpo.'},

  // ─ HORROR ─
  {id:'conoscenza_proibita',cat:'mente',stile:'horror',   req:null,
    nome:'Conoscenza Proibita',
    desc:'Hai letto ciò che non andava letto. Ora certe cose ti sono chiare in modo terrificante: i pattern nascosti nel caos, le connessioni che nessuno vuole vedere, la struttura fredda di ciò che sta dietro la realtà. Ti ha cambiato in qualcosa che il mondo non era pronto ad avere.',
    perk:'Un numero di volte per Riposo Lungo pari al tuo valore di ANIMA: quando fallisci un tiro di magia o di MENTE, puoi trasformarlo in successo. Se lo fai, subisci due punti di danno psichico — perdi due Punti Vita massimi fino al prossimo Riposo Lungo.',
    pro:'Garantisce successi nei momenti decisivi. La frequenza di utilizzo scala con ANIMA.',
    con:'Ogni uso riduce i Punti Vita massimi di due fino al riposo. Abusato, porta rapidamente alla soglia critica.'},

  // ─ NOIR ─
  {id:'istinto_sopravvivenza',cat:'mente',stile:'noir',   req:null,
    nome:'Istinto di Sopravvivenza',
    desc:'La città insegna cose che i libri non possono insegnare. Dopo abbastanza anni a guardarti le spalle, certe cose le senti prima di vederle. L\'ombra che si muove in modo sbagliato. Il silenzio che precede l\'agguato. Quella sensazione allo stomaco che precede sempre il momento in cui tutto va storto.',
    perk:'Passivo: non puoi essere colto di sorpresa — sei sempre presente nell\'iniziativa. 1x/sessione, puoi dichiarare di notare qualcosa che normalmente richiederebbe un tiro di MENTE: il Master decide cosa e quanto dettaglio.',
    pro:'Immunità agli agguati. Percezione gratuita una volta per sessione.',
    con:'Puramente difensivo e informativo. Nessun effetto diretto offensivo.'},

  {id:'parole_piombo',    cat:'anima',  stile:'noir',     req:null,
    nome:'Parole di Piombo',
    desc:'Alcune persone non hanno bisogno di estrarre un\'arma per essere pericolose. Il modo in cui guardano qualcuno è sufficiente. La voce che non si alza mai, le parole scelte con chirurgica precisione, il silenzio nel posto giusto: tutto comunica una cosa sola, con assoluta chiarezza.',
    perk:'Puoi usare ANIMA al posto di CORPO per i tiri di intimidazione e per imporre condizioni psicologiche a bersagli intelligenti. 1x/combat: come azione, effettua un tiro di ANIMA contro la MENTE del bersaglio. In caso di successo, il bersaglio non ti attacca nel round corrente — anche se è già in posizione di farlo.',
    pro:'Trasforma ANIMA in una risorsa offensiva. Ferma attacchi senza usare slot magici.',
    con:'Solo contro bersagli intelligenti capaci di comprendere una minaccia sociale. Inutile contro bestie o automi.'},

];

// ═══ AUGMENTS / MIGLIORAMENTI FISICI (max 2) ═══
var AUGMENTS = [
  // CYBERPUNK
  {id:'aug_oc',stile:'cyberpunk',tipo:'Cyberware',nome:'Occhi Cybertici',desc:'HUD integrato, zoom 10x, visione notturna.',pro:'+2 tiri MENTE visivi. Visione notturna.',con:'Visibili (LED). -1 ANIMA in contesti conservatori.',manutenzione:'Calibrazione mensile.',perk:'Scansione Tattica: 1x/combat, MENTE vs ANIMA per rivelare 1 stat nascosta del bersaglio.'},
  {id:'aug_bm',stile:'cyberpunk',tipo:'Cyberware',nome:'Braccio Meccanico',desc:'Esoscheletro. Forza idraulica.',pro:'+2 CORPO attacchi fisici. Solleva il doppio.',con:'-1 ANIMA formale. -1 CORPO stealth.',manutenzione:'Calibrazione settimanale.',perk:'Presa Idraulica: 1x/combat, se colpisci in mischia il bersaglio è Rallentato 1 round.'},
  {id:'aug_rn',stile:'cyberpunk',tipo:'Cyberware',nome:'Riflessi Neurali',desc:'Cablaggio sinaptico accelerato.',pro:'+3 iniziativa. +1 difesa CORPO.',con:'Stress: CORPO vs 7 o Indebolito (MENTE). Incomp. Limitatore Rimosso.',manutenzione:'Soppressori mensili.',perk:'Schivata Reattiva: 1x/combat, nega un attacco che ti avrebbe colpito con margine <= 2.'},
  {id:'aug_ds',stile:'cyberpunk',tipo:'Cyberware',nome:'Dermascheletro',desc:'Piastre subderminiche.',pro:'Riduce 2 danni fisici (min 0).',con:'-1 CORPO atletismo.',manutenzione:null,perk:'Impatto Assorbito: la prima volta che subisci 3+ danni in un combat, il prossimo attacco ha +2.'},
  {id:'aug_in',stile:'cyberpunk',tipo:'Cyberware',nome:'Interfaccia Neurale',desc:'Jack cranico per connessione digitale.',pro:'+3 MENTE vs sistemi digitali.',con:'Vulnerabile ad hacking (MENTE vs MENTE).',manutenzione:'Firmware mensile.',perk:'Download Rapido: 1x/sessione, scarica info da sistema digitale come azione gratuita.'},
  {id:'aug_gp',stile:'cyberpunk',tipo:'Cyberware',nome:'Gambe Potenziate',desc:'Servoassistite. Salti 3m, velocità doppia.',pro:'Movimento doppio. +3 CORPO salto.',con:'-2 CORPO stealth in corsa.',manutenzione:'Ammortizzatori settimanali.',perk:'Carica Devastante: se ti muovi di almeno 6m prima di attaccare, +2 al tiro.'},
  {id:'aug_ca',stile:'cyberpunk',tipo:'Cyberware',nome:'Cuore Artificiale',desc:'Pompa meccatronica.',pro:'HP max +4. Immune veleni cardiovascolari.',con:'-1 ANIMA permanente.',manutenzione:'Batteria trimestrale.',perk:'Secondo Battito: 1x/sessione, quando arrivi a 0 HP, torni a 3 HP.'},
  {id:'aug_np',stile:'cyberpunk',tipo:'Nanotech',nome:'Nanite Protettive',desc:'Microrobot riparatori.',pro:'+1 HP/round riposo breve. Veleni -1 round.',con:'In EMP: -3 tiri per 2 round.',manutenzione:null,perk:'Riparazione d\'Emergenza: 1x/combat, cura 2 HP come azione gratuita.'},
  // FANTASY
  {id:'aug_sd',stile:'fantasy',tipo:'Alchemico',nome:'Sangue del Drago',desc:'Metabolismo modificato.',pro:'Ignora 3 danni fuoco. +1 CORPO.',con:'-1 tiri in climi caldi.',manutenzione:null,perk:'Soffio Minore: 1x/combat, 1d12+CORPO vs CORPO, danno fuoco a un bersaglio entro 3m.'},
  {id:'aug_lp',stile:'fantasy',tipo:'Bioware',nome:'Tessuto Licantropo',desc:'Rigenerazione licantropa.',pro:'Rigenera 1 HP/round fuori combat. Artigli Cat A.',con:'-1 MENTE in luna piena. ANIMA vs 8 o perdi controllo.',manutenzione:null,perk:'Frenesia Lunare: sotto metà HP, +1 attacchi fisici (cumulabile con Furia).'},
  {id:'aug_ov',stile:'fantasy',tipo:'Magico',nome:'Occhio del Veggente',desc:'Terzo occhio magico.',pro:'+2 MENTE tiri magici. Rilevi aure 10m.',con:'-1 ANIMA social. Visioni involontarie.',manutenzione:null,perk:'Preveggenza: 1x/combat, dichiara prima del tiro del nemico: il suo prossimo tiro ha -2.'},
  {id:'aug_rc',stile:'fantasy',tipo:'Runa',nome:'Rune Corporee',desc:'Rune incise nella carne.',pro:'+2 difesa CORPO. Immune prima maledizione/sessione.',con:'Dispelling: -1 difesa/round. Visibili.',manutenzione:null,perk:'Runa Esplosiva: 1x/combat, reazione: chi ti colpisce in mischia subisce 3 danni.'},
  {id:'aug_ga',stile:'fantasy',tipo:'Bioware',nome:'Ghiandole Alchemiche',desc:'Organi sintetici.',pro:'1x/riposo: sostanza (veleno/acido/adrenalina/siero).',con:'Dieta specifica. Senza: -1 CORPO 1 ora.',manutenzione:'Dieta mensile.',perk:'Veleno Rapido: 1x/combat, il tuo prossimo attacco fisico infligge Avvelenato 2 round.'},
  // HORROR
  {id:'aug_pm',stile:'horror',tipo:'Patto',nome:'Patto col Morto',desc:'Accordo con entità.',pro:'1x/sessione: info unica. +1 difesa ANIMA.',con:'Entità può interferire.',manutenzione:'Rispetta patti o -2 tiri.',perk:'Sussurro del Morto: 1x/combat, ANIMA vs ANIMA di un nemico, vinci: conosci la sua prossima azione.'},
  {id:'aug_cm',stile:'horror',tipo:'Biomod',nome:'Carne Modulata',desc:'Corpo rimodellabile.',pro:'Rimodella arto (Cat A, strumento, superficie).',con:'-1 ANIMA permanente. Temperature estreme: -2 tiri.',manutenzione:null,perk:'Adattamento: 1x/sessione, rimodella un arto per ottenere +3 a un tipo di tiro CORPO per 1 scena.'},
  {id:'aug_nm',stile:'horror',tipo:'Neurologia',nome:'Nervo Morto',desc:'Anestetizzazione dolore.',pro:'Immune penalità Ferito. +1 CORPO resistenza.',con:'Non senti danni minori. Ferite nascoste (GM).',manutenzione:null,perk:'Resistenza al Dolore: 1x/combat, ignora una condizione per 1 round.'},
  {id:'aug_sc',stile:'horror',tipo:'Patto',nome:'Sigillo Corrotto',desc:'Sigillo magico oscuro.',pro:'+2 a tipo tiro scelto. Sempre attivo.',con:'Ad ogni uso: d6, su 1 entità guarda attraverso te.',manutenzione:null,perk:'Marchio Ardente: 1x/combat, il bersaglio che colpisci subisce -1 a tutti i tiri per 2 round.'},
  {id:'aug_mk',stile:'horror',tipo:'Patto Cosmico',nome:"Marchio dell'Antico",desc:'Simbolo entità cosmica.',pro:'+2 ANIMA vs entità cosmiche. Percepisci elder god 500m.',con:'-1 MENTE per sessione. Sogni cosmici.',manutenzione:'Rituali mensili.',perk:'Terrore Cosmico: 1x/sessione, ANIMA vs ANIMA di tutti entro 5m, chi perde è Spaventato 1 round.'},
  {id:'aug_oc2',stile:'horror',tipo:'Biomod Cosmico',nome:'Occhio del Caos',desc:'Occhio alieno.',pro:'+3 percezione soprannaturale. 50% futuro 1x/combat.',con:'-1 ANIMA permanente. Visioni non controllabili.',manutenzione:null,perk:'Visione del Caos: 1x/combat, 50% (d6 >= 4) di prevedere il prossimo tiro nemico e annullarlo.'},
  {id:'aug_sang',stile:'horror',tipo:'Rituale di Setta',nome:'Legame di Sangue',desc:'Rete psichica di setta.',pro:'Senti membri 1 km. +2 ANIMA rituali collettivi.',con:'Setta ti localizza sempre. GM ha accesso pensieri.',manutenzione:'Rito mensile.',perk:'Rete Psichica: 1x/combat, un membro della setta entro 1km ti dà +2 al prossimo tiro.'},
  {id:'aug_corp',stile:'horror',tipo:'Corruzione',nome:'Corruzione Benedetta',desc:'Corpo parzialmente corrotto.',pro:'+1 CORPO, +1 ANIMA. Rigenera 1 HP/round sotto metà HP.',con:'Rigenerazione: d6, su 1 tratto orrorifico. Non-umano.',manutenzione:null,perk:'Rigetto Violento: quando rigeneri HP, 1x/combat il nemico più vicino subisce 2 danni.'},
  {id:'aug_voc',stile:'horror',tipo:'Rituale di Setta',nome:"Voce dell'Abisso",desc:'Voce modificata da rituale.',pro:'+3 ANIMA intimidazione. Vero Nome: entità non attacca 1 round.',con:'-2 ANIMA social normali. Attira attenzione entità.',manutenzione:null,perk:'Comando Abissale: 1x/sessione, pronuncia un ordine: ANIMA vs ANIMA, il bersaglio esegue 1 azione semplice.'},
  // ANIME
  {id:'aug_lr',stile:'anime',tipo:'Neurologia',nome:'Limitatore Rimosso',desc:'Blocco mentale rimosso.',pro:'1x/combat: stat bonus x1.5 per 1 round.',con:'-5 HP dopo. Incomp. Riflessi Neurali / Gate dell\'Anima.',manutenzione:null,perk:'Sovraccarico: quando usi il Limitatore, il primo attacco del round extra ha +3.'},
  {id:'aug_fd',stile:'anime',tipo:'Biomod',nome:'Forma Duale',desc:'Trasformazione controllata.',pro:'1x/combat: +2 tiri, +2 HP temp per 3 round.',con:'Dopo: Indebolito (CORPO) 2 round. Aspetto cambia.',manutenzione:null,perk:'Metamorfosi Offensiva: nella Forma Duale, i tuoi attacchi fisici infliggono +2 danni.'},
  {id:'aug_ck',stile:'anime',tipo:'Spirituale',nome:'Core di Ki',desc:'Riserva energia spirituale.',pro:'+2 attacchi magici. Usa stat più alta per magie.',con:'2 magie consecutive: -2 HP. Ki visibile.',manutenzione:null,perk:'Esplosione di Ki: 1x/combat, il tuo prossimo attacco magico colpisce anche 1 bersaglio adiacente.'},
  {id:'aug_asc',stile:'anime',tipo:'Ascensione',nome:'Forma Ascesa',desc:'Vera forma di potere.',pro:'1x/sessione: +4 tiri, +5 HP temp per 4 round. Attacchi magici.',con:'Dopo: Stordito 1 round, poi -3 tiri 2 round. No con Forma Duale.',manutenzione:null,perk:'Aura Divina: nella Forma Ascesa, alleati entro 5m hanno +1 a tutti i tiri.'},
  {id:'aug_spirit',stile:'anime',tipo:'Spirituale',nome:"Spirito dell'Arma",desc:'Arma con coscienza.',pro:'+2 attacchi fisici. +1 iniziativa. 1x/sessione nega critico.',con:'Spirito ha volontà propria (GM). Se distrutta: -bonus 1 sessione.',manutenzione:'Cura narrativa.',perk:'Risonanza: 1x/combat, l\'arma agisce da sola come azione bonus (Cat A, +2 attacco).'},
  {id:'aug_gate',stile:'anime',tipo:'Energia Interiore',nome:"Gate dell'Anima",desc:'Canali energetici potenziati.',pro:'+1 tutti tiri. Azione: apri gate +4 attacco 1 round.',con:'Gate: -3 HP. 3+ aperture/sessione: -1 CORPO. Incomp. Limitatore Rimosso.',manutenzione:'Meditazione. Senza: -5 HP.',perk:'Canale Aperto: quando apri il Gate, il prossimo alleato che attacca il tuo bersaglio ha +2.'},
  {id:'aug_manif',stile:'anime',tipo:'Manifestazione',nome:"Eco dell'Anima",desc:'Manifestazione psichica.',pro:'Azione bonus Cat A a 5m. +2 ANIMA social. 1x/sessione intercetta.',con:'Danno all\'eco = danno a te. Visibile.',manutenzione:null,perk:'Eco Protettivo: 1x/combat, l\'eco intercetta un attacco a un alleato entro 5m.'},
  // UNIVERSALE / NOIR / POST-AP
  {id:'aug_ws',stile:'universale',tipo:'Biologico',nome:'Cicatrice della Guerra',desc:'Segni permanenti.',pro:'+1 CORPO. Immune Ferito in primo combat/sessione.',con:'-1 ANIMA vs non-combattenti. Trigger: -1 MENTE 1 round.',manutenzione:null,perk:'Veterano: 1x/combat, +2 al prossimo tiro contro un nemico che ti ha già colpito.'},
  {id:'aug_ps',stile:'universale',tipo:'Protesi',nome:'Protesi Specializzata',desc:'Protesi per scopo preciso.',pro:'+3 a tipo specifico tiro CORPO.',con:'-1 altri tiri CORPO.',manutenzione:'Manutenzione mensile.',perk:'Specializzazione Estrema: per il tipo scelto, 1x/combat il tiro ha minimo 6 sul d12.'},
  {id:'aug_mi',stile:'noir',tipo:'Neurologia',nome:'Mente da Investigatore',desc:'Condizionamento cognitivo.',pro:'GM dice se hai perso qualcosa. +2 MENTE vs illusioni.',con:'-1 ANIMA in situazioni emotive.',manutenzione:null,perk:'Deduzione Lampo: 1x/sessione, il GM rivela 1 indizio critico sulla scena.'},
  {id:'aug_it',stile:'post-ap',tipo:'Biologico',nome:'Immunizzazione Tossica',desc:'Corpo adattato a tossine.',pro:'Immune ambienti tossici. +3 vs veleni.',con:'-1 cure magiche/alchemiche.',manutenzione:null,perk:'Metabolismo Adattivo: 1x/sessione, ignora 1 effetto ambientale per 1 ora.'},
  // ═══════════════════════════════════════════════════
  // OGGETTI MAGICI, ARTEFATTI & DISPOSITIVI
  // tipo: specifica la natura dell'oggetto
  // max 2 tra modifiche corporee E oggetti (cap condiviso)
  // ═══════════════════════════════════════════════════

  // ─── FANTASY — Oggetti Magici ───

  {id:'aug_om01',stile:'fantasy',tipo:'Anello Magico',
    nome:'Anello della Rapidità',
    desc:'Fascia d\'oro con un rubino che pulsa al ritmo del cuore. Chi lo indossa pensa e reagisce più velocemente.',
    pro:'+1 a tutti i tiri di iniziativa e +1 MENTE permanente finché indossato.',
    con:'Se rimosso, il vantaggio cessa immediatamente. Non cumulabile con altri anelli.',
    manutenzione:null,
    perk:'Scatto: 1x/sessione, puoi agire prima di chiunque altro nel round corrente, indipendentemente dall\'iniziativa.'},

  {id:'aug_om02',stile:'fantasy',tipo:'Collana Magica',
    nome:'Collana del Guardiano',
    desc:'Pendente di cristallo contenente un minuscolo scudo di energia solidificata. Si frantuma assorbendo un colpo, poi si ricostituisce lentamente.',
    pro:'Una volta per sessione, nega automaticamente un colpo critico (il danno viene ridotto a zero).',
    con:'Dopo l\'uso, perde potere fino al Riposo Lungo.',
    manutenzione:null,
    perk:'Scudo Cristallino: 1x/sessione, nega un colpo critico subito.'},

  {id:'aug_om03',stile:'fantasy',tipo:'Pergamena',
    nome:'Pergamena di Individuazione',
    desc:'Papiro antico ricoperto di simboli che reagiscono alla presenza di entità nascoste. Si consuma a ogni uso ma un esperto può riscriverla.',
    pro:'1x/sessione, rivela tutte le creature invisibili, celate o travestite entro venti metri per un round.',
    con:'La pergamena si consuma dopo il terzo utilizzo e deve essere riscritta da un mago.',
    manutenzione:'Rinnovare ogni tre usi tramite un mago o un alchimista.',
    perk:'Occhio Veggente: 1x/sessione, rivela invisibili e nascosti entro 20m per un round.'},

  {id:'aug_om04',stile:'fantasy',tipo:'Amuleto Magico',
    nome:'Amuleto di Protezione',
    desc:'Talismano di ossidiana con sigilli protettivi incisi. Assorbe parte dell\'impatto di ogni colpo, come un\'armatura invisibile.',
    pro:'+1 alla Difesa permanente finché indossato. Non sostituisce armatura fisica.',
    con:'Richiede essere indossato visibilmente — chi lo vede sa che sei protetto.',
    manutenzione:null,perk:null},

  {id:'aug_om05',stile:'fantasy',tipo:'Anello Magico',
    nome:'Anello della Vista Oscura',
    desc:'Pietra nera incastonata in argento. Indossandolo gli occhi assumono una lieve luminescenza. Il buio cessa di essere un ostacolo.',
    pro:'Visione nel buio perfetta fino a venti metri. Nessuna penalità per oscurità totale.',
    con:'In piena luce intensa, -1 ai tiri di percezione visiva per abbagliamento.',
    manutenzione:null,perk:null},

  // ─── CYBERPUNK — Dispositivi Tecnologici ───

  {id:'aug_dt01',stile:'cyberpunk',tipo:'Dispositivo Tecnologico',
    nome:'Micro-Telecamera a Fibra',
    desc:'Telecamera grande quanto un bottone, trasmette in tempo reale a qualsiasi dispositivo entro due chilometri. Audio e video in HD.',
    pro:'Sorveglianza e raccolta prove da remoto. Rilevabile solo con scanner avanzati.',
    con:'Batteria di quattro ore. Rilevabile se il segnale viene intercettato.',
    manutenzione:'Ricarica ogni quattro ore d\'uso.',
    perk:'Sorveglianza: il personaggio può lasciare la telecamera attiva e monitorarla da remoto tramite qualsiasi schermo.'},

  {id:'aug_dt02',stile:'cyberpunk',tipo:'Dispositivo Tecnologico',
    nome:'Jammer EMP Tascabile',
    desc:'Piccolo dispositivo che emette un impulso elettromagnetico localizzato. Disabilita qualsiasi elettronica non schermata nel raggio d\'azione.',
    pro:'1x/sessione, disabilita tutti i dispositivi elettronici entro cinque metri per un round.',
    con:'Disabilita anche i propri dispositivi. Gli impianti ciberware del portatore vengono temporaneamente offline.',
    manutenzione:'Si ricarica automaticamente in otto ore.',
    perk:'Impulso EMP: 1x/sessione, disabilita tutta l\'elettronica entro 5m per un round (inclusa la propria).'},

  {id:'aug_dt03',stile:'cyberpunk',tipo:'Dispositivo Tecnologico',
    nome:'Scanner Medico Portatile',
    desc:'Apparecchio diagnostico medico-militare. Scansiona il corpo di un paziente in trenta secondi e fornisce una diagnosi completa inclusa toxicologia.',
    pro:'+3 a tutti i tiri di medicina e diagnosi. Identifica veleni e agenti biologici.',
    con:'Il risultato richiede interpretazione — chi non ha competenze mediche può fraintendere i dati.',
    manutenzione:null,perk:null},

  {id:'aug_dt04',stile:'cyberpunk',tipo:'Dispositivo Tecnologico',
    nome:'Telefono Criptato Militare',
    desc:'Comunicazioni a prova di intercettazione con crittografia quantistica. Non tracciabile con mezzi convenzionali.',
    pro:'Comunicazioni sicure e non tracciabili. Include GPS oscurato e sistema di messaggi autodistruttivi.',
    con:'Se sequestrato, l\'unità si distrugge automaticamente — perdendo anche i dati memorizzati.',
    manutenzione:null,perk:null},

  {id:'aug_dt05',stile:'cyberpunk',tipo:'Dispositivo Tecnologico',
    nome:'Microfono Direzionale da Lunga Gittata',
    desc:'Capta e amplifica conversazioni fino a cento metri di distanza filtrando il rumore ambientale. Standard delle agenzie di intelligence.',
    pro:'Ascoltare conversazioni private fino a 100m. Registrazione integrata.',
    con:'Richiede line-of-sight verso il bersaglio. Inutile attraverso muri spessi.',
    manutenzione:null,perk:null},

  // ─── NOIR — Strumenti da Investigatore ───

  {id:'aug_ni01',stile:'noir',tipo:'Strumento Investigativo',
    nome:'Lente di Ingrandimento da Detective',
    desc:'Lente professionale di cristallo ottico con graduazioni. Vecchio strumento, arte antica. Nelle mani giuste, niente sfugge.',
    pro:'1x/sessione, individua automaticamente un dettaglio nascosto o una prova che altrimenti richiederebbe un tiro difficile.',
    con:'Richiede almeno un minuto di esame — inutile in combattimento o situazioni concitate.',
    manutenzione:null,
    perk:'Occhio da Detective: 1x/sessione, il GM rivela un indizio o dettaglio nascosto nella scena esaminata.'},

  {id:'aug_ni02',stile:'noir',tipo:'Strumento Investigativo',
    nome:'Kit da Scassinatore Professionale',
    desc:'Trousse di attrezzi di precisione per serrature meccaniche ed elettroniche. Ogni attrezzo è bilanciato e silenziato.',
    pro:'+3 a tutti i tiri per aprire serrature, cassaforti e sistemi di sicurezza meccanici.',
    con:'Non funziona su sistemi biometrici o a riconoscimento vocale senza accessori aggiuntivi.',
    manutenzione:null,perk:null},

  {id:'aug_ni03',stile:'noir',tipo:'Strumento Investigativo',
    nome:'Registratore a Filo',
    desc:'Piccolo apparecchio nascondibile nell\'interno della giacca. Dodici ore di autonomia. Prove ammissibili in molte giurisdizioni.',
    pro:'Registra ogni conversazione entro tre metri senza possibilità di negazione plausibile. Prova inconfutabile.',
    con:'Se trovato durante una perquisizione, può compromettere tutto il lavoro investigativo.',
    manutenzione:'Cambio filo ogni dodici ore di registrazione.',perk:null},

  {id:'aug_ni04',stile:'noir',tipo:'Strumento Investigativo',
    nome:'Macchina Fotografica Discreta',
    desc:'Fotocamera di piccolo formato con obiettivo lungo. Scatta in silenzio, sviluppo in camera oscura portatile inclusa.',
    pro:'Prove fotografiche di qualità. +2 ai tiri di persuasione quando si presentano prove visive.',
    con:'Pellicola limitata — massimo ventiquattro scatti per rullino. Sviluppo richiede attrezzatura.',
    manutenzione:'Rullino da cambiare ogni 24 scatti.',perk:null},

  // ─── HORROR — Oggetti Maledetti & Reliquie ───

  {id:'aug_hc01',stile:'horror',tipo:'Oggetto Maledetto',
    nome:'Specchio Nero',
    desc:'Lastra di ossidiana levigata che non riflette il presente ma mostra frammenti del passato recente del luogo. I volti nell\'immagine sembrano consapevoli di chi guarda.',
    pro:'1x/sessione, il GM mostra cosa è accaduto in questo luogo nelle ultime ventiquattro ore.',
    con:'Chi guarda troppo a lungo — più di un minuto — acquisisce la condizione Spaventato senza possibilità di tiro.',
    manutenzione:null,
    perk:'Visione del Passato: 1x/sessione, il GM rivela un evento recente accaduto nel luogo corrente.'},

  {id:'aug_hc02',stile:'horror',tipo:'Oggetto Maledetto',
    nome:'Bambola Voodoo Legata',
    desc:'Bambolina di paglia e cera nera contenente un capello o unghia del bersaglio. La connessione è reale e bidirezionale.',
    pro:'1x/sessione, infliggi due punti di danno a distanza illimitata a un bersaglio a cui appartiene il materiale biologico contenuto.',
    con:'Se la bambola viene distrutta mentre è in uso, il portatore subisce lo stesso danno.',
    manutenzione:'Richiede materiale biologico fresco del bersaglio per essere usata.',
    perk:'Maledizione a Distanza: 1x/sessione, infliggi 2 danni a qualsiasi distanza al bersaglio legato.'},

  {id:'aug_hc03',stile:'horror',tipo:'Libro Maledetto',
    nome:'Libro delle Ombre',
    desc:'Raccolta di conoscenze proibite rilegata in pelle di origine sconosciuta. Ogni pagina rivela un segreto che non si sarebbe dovuto sapere. Non è sicuro tenerlo.',
    pro:'+2 a tutti i tiri di magie oscure e necromantiche. Sblocca accesso narrativo a rituali rari.',
    con:'-1 ANIMA permanente finché si possiede il libro. L\'ANIMA torna al valore normale se ci si libera di esso.',
    manutenzione:null,
    perk:'Conoscenza Proibita: +2 a tutte le magie oscure. Il portatore conosce automaticamente rituali che normalmente richiederebbero ricerca.'},

  {id:'aug_hc04',stile:'horror',tipo:'Reliquia Maledetta',
    nome:"Occhio di Vetro del Profeta",
    desc:'Occhio artificiale di vetro soffiato con una pupilla che si muove indipendentemente. Il proprietario originale era cieco ma vedeva cose che i vedenti non possono vedere.',
    pro:'1x/sessione, hai una visione profetica confusa su un evento imminente — il GM fornisce un\'immagine criptica del futuro prossimo.',
    con:"Le visioni non si possono controllare — arrivano anche di notte, interrompendo il sonno. Un Riposo Lungo non è garantito.",
    manutenzione:null,
    perk:"Profezia Confusa: 1x/sessione, il GM fornisce un'immagine simbolica di qualcosa che accadrà entro la sessione corrente."},

  // ─── LOVECRAFTIANO — Artefatti Cosmici ───

  {id:'aug_lv01',stile:'horror',tipo:'Artefatto Cosmico',
    nome:'Frammento di R\'lyeh',
    desc:'Pietra non-euclidea di colore impossibile da descrivere. Gli angoli non tornano. Tenerla troppo a lungo porta a pensieri di apertura, vastità e fame.',
    pro:'+2 a tutte le magie. Il portatore percepisce la presenza di entità soprannaturali entro cento metri.',
    con:'-2 ANIMA permanente finché si possiede il frammento. ANIMA torna al normale se ci se ne libera.',
    manutenzione:null,
    perk:"Risonanza Cosmica: il portatore sente la presenza di qualsiasi entità soprannaturale entro 100m anche senza tiro. Il GM lo avvisa."},

  {id:'aug_lv02',stile:'horror',tipo:'Artefatto Cosmico',
    nome:'Maschera di Nyarlathotep',
    desc:'Maschera rituale senza lineamenti fissi — la faccia cambia a seconda di chi la guarda. Indossarla permette di assumere l\'aspetto di chiunque si desideri. Il costo è una parte di sé.',
    pro:'1x/sessione, assumi perfettamente le sembianze di una persona che hai osservato per almeno un minuto. Voce e aspetto inclusi. Dura un\'ora.',
    con:'Ogni utilizzo richiede un tiro di ANIMA (difficoltà 8). In caso di fallimento perdi temporaneamente la certezza della propria identità — il GM gestisce le conseguenze narrative.',
    manutenzione:null,
    perk:"Volto del Messaggero: 1x/sessione, assumi le sembianze di chiunque tu abbia osservato di persona. Tiro ANIMA≥8 o conseguenze narrative."},

  {id:'aug_lv03',stile:'horror',tipo:'Testo Proibito',
    nome:'Necronomicon — Frammento Tradotto',
    desc:'Non il libro originale — nessuno l\'ha mai visto intero e restato sano di mente. Un frammento di traduzione, sufficiente per fare cose che non avrebbero dovuto essere possibili.',
    pro:'Sblocca accesso a magie di Livello 3 e 4 senza il talento Magia Avanzata. Solo per rituali — non in combattimento.',
    con:'-1 HP massimo permanente per ogni magia di livello 3-4 lanciata tramite il frammento. Non recuperabile.',
    manutenzione:'Ogni lettura prolungata richiede un tiro di MENTE (difficoltà 7) o si acquisisce una condizione narrativa.',
    perk:'Rituale Proibito: fuori combattimento, puoi lanciare magie L3-L4 senza Magia Avanzata. -1 HP max per lancio, permanente.'},

  // ─── VAMPIRICO ───

  {id:'aug_vp01',stile:'horror',tipo:'Reliquia Vampirica',
    nome:'Medaglione del Sangue Antico',
    desc:'Ciondolo di ematite riempito di sangue condensato di una stirpe vampirica estinta. Chi lo indossa acquisisce una minima connessione con quella fame.',
    pro:'Quando infliggi danno in mischia, recuperi un Punto Vita per ogni quattro punti di danno inflitti.',
    con:'In prossimità di sangue versato, un tiro di ANIMA (difficoltà 6) è necessario per non essere distratto.',
    manutenzione:null,
    perk:'Drenaggio: passivo — recuperi 1 HP ogni 4 punti di danno inflitto in mischia.'},

  {id:'aug_vp02',stile:'horror',tipo:'Reliquia Vampirica',
    nome:'Mantello della Notte Eterna',
    desc:'Tessuto nero come l\'assenza di luce. Nelle ore notturne assorbe l\'oscurità diventando parte di essa. Di giorno è solo un mantello molto elegante.',
    pro:'Di notte o in ambienti bui: invisibilità totale mentre sei immobile. -2 ai tiri di individuazione nemici anche in movimento.',
    con:'Di giorno o in ambienti illuminati: nessun beneficio. Il mantello emette un lieve odore metallico.',
    manutenzione:null,perk:null},

  {id:'aug_vp03',stile:'horror',tipo:'Reliquia Vampirica',
    nome:'Guanti di Sangue Ghiacciato',
    desc:'Guanti in pelle nera imbevuta di sangue vampirico cristallizzato. Il tocco è freddo come marmo. Intensificano le magie del sangue e della vita.',
    pro:'+2 a tutte le magie necromantiche e di drenaggio vitale. Furto Vitale recupera il doppio degli HP.',
    con:'Chi li indossa non sente il caldo corporeo altrui — piccole conseguenze sociali e sensoriali.',
    manutenzione:null,perk:null},

  // ─── ZOMBIE / POST-APOCALISSE ───

  {id:'aug_zm01',stile:'post-ap',tipo:'Composto Biologico',
    nome:'Siero T-Virus Indebolito',
    desc:'Versione diluita e stabilizzata del virus responsabile delle epidemie zombie. Invece di uccidere e trasformare, in piccole dosi potenzia il corpo temporaneamente.',
    pro:'1x/sessione: +3 CORPO e +5 HP temporanei per tre round. Dopo i tre round, -2 CORPO per un round.',
    con:'Ogni somministrazione richiede un tiro di CORPO (difficoltà 6) — in caso di fallimento, il personaggio entra in uno stato di furia incontrollata per un round (il GM gestisce le azioni).',
    manutenzione:'Una dose per sessione. Più dosi aumentano il rischio di mutazione permanente.',
    perk:'Surge Biologico: 1x/sessione, +3 CORPO e +5 HP temp per 3 round, poi -2 CORPO per 1 round. Tiro CORPO≥6 o furia.'},

  {id:'aug_zm02',stile:'post-ap',tipo:'Equipaggiamento Tattico',
    nome:'Maschera Anti-Infetto Militare',
    desc:'Respiratore a filtri multipli standard CDC-Tier3. Protegge da gas, veleni, spore, agenti biologici e airborne pathogeni. Usata dai team di contenimento.',
    pro:'Immunità a veleni inalatori, gas e malattie trasmesse per via aerea. +2 vs qualsiasi effetto chimico o biologico.',
    con:'Riduce la percezione auditiva (-1 ai tiri di ascolto). Visibilità laterale ridotta.',
    manutenzione:'Filtri da cambiare ogni otto ore di utilizzo continuativo.',perk:null},

  {id:'aug_zm03',stile:'post-ap',tipo:'Impianto Biologico',
    nome:'Organo di Riserva Sintetico',
    desc:'Organo secondario impiantato chirurgicamente che funge da backup. Se il cuore o il fegato cedono, l\'organo sintetico prende il controllo per qualche ora.',
    pro:'+4 HP massimi permanenti. Una volta per Riposo Lungo, quando scendi a zero HP, il sistema si attiva automaticamente e ti riporta a due HP invece di incapacitarti.',
    con:'L\'operazione richiede un chirurgo qualificato e lascia una cicatrice visibile.',
    manutenzione:'Controllo medico mensile consigliato. Se trascurato, il bonus HP scende a +2.',
    perk:'Sistema di Backup: 1x/Riposo Lungo, quando scendi a 0 HP ti stabilizzi automaticamente a 2 HP invece di incapacitarti.'},


];

// ═══ MOSTRI ESEMPIO ═══
// Talenti con ID corretti (armi_pesanti, armi_letali, gate_mb, gate_ma)
var MONSTERS = [
  // GREGARI (HP 4-8, 1 colpo)
  {id:'mon01',nome:'Goblin',tier:'gregario',corpo:3,mente:2,anima:1,hp:6,armaCat:'A',armaPerk:'a2',scudo:0,armatura:0,competenza:null,talenti:[],augmenti:[],magie:[],note:'Attacca in gruppo. Fugge se solo.'},
  {id:'mon02',nome:'Scheletro',tier:'gregario',corpo:3,mente:1,anima:1,hp:5,armaCat:'A',armaPerk:'a3',scudo:0,armatura:0,competenza:null,talenti:[],augmenti:[],magie:[],note:'Immune Spaventato. Vulnerabile a danni contundenti.'},
  {id:'mon03',nome:'Drone da Combattimento',tier:'gregario',corpo:2,mente:4,anima:0,hp:4,armaCat:'A',armaPerk:'a1',scudo:0,armatura:1,competenza:'mente',talenti:[],augmenti:[],magie:[],note:'A distanza. Esplode a 0 HP (2 danno a 3m).'},
  // NORMALI (HP 12-20, 2-3 round)
  {id:'mon04',nome:'Cavaliere Corrotto',tier:'normale',corpo:5,mente:3,anima:3,hp:16,armaCat:'B',armaPerk:'b2',scudo:1,armatura:2,competenza:'corpo',talenti:['t01'],augmenti:[],magie:[],note:'Pelle Dura riduce 1 danno. Scudo + armatura media.'},
  {id:'mon05',nome:'Cultista Maggiore',tier:'normale',corpo:3,mente:5,anima:4,hp:12,armaCat:'A',armaPerk:'a4',scudo:0,armatura:0,competenza:'mente',talenti:['gate_mb'],augmenti:[],magie:['m01','m07'],note:'Lancia Dardo Magico (+2) e Voce del Terrore (+2). 1 slot-punto per L1.'},
  {id:'mon06',nome:'Cyborg Mercenario',tier:'normale',corpo:5,mente:4,anima:2,hp:15,armaCat:'B',armaPerk:'b1',scudo:0,armatura:1,competenza:'corpo',talenti:[],augmenti:['aug_bm'],magie:[],note:'Braccio Meccanico: +2 CORPO attacchi.'},
  // ELITE (HP 25-40, 4-6 round)
  {id:'mon07',nome:'Drago Giovane',tier:'elite',corpo:8,mente:6,anima:4,hp:30,armaCat:'C',armaPerk:'c1',scudo:0,armatura:3,competenza:'corpo',talenti:['armi_pesanti','t01'],augmenti:['aug_sd'],magie:['m13'],note:'Soffio fuoco = Palla di Fuoco (+4). Pelle Dura + Armatura Pesante. Volo. Pool slot: max(6,4)-2=4pt.'},
  {id:'mon08',nome:"Assassino dell'Ombra",tier:'elite',corpo:6,mente:7,anima:5,hp:25,armaCat:'C',armaPerk:'c5',scudo:0,armatura:1,competenza:'mente',talenti:['armi_pesanti','gate_mb','t14'],augmenti:['aug_rn'],magie:['m14','m17'],note:'Invisibilità (+4) + Blocco Pensiero (+4). Riflessi Neurali. Pool slot: max(7,5)-2=5pt.'},
  // BOSS (HP 50-100, 6-10 round)
  {id:'mon09',nome:'Lich Antico',tier:'boss',corpo:4,mente:10,anima:8,hp:60,armaCat:'A',armaPerk:'a5',scudo:0,armatura:0,competenza:'mente',talenti:['gate_mb','gate_ma','t13','cap_12','t10'],augmenti:['aug_ov','aug_rc','aug_mk'],magie:['m25','m29','m35','m47'],note:'Magie L3-L4 (+6/+8). Pool slot: max(10,8)-2=8pt. Concentrazione doppia (t13). Resistenza Mentale. 3 augment (solo boss, sopra il limite normale).'},
  {id:'mon10',nome:'Shogun Demoniaco',tier:'boss',corpo:10,mente:6,anima:8,hp:80,armaCat:'D',armaPerk:'d3',scudo:0,armatura:3,competenza:'corpo',talenti:['armi_pesanti','armi_letali','t06','cap_12','t02'],augmenti:['aug_lr','aug_fd','aug_spirit'],magie:[],note:'Cat D +4. Furia + Limitatore Rimosso. Forma Duale. Spirito dell\'Arma. Puro combattente fisico. 3 augment (solo boss).'}
];

// ═══ WOUND TIERS ═══

/* ═══════════════════════════════════════════════════════════════════════
   WEAPONS — Arsenale Completo C.O.R.E.
   Campi: id, nome, nomeLore (solo leggendarie), cat (A/B/C/D),
          tipo, stile, danno, portata, peso, mani, rarita,
          req (opz.), elemento (opz.), desc, perkSpeciale (opz.)
   perkSpeciale = { nome, tipo, desc, malus? }
═══════════════════════════════════════════════════════════════════════ */
var WEAPONS = [

  // ════════════════════════════════
  //  CATEGORIA A  (+1) — Leggere
  // ════════════════════════════════

  // ─ FANTASY / D&D ─
  {id:'w_a01',nome:'Pugnale',         nomeLore:null,cat:'A',tipo:'Pugnale',   stile:'fantasy',
   danno:'Perforante',portata:'Mischia / 5m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Lama corta e affilata. Versatile, affidabile, silenziosa.',perkSpeciale:null},
  {id:'w_a02',nome:'Ascia Leggera',   nomeLore:null,cat:'A',tipo:'Ascia',     stile:'fantasy',
   danno:'Tagliente',portata:'Mischia / 5m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Testa affilata, bilanciata per il lancio.',perkSpeciale:null},
  {id:'w_a03',nome:'Martello Leggero',nomeLore:null,cat:'A',tipo:'Mazza',     stile:'fantasy',
   danno:'Contundente',portata:'Mischia / 5m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Testa metallica piccola, impugnatura corta.',perkSpeciale:null},
  {id:'w_a04',nome:'Falce Corta',     nomeLore:null,cat:'A',tipo:'Lama',      stile:'fantasy',
   danno:'Tagliente',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Lama incurvata, usata anche come attrezzo agricolo.',perkSpeciale:null},
  {id:'w_a05',nome:'Balestra a Mano', nomeLore:null,cat:'A',tipo:'Balestra',  stile:'fantasy',
   danno:'Perforante',portata:'20m',peso:'Leggero',mani:'1h',rarita:'Non comune',
   req:null,elemento:null,
   desc:'Compatta, silenziosa, facile da nascondere.',perkSpeciale:null},
  {id:'w_a06',nome:'Giavellotto',     nomeLore:null,cat:'A',tipo:'Asta',      stile:'fantasy',
   danno:'Perforante',portata:'Mischia / 10m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Lancia leggera da lancio, efficace a distanza ravvicinata.',perkSpeciale:null},

  // ─ CYBERPUNK RED ─
  {id:'w_a07',nome:'Micro-Pistola',   nomeLore:null,cat:'A',tipo:'Pistola',   stile:'cyberpunk',
   danno:'Perforante',portata:'10m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Piccola, silenziabile, facile da nascondere in un interno coscia.',perkSpeciale:null},
  {id:'w_a08',nome:'Taser',           nomeLore:null,cat:'A',tipo:'Energia',   stile:'cyberpunk',
   danno:'Elettrico',portata:'Mischia / 3m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:'Elettrico',
   desc:'Scarica a impulso che stordisce invece di uccidere.',perkSpeciale:null},
  {id:'w_a09',nome:'Lama Monofilo',   nomeLore:null,cat:'A',tipo:'Lama',      stile:'cyberpunk',
   danno:'Tagliente',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Non comune',
   req:null,elemento:null,
   desc:"Filo monomolecolare su impugnatura ceramica. Taglia quasi tutto.",perkSpeciale:null},
  {id:'w_a10',nome:'Spike Subderminico',nomeLore:null,cat:'A',tipo:'Corp. a Corp.',stile:'cyberpunk',
   danno:'Perforante',portata:'Mischia',peso:'—',mani:'1h',rarita:'Non comune',
   req:'Augment cibernetico',elemento:null,
   desc:'Lame retraibili impiantate nelle nocche o negli avambracci.',perkSpeciale:null},

  // ─ ANIME ─
  {id:'w_a11',nome:'Kunai',           nomeLore:null,cat:'A',tipo:'Pugnale da Lancio',stile:'anime',
   danno:'Perforante',portata:'Mischia / 8m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Lama da lancio a forma di anello. Icona del combattimento ninja.',perkSpeciale:null},
  {id:'w_a12',nome:'Shuriken (x5)',   nomeLore:null,cat:'A',tipo:'Lancio',    stile:'anime',
   danno:'Tagliente',portata:'10m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Stelle di metallo. Si lanciano con precisione fulminea, set di cinque.',perkSpeciale:null},
  {id:'w_a13',nome:'Tantō',           nomeLore:null,cat:'A',tipo:'Pugnale',   stile:'anime',
   danno:'Perforante',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Non comune',
   req:null,elemento:null,
   desc:'Pugnale tradizionale giapponese. Onore e funzione in ogni centimetro di lama.',perkSpeciale:null},

  // ─ HORROR / DEMONOLOGIA ─
  {id:'w_a14',nome:"Spina d'Osso",    nomeLore:null,cat:'A',tipo:'Pugnale',   stile:'horror',
   danno:'Necromantico',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Non comune',
   req:null,elemento:'Oscuro',
   desc:'Ricavata dalle ossa di qualcosa che non andava ucciso. Ancora calda al tatto.',perkSpeciale:null},
  {id:'w_a15',nome:'Ago Rituale',     nomeLore:null,cat:'A',tipo:'Pugnale',   stile:'horror',
   danno:'Perforante',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Non comune',
   req:null,elemento:null,
   desc:'Lungo e sottile, usato in cerimonie di cui è meglio ignorare i dettagli.',perkSpeciale:null},

  // ─ NOIR ─
  {id:'w_a16',nome:'Derringer',       nomeLore:null,cat:'A',tipo:'Pistola',   stile:'noir',
   danno:'Perforante',portata:'5m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Due colpi, nessuna scusa. Si nasconde in un portasigarette.',perkSpeciale:null},
  {id:'w_a17',nome:'Tirapugni Ottone',nomeLore:null,cat:'A',tipo:'Corp. a Corp.',stile:'noir',
   danno:'Contundente',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Il messaggio più diretto che esista. Economico e invariabilmente efficace.',perkSpeciale:null},
  {id:'w_a18',nome:'Stiletto da Gangster',nomeLore:null,cat:'A',tipo:'Pugnale',stile:'noir',
   danno:'Perforante',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Lama a scatto, molla silenziosa. Non sporchi le dita.',perkSpeciale:null},

  // ════════════════════════════════
  //  CATEGORIA B  (+2) — Standard
  // ════════════════════════════════

  // ─ FANTASY / D&D ─
  {id:'w_b01',nome:'Spada Lunga',     nomeLore:null,cat:'B',tipo:'Spada',     stile:'fantasy',
   danno:'Tagliente',portata:'Mischia',peso:'Medio',mani:'versatile',rarita:'Comune',
   req:null,elemento:null,
   desc:"L'arma dell'avventuriero. Bilanciata, affidabile, adatta a qualsiasi situazione.",perkSpeciale:null},
  {id:'w_b02',nome:'Fioretto',        nomeLore:null,cat:'B',tipo:'Spada',     stile:'fantasy',
   danno:'Perforante',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Velocità e precisione. Ogni affondo è un\'equazione, non una bravata.',perkSpeciale:null},
  {id:'w_b03',nome:'Ascia da Guerra', nomeLore:null,cat:'B',tipo:'Ascia',     stile:'fantasy',
   danno:'Tagliente',portata:'Mischia',peso:'Medio',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'La preferita di chi non ama le sottigliezze.',perkSpeciale:null},
  {id:'w_b04',nome:'Lancia',          nomeLore:null,cat:'B',tipo:'Asta',      stile:'fantasy',
   danno:'Perforante',portata:'Mischia (3m)',peso:'Medio',mani:'versatile',rarita:'Comune',
   req:null,elemento:null,
   desc:'Gittata superiore in mischia. Terrificante in formazione.',perkSpeciale:null},
  {id:'w_b05',nome:'Martello da Guerra',nomeLore:null,cat:'B',tipo:'Mazza',   stile:'fantasy',
   danno:'Contundente',portata:'Mischia',peso:'Medio',mani:'versatile',rarita:'Comune',
   req:null,elemento:null,
   desc:'Spacca armature. Non è il genere di arma che perdona.',perkSpeciale:null},
  {id:'w_b06',nome:'Arco Corto',      nomeLore:null,cat:'B',tipo:'Arco',      stile:'fantasy',
   danno:'Perforante',portata:'40m',peso:'Leggero',mani:'2h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Mobilità e cadenza di fuoco. Il prediletto dei ranger.',perkSpeciale:null},
  {id:'w_b07',nome:'Balestra',        nomeLore:null,cat:'B',tipo:'Balestra',  stile:'fantasy',
   danno:'Perforante',portata:'30m',peso:'Medio',mani:'2h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Nessun addestramento necessario. Punta e spara.',perkSpeciale:null},
  {id:'w_b08',nome:'Tridente',        nomeLore:null,cat:'B',tipo:'Asta',      stile:'fantasy',
   danno:'Perforante',portata:'Mischia (3m)',peso:'Medio',mani:'versatile',rarita:'Non comune',
   req:null,elemento:null,
   desc:'Tre punte, tre possibilità di perforare qualcosa di importante.',perkSpeciale:null},

  // ─ CYBERPUNK RED ─
  {id:'w_b09',nome:'Pistola Standard',nomeLore:null,cat:'B',tipo:'Pistola',   stile:'cyberpunk',
   danno:'Perforante',portata:'25m',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:"9mm semi-automatica. L'arma di servizio del ciberpunk che vuole sopravvivere.",perkSpeciale:null},
  {id:'w_b10',nome:'SMG Compatta',    nomeLore:null,cat:'B',tipo:'Mitra',     stile:'cyberpunk',
   danno:'Perforante',portata:'20m',peso:'Leggero',mani:'1h',rarita:'Non comune',
   req:null,elemento:null,
   desc:'Raffica corta, alto rateo. Si impugna con una mano, meglio con due.',perkSpeciale:null},
  {id:'w_b11',nome:'Katana Monofilamento',nomeLore:null,cat:'B',tipo:'Spada', stile:'cyberpunk',
   danno:'Tagliente',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Non comune',
   req:null,elemento:null,
   desc:'Ceramica rinforzata con filo monomolecolare sul bordo.',perkSpeciale:null},

  // ─ ANIME ─
  {id:'w_b12',nome:'Katana',          nomeLore:null,cat:'B',tipo:'Spada',     stile:'anime',
   danno:'Tagliente',portata:'Mischia',peso:'Leggero',mani:'versatile',rarita:'Non comune',
   req:null,elemento:null,
   desc:'La via della spada. Velocità, eleganza, un taglio che non lascia dubbi.',perkSpeciale:null},
  {id:'w_b13',nome:'Naginata',        nomeLore:null,cat:'B',tipo:'Asta con Lama',stile:'anime',
   danno:'Tagliente',portata:'Mischia (3m)',peso:'Medio',mani:'2h',rarita:'Non comune',
   req:null,elemento:null,
   desc:"L'arma dei guerrieri eleganti. Portata e grazia in egual misura.",perkSpeciale:null},
  {id:'w_b14',nome:'Guanti da Combattimento',nomeLore:null,cat:'B',tipo:'Corp. a Corp.',stile:'anime',
   danno:'Contundente',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Rinforzati con metallo o ki. Ogni pugno è una sentenza.',perkSpeciale:null},

  // ─ HORROR / DEMONOLOGIA ─
  {id:'w_b15',nome:"Daga d'Argento",  nomeLore:null,cat:'B',tipo:'Pugnale',   stile:'horror',
   danno:'Perforante',portata:'Mischia / 5m',peso:'Leggero',mani:'1h',rarita:'Non comune',
   req:null,elemento:'Sacro',
   desc:'Fusa con argento puro e benedetta. Brucia ciò che non dovrebbe esistere.',perkSpeciale:null},
  {id:'w_b16',nome:'Lama Rituale Oscura',nomeLore:null,cat:'B',tipo:'Pugnale', stile:'horror',
   danno:'Necromantico',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Raro',
   req:null,elemento:'Oscuro',
   desc:'Incisa con simboli di potere che nessuno dovrebbe saper leggere.',perkSpeciale:null},

  // ─ NOIR ─
  {id:'w_b17',nome:'Revolver .38',    nomeLore:null,cat:'B',tipo:'Revolver',  stile:'noir',
   danno:'Perforante',portata:'20m',peso:'Medio',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Sei colpi, sei decisioni. Il classico di chi non si fida delle pistole moderne.',perkSpeciale:null},
  {id:'w_b18',nome:'Fucile a Pompa Corto',nomeLore:null,cat:'B',tipo:'Fucile',stile:'noir',
   danno:'Tagliente',portata:'10m',peso:'Medio',mani:'2h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Nessuno discute con un cal.12 a meno di dieci metri.',perkSpeciale:null},
  {id:'w_b19',nome:'Manganello',      nomeLore:null,cat:'B',tipo:'Mazza',     stile:'noir',
   danno:'Contundente',portata:'Mischia',peso:'Leggero',mani:'1h',rarita:'Comune',
   req:null,elemento:null,
   desc:'Il ragionamento finale di chi vuole risposte senza spargere sangue.',perkSpeciale:null},

  // ════════════════════════════════════════════════
  //  CATEGORIA C  (+3) — Pesanti, CORPO≥6 o talento
  // ════════════════════════════════════════════════

  // ─ FANTASY / D&D ─
  {id:'w_c01',nome:'Spadone',         nomeLore:null,cat:'C',tipo:'Spada',     stile:'fantasy',
   danno:'Tagliente',portata:'Mischia',peso:'Pesante',mani:'2h',rarita:'Non comune',
   req:'CORPO ≥ 6',elemento:null,
   desc:'Taglia attraverso armatura e uomini con la stessa indifferenza.',perkSpeciale:null},
  {id:'w_c02',nome:'Grande Ascia',    nomeLore:null,cat:'C',tipo:'Ascia',     stile:'fantasy',
   danno:'Tagliente',portata:'Mischia',peso:'Pesante',mani:'2h',rarita:'Non comune',
   req:'CORPO ≥ 6',elemento:null,
   desc:"Pura distruzione. Non c'è eleganza — solo il risultato.",perkSpeciale:null},
  {id:'w_c03',nome:'Grande Mazza',    nomeLore:null,cat:'C',tipo:'Mazza',     stile:'fantasy',
   danno:'Contundente',portata:'Mischia',peso:'Pesante',mani:'2h',rarita:'Non comune',
   req:'CORPO ≥ 6',elemento:null,
   desc:'Spiana armature. Non serve tagliare se puoi appiattire.',perkSpeciale:null},
  {id:'w_c04',nome:'Alabarda',        nomeLore:null,cat:'C',tipo:'Asta con Lama',stile:'fantasy',
   danno:'Tagliente',portata:'Mischia (3m)',peso:'Pesante',mani:'2h',rarita:'Non comune',
   req:'CORPO ≥ 6',elemento:null,
   desc:'Il dominio delle formazioni militari. Taglia, colpisce, e tiene a distanza.',perkSpeciale:null},
  {id:'w_c05',nome:'Arco Lungo',      nomeLore:null,cat:'C',tipo:'Arco',      stile:'fantasy',
   danno:'Perforante',portata:'80m',peso:'Medio',mani:'2h',rarita:'Non comune',
   req:'CORPO ≥ 6',elemento:null,
   desc:'Portata straordinaria. Nelle mani giuste, cambia il risultato delle battaglie.',perkSpeciale:null},
  {id:'w_c06',nome:'Balestra Pesante',nomeLore:null,cat:'C',tipo:'Balestra',  stile:'fantasy',
   danno:'Perforante',portata:'60m',peso:'Pesante',mani:'2h',rarita:'Non comune',
   req:'CORPO ≥ 6',elemento:null,
   desc:'Perfora piastre di acciaio. Ricarica lenta, ma il primo colpo raramente fallisce.',perkSpeciale:null},

  // ─ CYBERPUNK RED ─
  {id:'w_c07',nome:'Fucile d\'Assalto',nomeLore:null,cat:'C',tipo:'Fucile',   stile:'cyberpunk',
   danno:'Perforante',portata:'100m',peso:'Pesante',mani:'2h',rarita:'Raro',
   req:'CORPO ≥ 6',elemento:null,
   desc:"Cadenza elevata, precisione militare. L'arma dei soldier-for-hire seri.",perkSpeciale:null},
  {id:'w_c08',nome:'Pistola Pesante HMG',nomeLore:null,cat:'C',tipo:'Pistola',stile:'cyberpunk',
   danno:'Perforante',portata:'30m',peso:'Pesante',mani:'versatile',rarita:'Raro',
   req:'CORPO ≥ 6',elemento:null,
   desc:'Calibro .50 modificato. Ciò che colpisce non si rialza facilmente.',perkSpeciale:null},
  {id:'w_c09',nome:'Monokatana',       nomeLore:null,cat:'C',tipo:'Spada',    stile:'cyberpunk',
   danno:'Tagliente',portata:'Mischia',peso:'Medio',mani:'2h',rarita:'Raro',
   req:'CORPO ≥ 6',elemento:null,
   desc:'Lama a piena lunghezza con filo monomolecolare. Taglia veicoli leggeri.',perkSpeciale:null},

  // ─ ANIME ─
  {id:'w_c10',nome:'Nodachi',          nomeLore:null,cat:'C',tipo:'Spada',    stile:'anime',
   danno:'Tagliente',portata:'Mischia (2m)',peso:'Pesante',mani:'2h',rarita:'Raro',
   req:'CORPO ≥ 6',elemento:null,
   desc:"Spada di campo lunga quanto un uomo. Ogni fendente ha il peso della storia.",perkSpeciale:null},
  {id:'w_c11',nome:"Odachi della Tempesta",nomeLore:null,cat:'C',tipo:'Spada',stile:'anime',
   danno:'Tagliente',portata:'Mischia (2m)',peso:'Pesante',mani:'2h',rarita:'Raro',
   req:'CORPO ≥ 6',elemento:'Fulmine',
   desc:'Forgiata durante un temporale. Arde di scariche elettrostatiche sui bordi.',perkSpeciale:null},

  // ─ HORROR / DEMONOLOGIA ─
  {id:'w_c12',nome:'Falce della Mietitrice',nomeLore:null,cat:'C',tipo:'Falce',stile:'horror',
   danno:'Necromantico',portata:'Mischia (2m)',peso:'Pesante',mani:'2h',rarita:'Raro',
   req:'CORPO ≥ 6',elemento:'Oscuro',
   desc:'Fredda al tatto anche d\'estate. Chi viene colpito percepisce la propria fine.',perkSpeciale:null},
  {id:'w_c13',nome:'Marchio del Divoratore',nomeLore:null,cat:'C',tipo:'Maglio',stile:'horror',
   danno:'Contundente',portata:'Mischia',peso:'Pesante',mani:'2h',rarita:'Raro',
   req:'CORPO ≥ 6',elemento:'Demonico',
   desc:'Coperto di rune demoniche. Rompe le barriere magiche e le ossa con uguale facilità.',perkSpeciale:null},

  // ─ NOIR ─
  {id:'w_c14',nome:'Tommy Gun',        nomeLore:null,cat:'C',tipo:'Mitra',    stile:'noir',
   danno:'Perforante',portata:'30m',peso:'Pesante',mani:'2h',rarita:'Non comune',
   req:'CORPO ≥ 6',elemento:null,
   desc:'Il suono dell\'era del proibizionismo. Sessanta colpi di argomento inattaccabile.',perkSpeciale:null},
  {id:'w_c15',nome:'Fucile da Cecchino',nomeLore:null,cat:'C',tipo:'Fucile',  stile:'noir',
   danno:'Perforante',portata:'200m',peso:'Pesante',mani:'2h',rarita:'Raro',
   req:'CORPO ≥ 6',elemento:null,
   desc:'Freddo, distante, inevitabile. Porta la morte con puntualità svizzera.',perkSpeciale:null},
  {id:'w_c16',nome:'Revolver Magnum',  nomeLore:null,cat:'C',tipo:'Revolver', stile:'noir',
   danno:'Perforante',portata:'30m',peso:'Pesante',mani:'versatile',rarita:'Non comune',
   req:'CORPO ≥ 6',elemento:null,
   desc:'.44 Magnum. Chi viene colpito ha già finito di essere un problema.',perkSpeciale:null},

  // ══════════════════════════════════════════════════════════════════
  //  CATEGORIA D  (+4) — Devastanti, CORPO≥10 + Armi Letali
  //  ★ ARMI LEGGENDARIE CON NOME E PERK SPECIALE ★
  // ══════════════════════════════════════════════════════════════════

  // ─ FANTASY — Leggendarie ─
  {id:'w_d01',nome:'Spadone',nomeLore:'Spezzamondi',cat:'D',tipo:'Spada',     stile:'fantasy',
   danno:'Tagliente + Radioso',portata:'Mischia (2m)',peso:'Pesante',mani:'2h',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali',elemento:'Radioso',
   desc:'Forgiata durante l\'eclissi di un dio morente. Emette una deflagrazione di luce a ogni colpo che accieca tutto ciò che si trova entro due metri.',
   perkSpeciale:{nome:'Furia Solare',tipo:'1x/combat',
     desc:'Quando colpisci, ogni nemico entro 2m subisce metà del danno inferto come onda d\'urto radiosa. Non colpisce alleati.',malus:null}},

  {id:'w_d02',nome:'Arco',nomeLore:'Arco di Asteria',cat:'D',tipo:'Arco',    stile:'fantasy',
   danno:'Perforante + Lunare',portata:'150m',peso:'Leggero',mani:'2h',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali',elemento:'Lunare',
   desc:'Legno lunare bianco, corda di filo di stelle. Le frecce lasciano una scia argentea e non possono essere schivate da bersagli con MENTE inferiore a 8.',
   perkSpeciale:{nome:'Freccia Inevitabile',tipo:'1x/sessione',
     desc:'Scocca una freccia che ignora completamente la Difesa del bersaglio. Il danno è applicato direttamente agli HP.',malus:null}},

  {id:'w_d03',nome:'Maglio',nomeLore:'Tuono Silente',cat:'D',tipo:'Maglio',   stile:'fantasy',
   danno:'Contundente + Fulmine',portata:'Mischia',peso:'Pesante',mani:'2h',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali',elemento:'Fulmine',
   desc:'Ferro nero che emette un rombo sordo a ogni colpo. Al contatto scarica in silenzio — il nemico non sente il tonfo, ma si ritrova a terra.',
   perkSpeciale:{nome:'Scarica Paralizzante',tipo:'1x/combat',
     desc:'Il prossimo colpo a segno impone la condizione Stordito per 2 round senza tiro di resistenza.',malus:null}},

  // ─ CYBERPUNK — Leggendarie ─
  {id:'w_d04',nome:'Lama Cybernetica',nomeLore:'Mantide',cat:'D',tipo:'Lama Impiantata',stile:'cyberpunk',
   danno:'Tagliente',portata:'Mischia',peso:'—',mani:'1h',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali + Augment cibernetico',elemento:null,
   desc:'Lame ad apertura pneumatica impiantate nell\'avambraccio. Si dispiegano in 0.3 secondi. Non esiste guardia che le aspetti.',
   perkSpeciale:{nome:'Dispiegamento Istantaneo',tipo:'passivo',
     desc:'Non puoi mai essere colto di sorpresa mentre Mantide è impiantata. Il primo attacco di ogni combattimento ottiene +2 al tiro.',malus:null}},

  {id:'w_d05',nome:'Fucile ad Alta Energia',nomeLore:'Ragnarok-7',cat:'D',tipo:'Fucile Prototipo',stile:'cyberpunk',
   danno:'Energetico + Plasma',portata:'300m',peso:'Pesante',mani:'2h',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali',elemento:'Plasma',
   desc:'Arma militare prototipo. Ogni colpo richiede 3 secondi di ricarica — ma ciò che colpisce smette di esistere come unità coerente di materia.',
   perkSpeciale:{nome:'Colpo di Plasma',tipo:'1x/combat',
     desc:'Un colpo ignora completamente armature e scudi. La DEF del bersaglio è considerata zero per quel calcolo del danno.',malus:null}},

  // ─ ANIME — Leggendarie ─
  {id:'w_d06',nome:'Nodachi',nomeLore:'Occhio del Drago',cat:'D',tipo:'Spada', stile:'anime',
   danno:'Tagliente + Fuoco',portata:'Mischia (2m)',peso:'Pesante',mani:'2h',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali',elemento:'Fuoco',
   desc:'Forgiata nel nucleo di un vulcano da un fabbro che aveva fatto un patto. Filamenti di magma scorrono lungo la lama e non si spengono mai.',
   perkSpeciale:{nome:'Passo del Drago',tipo:'1x/combat',
     desc:'Dopo aver abbattuto un nemico, puoi muoverti fino a 5m e effettuare immediatamente un secondo attacco completo nel tuo turno.',malus:null}},

  {id:'w_d07',nome:'Katana',nomeLore:'Fato Infranto',cat:'D',tipo:'Spada',    stile:'anime',
   danno:'Tagliente + Vuoto',portata:'Mischia',peso:'Medio',mani:'versatile',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali',elemento:'Vuoto',
   desc:'Spezzata e riformata con tecnica proibita. L\'impugnatura è tenuta insieme da bende di seta nera. Taglia attraverso il ki, non solo la carne.',
   perkSpeciale:{nome:'Recisione del Ki',tipo:'1x/sessione',
     desc:'Un colpo annulla il prossimo perk o magia che il bersaglio avrebbe usato quel giorno. Il GM decide quale effetto specifico viene reciso.',malus:null}},

  // ─ HORROR / DEMONOLOGIA — Leggendarie Maledette ─
  {id:'w_d08',nome:'Falce',nomeLore:'Lama del Vuoto',cat:'D',tipo:'Falce',    stile:'horror',
   danno:'Necromantico',portata:'Mischia (2m)',peso:'Pesante',mani:'2h',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali',elemento:'Oscuro',
   desc:'Non si sa da dove viene. Chiunque la abbia impugnata riferisce lo stesso sogno — un corridoio infinito e qualcosa che cammina verso di loro.',
   perkSpeciale:{nome:'Mietitore',tipo:'1x/combat',
     desc:'Se il colpo porta il bersaglio a 0 HP, recuperi HP pari al tuo CORPO. L\'anima del bersaglio alimenta la lama.',
     malus:'−1 ANIMA permanente finché equipaggiata. Ogni notte il portatore sogna la propria morte.'}},

  {id:'w_d09',nome:'Pugnale Rituale',nomeLore:'Marchio di Abaddon',cat:'D',tipo:'Pugnale',stile:'horror',
   danno:'Demonico',portata:'Mischia / 8m',peso:'Leggero',mani:'1h',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali',elemento:'Demonico',
   desc:'Iscritto con il vero nome di un demone minore. Chi viene ferito sente qualcosa cominciare a muoversi dall\'interno.',
   perkSpeciale:{nome:'Segnatura Demoniaca',tipo:'1x/sessione',
     desc:'Chi viene ferito acquisisce la condizione Spaventato per l\'intera scena (non solo 2 round). Tiro ANIMA vs ANIMA+6 per resistere.',
     malus:'Il portatore non recupera più di 2 slot magici per Riposo Breve.'}},

  // ─ NOIR — Leggendaria ─
  {id:'w_d10',nome:'Revolver',nomeLore:'Il Giustiziere',cat:'D',tipo:'Revolver',stile:'noir',
   danno:'Perforante',portata:'40m',peso:'Pesante',mani:'versatile',rarita:'Leggendario',
   req:'CORPO ≥ 10 + Armi Letali',elemento:null,
   desc:'Calcio in ebano, canna allungata, dodici tacche. Non ne manca una. Dicono che i colpi trovino sempre il bersaglio se la causa è giusta.',
   perkSpeciale:{nome:'Colpo del Giustiziere',tipo:'1x/sessione',
     desc:'Dichiara un bersaglio come il tuo obiettivo di giustizia (motivazione narrativa obbligatoria). Il prossimo colpo contro di lui è automaticamente critico e ignora la Difesa. Il GM approva la motivazione.',malus:null}},
];

var WOUND_TIERS = [
  {tier:0, nome:'Integro',      penalita:0,    desc:'Nessuna penalità.'},
  {tier:1, nome:'Ferito',       penalita:-1,   desc:'-1 a tutti i tiri.'},
  {tier:2, nome:'Critico',      penalita:-2,   desc:'-2 a tutti i tiri.'},
  {tier:3, nome:'Incapacitato', penalita:null,  desc:'Non agisce. 3 round per stabilizzarlo.'}
];

// ═══ RIPOSI ═══
var REST_RULES = {
  breve: {nome:'Riposo Breve', durata:'10 minuti', effetto:'Recupera CORPO HP. Slot magie NON recuperati.'},
  lungo: {nome:'Riposo Lungo', durata:'8 ore',     effetto:'Tutti HP recuperati. Tutti slot magia recuperati. Punti Eroe ripristinati. Condizioni azzerate.'}
};

// ═══ PUNTO EROE ═══
var HERO_POINT = {
  nome: 'Punto Eroe',
  maxPerSession: 2,
  cap: 3,
  refresh: 'Inizio sessione (o Riposo Lungo a discrezione del GM)',
  rules: [
    'Ogni PG inizia la sessione con 2 Punti Eroe (cap: 3).',
    'Il giocatore descrive un\'azione drammatica, narrativa, eroica o disperata.',
    'Il GM valuta la descrizione: se è coerente col personaggio e la scena, l\'azione riesce automaticamente senza tiro.',
    'Se il GM ritiene che l\'azione sia troppo potente per un successo automatico, concede invece un bonus tra +1 e +6 al tiro, a sua discrezione.',
    'Il Punto Eroe si consuma in entrambi i casi.',
    'Un Punto Eroe può anche essere speso per: negare un colpo mortale (resti a 1 HP), aggiungere un dettaglio narrativo alla scena (con approvazione GM), oppure agire fuori turno con una reazione narrativa.',
    'Il GM può assegnare un Punto Eroe extra come ricompensa per giocate particolarmente creative o eroiche (max 3 totali).',
    'I Punti Eroe non si accumulano tra sessioni.'
  ],
  esempi: [
    {azione:'Il bardo salta dal balcone, afferra il lampadario e oscilla verso il nemico cantando.', esito:'Successo automatico — azione spettacolare e coerente col personaggio.'},
    {azione:'Il guerriero vuole tagliare in due il drago con un solo colpo.', esito:'Bonus tra +1 e +6 al tiro — il GM sceglie il valore in base alla potenza dell\'azione descritta.'},
    {azione:'Il ladro vuole che ci sia una finestra aperta nel muro del castello.', esito:'Successo — il giocatore aggiunge un dettaglio narrativo ragionevole.'},
    {azione:'Il mago sta per morire: "Il mio maestro mi ha insegnato un ultimo trucco."', esito:'Nega il colpo mortale — resta a 1 HP con una motivazione narrativa.'}
  ]
};
