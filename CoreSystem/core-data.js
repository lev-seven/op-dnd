// ============================================================
//  C.O.R.E. — Compact Open Rules Engine
//  core-data.js — File Dati Completo
//  Versione con condizioni, armature, iniziativa, nuovi contenuti
// ============================================================

const STILI = {
  universale: { lbl:'Universale', icon:'⬡', cls:'sb-un' },
  fantasy:    { lbl:'Fantasy',    icon:'⚔', cls:'sb-fa' },
  cyberpunk:  { lbl:'Cyberpunk',  icon:'◈', cls:'sb-cy' },
  noir:       { lbl:'Noir',       icon:'◉', cls:'sb-no' },
  horror:     { lbl:'Horror',     icon:'☽', cls:'sb-ho' },
  anime:      { lbl:'Anime',      icon:'⚡', cls:'sb-an' },
  'post-ap':  { lbl:'Post-Ap',   icon:'☢', cls:'sb-pa' }
};

// ═══ REGOLE BASE ═══
const CORE_RULES = {
  stats: ['CORPO','MENTE','ANIMA'],
  hpFormula: 'CORPO + MENTE + ANIMA',
  startPoints: 12,
  statMin: 1,
  statCapBase: 10,
  statCap12: 12,
  statCap15: 15,
  maxTalents: 5,
  maxAugments: 3,
  maxCantrips: 2,
  slotFormula: 'max(MENTE, ANIMA) - 2',
  baseMovement: 9,
  maxConditions: 2,
  defBonusCap: null, // nessun cap, bilanciato dai malus
  initiative: '1d12 + stat di competenza (senza competenza: 1d12 nudo)',
  initiativeParita: 'MENTE più alta agisce prima'
};

// ═══ CONDIZIONI (max 2 attive contemporaneamente) ═══
const CONDITIONS = [
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
const ARMORS = [
  {id:0, nome:'Nessuna',  bonus:0, penMente:0, penAnima:0, movimento:9, req:0,  note:''},
  {id:1, nome:'Leggera',  bonus:1, penMente:0, penAnima:0, movimento:9, req:0,  note:'Nessuna restrizione.'},
  {id:2, nome:'Media',    bonus:2, penMente:1, penAnima:0, movimento:7, req:4,  note:'-1 tiri MENTE. Movimento 7m. Richiede CORPO 4+.'},
  {id:3, nome:'Pesante',  bonus:3, penMente:1, penAnima:1, movimento:5, req:6,  note:'-1 tiri MENTE, -1 tiri ANIMA. Movimento 5m. No cantrip ANIMA. Richiede CORPO 6+.'}
];

// ═══ ARMI ═══
const WCAT = {
  A:{ nome:'Leggera',   bonus:0, req:null,      svan:'Danno singolo basso. Quasi inutile contro difese alte.', initMod:0 },
  B:{ nome:'Standard',  bonus:2, req:null,      svan:'Nessuno — bilanciata per eccellenza.', initMod:0 },
  C:{ nome:'Pesante',   bonus:4, req:'gate_ab', svan:'-1 alla propria difesa. Ingombrante.', initMod:0 },
  D:{ nome:'Devastante',bonus:6, req:'gate_aa', svan:'-2 difesa. Richiede due mani. -1 iniziativa.', initMod:-1 }
};

const WPERKS = {
  A:[
    {id:'a1',nome:'Velocita',    desc:'Attacca due volte per round. Ogni attacco a -2 al tiro.',              pro:'Ottimo per finire nemici.',             con:'Danno basso contro difese alte.'},
    {id:'a2',nome:'Furtivo',     desc:'+2 al tiro vs bersagli che non ti hanno visto in questo round.',       pro:'Bonus per chi agisce per primo.',       con:'Perso se il nemico e allertato.'},
    {id:'a3',nome:'Sanguinante', desc:'Se colpisci: 1 HP/round per 3 round (cumulabile).',                    pro:'Danno nel tempo.',                      con:'Lento. Curabili con healing.'},
    {id:'a4',nome:'Colpo Basso', desc:'Se colpisci: bersaglio -1 difesa fino al suo prossimo turno.',         pro:'Facilita colpi degli alleati.',         con:'Utile solo se alleati attaccano dopo.'},
    {id:'a5',nome:'Schivata',    desc:'Dopo aver attaccato: +1 difesa tua fino al tuo prossimo turno.',       pro:'Offensivo e difensivo.',                con:'Non aiuta se non attacchi.'}
  ],
  B:[
    {id:'b1',nome:'Affidabilita', desc:'1x/combat: se esci 1-3 sul d12, ritira e tieni il secondo.',          pro:'Elimina i fallimenti brutti.',          con:'1 uso per combat.'},
    {id:'b2',nome:'Parata',       desc:'+1 difesa CORPO mentre impugni questa arma (passivo).',                pro:'Difesa costante.',                      con:'Non aiuta l\'attacco.'},
    {id:'b3',nome:'Spinta',       desc:'Se danno > 5: bersaglio -1 al prossimo tiro.',                        pro:'Debuff su ogni colpo forte.',           con:'Non vs difese altissime.'},
    {id:'b4',nome:'Bilanciamento',desc:'Prima di attaccare: -1 tiro per +2 danno, o +1 tiro per -1 danno.',  pro:'Adattabile a ogni situazione.',         con:'Decidi prima del tiro.'},
    {id:'b5',nome:'Rimbalzo',     desc:'Se attacco fa 0 danno: prossimo tiro vs stesso bersaglio +2.',        pro:'Trasforma mancanze in setup.',          con:'Serve un turno sacrificato.'}
  ],
  C:[
    {id:'c1',nome:'Sfondamento',  desc:'Ignora 2 punti di CORPO difensivo del bersaglio.',                    pro:'Contro nemici corazzati.',              con:'Inutile vs CORPO basso.'},
    {id:'c2',nome:'Schianto',     desc:'Se danno > 5: bersaglio destabilizzato, -1 al prossimo tiro.',        pro:'Debuff affidabile.',                    con:'Richiede 6+ danno.'},
    {id:'c3',nome:'Inesorabile',  desc:'Il perk puo essere usato 2x/combat.',                                 pro:'Raddoppia qualsiasi perk.',             con:'Dipende dal perk scelto.'},
    {id:'c4',nome:'Terrore',      desc:'Se danno > 7: bersaglio -1 ANIMA per questo combat (max -3).',        pro:'Erode l\'ANIMA nel tempo.',             con:'Richiede danno alto.'},
    {id:'c5',nome:'Spaccaossa',   desc:'1x/combat: se colpisci FERITO o CRITICO, +3 danno.',                  pro:'Finisher potente.',                     con:'1 uso. Solo vs feriti.'}
  ],
  D:[
    {id:'d1',nome:'Impatto',       desc:'Se danno > 8: bersaglio -1 al prossimo tiro.',                       pro:'Scala con tiri alti.',                  con:'Solo se danno >8.'},
    {id:'d2',nome:'Frantumo',      desc:'1x/combat: distruggi scudo nemico o penalizza arma (-1 permanente).', pro:'Elimina vantaggi difensivi.',           con:'1 uso.'},
    {id:'d3',nome:'Esecuzione',    desc:'1x/combat: se bersaglio <= 10 HP, +4 al tiro.',                      pro:'Finisher letale.',                      con:'1 uso.'},
    {id:'d4',nome:"Onda d'Urto",  desc:'1x/combat: colpisci anche bersaglio adiacente per meta danno.',       pro:'Multi-target.',                         con:'1 uso. Bersagli vicini.'},
    {id:'d5',nome:'Fendente Letale',desc:'Se attacco-difesa >= 6: no HP naturali fino a riposo lungo.',       pro:'Nega rigenerazione.',                   con:'Solo con margine 6+.'}
  ]
};

const SHIELDS = [
  {id:0, nome:'Nessuno',    bonus:0, penMente:0, penAnima:0, rest:null,           note:''},
  {id:1, nome:'Piccolo +1', bonus:1, penMente:0, penAnima:0, rest:null,           note:'Nessuna restrizione d\'arma.'},
  {id:2, nome:'Medio +2',   bonus:2, penMente:1, penAnima:0, rest:['A','B','C'], note:'No Cat D. -1 tiri MENTE.'},
  {id:3, nome:'Torre +3',   bonus:3, penMente:1, penAnima:1, rest:['A','B'],     note:'Solo Cat A/B. -1 tiri MENTE, -1 tiri ANIMA.'}
];

// ═══ INCOMPATIBILITA ═══
const INCOMPATIBILITIES = [
  {items:['shield_2','shield_3','cat_D'], rule:'Scudo Medio/Torre incompatibile con Cat D (due mani).'},
  {items:['armor_3','cantrip_anima'],     rule:'Armatura Pesante impedisce cantrip ANIMA (troppo ingombro).'},
  {items:['shield','dual_wield'],         rule:'Scudo incompatibile con Doppia Impugnatura (serve mano libera).'},
  {items:['aug_rn','aug_lr'],             rule:'Riflessi Neurali incompatibile con Limitatore Rimosso.'},
  {items:['aug_gate','aug_lr'],           rule:'Gate dell\'Anima incompatibile con Limitatore Rimosso.'}
];

// ═══ MAGIE ═══
const SPELLS = [
  // CANTRIP — tutti, max 2
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
  {id:'c18',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Senso Etereo',       bonus:0,mec:'Rilevi esseri viventi entro 20m per 10 min.',                                 pro:'Esplorazione e sorveglianza.',     con:'Non distingue amici da nemici.'},
  // L1 +0
  {id:'m01',tipo:'mg',lvl:1,min:3,stat:'MENTE',stile:'fantasy',  nome:'Dardo Magico',       bonus:0,mec:'1d12+MENTE vs CORPO. Fa sempre minimo 1 danno.',                             pro:'Garantisce danno.',                con:'Danno moderato.'},
  {id:'m02',tipo:'mg',lvl:1,min:3,stat:'MENTE',stile:'fantasy',  nome:'Sonno',              bonus:0,mec:'1d12+MENTE vs ANIMA. Vinci: dorme. No su ANIMA >= 8.',                       pro:'Neutralizza senza danno.',         con:'ANIMA alta resiste.'},
  {id:'m03',tipo:'mg',lvl:1,min:3,stat:'MENTE',stile:'fantasy',  nome:'Presa Arcana',       bonus:0,mec:'1d12+MENTE vs CORPO. Vinci: Rallentato 1 round.',                            pro:'Controllo del campo.',             con:'CORPO alto resiste.'},
  {id:'m04',tipo:'mg',lvl:1,min:3,stat:'MENTE',stile:'fantasy',  nome:'Cura Ferite',        bonus:0,mec:'Ripristina MENTE HP a un bersaglio. Richiede tocco.',                        pro:'Healing diretto.',                 con:'Richiede tocco.'},
  {id:'m05',tipo:'mg',lvl:1,min:3,stat:'MENTE',stile:'fantasy',  nome:'Scudo di Forza',     bonus:0,mec:'+2 difesa vs tutti per 2 round.',                                            pro:'Difesa per 2 round.',              con:'Costa 1 azione.'},
  {id:'m06',tipo:'mg',lvl:1,min:3,stat:'MENTE',stile:'fantasy',  nome:'Frecce Magiche',     bonus:0,mec:'3 dardi: 1d12+MENTE-2 ciascuno vs CORPO. Distribuibili.',                   pro:'Multi-target.',                    con:'-2 per dardo.'},
  {id:'m07',tipo:'mg',lvl:1,min:3,stat:'ANIMA',stile:'horror',   nome:'Voce del Terrore',   bonus:0,mec:'1d12+ANIMA vs ANIMA. Vinci: Spaventato 2 round.',                           pro:'Infligge condizione.',             con:'Richiede vittoria.'},
  {id:'m08',tipo:'mg',lvl:1,min:3,stat:'ANIMA',stile:'anime',    nome:'Ispirazione Arcana', bonus:0,mec:'ANIMA: alleato +3 al prossimo tiro (prima del tiro).',                       pro:'Bonus in momenti cruciali.',       con:'Solo 1 tiro.'},
  {id:'m09',tipo:'mg',lvl:1,min:3,stat:'ANIMA',stile:'fantasy',  nome:'Canto di Guarigione',bonus:0,mec:'Ripristina ANIMA HP a un bersaglio. Richiede tocco.',                       pro:'Healing basato su ANIMA.',         con:'Richiede tocco.'},
  {id:'m10',tipo:'mg',lvl:1,min:3,stat:'MENTE',stile:'cyberpunk',nome:'Aggancio',           bonus:0,mec:'MENTE vs 7: accedi o disabilita sistema digitale semplice.',                 pro:'Utility digitale.',                con:'Solo sistemi semplici.'},
  {id:'m11',tipo:'mg',lvl:1,min:3,stat:'ANIMA',stile:'horror',   nome:'Grido Straniante',   bonus:0,mec:'ANIMA vs ANIMA di tutti entro 5m. Chi perde: Indebolito (ANIMA) 1 round.',   pro:'Area burst ANIMA.',                con:'Raggio piccolo.'},
  {id:'m12',tipo:'mg',lvl:1,min:3,stat:'MENTE',stile:'fantasy',  nome:'Cura a Distanza',    bonus:0,mec:'Ripristina MENTE HP a bersaglio entro 10m. No tocco.',                      pro:'Healing sicuro a distanza.',       con:'Stessa quantita di Cura Ferite.'},
  {id:'m43',tipo:'mg',lvl:1,min:3,stat:'ANIMA',stile:'horror',   nome:'Maledizione di Setta',bonus:0,mec:'1d12+ANIMA vs ANIMA. Vinci: bersaglio fallisce prossimo tiro vs Spaventato.',pro:'Amplificatore per effetti paura.',con:'Solo vs resistenza, no danno.'},
  {id:'m48',tipo:'mg',lvl:1,min:3,stat:'MENTE',stile:'anime',    nome:'Analisi Tattica',    bonus:0,mec:'MENTE vs ANIMA. Vinci: conosci cat arma, HP approx, 1 perk. +2 prossimo attacco vs lui.',pro:'Info + bonus attacco.',con:'Solo 1 bersaglio.'},
  // L2 +1
  {id:'m13',tipo:'mg',lvl:2,min:4,stat:'MENTE',stile:'fantasy',  nome:'Palla di Fuoco',    bonus:1,mec:'1d12+MENTE+1 vs CORPO di TUTTI in raggio. Amici inclusi.',                   pro:'Multi-target, danno elevato.',     con:'Colpisce alleati.'},
  {id:'m14',tipo:'mg',lvl:2,min:4,stat:'MENTE',stile:'universale',nome:'Invisibilita',     bonus:1,mec:'Invisibile 10 min o fino al prossimo attacco.',                               pro:'Elusione totale.',                 con:'Si annulla al primo attacco.'},
  {id:'m15',tipo:'mg',lvl:2,min:4,stat:'MENTE',stile:'universale',nome:'Telecinesi',       bonus:1,mec:'1d12+MENTE+1 vs CORPO. Sposta, afferra, disarma. Danno = margine.',          pro:'Versatile.',                       con:'Non vs CORPO altissimo.'},
  {id:'m16',tipo:'mg',lvl:2,min:4,stat:'MENTE',stile:'fantasy',  nome:'Lama Magica',       bonus:1,mec:'Incanta arma alleata: +3 al prossimo attacco, danno magico.',                pro:'Buff potente.',                    con:'Solo 1 attacco.'},
  {id:'m17',tipo:'mg',lvl:2,min:4,stat:'MENTE',stile:'noir',     nome:'Blocco del Pensiero',bonus:1,mec:'1d12+MENTE+1 vs MENTE. Vinci: no magie per 2 round.',                      pro:'Silenzia caster.',                 con:'Solo vs caster.'},
  {id:'m18',tipo:'mg',lvl:2,min:4,stat:'MENTE',stile:'universale',nome:'Volo',             bonus:1,mec:'Voli 10 min. Puoi portare 1 alleato.',                                       pro:'Mobilita aerea.',                  con:'Attacchi fisici lo annullano.'},
  {id:'m19',tipo:'mg',lvl:2,min:4,stat:'ANIMA',stile:'fantasy',  nome:'Benedizione',       bonus:1,mec:'1d12+ANIMA+1: alleati vicini +2 tiri per 3 round.',                          pro:'Buff di gruppo.',                  con:'Richiede alleati vicini.'},
  {id:'m20',tipo:'mg',lvl:2,min:4,stat:'ANIMA',stile:'fantasy',  nome:"Legame dell'Anima", bonus:1,mec:'1d12+ANIMA+1: condividi meta del danno ricevuto da 1 alleato.',              pro:'Protezione per alleato.',          con:'Rischioso se alleato subisce tanto.'},
  {id:'m21',tipo:'mg',lvl:2,min:4,stat:'ANIMA',stile:'noir',     nome:"Voce dell'Autorita",bonus:1,mec:'1d12+ANIMA+1 vs ANIMA. Vinci: trattato come autorita per 10 min.',          pro:'Charm narrativo.',                 con:'Zero danno.'},
  {id:'m22',tipo:'mg',lvl:2,min:4,stat:'MENTE',stile:'cyberpunk',nome:'Overload Neurale',  bonus:1,mec:'1d12+MENTE+1 vs CORPO. Vs augmentati: augmenti disabilitati 2 round.',       pro:'Counter cyberware.',               con:'Solo vs augmentati.'},
  {id:'m23',tipo:'mg',lvl:2,min:4,stat:'MENTE',stile:'horror',   nome:'Barriera di Spine', bonus:1,mec:'Chi ti colpisce in mischia subisce 2 danni auto. Dura 3 round.',             pro:'Difesa che punisce.',              con:'Solo mischia.'},
  {id:'m24',tipo:'mg',lvl:2,min:4,stat:'ANIMA',stile:'anime',    nome:"Eco dell'Anima",    bonus:1,mec:'1d12+ANIMA+1: ripeti tipo attacco riuscito di un alleato questo round.',     pro:'Sinergia di gruppo.',              con:'Richiede alleato abbia gia colpito.'},
  {id:'m44',tipo:'mg',lvl:2,min:4,stat:'ANIMA',stile:'horror',   nome:'Visione Cosmica',   bonus:1,mec:'1d12+ANIMA+1 vs MENTE. Vinci: Indebolito (MENTE) 2 round.',                 pro:'Debuff MENTE pesante.',            con:'Immune se MENTE >= 7.'},
  {id:'m45',tipo:'mg',lvl:2,min:4,stat:'MENTE',stile:'horror',   nome:'Rito del Sangue',   bonus:1,mec:'Spendi 3 HP: prossimo tiro magico minimo 8 sul d12.',                        pro:'Elimina fallimenti magici.',       con:'Costa 3 HP. Visibile.'},
  {id:'m49',tipo:'mg',lvl:2,min:4,stat:'ANIMA',stile:'anime',    nome:'Aura di Supremazia',bonus:1,mec:'1d12+ANIMA+1: nemici entro 5m: ANIMA vs tua ANIMA o Indebolito (ANIMA) 2 round.',pro:'Area debuff ANIMA.',           con:'Se ANIMA inferiore, effetto ribaltato.'},
  // NUOVE L2
  {id:'m51',tipo:'mg',lvl:2,min:4,stat:'ANIMA',stile:'universale',nome:'Catene dell\'Anima',bonus:1,mec:'1d12+ANIMA+1 vs ANIMA. Vinci: Rallentato 2 round.',                        pro:'Controllo del campo.',             con:'Solo rallentamento.'},
  {id:'m52',tipo:'mg',lvl:2,min:4,stat:'ANIMA',stile:'fantasy',   nome:'Patto di Sangue',  bonus:1,mec:'Lega 2 alleati per 3 round: danno ricevuto diviso equamente (arrotonda su).',pro:'Equalizza sopravvivenza.',         con:'Se uno e debole, rischia.'},
  // L3 +2
  {id:'m25',tipo:'mg',lvl:3,min:5,stat:'MENTE',stile:'fantasy',  nome:'Fulmine',           bonus:2,mec:'1d12+MENTE+2 vs CORPO in linea. Oltre il primo: meta danno.',               pro:'Danno altissimo in linea.',        con:'Richiede allineamento.'},
  {id:'m26',tipo:'mg',lvl:3,min:5,stat:'MENTE',stile:'horror',   nome:'Controllo Mentale', bonus:2,mec:'1d12+MENTE+2 vs ANIMA. Vinci: 1 ordine semplice non suicida (1 round).',    pro:'Nemico diventa alleato temp.',     con:'1 round.'},
  {id:'m27',tipo:'mg',lvl:3,min:5,stat:'MENTE',stile:'fantasy',  nome:'Muro di Ghiaccio',  bonus:2,mec:'Barriera solida 10 min. Sfondare: CORPO vs 12.',                            pro:'Divide il campo.',                 con:'No danno.'},
  {id:'m28',tipo:'mg',lvl:3,min:5,stat:'MENTE',stile:'anime',    nome:'Tempesta di Lame',  bonus:2,mec:'1d12+MENTE+2 vs CORPO di tutti entro 3m da te.',                            pro:'Area devastante.',                 con:'Colpisce alleati vicini.'},
  {id:'m29',tipo:'mg',lvl:3,min:5,stat:'MENTE',stile:'horror',   nome:'Maledizione',       bonus:2,mec:'1d12+MENTE+2 vs ANIMA. Vinci: Indebolito (stat a scelta) per intera sessione.',pro:'Debuff permanente.',             con:'Richiede vittoria.'},
  {id:'m30',tipo:'mg',lvl:3,min:5,stat:'ANIMA',stile:'horror',   nome:'Aura di Morte',     bonus:2,mec:'1d12+ANIMA+2: nemici in raggio -1/round in zona (max -3).',                 pro:'Debuff crescente.',                con:'Nemici possono allontanarsi.'},
  {id:'m31',tipo:'mg',lvl:3,min:5,stat:'ANIMA',stile:'horror',   nome:'Anima in Prestito', bonus:2,mec:'1d12+ANIMA+2 vs 15. Richiami alleato caduto QUESTO round (1 HP). 1x/riposo.',pro:'Salvataggio immediato.',          con:'Tiro difficile.'},
  {id:'m32',tipo:'mg',lvl:3,min:5,stat:'ANIMA',stile:'anime',    nome:'Grido di Guerra',   bonus:2,mec:'1d12+ANIMA+2: alleati +2 attacco, ignorano Ferito per 2 round.',             pro:'Buff massiccio.',                  con:'Dura 2 round.'},
  {id:'m33',tipo:'mg',lvl:3,min:5,stat:'MENTE',stile:'cyberpunk',nome:'Hacking di Massa',  bonus:2,mec:'1d12+MENTE+2 vs 10: controllo sistemi digitali entro 20m per 2 round.',      pro:'Dominio tecno in area.',           con:'Organici immuni.'},
  {id:'m34',tipo:'mg',lvl:3,min:5,stat:'ANIMA',stile:'anime',    nome:'Urlo Berserker',    bonus:2,mec:'ANIMA: +4 attacchi per 2 round. Poi Indebolito (CORPO) 1 round.',            pro:'Offensiva devastante.',            con:'Esaurimento post-uso.'},
  {id:'m46',tipo:'mg',lvl:3,min:5,stat:'ANIMA',stile:'horror',   nome:'Richiamo dell\'Antico',bonus:2,mec:'1d12+ANIMA+2 vs 10: tutti entro raggio: ANIMA vs 10 o Spaventato 1 round.',pro:'Area paura potentissima.',       con:'Entita puo restare (GM).'},
  {id:'m50',tipo:'mg',lvl:3,min:5,stat:'ANIMA',stile:'anime',    nome:'Tecnica Ultimo Stadio',bonus:2,mec:'1d12+ANIMA+2 vs CORPO. Danno massimizzato (d12=12). 1x/sessione.',       pro:'Danno max garantito.',             con:'1 uso per sessione.'},
  // NUOVE L3
  {id:'m53',tipo:'mg',lvl:3,min:5,stat:'ANIMA',stile:'universale',nome:'Scudo di Gruppo',  bonus:2,mec:'Alleati entro 5m: +2 difesa CORPO per 2 round. Costa la tua azione.',        pro:'Buff difensivo di gruppo.',        con:'Costa azione.'},
  {id:'m54',tipo:'mg',lvl:3,min:5,stat:'ANIMA',stile:'anime',    nome:'Volonta del Conquistatore',bonus:2,mec:'1d12+ANIMA+2 vs ANIMA tutti in 10m. Perdi 5+: Spaventato 2 round. Perdi: -1 prossimo tiro.',pro:'Area intimidazione.',con:'Slot L3 richiesto.'},
  // L4 +3
  {id:'m35',tipo:'mg',lvl:4,min:6,stat:'MENTE',stile:'fantasy',  nome:'Resurrezione',      bonus:3,mec:'Stabilizza 1 alleato 0 HP -> torna a CORPO HP. 1x/riposo lungo.',            pro:'Salva dalla morte.',               con:'1 uso.'},
  {id:'m36',tipo:'mg',lvl:4,min:6,stat:'MENTE',stile:'universale',nome:'Teletrasporto',    bonus:3,mec:'Sposta chiunque tocchi in luogo noto. 1x/giorno.',                           pro:'Fuga o riposizionamento.',         con:'Devi conoscere il luogo.'},
  {id:'m37',tipo:'mg',lvl:4,min:6,stat:'MENTE',stile:'anime',    nome:'Nova Arcana',       bonus:3,mec:'1d12+MENTE+3 vs CORPO in area enorme. Esaurisce TUTTI gli slot.',           pro:'Danno devastante.',                con:'Esaurisce tutto.'},
  {id:'m38',tipo:'mg',lvl:4,min:6,stat:'MENTE',stile:'universale',nome:'Arresto del Tempo',bonus:3,mec:'Agisci 1 round extra fuori dal tempo. 1x/giorno.',                          pro:'Un round extra.',                  con:'1 uso.'},
  {id:'m39',tipo:'mg',lvl:4,min:6,stat:'ANIMA',stile:'horror',   nome:'Dominio',           bonus:3,mec:'1d12+ANIMA+3 vs ANIMA. Controllo completo per 1 ora. No atti suicidi.',     pro:'Controllo totale.',                con:'Richiede vittoria.'},
  {id:'m40',tipo:'mg',lvl:4,min:6,stat:'ANIMA',stile:'horror',   nome:"Sacrificio d'Anima",bonus:3,mec:'Spendi 2 HP per ogni 1 HP curato agli alleati in raggio. 1x/riposo.',       pro:'Healing massiccio.',               con:'Costa i tuoi HP.'},
  {id:'m41',tipo:'mg',lvl:4,min:6,stat:'ANIMA',stile:'horror',   nome:'Grande Maledizione',bonus:3,mec:'1d12+ANIMA+3 vs ANIMA. Maledizione permanente fino a dispel.',              pro:'Permanente.',                      con:'Effetto specifico col GM.'},
  {id:'m42',tipo:'mg',lvl:4,min:6,stat:'MENTE',stile:'cyberpunk',nome:'Trasferimento Coscienza',bonus:3,mec:'1d12+MENTE+3 vs MENTE. Scambi coscienza con bersaglio 10 min.',       pro:'Infiltrazione totale.',            con:'Il tuo corpo e vulnerabile.'},
  {id:'m47',tipo:'mg',lvl:4,min:6,stat:'MENTE',stile:'horror',   nome:'Frammentazione Cosmica',bonus:3,mec:'1d12+MENTE+3 vs MENTE. Fallisce ogni tiro con 1-4 per 2 round.',       pro:'Raddoppia fallimenti critici.',    con:'Se fallisci: -1 MENTE.'},
  // NUOVA L4
  {id:'m55',tipo:'mg',lvl:4,min:6,stat:'MENTE',stile:'universale',nome:'Disintegrazione',  bonus:3,mec:'1d12+MENTE+3 vs CORPO. Ignora bonus armatura. Danno = margine x2.',         pro:'Ignora armatura, danno doppio.',   con:'Non ignora scudo.'}
];

// ═══ TALENTI ═══
const TALENTS = [
  // ACCESSI
  {id:'gate_ab',cat:'accesso',stile:'universale',req:null,      nome:'Armi - Base',     desc:'Sblocca Cat C e i suoi 5 perk.',                              pro:'Accesso a +4 attacco.',           con:'Costa 1 slot talento.'},
  {id:'gate_aa',cat:'accesso',stile:'universale',req:'gate_ab', nome:'Armi - Avanzato', desc:'Sblocca Cat D. Richiede Armi Base.',                          pro:'Massimo potere fisico.',           con:'Richiede Armi Base.'},
  {id:'gate_mb',cat:'accesso',stile:'universale',req:null,      nome:'Magia - Base',    desc:'Sblocca magie L1-2. Slot = max(MENTE,ANIMA)-2.',              pro:'Magie L1-2 disponibili.',         con:'Costa 1 slot talento.'},
  {id:'gate_ma',cat:'accesso',stile:'universale',req:'gate_mb', nome:'Magia - Avanzata',desc:'Sblocca magie L3-4. Richiede Magia Base.',                   pro:'Le magie piu potenti.',            con:'Richiede Magia Base.'},
  // LIMITI
  {id:'cap_12', cat:'limite', stile:'universale',req:null,      nome:'Limite Elevato',  desc:'Cap caratteristiche: 10 -> 12.',                              pro:'Stat piu alte.',                  con:'Costa 1 slot talento.'},
  {id:'cap_15', cat:'limite', stile:'universale',req:'cap_12',  nome:'Limite Maestro',  desc:'Cap: 12 -> 15. Richiede Limite Elevato.',                    pro:'Valori massimi del sistema.',      con:'Richiede Limite Elevato.'},
  // CORPO
  {id:'t01',cat:'corpo',stile:'fantasy',   req:null,nome:'Pelle Dura',          desc:'Riduci di 1 tutti i danni fisici (min 0). Passivo.',                pro:'Riduzione su ogni colpo.',        con:'Inutile vs magie.'},
  {id:'t02',cat:'corpo',stile:'universale',req:null,nome:'Colpo Preciso',       desc:'1x/combat: se superi la difesa, attacco fisico fa minimo 5 danno.',  pro:'Garantisce danno.',               con:'1 uso.'},
  {id:'t03',cat:'corpo',stile:'fantasy',   req:null,nome:'Resistenza Innata',   desc:'Immune a condizione Avvelenato. +3 vs veleni potenti.',              pro:'Potente con veleni.',             con:'Situazionale.'},
  {id:'t04',cat:'corpo',stile:'universale',req:null,nome:'Atletismo Estremo',   desc:'+3 a tiri CORPO non-combat (scalare, nuotare, saltare).',            pro:'Dominante in esplorazione.',      con:'Zero combat.'},
  {id:'t05',cat:'corpo',stile:'universale',req:null,nome:'Sfida',               desc:'Provochi un nemico: deve attaccarti o fallisce ANIMA vs tua ANIMA.', pro:'Protegge alleati.',               con:'Attiri danni.'},
  {id:'t06',cat:'corpo',stile:'anime',     req:null,nome:'Furia',               desc:'Sotto meta HP: +2 ai tiri di attacco fisico. Passivo.',              pro:'Letale in pericolo.',             con:'Richiede essere ferito.'},
  {id:'t07',cat:'corpo',stile:'fantasy',   req:null,nome:'Guarigione Naturale', desc:'+2 HP per round di riposo breve.',                                   pro:'Healing passivo.',                con:'Zero in combat.'},
  {id:'t08',cat:'corpo',stile:'fantasy',   req:null,nome:'Colosso',             desc:'CORPO conta +1 per HP max (non aggiunge alla stat).',                pro:'HP extra senza sacrifici.',       con:'Solo sopravvivenza.'},
  {id:'t48',cat:'corpo',stile:'anime',     req:null,nome:'Superamento del Limite',desc:'Dopo crisi, 1x/sessione: recupera 5 HP, +2 tiri per 2 round.',    pro:'Rimonta potente.',                con:'1 uso. GM decide.'},
  // NUOVI CORPO
  {id:'t51',cat:'corpo',stile:'universale',req:null,nome:'Doppia Impugnatura',  desc:'2 armi Cat A. Attacchi 2x a -3 ciascuno. No scudo. Se entrambi mancano: Indebolito (CORPO) 1 round.',pro:'Potenziale doppio danno.',con:'No scudo, -3 per attacco, rischio.'},
  {id:'t52',cat:'corpo',stile:'universale',req:null,nome:'Colpo Critico',       desc:'Su 12 naturale al d12: +4 danno bonus. Passivo.',                   pro:'Bonus su critico.',               con:'Solo su 12 naturale (8%).'},
  // MENTE
  {id:'t09',cat:'mente',stile:'noir',      req:null,nome:'Analisi del Nemico',  desc:'Osserva 1 round senza attaccare: GM rivela tratto o debolezza.',     pro:'Info tattica gratuita.',          con:'Sprechi un round.'},
  {id:'t10',cat:'mente',stile:'horror',    req:null,nome:'Resistenza Mentale',  desc:'+3 difesa vs magie mentali. Immune a condizione Confuso.',           pro:'Contro maghi.',                   con:'Solo vs magie mentali.'},
  {id:'t11',cat:'mente',stile:'noir',      req:null,nome:'Memoria Eidettica',   desc:'Ricordi tutto cio che hai visto/sentito.',                           pro:'Nessuna perdita di info.',        con:'Zero combat.'},
  {id:'t12',cat:'mente',stile:'noir',      req:null,nome:'Polimata',            desc:'+3 a tiri MENTE di conoscenza, ricerca e identificazione.',          pro:'Esperto del sapere.',             con:'Solo conoscenza.'},
  {id:'t13',cat:'mente',stile:'fantasy',   req:null,nome:'Concentrazione',      desc:'Mantieni attivi due effetti magici contemporaneamente.',              pro:'Raddoppia utilita caster.',       con:'Inutile senza magie.'},
  {id:'t14',cat:'mente',stile:'fantasy',   req:null,nome:'Occhio di Falco',     desc:'+2 ai tiri di attacco con armi a distanza.',                        pro:'Specializzazione arcieri.',       con:'Solo distanza.'},
  {id:'t15',cat:'mente',stile:'universale',req:null,nome:'Tattico',             desc:'1x/combat: redirige attacco di un alleato verso bersaglio migliore.', pro:'Ottimizza azioni gruppo.',       con:'1 uso.'},
  {id:'t33',cat:'mente',stile:'cyberpunk', req:null,nome:'Hacker',              desc:'+3 MENTE vs sistemi digitali. Intrusioni senza strumenti.',          pro:'Dominio in ambienti tech.',       con:'Inutile senza tecnologia.'},
  {id:'t34',cat:'mente',stile:'noir',      req:null,nome:'Investigatore',       desc:'Passivo: GM segnala se c\'e qualcosa di nascosto. +2 tiri MENTE deduzione.',pro:'Non sfugge nulla.',        con:'Il GM decide.'},
  {id:'t35',cat:'mente',stile:'universale',req:null,nome:'Adrenalina Innata',   desc:'1x/combat: ritira qualsiasi dado e prendi il migliore.',             pro:'Salva da situazioni critiche.',   con:'1 uso.'},
  {id:'t43',cat:'mente',stile:'horror',    req:null,nome:'Cultista',            desc:'Membro di setta. +3 conoscenza riti. 1x/sessione la setta fornisce risorsa.',pro:'Rete di risorse oscure.',  con:'La setta ti osserva. Compiti dal GM.'},
  {id:'t44',cat:'mente',stile:'horror',    req:null,nome:'Mente Blindata',      desc:'+4 vs follia e orrore cosmico. Immune prima maledizione/sessione.',  pro:'Counter horror cosmico.',         con:'-1 ANIMA passivo.'},
  {id:'t50',cat:'mente',stile:'anime',     req:null,nome:'Discepolo del Maestro',desc:'Hai un maestro. +2 vs tecniche che ti ha insegnato a riconoscere.', pro:'Bonus permanente + narrativa.',   con:'Se il maestro muore, perdi bonus.'},
  // NUOVI MENTE
  {id:'t53',cat:'mente',stile:'fantasy',   req:null,nome:'Metamagia',           desc:'1x/combat: lancia magia a distanza doppia, OPPURE cambia stat difesa bersaglio. Dichiari prima del tiro.',pro:'Flessibilita caster.',con:'1 uso.'},
  // ANIMA
  {id:'t16',cat:'anima',stile:'universale',req:null,nome:'Aura di Comando',     desc:'Alleati vicini +1 ai tiri quando dai indicazioni come azione.',       pro:'Potenzia il gruppo.',             con:'Richiede la tua azione.'},
  {id:'t17',cat:'anima',stile:'noir',      req:null,nome:'Empatia',             desc:'Sai sempre se qualcuno mente. GM dice "sincero"/"mente" (passivo).',  pro:'Potente in indagini.',            con:'Il GM puo giocare su "crede".'},
  {id:'t18',cat:'anima',stile:'anime',     req:null,nome:'Spirito Indomabile',  desc:'Penalita ferite un tier dopo: Ferito=0, Critico=-1.',                 pro:'Efficace piu a lungo.',          con:'Non riduce il danno.'},
  {id:'t19',cat:'anima',stile:'universale',req:null,nome:'Ispirazione',         desc:'1x/riposo lungo: +4 al tiro di un alleato.',                         pro:'Cambia momenti cruciali.',        con:'1 uso al giorno.'},
  {id:'t20',cat:'anima',stile:'universale',req:null,nome:'Senso del Pericolo',  desc:'Non puoi essere sorpreso. Sempre la tua azione in imboscata.',        pro:'Nessun agguato.',                con:'Situazionale.'},
  {id:'t21',cat:'anima',stile:'noir',      req:null,nome:'Voce della Ragione',  desc:'+3 a tiri ANIMA di persuasione, diplomazia, negoziazione.',           pro:'Domina contesti sociali.',        con:'Solo social.'},
  {id:'t22',cat:'anima',stile:'noir',      req:null,nome:"Nervi d'Acciaio",     desc:'Immune a condizione Spaventato. +1 vs coercizione.',                 pro:'Inflessibile.',                   con:'Situazionale.'},
  {id:'t36',cat:'anima',stile:'anime',     req:null,nome:'Aura di Ki',          desc:'+2 ANIMA intimidire E ispirare. Nemici ti vedono come minaccia.',     pro:'Doppio beneficio.',               con:'Nemici ti prendono di mira.'},
  {id:'t37',cat:'anima',stile:'horror',    req:null,nome:'Sangue Maledetto',    desc:'1x/sessione: sacrifica fino a 5 HP per +1 tiri per HP speso (resto scena).',pro:'Burst di potere.',          con:'Costa HP. Max +5.'},
  {id:'t45',cat:'anima',stile:'horror',    req:null,nome:'Servo dell\'Antico',  desc:'1x/sessione: entita agisce 1 round (GM), poi tu +3 tiri per 1 round.',pro:'Potere enorme.',                 con:'GM controlla entita.'},
  {id:'t46',cat:'anima',stile:'horror',    req:null,nome:'Ritualista',          desc:'Con 10 min e materiali: +5 tiro magico, cura 5 HP, o -2 a bersaglio.',pro:'Potere fuori-combat enorme.',    con:'Materiali richiesti. Fallimenti hanno conseguenze.'},
  {id:'t47',cat:'anima',stile:'anime',     req:null,nome:'Nakama',              desc:'1x/combat: se alleato a <= 1/3 HP, +4 tiri per 1 round.',            pro:'Burst situazionale forte.',       con:'Solo se alleato in pericolo.'},
  // NUOVI ANIMA
  {id:'t54',cat:'anima',stile:'horror',    req:null,nome:'Ultimo Respiro',      desc:'Quando alleato a 0 HP entro 5m: reazione, cura ANIMA HP. 1x/riposo lungo.',pro:'Salvataggio clutch.',       con:'1 uso al giorno.'},
  {id:'t55',cat:'anima',stile:'cyberpunk', req:null,nome:'Scarica Adrenalinica',desc:'1x/combat: turno extra immediato. Poi Indebolito (CORPO) 2 round. No cumulo con altri effetti turno-extra.',pro:'Turno extra.',con:'Esaurimento post-uso.'},
  // IBRIDO
  {id:'t23',cat:'ibrido',stile:'universale',req:null,nome:"Maestro d'Armi",     desc:'Il perk arma puo essere usato 2x/combat.',                           pro:'Raddoppia perk.',                con:'Dipende dal perk.'},
  {id:'t24',cat:'ibrido',stile:'universale',req:null,nome:'Contrattacco',       desc:'Quando un nemico fa 0 danno contro di te, rispondi come reazione.',   pro:'Punisce le mancanze nemiche.',   con:'Solo quando il nemico manca.'},
  {id:'t25',cat:'ibrido',stile:'noir',     req:null,nome:'Sangue Freddo',       desc:'Le penalita ferite si applicano un tier dopo.',                       pro:'Efficace piu a lungo.',          con:'Non riduce il danno.'},
  {id:'t26',cat:'ibrido',stile:'fantasy',  req:null,nome:'Cacciatore',          desc:'+2 attacchi contro bersaglio gia colpito nello stesso combat.',       pro:'Scala contro boss.',              con:'No bonus al primo colpo.'},
  {id:'t27',cat:'ibrido',stile:'universale',req:null,nome:'Adattamento Rapido', desc:'1x/sessione: usa stat diversa per 1 azione (accordo GM).',            pro:'Flessibilita narrativa.',         con:'1 uso.'},
  {id:'t28',cat:'ibrido',stile:'anime',    req:null,nome:'Riflessi Fulminei',   desc:'+2 iniziativa. A parita agisci per primo.',                           pro:'Vantaggio tattico.',              con:'Solo iniziativa.'},
  {id:'t29',cat:'ibrido',stile:'fantasy',  req:null,nome:'Predatore',           desc:'+2 attacchi contro bersagli che si sono gia mossi.',                  pro:'Contro unita veloci.',            con:'Inutile vs nemici lenti.'},
  {id:'t30',cat:'ibrido',stile:'anime',    req:null,nome:'Volonta di Ferro',    desc:'Prima volta a 0 HP: agisci ancora 1 round prima di cadere.',          pro:'Ultimo gesto eroico.',            con:'Una sola volta.'},
  {id:'t31',cat:'ibrido',stile:'universale',req:null,nome:'Doppia Minaccia',    desc:'Con Armi Base, alterna perk Cat C e Cat A nello stesso combat.',      pro:'Combina due categorie.',          con:'Richiede Armi Base.'},
  {id:'t32',cat:'ibrido',stile:'universale',req:null,nome:'Presenza Letale',    desc:'Nemici che mancano in mischia: -1 al prossimo tiro. Passivo.',        pro:'Punisce ogni mancanza.',          con:'Solo mischia.'},
  {id:'t38',cat:'ibrido',stile:'universale',req:null,nome:'Sincronia',          desc:'Attacchi stesso bersaglio di un alleato: entrambi +2 al tiro.',       pro:'Sinergia intensa.',               con:'Richiede coordinazione.'},
  {id:'t39',cat:'ibrido',stile:'noir',     req:null,nome:'Cacciatore di Taglie',desc:'+3 a tiri MENTE per tracciare bersaglio gia visto.',                 pro:'Tracker infallibile.',            con:'Solo vs bersagli gia visti.'},
  {id:'t40',cat:'ibrido',stile:'post-ap', req:null,nome:'Arma Improvvisata',   desc:'Qualsiasi oggetto e Cat B weapon. Senza perk.',                       pro:'Mai disarmato.',                  con:'Nessun perk.'},
  {id:'t41',cat:'ibrido',stile:'horror',   req:null,nome:'Presagio',            desc:'GM ti avverte di pericoli soprannaturali nell\'area immediata.',       pro:'Nessuna sorpresa soprannaturale.',con:'Il GM decide il timing.'},
  {id:'t42',cat:'ibrido',stile:'post-ap', req:null,nome:'Sopravvivenza Estrema',desc:'+3 tiri CORPO sopravvivenza. Non puoi perderti. 1x/giorno trova risorse.',pro:'Indispensabile in aree ostili.', con:'Inutile in ambienti urbani.'},
  {id:'t49',cat:'ibrido',stile:'anime',   req:null,nome:'Tecnica Segreta',     desc:'1x/sessione: dichiara nome tecnica, +5 prossimo tiro. Narrativamente vincolata.',pro:'Bonus enorme nel momento giusto.',con:'1 uso. Deve essere coerente.'},
  // NUOVI IBRIDO
  {id:'t56',cat:'ibrido',stile:'fantasy',  req:null,nome:'Legame Familiare',    desc:'Hai un familiare. +2 tiri MENTE esplorazione. 1x/combat intercetta 1 attacco (muore, torna dopo riposo lungo).',pro:'Difesa + esplorazione.',con:'Se muore, 1 riposo senza bonus.'}
];

// ═══ AUGMENTS / MIGLIORAMENTI FISICI (max 3) ═══
const AUGMENTS = [
  // CYBERPUNK
  {id:'aug_oc',stile:'cyberpunk',tipo:'Cyberware',nome:'Occhi Cybertici',desc:'HUD integrato, zoom 10x, visione notturna.',pro:'+2 tiri MENTE visivi. Visione notturna.',con:'Visibili (LED). -1 ANIMA in contesti conservatori.',manutenzione:'Calibrazione mensile.'},
  {id:'aug_bm',stile:'cyberpunk',tipo:'Cyberware',nome:'Braccio Meccanico',desc:'Esoscheletro. Forza idraulica.',pro:'+2 CORPO attacchi fisici. Solleva il doppio.',con:'-1 ANIMA formale. -1 CORPO stealth.',manutenzione:'Calibrazione settimanale.'},
  {id:'aug_rn',stile:'cyberpunk',tipo:'Cyberware',nome:'Riflessi Neurali',desc:'Cablaggio sinaptico accelerato.',pro:'+3 iniziativa. +1 difesa CORPO.',con:'Stress: CORPO vs 7 o Indebolito (MENTE). Incomp. Limitatore Rimosso.',manutenzione:'Soppressori mensili.'},
  {id:'aug_ds',stile:'cyberpunk',tipo:'Cyberware',nome:'Dermascheletro',desc:'Piastre subderminiche.',pro:'Riduce 2 danni fisici (min 0).',con:'-1 CORPO atletismo.',manutenzione:null},
  {id:'aug_in',stile:'cyberpunk',tipo:'Cyberware',nome:'Interfaccia Neurale',desc:'Jack cranico per connessione digitale.',pro:'+3 MENTE vs sistemi digitali.',con:'Vulnerabile ad hacking (MENTE vs MENTE).',manutenzione:'Firmware mensile.'},
  {id:'aug_gp',stile:'cyberpunk',tipo:'Cyberware',nome:'Gambe Potenziate',desc:'Servoassistite. Salti 3m, velocita doppia.',pro:'Movimento doppio. +3 CORPO salto.',con:'-2 CORPO stealth in corsa.',manutenzione:'Ammortizzatori settimanali.'},
  {id:'aug_ca',stile:'cyberpunk',tipo:'Cyberware',nome:'Cuore Artificiale',desc:'Pompa meccatronica.',pro:'HP max +4. Immune veleni cardiovascolari.',con:'-1 ANIMA permanente.',manutenzione:'Batteria trimestrale.'},
  {id:'aug_np',stile:'cyberpunk',tipo:'Nanotech',nome:'Nanite Protettive',desc:'Microrobot riparatori.',pro:'+1 HP/round riposo breve. Veleni -1 round.',con:'In EMP: -3 tiri per 2 round.',manutenzione:null},
  // FANTASY
  {id:'aug_sd',stile:'fantasy',tipo:'Alchemico',nome:'Sangue del Drago',desc:'Metabolismo modificato.',pro:'Ignora 3 danni fuoco. +1 CORPO.',con:'-1 tiri in climi caldi.',manutenzione:null},
  {id:'aug_lp',stile:'fantasy',tipo:'Bioware',nome:'Tessuto Licantropo',desc:'Rigenerazione licantropa.',pro:'Rigenera 1 HP/round fuori combat. Artigli Cat A.',con:'-1 MENTE in luna piena. ANIMA vs 8 o perdi controllo.',manutenzione:null},
  {id:'aug_ov',stile:'fantasy',tipo:'Magico',nome:'Occhio del Veggente',desc:'Terzo occhio magico.',pro:'+2 MENTE tiri magici. Rilevi aure 10m.',con:'-1 ANIMA social. Visioni involontarie.',manutenzione:null},
  {id:'aug_rc',stile:'fantasy',tipo:'Runa',nome:'Rune Corporee',desc:'Rune incise nella carne.',pro:'+2 difesa CORPO. Immune prima maledizione/sessione.',con:'Dispelling: -1 difesa/round. Visibili.',manutenzione:null},
  {id:'aug_ga',stile:'fantasy',tipo:'Bioware',nome:'Ghiandole Alchemiche',desc:'Organi sintetici.',pro:'1x/riposo: sostanza (veleno/acido/adrenalina/siero).',con:'Dieta specifica. Senza: -1 CORPO 1 ora.',manutenzione:'Dieta mensile.'},
  // HORROR
  {id:'aug_pm',stile:'horror',tipo:'Patto',nome:'Patto col Morto',desc:'Accordo con entita.',pro:'1x/sessione: info unica. +1 difesa ANIMA.',con:'Entita puo interferire.',manutenzione:'Rispetta patti o -2 tiri.'},
  {id:'aug_cm',stile:'horror',tipo:'Biomod',nome:'Carne Modulata',desc:'Corpo rimodellabile.',pro:'Rimodella arto (Cat A, strumento, superficie).',con:'-1 ANIMA permanente. Temperature estreme: -2 tiri.',manutenzione:null},
  {id:'aug_nm',stile:'horror',tipo:'Neurologia',nome:'Nervo Morto',desc:'Anestetizzazione dolore.',pro:'Immune penalita Ferito. +1 CORPO resistenza.',con:'Non senti danni minori. Ferite nascoste (GM).',manutenzione:null},
  {id:'aug_sc',stile:'horror',tipo:'Patto',nome:'Sigillo Corrotto',desc:'Sigillo magico oscuro.',pro:'+2 a tipo tiro scelto. Sempre attivo.',con:'Ad ogni uso: d6, su 1 entita guarda attraverso te.',manutenzione:null},
  {id:'aug_mk',stile:'horror',tipo:'Patto Cosmico',nome:'Marchio dell\'Antico',desc:'Simbolo entita cosmica.',pro:'+2 ANIMA vs entita cosmiche. Percepisci elder god 500m.',con:'-1 MENTE per sessione. Sogni cosmici.',manutenzione:'Rituali mensili.'},
  {id:'aug_oc2',stile:'horror',tipo:'Biomod Cosmico',nome:'Occhio del Caos',desc:'Occhio alieno.',pro:'+3 percezione soprannaturale. 50% futuro 1x/combat.',con:'-1 ANIMA permanente. Visioni non controllabili.',manutenzione:null},
  {id:'aug_sang',stile:'horror',tipo:'Rituale di Setta',nome:'Legame di Sangue',desc:'Rete psichica di setta.',pro:'Senti membri 1 km. +2 ANIMA rituali collettivi.',con:'Setta ti localizza sempre. GM ha accesso pensieri.',manutenzione:'Rito mensile.'},
  {id:'aug_corp',stile:'horror',tipo:'Corruzione',nome:'Corruzione Benedetta',desc:'Corpo parzialmente corrotto.',pro:'+1 CORPO, +1 ANIMA. Rigenera 1 HP/round sotto meta HP.',con:'Rigenerazione: d6, su 1 tratto orrorifico. Non-umano.',manutenzione:null},
  {id:'aug_voc',stile:'horror',tipo:'Rituale di Setta',nome:'Voce dell\'Abisso',desc:'Voce modificata da rituale.',pro:'+3 ANIMA intimidazione. Vero Nome: entita non attacca 1 round.',con:'-2 ANIMA social normali. Attira attenzione entita.',manutenzione:null},
  // ANIME
  {id:'aug_lr',stile:'anime',tipo:'Neurologia',nome:'Limitatore Rimosso',desc:'Blocco mentale rimosso.',pro:'1x/combat: stat bonus x1.5 per 1 round.',con:'-5 HP dopo. Incomp. Riflessi Neurali / Gate.',manutenzione:null},
  {id:'aug_fd',stile:'anime',tipo:'Biomod',nome:'Forma Duale',desc:'Trasformazione controllata.',pro:'1x/combat: +2 tiri, +2 HP temp per 3 round.',con:'Dopo: Indebolito (CORPO) 2 round. Aspetto cambia.',manutenzione:null},
  {id:'aug_ck',stile:'anime',tipo:'Spirituale',nome:'Core di Ki',desc:'Riserva energia spirituale.',pro:'+2 attacchi magici. Usa stat piu alta per magie.',con:'2 magie consecutive: -2 HP. Ki visibile.',manutenzione:null},
  {id:'aug_asc',stile:'anime',tipo:'Ascensione',nome:'Forma Ascesa',desc:'Vera forma di potere.',pro:'1x/sessione: +4 tiri, +5 HP temp per 4 round. Attacchi magici.',con:'Dopo: Stordito 1 round, poi -3 tiri 2 round. No con Forma Duale.',manutenzione:null},
  {id:'aug_spirit',stile:'anime',tipo:'Spirituale',nome:'Spirito dell\'Arma',desc:'Arma con coscienza.',pro:'+2 attacchi fisici. +1 iniziativa. 1x/sessione nega critico.',con:'Spirito ha volonta propria (GM). Se distrutta: -bonus 1 sessione.',manutenzione:'Cura narrativa.'},
  {id:'aug_gate',stile:'anime',tipo:'Energia Interiore',nome:'Gate dell\'Anima',desc:'Canali energetici potenziati.',pro:'+1 tutti tiri. Azione: apri gate +4 attacco 1 round.',con:'Gate: -3 HP. 3+ aperture/sessione: -1 CORPO. Incomp. Limitatore.',manutenzione:'Meditazione. Senza: -5 HP.'},
  {id:'aug_manif',stile:'anime',tipo:'Manifestazione',nome:'Eco dell\'Anima',desc:'Manifestazione psichica.',pro:'Azione bonus Cat A a 5m. +2 ANIMA social. 1x/sessione intercetta.',con:'Danno all\'eco = danno a te. Visibile.',manutenzione:null},
  // UNIVERSALE / NOIR / POST-AP
  {id:'aug_ws',stile:'universale',tipo:'Biologico',nome:'Cicatrice della Guerra',desc:'Segni permanenti.',pro:'+1 CORPO. Immune Ferito in primo combat/sessione.',con:'-1 ANIMA vs non-combattenti. Trigger: -1 MENTE 1 round.',manutenzione:null},
  {id:'aug_ps',stile:'universale',tipo:'Protesi',nome:'Protesi Specializzata',desc:'Protesi per scopo preciso.',pro:'+3 a tipo specifico tiro CORPO.',con:'-1 altri tiri CORPO.',manutenzione:'Manutenzione mensile.'},
  {id:'aug_mi',stile:'noir',tipo:'Neurologia',nome:'Mente da Investigatore',desc:'Condizionamento cognitivo.',pro:'GM dice se hai perso qualcosa. +2 MENTE vs illusioni.',con:'-1 ANIMA in situazioni emotive.',manutenzione:null},
  {id:'aug_it',stile:'post-ap',tipo:'Biologico',nome:'Immunizzazione Tossica',desc:'Corpo adattato a tossine.',pro:'Immune ambienti tossici. +3 vs veleni.',con:'-1 cure magiche/alchemiche.',manutenzione:null}
];

// ═══ MOSTRI ESEMPIO ═══
const MONSTERS = [
  // GREGARI (HP 4-8, 1 colpo)
  {id:'mon01',nome:'Goblin',tier:'gregario',corpo:3,mente:2,anima:1,hp:6,armaCat:'A',armaPerk:'a2',scudo:0,armatura:0,competenza:null,talenti:[],augmenti:[],magie:[],note:'Attacca in gruppo. Fugge se solo.'},
  {id:'mon02',nome:'Scheletro',tier:'gregario',corpo:3,mente:1,anima:1,hp:5,armaCat:'A',armaPerk:'a3',scudo:0,armatura:0,competenza:null,talenti:[],augmenti:[],magie:[],note:'Immune Spaventato. Vulnerabile a danni contundenti.'},
  {id:'mon03',nome:'Drone da Combattimento',tier:'gregario',corpo:2,mente:4,anima:0,hp:4,armaCat:'A',armaPerk:'a1',scudo:0,armatura:1,competenza:'mente',talenti:[],augmenti:[],magie:[],note:'A distanza. Esplode a 0 HP (2 danno a 3m).'},
  // NORMALI (HP 12-20, 2-3 round)
  {id:'mon04',nome:'Cavaliere Corrotto',tier:'normale',corpo:5,mente:3,anima:3,hp:16,armaCat:'B',armaPerk:'b2',scudo:1,armatura:2,competenza:'corpo',talenti:['t01'],augmenti:[],magie:[],note:'Pelle Dura riduce 1 danno. Scudo + armatura media.'},
  {id:'mon05',nome:'Cultista Maggiore',tier:'normale',corpo:3,mente:5,anima:4,hp:12,armaCat:'A',armaPerk:'a4',scudo:0,armatura:0,competenza:'mente',talenti:['gate_mb'],augmenti:[],magie:['m01','m07'],note:'Lancia Dardo Magico e Voce del Terrore.'},
  {id:'mon06',nome:'Cyborg Mercenario',tier:'normale',corpo:5,mente:4,anima:2,hp:15,armaCat:'B',armaPerk:'b1',scudo:0,armatura:1,competenza:'corpo',talenti:[],augmenti:['aug_bm'],magie:[],note:'Braccio Meccanico: +2 CORPO attacchi.'},
  // ELITE (HP 25-40, 4-6 round)
  {id:'mon07',nome:'Drago Giovane',tier:'elite',corpo:8,mente:6,anima:4,hp:30,armaCat:'C',armaPerk:'c1',scudo:0,armatura:3,competenza:'corpo',talenti:['gate_ab','t01'],augmenti:['aug_sd'],magie:['m13'],note:'Soffio fuoco = Palla di Fuoco. Pelle Dura + Armatura Pesante. Volo.'},
  {id:'mon08',nome:'Assassino dell\'Ombra',tier:'elite',corpo:6,mente:7,anima:5,hp:25,armaCat:'C',armaPerk:'c5',scudo:0,armatura:1,competenza:'mente',talenti:['gate_ab','gate_mb','t14'],augmenti:['aug_rn'],magie:['m14','m17'],note:'Invisibilita + Blocco Pensiero. Riflessi Neurali.'},
  // BOSS (HP 50-100, 6-10 round)
  {id:'mon09',nome:'Lich Antico',tier:'boss',corpo:4,mente:10,anima:8,hp:60,armaCat:'A',armaPerk:'a5',scudo:0,armatura:0,competenza:'mente',talenti:['gate_mb','gate_ma','t13','cap_12','t10'],augmenti:['aug_ov','aug_rc','aug_mk'],magie:['m25','m29','m35','m47'],note:'Concentrazione doppia. Resistenza Mentale. 3 augment. Magie L3-L4.'},
  {id:'mon10',nome:'Shogun Demoniaco',tier:'boss',corpo:10,mente:6,anima:8,hp:80,armaCat:'D',armaPerk:'d3',scudo:0,armatura:3,competenza:'corpo',talenti:['gate_ab','gate_aa','t06','cap_12','t02'],augmenti:['aug_lr','aug_fd','aug_spirit'],magie:[],note:'Furia + Cat D + Limitatore Rimosso. Forma Duale. Spirito dell\'Arma. Puro combattente fisico devastante.'}
];

// ═══ WOUND TIERS ═══
const WOUND_TIERS = [
  {tier:0, nome:'Integro',      penalita:0,  desc:'Nessuna penalita.'},
  {tier:1, nome:'Ferito',       penalita:-1, desc:'-1 a tutti i tiri.'},
  {tier:2, nome:'Critico',      penalita:-2, desc:'-2 a tutti i tiri.'},
  {tier:3, nome:'Incapacitato', penalita:null, desc:'Non agisce. 3 round per stabilizzarlo.'}
];

// ═══ REST ═══
const REST_RULES = {
  breve: {nome:'Riposo Breve', durata:'10 minuti', effetto:'Recupera CORPO HP. Slot magie non recuperati.'},
  lungo: {nome:'Riposo Lungo', durata:'8 ore',     effetto:'Tutti HP recuperati. Tutti slot magia recuperati. Punti Eroe ripristinati.'}
};

// ═══ PUNTO EROE — Ispirato a 7th Sea ═══
const HERO_POINT = {
  nome: 'Punto Eroe',
  maxPerSession: 2,
  refresh: 'Inizio sessione (o Riposo Lungo a discrezione del GM)',
  rules: [
    'Ogni PG inizia la sessione con 2 Punti Eroe.',
    'Il giocatore descrive un\'azione drammatica, narrativa, eroica o disperata.',
    'Il GM valuta la descrizione: se è coerente col personaggio e la scena, l\'azione riesce automaticamente senza tiro.',
    'Se il GM ritiene che l\'azione sia troppo potente per un successo automatico, concede invece +6 al tiro.',
    'Il Punto Eroe si consuma in entrambi i casi.',
    'Un Punto Eroe può anche essere speso per: negare un colpo mortale (resti a 1 HP), aggiungere un dettaglio narrativo alla scena (con approvazione GM), oppure agire fuori turno con una reazione narrativa.',
    'Il GM può assegnare un Punto Eroe extra come ricompensa per giocate particolarmente creative o eroiche (max 3 totali).',
    'I Punti Eroe non si accumulano tra sessioni.'
  ],
  esempi: [
    {azione:'Il bardo salta dal balcone, afferra il lampadario e oscilla verso il nemico cantando.', esito:'Successo automatico — azione spettacolare e coerente col personaggio.'},
    {azione:'Il guerriero vuole tagliare in due il drago con un solo colpo.', esito:'+6 al tiro — troppo potente per un successo automatico, ma il bonus è enorme.'},
    {azione:'Il ladro vuole che ci sia una finestra aperta nel muro del castello.', esito:'Successo — il giocatore aggiunge un dettaglio narrativo ragionevole.'},
    {azione:'Il mago sta per morire: "Il mio maestro mi ha insegnato un ultimo trucco."', esito:'Nega il colpo mortale — resta a 1 HP con una motivazione narrativa.'}
  ]
};