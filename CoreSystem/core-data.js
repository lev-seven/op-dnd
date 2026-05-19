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
  D:{ nome:'Devastante', bonus:4, req:'armi_letali',   svan:'Richiede CORPO≥10 + talento Armi Letali obbligatorio. Due mani: no scudo. -1 iniziativa.', initMod:-1 },
  DX:{ nome:'Leggendaria', bonus:5, req:'armi_letali', svan:'−2 iniziativa. Richiede Armi Letali + Limite Elevato + CORPO 12. Solo via upgrade da Cat D.', initMod:-2 }
};

var WPERKS = {
A:[
  {id:'a_vel',nome:'Velocità',          stile:'universale',desc:'Attacchi non provocano reazioni di opportunità.',pro:'+1 iniziativa. Mobilità tattica.',con:'Nessun bonus al danno.',evolveIn:'b_vel'},
  {id:'a_pen',nome:'Penetrazione',      stile:'universale',desc:'Ignora 1 punto di DEF del bersaglio su ogni attacco.',pro:'Utile contro qualsiasi difesa.',con:'Effetto minimo su nemici con DEF bassa.',evolveIn:'b_pen'},
  {id:'a_sto',nome:'Stordimento',       stile:'universale',desc:'Su colpo: bersaglio −1 al prossimo tiro.',pro:'Debuff costante su ogni colpo.',con:'Effetto moderato, non cumulabile.',evolveIn:'b_sto'},
  {id:'a_pre',nome:'Precisione',        stile:'universale',desc:'Il danno non può essere inferiore a 2 su attacco riuscito.',pro:'Garantisce danno minimo.',con:'Inutile contro DEF molto bassa.',evolveIn:'b_pre'},
  {id:'a_res',nome:'Resilienza',        stile:'universale',desc:'+1 alla DEF finché questa arma è impugnata.',pro:'Difesa passiva costante.',con:'Perdi il bonus se disarmato.',evolveIn:'b_res'},
  {id:'fa_a1',nome:'Lama Sacra',        stile:'fantasy',   desc:'+1 danno contro non-morti e demoni. La lama emette luce fioca entro 5m.',pro:'Situazionalmente molto forte.',con:'Inutile contro nemici non-oscuri.',evolveIn:'fa_b1'},
  {id:'cy_a1',nome:'Impulso Digitale',  stile:'cyberpunk', desc:'Su colpo: 1 impianto del bersaglio va offline per 1 round.',pro:'Disabilita impianti chiave.',con:'Inutile contro nemici senza tecnologia.',evolveIn:'cy_b1'},
  {id:'ho_a1',nome:'Veleno Radicato',   stile:'horror',    desc:'Su colpo: bersaglio Avvelenato 1 round (−1 ai tiri).',pro:'Debuff immediato ogni colpo.',con:'Breve durata.',evolveIn:'ho_b1'},
  {id:'no_a1',nome:'Colpo Silenzioso',  stile:'noir',      desc:'Attacchi non producono suono udibile oltre 5m.',pro:'Stealth offensiva pura.',con:'Nessun bonus meccanico al danno.',evolveIn:'no_b1'},
  {id:'an_a1',nome:'Slancio di Ki',     stile:'anime',     desc:'Su colpo: spinge il bersaglio di 1m e non può usare reazioni per 1 round.',pro:'Controllo posizionale immediato.',con:'Bassa gittata della spinta.',evolveIn:'an_b1'},
],
B:[
  {id:'b_vel',nome:'Velocità Superiore',stile:'universale',desc:'+2 iniziativa. Puoi muoverti di 1m prima o dopo l\'attacco senza usare azione.',pro:'Mobilità + iniziativa forti.',con:'Bonus al danno assente.',evolveIn:'c_vel',daId:'a_vel'},
  {id:'b_pen',nome:'Penetrazione Profonda',stile:'universale',desc:'Ignora 2 punti DEF. Attacchi contano come magici.',pro:'Valore contro armature e immunità.',con:'Meno utile contro DEF bassa.',evolveIn:'c_pen',daId:'a_pen'},
  {id:'b_sto',nome:'Stordimento Pesante',stile:'universale',desc:'Su colpo: applica Rallentato 1 round.',pro:'Condizione vera, non solo −1.',con:'Singola condizione, 1 round.',evolveIn:'c_sto',daId:'a_sto'},
  {id:'b_pre',nome:'Colpo Garantito',  stile:'universale',desc:'Danno minimo 3. 1x/combat: ritira il dado se ottieni 1–3.',pro:'Affidabilità + ritiro emergenza.',con:'1 uso del ritiro per combat.',evolveIn:'c_pre',daId:'a_pre'},
  {id:'b_res',nome:'Guardia Solida',   stile:'universale',desc:'+1 DEF + +1 ai tiri CORPO per resistere a condizioni fisiche.',pro:'Difesa e resistenza combinate.',con:'Richiede di impugnare l\'arma.',evolveIn:'c_res',daId:'a_res'},
  {id:'b_cnt',nome:'Contrattacco',     stile:'universale',desc:'Quando un nemico ti manca in mischia: +2 al tuo prossimo attacco contro di lui.',pro:'Punisce le mancanze nemiche.',con:'Solo mischia, condizionale.',evolveIn:'c_cnt'},
  {id:'fa_b1',nome:'Lama Sacra Maggiore',stile:'fantasy', desc:'+2 danno vs oscurità. 1x/combat: rimuovi 1 condizione oscura al colpo.',pro:'Molto forte in campagne horror/dark.',con:'Situazionale fuori contesto.',evolveIn:'fa_c1',daId:'fa_a1'},
  {id:'fa_b2',nome:'Runa Minore',      stile:'fantasy',   desc:'1x/combat: imbui l\'arma con un elemento (fuoco/freddo/fulmine) per +1 danno di quel tipo.',pro:'Flessibilità elementale.',con:'Solo 1 uso, 1 tipo a volta.',evolveIn:'fa_c2'},
  {id:'cy_b1',nome:'EMP Localizzato',  stile:'cyberpunk', desc:'Su colpo: tutti gli impianti del bersaglio offline 1r + −1 tiri se ne usa.',pro:'Disabilita sistemi multipli.',con:'1 round, poi tutto torna.',evolveIn:'cy_c1',daId:'cy_a1'},
  {id:'cy_b2',nome:'Mirino Integrato', stile:'cyberpunk', desc:'+1 tiri a distanza. Ignora copertura leggera.',pro:'Specializzazione cecchino immediata.',con:'Solo a distanza.',evolveIn:'cy_c2'},
  {id:'ho_b1',nome:'Veleno Potenziato',stile:'horror',    desc:'Su colpo: Avvelenato 2 round + −1 CORPO per HP/Difesa durante durata.',pro:'Debuff esteso e composto.',con:'2 round, poi scade.',evolveIn:'ho_c1',daId:'ho_a1'},
  {id:'ho_b2',nome:'Aura Necrotica',   stile:'horror',    desc:'I non-morti entro 3m ignorano il portatore e non attaccano automaticamente.',pro:'Utilissimo in dungeon/horror.',con:'Non controlla i non-morti, solo neutralità.',evolveIn:'ho_c2'},
  {id:'no_b1',nome:'Fantasma',         stile:'noir',      desc:'Silenzioso. 1x/combat: attacca da angolo cieco → +2 tiro, non riveli posizione.',pro:'Stealth offensiva + bonus colpo.',con:'1 uso.',evolveIn:'no_c1',daId:'no_a1'},
  {id:'no_b2',nome:'Parole Taglienti', stile:'noir',      desc:'1x/combat: attacco verbale (portata voce) che infligge danno normale senza corpo a corpo.',pro:'Danno a distanza senza arco.',con:'1 uso, narrativamente vincolato.',evolveIn:'no_c2'},
  {id:'an_b1',nome:'Esplosione di Ki', stile:'anime',     desc:'Su colpo: spinge 2m + bersaglio Rallentato se fallisce CORPO vs tua ANIMA.',pro:'Spinta + condizione combo.',con:'Richiede fallimento tiro avversario.',evolveIn:'an_c1',daId:'an_a1'},
  {id:'an_b2',nome:'Tecnica di Agilità',stile:'anime',   desc:'+1 iniziativa. Dopo aver colpito: muoviti 2m come azione gratuita senza provocare reazioni.',pro:'Mobilità post-attacco.',con:'Solo dopo aver colpito.',evolveIn:'an_c2'},
],
C:[
  {id:'c_vel',nome:'Velocità Estrema',  stile:'universale',desc:'+2 iniziativa. Attacca e muoviti nella stessa azione senza penalità.',pro:'Mobilità piena in combattimento.',con:'Nessun bonus al danno.',evolveIn:'d_vel',daId:'b_vel'},
  {id:'c_pen',nome:'Perforante',        stile:'universale',desc:'Ignora 3 DEF. Se danno ≥ 4: riduce DEF bersaglio di 1 per tutto il combat.',pro:'Armor break permanente.',con:'Richiede danno ≥ 4.',evolveIn:'d_pen',daId:'b_pen'},
  {id:'c_sto',nome:'Colpo Disabilitante',stile:'universale',desc:'Su colpo: applica Stordito 1 round 1x/combat (bersaglio perde l\'azione).',pro:'Condizione grave, azione persa.',con:'1 uso.',evolveIn:'d_sto',daId:'b_sto'},
  {id:'c_pre',nome:'Colpo Infallibile', stile:'universale',desc:'Danno minimo 4. Su 12 naturale: +3 danno bonus.',pro:'Min alto + critico potenziato.',con:'Critico sempre raro (8%).',evolveIn:'d_pre',daId:'b_pre'},
  {id:'c_res',nome:'Fortezza',          stile:'universale',desc:'+2 DEF + immune a Indebolito mentre impugni questa arma.',pro:'Immunità a condizione comune.',con:'Solo se impugnata.',evolveIn:'d_res',daId:'b_res'},
  {id:'c_cnt',nome:'Contrattacco Istantaneo',stile:'universale',desc:'Quando un nemico ti manca: contrattacca immediatamente come reazione gratuita.',pro:'Attacco extra gratuito.',con:'Solo quando il nemico manca.',evolveIn:'d_cnt',daId:'b_cnt'},
  {id:'c_dev',nome:'Devastazione',      stile:'universale',desc:'1x/combat: tutti i nemici entro 1m subiscono metà del tuo danno.',pro:'Area di effetto in mischia.',con:'1 uso, raggio piccolo.',evolveIn:'d_dev'},
  {id:'fa_c1',nome:'Benedizione Divina',stile:'fantasy',  desc:'+3 danno vs oscurità. Colpisce entità incorporee come se fossero fisiche.',pro:'Versatilità enorme vs non-fisici.',con:'Inutile senza nemici oscuri.',evolveIn:'fa_d1',daId:'fa_b1'},
  {id:'fa_c2',nome:'Runa Maggiore',     stile:'fantasy',  desc:'1x/combat: +2 danno elementale + effetto (fuoco=brucia 1/r; freddo=Rallentato; fulmine=Stordito).',pro:'Danni + condizioni combinate.',con:'1 uso.',evolveIn:'fa_d2',daId:'fa_b2'},
  {id:'fa_c3',nome:'Anima dell\'Arma',  stile:'fantasy',  desc:'L\'arma è senziente: 1x/sessione avvisa di pericolo imminente (GM segnala).',pro:'Informazione narrativa potente.',con:'GM valuta il timing.',evolveIn:'fa_d3'},
  {id:'cy_c1',nome:'Sovraccarico Neurale',stile:'cyberpunk',desc:'Su colpo: sistemi digitali e impianti offline 2 round.',pro:'Shutown totale 2 round.',con:'Solo su bersagli tech.',evolveIn:'cy_d1',daId:'cy_b1'},
  {id:'cy_c2',nome:'Targeting Avanzato',stile:'cyberpunk',desc:'+2 tiri a distanza. Ignora copertura pesante.',pro:'Cecchino efficace in copertura.',con:'Solo a distanza.',evolveIn:'cy_d2',daId:'cy_b2'},
  {id:'cy_c3',nome:'Modifica Adattiva', stile:'cyberpunk',desc:'1x/sessione: rimodella funzione arma (+2 a un tipo di attacco per 1 scena, GM approva).',pro:'Flessibilità situazionale enorme.',con:'1 uso. GM deve approvare.',evolveIn:'cy_d3'},
  {id:'ho_c1',nome:'Veleno Abissale',   stile:'horror',   desc:'Su colpo: Avvelenato 3 round + 1 danno necrotico extra per round.',pro:'Danno nel tempo forte.',con:'3 round, poi scade.',evolveIn:'ho_d1',daId:'ho_b1'},
  {id:'ho_c2',nome:'Signore dei Non-Morti',stile:'horror',desc:'I non-morti ti ignorano. 1x/combat: un gregario non-morto esegue 1 azione per te.',pro:'Controllo parziale non-morti.',con:'Solo gregari.',evolveIn:'ho_d2',daId:'ho_b2'},
  {id:'ho_c3',nome:'Maledizione Minore',stile:'horror',   desc:'Su 12 naturale: bersaglio Maledetto 3 round (−1 tutti i tiri, cure dimezzate).',pro:'Maledizione potente su critico.',con:'Solo su 12 naturale.',evolveIn:'ho_d3'},
  {id:'no_c1',nome:'Ombra Perfetta',    stile:'noir',     desc:'Attacchi sempre silenziosi. 1x/combat: colpisci e rimani nascosto.',pro:'Stealth offensiva piena.',con:'1 uso del rimani-nascosto.',evolveIn:'no_d1',daId:'no_b1'},
  {id:'no_c2',nome:'Lingua Affilata',   stile:'noir',     desc:'1x/combat: attacco verbale che infligge danno normale + Spaventato 1r OPPURE distrae 1 nemico 1r.',pro:'Danno + condizione o distrazione.',con:'1 uso, narrativo.',evolveIn:'no_d2',daId:'no_b2'},
  {id:'no_c3',nome:'Informatore',       stile:'noir',     desc:'Se osservi 1 round prima del combat: GM rivela tier ferite + 1 debolezza del bersaglio scelto.',pro:'Info tattica gratuita.',con:'Richiede azione di osservazione.',evolveIn:'no_d3'},
  {id:'an_c1',nome:'Ki Esplosivo',      stile:'anime',    desc:'Su colpo: spinge 3m + Stordito se fallisce CORPO vs ANIMA + 1 danno a tutti entro 1m dal bersaglio.',pro:'Controllo area + condizione.',con:'Richiede fallimento avversario.',evolveIn:'an_d1',daId:'an_b1'},
  {id:'an_c2',nome:'Iper-Velocità',     stile:'anime',    desc:'+2 iniziativa. Dopo ogni colpo: muoviti 3m senza provocare reazioni.',pro:'Mobilità estrema ogni turno.',con:'Richiede di colpire.',evolveIn:'an_d2',daId:'an_b2'},
  {id:'an_c3',nome:'Aura Eroica',       stile:'anime',    desc:'Sotto metà HP: +2 a tutti i tiri di attacco + alleati che ti vedono +1 ai loro tiri.',pro:'Rimonta e buff gruppo.',con:'Solo sotto metà HP.',evolveIn:'an_d3'},
],
D:[
  {id:'d_vel',nome:'Tempesta di Lame',  stile:'universale',desc:'+3 iniziativa. 1x/combat: attacca due volte nello stesso turno (seconda a −2).',pro:'Doppio attacco + massima init.',con:'−2 al secondo tiro.',daId:'c_vel'},
  {id:'d_pen',nome:'Sfondamento',       stile:'universale',desc:'Su colpo: ignora completamente la DEF del bersaglio per quel turno 1x/combat.',pro:'Danno netto su turno chiave.',con:'1 uso.',daId:'c_pen'},
  {id:'d_sto',nome:'Terrore Incarnato', stile:'universale',desc:'Su colpo: scegli tra Stordito 1r / Spaventato 2r / Rallentato 2r.',pro:'Condizione a scelta.',con:'Richiede di colpire.',daId:'c_sto'},
  {id:'d_pre',nome:'Colpo Mortale',     stile:'universale',desc:'Danno minimo 5. Su 12 naturale: il bersaglio non può agire nel round successivo.',pro:'Critico devastante.',con:'12 nat solo 8%.',daId:'c_pre'},
  {id:'d_res',nome:'Baluardo',          stile:'universale',desc:'+2 DEF + 1x/combat: reazione per dimezzare il danno di un attacco subito.',pro:'Difesa + salvataggio emergenza.',con:'1 uso del dimezza-danno.',daId:'c_res'},
  {id:'d_cnt',nome:'Contrattacco Devastante',stile:'universale',desc:'Quando un nemico ti manca: contrattacca come reazione con +3 al tiro.',pro:'Contrattacco potenziato.',con:'Solo quando il nemico manca.',daId:'c_cnt'},
  {id:'d_dev',nome:'Turbine',           stile:'universale',desc:'1x/combat: attacca TUTTI i nemici entro 3m con un singolo tiro.',pro:'Area enorme, bersagli multipli.',con:'1 uso.',daId:'c_dev'},
  {id:'d_spe',nome:'Frantumazione',     stile:'universale',desc:'Su danno ≥ 5: riduce DEF bersaglio di 1 per il combat (max −2 cumulabile).',pro:'Armor break progressivo.',con:'Richiede danno ≥ 5.'},
  {id:'fa_d1',nome:'Execrator',         stile:'fantasy',  desc:'+4 danno vs oscurità. 1x/combat: Giudizio → bersaglio perde condizioni positive e non le recupera per 2r.',pro:'Devastante vs oscurità.',con:'Situazionale.',daId:'fa_c1'},
  {id:'fa_d2',nome:'Runa Cosmica',      stile:'fantasy',  desc:'Danno elementale sempre attivo (scegli tipo). 1x/combat: +3 elementale + effetto a tutti entro 2m.',pro:'Danno elementale aoe.',con:'1 uso dell\'area.',daId:'fa_c2'},
  {id:'fa_d3',nome:'Forma Vera',        stile:'fantasy',  desc:'+2 a tutti i tiri di attacco + impossibile essere disarmati. L\'arma rivela la sua natura spirituale.',pro:'Bonus fisso + inviolabilità.',con:'Nessun bonus al danno diretto.',daId:'fa_c3'},
  {id:'fa_d4',nome:'Ira degli Antichi', stile:'fantasy',  desc:'1x/combat: se danno > metà HP bersaglio → anche Spaventato 2 round.',pro:'Condizione enorme su colpo forte.',con:'1 uso, dipende dal danno.'},
  {id:'cy_d1',nome:'God Mode',          stile:'cyberpunk',desc:'1x/combat: disabilita TUTTO entro 5m (impianti, droni, armi tech) per 2 round.',pro:'Shutdown area totale.',con:'1 uso, solo vs tech.',daId:'cy_c1'},
  {id:'cy_d2',nome:'Sniper Perfetto',   stile:'cyberpunk',desc:'+3 tiri a distanza + ignora qualsiasi tipo di copertura.',pro:'Cecchino invulnerabile a cover.',con:'Solo a distanza.',daId:'cy_c2'},
  {id:'cy_d3',nome:'Protocollo Omega',  stile:'cyberpunk',desc:'1x/combat: l\'arma attacca autonomamente un secondo bersaglio a −2 senza usare la tua azione.',pro:'Attacco bonus senza azione.',con:'1 uso, −2 al tiro.',daId:'cy_c3'},
  {id:'cy_d4',nome:'Broadcast di Panico',stile:'cyberpunk',desc:'Su colpo su bersaglio con impianti neurali: trasmette panico → tutti i nemici entro 3m Spaventati 1r.',pro:'Aoe psicologica da 1 colpo.',con:'Solo vs bersagli con neurali.'},
  {id:'ho_d1',nome:'Veleno della Fine', stile:'horror',   desc:'Su colpo: Avvelenato 4 round + 2 danno necrotico/round + cure magiche dimezzate per durata.',pro:'DoT devastante + anti-cura.',con:'4 round di durata.',daId:'ho_c1'},
  {id:'ho_d2',nome:'Necromante Istintivo',stile:'horror', desc:'Controlli non-morti fino a tier normale. 1x/sessione: controlla 1 elite per 1 scena.',pro:'Esercito di non-morti.',con:'1 uso elite per sessione.',daId:'ho_c2'},
  {id:'ho_d3',nome:'Grande Maledizione',stile:'horror',   desc:'Su colpo: Maledetto 5 round (−2 tutti i tiri). Nessuna cura funziona per tutta la durata.',pro:'Maledizione lunga + anti-cura.',con:'Richiede di colpire.',daId:'ho_c3'},
  {id:'ho_d4',nome:'Drenaggio',         stile:'horror',   desc:'Su ogni colpo: recuperi 1 HP. Su critico: recuperi HP pari al danno inflitto diviso 2.',pro:'Sostentamento in combat.',con:'Critico per heal massimo.'},
  {id:'no_d1',nome:'Il Fantasma',       stile:'noir',     desc:'Sempre silenzioso e non rintracciabile. 1x/combat: diventa invisibile 1 round dopo aver colpito.',pro:'Invisibilità tattica.',con:'1 round, 1 uso.',daId:'no_c1'},
  {id:'no_d2',nome:'Artista della Parola',stile:'noir',   desc:'1x/combat: attacco verbale che colpisce TUTTI i nemici che possono sentirti con un tiro unico.',pro:'Danno area senza corpo a corpo.',con:'1 uso, solo chi sente.',daId:'no_c2'},
  {id:'no_d3',nome:'Conoscenza Totale', stile:'noir',     desc:'Conosci HP/DEF/talenti del bersaglio prima di ogni scontro con osservazione. In combat: 1 debolezza/round.',pro:'Info tattica assoluta.',con:'Richiede osservazione preventiva.',daId:'no_c3'},
  {id:'no_d4',nome:'Il Prezzo del Silenzio',stile:'noir', desc:'1x/sessione: se sei l\'unico testimone di un evento puoi riscriverne narrativamente l\'esito (GM approva).',pro:'Potere narrativo unico.',con:'1 uso, GM deve approvare.'},
  {id:'an_d1',nome:'Devastazione di Ki',stile:'anime',    desc:'Su colpo: onde di Ki infliggono metà danno a tutti entro 3m. Bersaglio principale Stordito 1r.',pro:'Area + stordimento principale.',con:'Metà danno sull\'area.',daId:'an_c1'},
  {id:'an_d2',nome:'Trascendenza Cinetica',stile:'anime', desc:'+3 iniziativa. Attacca ogni nemico che entra nel tuo raggio nel round come azione gratuita (1 volta ciascuno).',pro:'Controllo zona totale.',con:'Solo nemici che si avvicinano.',daId:'an_c2'},
  {id:'an_d3',nome:'Spirito Indomabile',stile:'anime',    desc:'Sotto metà HP: +3 tutti i tiri + immune a Spaventato e Stordito + a 0 HP agisci ancora 1 round.',pro:'Rimonta assoluta.',con:'Solo sotto metà HP.',daId:'an_c3'},
  {id:'an_d4',nome:'Tecnica Suprema',   stile:'anime',    desc:'1x/sessione: dichiara il nome della tecnica → il prossimo attacco è automaticamente critico se supera la DEF.',pro:'Critico garantito 1x/sessione.',con:'1 uso. Deve superare la DEF.'},
],
DX:[
  {id:'dx_tra',nome:'Trascendenza',     stile:'universale',desc:'Ogni attacco ignora completamente la DEF del bersaglio.',pro:'Danno netto assoluto.',con:'Non aumenta il tiro, solo ignora DEF.'},
  {id:'dx_dre',nome:'Drenaggio Vitale', stile:'universale',desc:'Su ogni colpo riuscito: recuperi HP pari al danno inflitto diviso 2.',pro:'Sostentamento massimo in combat.',con:'Dipende dal danno inflitto.'},
  {id:'dx_fra',nome:'Frattura',         stile:'universale',desc:'1x/combat: il bersaglio non può usare abilità speciali, magie o perk per 2 round.',pro:'Shutdown completo 2 round.',con:'1 uso.'},
  {id:'dx_eco',nome:'Eco del Colpo',    stile:'universale',desc:'Il danno si replica su un secondo bersaglio entro 3m a metà valore (stesso tiro).',pro:'Danno automatico su secondo bersaglio.',con:'Metà valore, richiede bersaglio vicino.'},
  {id:'dx_con',nome:'Consumo',          stile:'universale',desc:'Su colpo: bersaglio perde 1 slot magia OPPURE 1 uso perk. Se non ne ha: −2 tutti i tiri per 1 round.',pro:'Drain risorse universale.',con:'Effetto minore se bersaglio ha già usato le risorse.'},
],
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
  {id:'c01',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Fiamma Minore',     bonus:0,mec:'Una fiamma sottile nasce dal palmo e si scaglia in un getto di calore concentrato. Oltre a colpire il bersaglio, può accendere materiali combustibili a distanza e fornisce luce stabile nel buio. Tiro MENTE contro CORPO — il fuoco lascia segni.',                         pro:'Offensivo e narrativo.',           con:'Danno basso, raggio corto.'},
  {id:'c02',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Scudo Arcano',      bonus:0,mec:'Come reazione a un attacco magico in arrivo, erigi una pellicola arcana che assorbe parte dell\'impatto. Concede più tre alla Difesa contro il prossimo attacco magico ricevuto in questo round. Non richiede azione.',                   pro:'Gratuito, non usa azione.',        con:'Solo vs magie.'},
  {id:'c03',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Messaggio Mentale', bonus:0,mec:'Comprimi un pensiero in una piccola sfera di luce e la invii verso chiunque tu conosca entro un chilometro. La sfera arriva in pochi secondi. Il ricevente sente le parole nella propria mente — nessuno interposta può intercettarla.',              pro:'Comunicazione segreta.',           con:'Solo frasi brevi.'},
  {id:'c04',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Disturbo',          bonus:0,mec:'Distorci brevemente la concentrazione del bersaglio con interferenza mentale. Tiro MENTE contro MENTE — se riesce, il bersaglio subisce meno uno al prossimo tiro che effettua prima del tuo prossimo turno.',                     pro:'Debuff economico.',                con:'Effetto lieve.'},
  {id:'c05',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Luce',              bonus:0,mec:'Fai schioccare le dita e una sfera di luce bianca appare nell\'aria vicino a te, illuminando tutto nel raggio di dieci metri come piena luce diurna. La sfera fluttua obbedendo ai tuoi pensieri e dura finché non la dissolvi.',                                                pro:'Sempre utile.',                    con:'Nessun effetto combat.'},
  {id:'c06',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Gelo',              bonus:0,mec:'Un soffio di aria gelida scaturisce dalle mani e si condensa in cristalli di ghiaccio volanti verso il bersaglio. Tiro MENTE contro CORPO — può rallentare il bersaglio o rendere scivoloso il terreno sotto di lui.',              pro:'Danno + debuff difesa.',           con:'Brevissima durata.'},
  {id:'c07',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Spinta Arcana',     bonus:0,mec:'Un\'onda invisibile di forza arcana si espande dalla mano aperta e colpisce il bersaglio con l\'impatto di un pugno invisibile. Spinge e destabilizza. Tiro MENTE contro CORPO — il bersaglio colpito indietreggia di un metro.',                               pro:'Posizionamento tattico.',          con:'Zero danno.'},
  {id:'c08',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Nebbia',            bonus:0,mec:'Exhali aria che si trasforma in nebbia densa entro cinque metri. La nebbia blocca la visione diretta — qualsiasi attacco che la attraversa subisce meno uno al tiro. Persiste per due round se non dissipata dal vento.',                                   pro:'Ostacola in area.',                con:'Ostacola anche alleati.'},
  {id:'c09',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'noir',      nome:'Occhio di Mente',   bonus:0,mec:'Estendi i sensi mentali come tentacoli invisibili nell\'area circostante. Per un round percepisci la presenza emotiva di tutte le menti senzienti entro venti metri, anche attraverso muri sottili. Il GM ti avvisa di presenze nascoste.',              pro:'Info tattica e narrativa.',        con:'Zero danno.'},
  {id:'c10',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Guardia Arcana',    bonus:0,mec:'Intreccia un filo di magia difensiva intorno a un alleato entro cinque metri. Fino al tuo prossimo turno, il primo attacco che lo colpisce subisce meno due al danno finale dopo i calcoli normali.',                             pro:'Buffer rapido.',                   con:'Dura 1 round.'},
  {id:'c11',tipo:'ct',lvl:0,min:0,stat:'ANIMA',stile:'fantasy',   nome:'Benedizione Minore',bonus:0,mec:'Posando una mano su chi soffre, incanalai una scintilla di vita attraverso il tocco. Ripristina uno o due Punti Vita a un bersaglio a contatto. Non guarisce ferite gravi né elimina condizioni — rallenta solo il deterioramento.',                               pro:'Supporto immediato gratuito.',     con:'Solo +1, 1 alleato.'},
  {id:'c12',tipo:'ct',lvl:0,min:0,stat:'ANIMA',stile:'fantasy',   nome:'Parola di Conforto',bonus:0,mec:'Alcune parole dette nel tono giusto fanno più di una medicina. Rivolgi una frase a un alleato vicino: se sceglie di accettarla, recupera una condizione psicologica minore o ottiene più uno al prossimo tiro morale.',             pro:'Utility gratuita.',                con:'Solo condizioni minori.'},
  {id:'c13',tipo:'ct',lvl:0,min:0,stat:'ANIMA',stile:'noir',      nome:'Empatia Arcana',    bonus:0,mec:'Apri brevemente la mente alle emozioni altrui come un ricevitore sintonizzato. Per un round sai con certezza se il bersaglio è ostile, timoroso, calmo o nasconde qualcosa — senza comunicazione verbale.',                  pro:'Leggi lo stato d\'animo.',         con:'Solo emozioni.'},
  {id:'c14',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'horror',    nome:'Tocco Necrotico',   bonus:0,mec:'Allungi la mano e convoglii energia che prosciuga la vitalità del bersaglio. Tiro MENTE contro CORPO — il danno necrotico non causa ferite fisiche visibili ma esaurisce dall\'interno.',                  pro:'Danno e auto-cura dual use.',      con:'Richiede tocco.'},
  {id:'c15',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'cyberpunk', nome:'Impulso Digitale',  bonus:0,mec:'Emetti un breve impulso di frequenze elettromagnetiche mirate verso il sistema nervoso cibernetico del bersaglio. Tiro MENTE contro MENTE — se riesce, il bersaglio perde l\'uso di un impianto cibernetico per un round.',                 pro:'Utility digitale gratuita.',       con:'Solo dispositivi semplici.'},
  {id:'c16',tipo:'ct',lvl:0,min:0,stat:'ANIMA',stile:'anime',     nome:'Aura Minacciosa',   bonus:0,mec:'Concentri la tua energia verso l\'esterno in un\'aura di pressione psicologica. I nemici che ti guardano sentono qualcosa di sbagliato — qualcosa di troppo sicuro di sé. Tiro ANIMA contro MENTE — applica Spaventato per un round.',              pro:'Setup confronti.',                 con:'+2 a 1 tiro solo.'},
  {id:'c17',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'fantasy',   nome:'Veleno di Contatto',bonus:0,mec:'Un sottile strato di veleno magico appare sulla tua mano o su una superficie che tocchi. Il primo bersaglio a contatto subisce avvelenamento: meno uno a tutti i tiri per due round se fallisce un tiro di CORPO contro la tua ANIMA.',       pro:'Danno nel tempo senza slot.',      con:'Solo 1 attacco.'},
  {id:'c18',tipo:'ct',lvl:0,min:0,stat:'MENTE',stile:'universale',nome:'Senso Etereo',      bonus:0,mec:'Estendi la percezione verso piani adiacenti al fisico. Per un round senti la presenza di entità soprannaturali, oggetti incantati o luoghi di potere entro trenta metri. Il GM ti avvisa se qualcosa di rilevante è nell\'area.',                                 pro:'Esplorazione e sorveglianza.',     con:'Non distingue amici da nemici.'},

  // ── LIVELLO 1 ── bonus:+2, min stat:6, costo:1pt
  {id:'m01',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Dardo Magico',       bonus:2,mec:'Un dardo di energia pura si forma tra le dita e scatta verso il bersaglio con traiettoria perfetta. Non richiede di mirare — il dardo segue il bersaglio automaticamente finché è nel campo visivo. Difficile da schivare, facile da usare.',                           pro:'Garantisce danno.',                con:'Danno moderato.'},
  {id:'m02',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Sonno',              bonus:2,mec:'Sussurri arcani si insinuano nella mente del bersaglio e ne appesantiscono la coscienza come piombo. Tiro MENTE contro MENTE — in caso di successo il bersaglio cade addormentato per un round o finché non subisce danno.',                     pro:'Neutralizza senza danno.',         con:'ANIMA alta resiste.'},
  {id:'m03',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Presa Arcana',       bonus:2,mec:'Mani invisibili di forza arcana afferrano il bersaglio e lo bloccano in posizione. Tiro MENTE contro CORPO — se riesce, il bersaglio non può muoversi per un round ma può ancora attaccare con meno uno al tiro.',                          pro:'Controllo del campo.',             con:'CORPO alto resiste.'},
  {id:'m04',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Cura Ferite',        bonus:2,mec:'Canalizzai energia vitale attraverso le mani posate sul paziente. Ripristina Punti Vita pari a quattro più il tuo bonus di competenza ANIMA. Non funziona su non-morti e non cura malattie o veleni — solo danni fisici.',                        pro:'Healing diretto.',                 con:'Richiede tocco.'},
  {id:'m05',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Scudo di Forza',     bonus:2,mec:'Un disco di forza solidificata si materializza davanti a te. Fino al tuo prossimo turno, aggiunge tre alla tua Difesa contro tutti gli attacchi in arrivo, fisici e magici. Sparisce dopo aver assorbito il primo colpo.',                                            pro:'Difesa per 2 round.',              con:'Costa 1 azione.'},
  {id:'m06',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Frecce Magiche',     bonus:2,mec:'Tre piccole frecce di luce si materializzano nell\'aria e saettano verso il bersaglio o verso bersagli separati a tua scelta. Ogni freccia tira indipendentemente con più uno al tiro ciascuna. Utile contro più nemici ravvicinati.',                     pro:'Multi-target.',                    con:'-2 per dardo rispetto a L1 standard.'},
  {id:'m07',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'horror',   nome:'Voce del Terrore',   bonus:2,mec:'La tua voce si trasforma in qualcosa di non umano — frequenze che il cervello non può ignorare. Tiro ANIMA contro ANIMA — il bersaglio acquisisce Spaventato per due round. Funziona anche oltre la vista diretta se ti sente.',                         pro:'Infligge condizione.',             con:'Richiede vittoria.'},
  {id:'m08',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'anime',    nome:'Ispirazione Arcana', bonus:2,mec:'Intreccia un filo dorato di energia arcana intorno a un alleato entro dieci metri. Il prossimo tiro che effettua ottiene un bonus pari al tuo bonus di competenza ANIMA. Si consuma al primo utilizzo.',                       pro:'Bonus in momenti cruciali.',       con:'Solo 1 tiro.'},
  {id:'m09',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'fantasy',  nome:'Canto di Guarigione',bonus:2,mec:'Intoni poche note di un canto antico che risuonano nella carne. Tutti gli alleati entro dieci metri recuperano due Punti Vita. Non è un guaritore completo: è il respiro di sollievo che mantiene in piedi chi è ancora in piedi.',                       pro:'Healing basato su ANIMA.',         con:'Richiede tocco.'},
  {id:'m10',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'cyberpunk',nome:'Aggancio',           bonus:2,mec:'Un gancio di energia arcana scatta verso il bersaglio entro venti metri. Tiro MENTE contro CORPO — se riesce, lo tiri verso di te di tre metri o lo fai cadere a terra se resiste al movimento.',                 pro:'Utility digitale.',                con:'Solo sistemi semplici.'},
  {id:'m11',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'horror',   nome:'Grido Straniante',   bonus:2,mec:'Emetti un urlo soprannaturale che colpisce la mente invece del corpo. Tiro ANIMA contro MENTE — in caso di successo il bersaglio è Stordito per un round: perde la prossima azione e subisce meno uno ai tiri per un round aggiuntivo.', pro:'Area burst ANIMA.',               con:'Raggio piccolo.'},
  {id:'m12',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'fantasy',  nome:'Cura a Distanza',    bonus:2,mec:'Estendi una mano e da essa parte un filo di luce che raggiunge un alleato entro quindici metri. Ripristina tre Punti Vita a distanza senza toccare. Puoi usarla mentre sei impegnato in combattimento diretto.',                      pro:'Healing sicuro a distanza.',       con:'Stessa quantità di Cura Ferite.'},
  {id:'m43',tipo:'mg',lvl:1,min:6,stat:'ANIMA',stile:'horror',   nome:'Maledizione di Setta',bonus:2,mec:'Pronunci una formula di vincolazione tratta da un rituale antico. Tiro ANIMA contro ANIMA — il bersaglio acquisisce Maledetto per tre round: meno uno a tutti i tiri finché la maledizione non viene spezzata o decade naturalmente.',pro:'Amplificatore per effetti paura.',con:'Solo vs resistenza, no danno.'},
  {id:'m48',tipo:'mg',lvl:1,min:6,stat:'MENTE',stile:'anime',    nome:'Analisi Tattica',    bonus:2,mec:'In un secondo di concentrazione intensa analizzi la situazione tattica circostante. Ottieni informazioni sulle debolezze di un bersaglio — il GM rivela il suo Wound Tier attuale e il tipo di difese principali che possiede.',pro:'Info + bonus attacco.',con:'Solo 1 bersaglio.'},

  // ── LIVELLO 2 ── bonus:+4, min stat:8, costo:2pt
  {id:'m13',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'fantasy',  nome:'Palla di Fuoco',    bonus:4,mec:'Comprimi energia calorica in una sfera che scagli verso il punto scelto entro trenta metri. Quando esplode, colpisce tutti i bersagli nel raggio di tre metri con il danno completo. I bersagli ai bordi possono tentare CORPO per dimezzarlo.',                   pro:'Multi-target, danno elevato.',     con:'Colpisce alleati.'},
  {id:'m14',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'universale',nome:'Invisibilità',     bonus:4,mec:'Il tuo corpo si piega fuori dalla percezione visibile — luce e sguardi scivolano intorno a te. Rimani invisibile finché attacchi o lanci un\'altra magia. Qualsiasi mossa dopo l\'invisibilità concede più due al primo attacco.',                               pro:'Elusione totale.',                 con:'Si annulla al primo attacco.'},
  {id:'m15',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'universale',nome:'Telecinesi',       bonus:4,mec:'Estendi la volontà verso un oggetto o persona entro venti metri. Tiro MENTE contro CORPO — se riesce, puoi spostare il bersaglio di tre metri in qualsiasi direzione o tenerlo fermo per un round contro la sua volontà.',          pro:'Versatile.',                       con:'Non vs CORPO altissimo.'},
  {id:'m16',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'fantasy',  nome:'Lama Magica',       bonus:4,mec:'Una lama di energia magica si materializza nella tua mano e rimane finché non la dissolvi. Conta come arma fisica con il tuo bonus MENTE. Può colpire entità incorporee e non viene rimossa da disarmo fisico.',                pro:'Buff potente.',                    con:'Solo 1 attacco.'},
  {id:'m17',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'noir',     nome:'Blocco del Pensiero',bonus:4,mec:'Un muro psichico invisibile scende sulla mente del bersaglio. Tiro MENTE contro MENTE — in caso di successo il bersaglio non può usare abilità psichiche, magie mentali o comunicazione telepatica per due round.',                      pro:'Silenzia caster.',                 con:'Solo vs caster.'},
  {id:'m18',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'universale',nome:'Volo',             bonus:4,mec:'Il corpo si alleggerisce fino a diventare quasi senza peso. Per tre round puoi muoverti in qualsiasi direzione tridimensionale a velocità normale — su, di lato, in diagonale. Puoi planare anche in caso di caduta.',                                       pro:'Mobilità aerea.',                  con:'Attacchi fisici lo annullano.'},
  {id:'m19',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'fantasy',  nome:'Benedizione',       bonus:4,mec:'Invochi una benedizione genuina su un alleato o su te stesso. Per due round il bersaglio ottiene più uno a tutti i tiri di qualsiasi tipo. Non cumulabile con altre benedizioni attive dello stesso tipo.',                          pro:'Buff di gruppo.',                  con:'Richiede alleati vicini.'},
  {id:'m20',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'fantasy',  nome:"Legame dell'Anima", bonus:4,mec:'1d12+ANIMA+4: condividi metà del danno ricevuto da 1 alleato.',              pro:'Protezione per alleato.',          con:'Rischioso se alleato subisce tanto.'},
  {id:'m21',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'noir',     nome:"Voce dell'Autorità",bonus:4,mec:'1d12+ANIMA+4 vs ANIMA. Vinci: trattato come autorità per 10 min.',          pro:'Charm narrativo.',                 con:'Zero danno.'},
  {id:'m22',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'cyberpunk',nome:'Overload Neurale',  bonus:4,mec:'Sovraccarichi il sistema nervoso cibernetico del bersaglio con un picco di tensione mirato. Tiro MENTE contro MENTE — se riesce, il bersaglio perde accesso a tutti gli impianti tecnologici per due round mentre il sistema si riavvia.',       pro:'Counter cyberware.',               con:'Solo vs augmentati.'},
  {id:'m23',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'horror',   nome:'Barriera di Spine', bonus:4,mec:'Dal terreno sotto i piedi del bersaglio emergono spine di energia solidificata. Tiro ANIMA contro CORPO — se riesce il danno normale, il bersaglio è anche Rallentato per un round: movimenti dimezzati e meno uno ai tiri fisici.',             pro:'Difesa che punisce.',              con:'Solo mischia.'},
  {id:'m24',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'anime',    nome:"Eco dell'Anima",    bonus:4,mec:'1d12+ANIMA+4: ripeti tipo attacco riuscito di un alleato questo round.',     pro:'Sinergia di gruppo.',              con:'Richiede alleato abbia già colpito.'},
  {id:'m44',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'horror',   nome:'Visione Cosmica',   bonus:4,mec:'Apri temporaneamente la mente a dimensioni che l\'occhio normale non vede. Per un round percepisci tutto l\'invisibile e il soprannaturale nell\'area. Il GM rivela qualsiasi entità o effetto magico attivo entro trenta metri.',                 pro:'Debuff MENTE pesante.',            con:'Immune se MENTE >= 7.'},
  {id:'m45',tipo:'mg',lvl:2,min:8,stat:'MENTE',stile:'horror',   nome:'Rito del Sangue',   bonus:4,mec:'Tracci un simbolo con il tuo sangue e invochi un legame vitale con il bersaglio. Per due round, metà di ogni danno che il bersaglio ti infligge viene riflesso su di lui come danno necrotico. Il rito è visibile e può essere interrotto.',                        pro:'Elimina fallimenti magici.',       con:'Costa 3 HP. Visibile.'},
  {id:'m49',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'anime',    nome:'Aura di Supremazia',bonus:4,mec:'Un\'aura visibile di energia guerriera si espande da te in un raggio di cinque metri. Tutti gli alleati nell\'area ottengono più due ai tiri di attacco per due round. Tu non benefici dell\'aura — l\'energia fluisce verso gli altri.',pro:'Area debuff ANIMA.',           con:'Se ANIMA inferiore, effetto ribaltato.'},
  {id:'m51',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'universale',nome:"Catene dell'Anima",bonus:4,mec:'1d12+ANIMA+4 vs ANIMA. Vinci: Rallentato 2 round.',                         pro:'Controllo del campo.',             con:'Solo rallentamento.'},
  {id:'m52',tipo:'mg',lvl:2,min:8,stat:'ANIMA',stile:'fantasy',  nome:'Patto di Sangue',  bonus:4,mec:'Stringi un accordo magico vincolante con un alleato volontario. Finché siete entrambi coscienti entro venti metri, quando uno dei due subisce danno, l\'altro può scegliere di assorbire la metà. Il patto si spezza a fine scontro.',pro:'Equalizza sopravvivenza.',         con:'Se uno è debole, rischia.'},

  // ── LIVELLO 3 ── bonus:+6, min stat:10, costo:3pt
  {id:'m25',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'fantasy',  nome:'Fulmine',          bonus:6,mec:'Chiami un fulmine dalla volta celeste — o dall\'energia statica accumulata se sei al chiuso. Si abbatte sul bersaglio principale e può saltare su un secondo bersaglio entro cinque metri con tiro a meno due. Il rombo è udibile a cento metri.',               pro:'Danno altissimo in linea.',        con:'Richiede allineamento.'},
  {id:'m26',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'horror',   nome:'Controllo Mentale',bonus:6,mec:'Penetri nella mente del bersaglio e prendi il controllo delle intenzioni immediate. Tiro MENTE contro MENTE — in caso di successo dirigi le sue azioni per un round. Il bersaglio non combatte l\'effetto — non sa di essere controllato.',    pro:'Nemico diventa alleato temp.',     con:'1 round.'},
  {id:'m27',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'fantasy',  nome:'Muro di Ghiaccio', bonus:6,mec:'Un muro di ghiaccio alto due metri si erge istantaneamente lungo una linea di cinque metri. Blocca il passaggio fisico e chiunque tenti di sfondarlo subisce danno da freddo. Fornisce copertura agli alleati e dura tre round.',                            pro:'Divide il campo.',                 con:'No danno.'},
  {id:'m28',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'anime',    nome:'Tempesta di Lame', bonus:6,mec:'Invochi la tecnica segreta e scateni un turbine di lame di energia che si espande in un cerchio di quattro metri intorno a te. Ogni nemico nel raggio subisce il danno completo senza tiro separato — la tempesta colpisce tutto indiscriminatamente.',                            pro:'Area devastante.',                 con:'Colpisce alleati vicini.'},
  {id:'m29',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'horror',   nome:'Maledizione',      bonus:6,mec:'Pronunci parole di maledizione antiche che si incidono nell\'aura del bersaglio. Tiro ANIMA contro ANIMA — se riesce, il bersaglio subisce meno due a tutti i tiri per tre round e qualsiasi magia di cura che lo colpisce è dimezzata.',pro:'Debuff permanente.',             con:'Richiede vittoria.'},
  {id:'m30',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'horror',   nome:'Aura di Morte',    bonus:6,mec:'Un\'aura di energia necrotica si espande da te in un raggio di cinque metri. Tutti i nemici nell\'aura subiscono uno danno necrotico all\'inizio di ogni loro turno per due round. Chi entra nell\'area lo subisce immediatamente.',                 pro:'Debuff crescente.',                con:'Nemici possono allontanarsi.'},
  {id:'m31',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'horror',   nome:'Anima in Prestito',bonus:6,mec:'Invochi uno spirito disposto a prestare le sue capacità per un round. Lo spirito può compiere una qualsiasi azione al posto tuo nello stesso turno — attaccare, spostare oggetti, distrarre. Poi scompare. Non puoi controllarne le intenzioni profonde.',pro:'Salvataggio immediato.',          con:'Tiro difficile.'},
  {id:'m32',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'anime',    nome:'Grido di Guerra',  bonus:6,mec:'Emetti un grido che incanalai la volontà di combattimento pura. Tutti gli alleati entro dieci metri che possono sentirti ottengono più uno al danno su ogni attacco per due round. Non cumulabile con un secondo Grido attivo.',             pro:'Buff massiccio.',                  con:'Dura 2 round.'},
  {id:'m33',tipo:'mg',lvl:3,min:10,stat:'MENTE',stile:'cyberpunk',nome:'Hacking di Massa', bonus:6,mec:'Prendi il controllo simultaneo di tutti i dispositivi tecnologici in un raggio di dieci metri. Telecamere si spengono, porte si aprono, droni si riavviano. Tiro MENTE contro la complessità del sistema — il GM valuta la difficoltà.',      pro:'Dominio tecno in area.',           con:'Organici immuni.'},
  {id:'m34',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'anime',    nome:'Urlo Berserker',   bonus:6,mec:'Lasci andare ogni inibizione mentale e ti scagli nel combattimento con forza bruta potenziata magicamente. Per due round il tuo attacco ottiene più due al danno fisico finale, ma la tua Difesa scende di due per la stessa durata.',            pro:'Offensiva devastante.',            con:'Esaurimento post-uso.'},
  {id:'m46',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'horror',   nome:"Richiamo dell'Antico",bonus:6,mec:'1d12+ANIMA+6 vs 10: tutti entro raggio: ANIMA vs 10 o Spaventato 1 round.',pro:'Area paura potentissima.',       con:'Entità può restare (GM).'},
  {id:'m50',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'anime',    nome:'Tecnica Ultimo Stadio',bonus:6,mec:'Spingiti oltre ogni limite fisico con un picco di ki concentrato. Il prossimo attacco ottiene più quattro al tiro e ignora il bonus di scudo del bersaglio. Dopo l\'uso sei Affaticato per un round — meno uno ai tiri.',      pro:'Danno max garantito.',             con:'1 uso per sessione.'},
  {id:'m53',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'universale',nome:'Scudo di Gruppo', bonus:6,mec:'Estendi una barriera di forza arcana su tutti gli alleati entro quindici metri. Fino al tuo prossimo turno, ogni alleato coperto da questa magia ottiene più due alla Difesa contro il prossimo attacco che riceve.',        pro:'Buff difensivo di gruppo.',        con:'Costa azione.'},
  {id:'m54',tipo:'mg',lvl:3,min:10,stat:'ANIMA',stile:'anime',    nome:'Volontà del Conquistatore',bonus:6,mec:'La tua presenza sul campo di battaglia diventa un fatto schiacciante. Tutti i nemici che possono vederti devono superare ANIMA contro la tua ANIMA o subiscono Spaventato per due round. Chi già ti conosce ottiene meno uno al tiro.',pro:'Area intimidazione.',con:'Slot L3 richiesto.'},

  // ── LIVELLO 4 ── bonus:+8, min stat:12, costo:4pt
  {id:'m35',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'fantasy',  nome:'Resurrezione',     bonus:8,mec:'Il confine tra vita e morte è spesso solo una questione di volontà e di energia sufficiente. Riporti alla vita un alleato caduto entro un minuto dalla morte con tre Punti Vita. La magia è istantanea ma lascia il resurreto debilitato per un giorno.',            pro:'Salva dalla morte.',               con:'1 uso.'},
  {id:'m36',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'universale',nome:'Teletrasporto',   bonus:8,mec:'Disintegri lo spazio tra due punti noti e ti sposti istantaneamente. La destinazione deve essere un luogo che conosci o che vedi chiaramente. Non funziona attraverso barriere magiche. Porta con te fino a due persone a contatto.',                           pro:'Fuga o riposizionamento.',         con:'Devi conoscere il luogo.'},
  {id:'m37',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'anime',    nome:'Nova Arcana',      bonus:8,mec:'Canalizzai l\'intera riserva di energia arcana e la scagli verso l\'esterno in un\'esplosione sferica di sei metri centrata su di te. Tutto nel raggio subisce il danno completo — alleati inclusi. Tu sei immune all\'esplosione.',           pro:'Danno devastante.',                con:'Esaurisce tutto.'},
  {id:'m38',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'universale',nome:'Arresto del Tempo',bonus:8,mec:'Il tempo rallenta fino a fermarsi per tutto ciò che non sei tu. Per due round completi sei l\'unico essere ad agire. Puoi effettuare due turni normali consecutivi — poi il tempo riprende e tutti i round successivi tornano normali.',                         pro:'Un round extra.',                  con:'1 uso.'},
  {id:'m39',tipo:'mg',lvl:4,min:12,stat:'ANIMA',stile:'horror',   nome:'Dominio',          bonus:8,mec:'Penetri così a fondo nella mente del bersaglio da impiantare volontà e comandi come se fossero suoi. Tiro MENTE contro MENTE — se riesce, controlli completamente le azioni del bersaglio per due round.',     pro:'Controllo totale.',                con:'Richiede vittoria.'},
  {id:'m40',tipo:'mg',lvl:4,min:12,stat:'ANIMA',stile:'horror',   nome:"Sacrificio d'Anima",bonus:8,mec:'Spendi 2 HP per ogni 1 HP curato agli alleati in raggio. 1x/riposo.',      pro:'Healing massiccio.',               con:'Costa i tuoi HP.'},
  {id:'m41',tipo:'mg',lvl:4,min:12,stat:'ANIMA',stile:'horror',   nome:'Grande Maledizione',bonus:8,mec:'Pronunci le sette parole della Grande Maledizione — nessuno le stesse in ordine identico due volte. Il bersaglio subisce Maledetto per cinque round: meno due a tutti i tiri, nessuna cura magica funziona, ogni fallimento costa un HP.',             pro:'Permanente.',                      con:'Effetto specifico col GM.'},
  {id:'m42',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'cyberpunk',nome:'Trasferimento Coscienza',bonus:8,mec:'La tua coscienza abbandona il corpo fisico e si trasferisce in un sistema digitale entro venti metri. Per due round controlli quel sistema dall\'interno. Il tuo corpo originale è incosciente e vulnerabile durante il trasferimento.',      pro:'Infiltrazione totale.',            con:'Il tuo corpo è vulnerabile.'},
  {id:'m47',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'horror',   nome:'Frammentazione Cosmica',bonus:8,mec:'Crei una frattura nel tessuto della realtà locale. Tutto ciò che si trova entro tre metri dal punto scelto deve superare MENTE contro la tua MENTE o viene parzialmente dissolto — subisce il danno completo e perde un\'azione nel round successivo.',      pro:'Raddoppia fallimenti critici.',    con:'Se fallisci: -1 MENTE.'},
  {id:'m55',tipo:'mg',lvl:4,min:12,stat:'MENTE',stile:'universale',nome:'Disintegrazione', bonus:8,mec:'Concentri un fascio di energia pura e lo scagli sul bersaglio. Se il danno supera la metà dei Punti Vita massimi del bersaglio, viene ridotto in polvere — non si può curare né resurrezione: è semplicemente finita. Contro personaggi principali, il GM valuta l\'effetto narrativo.',         pro:'Ignora armatura, danno doppio.',   con:'Non ignora scudo.'},


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
  {id:'armi_pesanti',cat:'accesso',stile:'universale',req:null,          nome:'Armi Pesanti',    desc:'Hai ricevuto addestramento formale con armamenti che la maggior parte trova ingestibili. Armi Cat C sbloccate senza requisito CORPO 6. Prerequisito per specializzazioni avanzate.',pro:'Cat C gratis senza CORPO 6. Sblocca spec_cat_c e t31.',con:'Occupa 1 slot talento senza bonus diretto di danno.'},
  {id:'armi_letali', cat:'accesso',stile:'universale',req:null,           nome:'Armi Letali',     desc:'Anni passati a maneggiare armamenti proibiti ti hanno dato la padronanza tecnica di armi che la gente comune non sa nemmeno impugnare. Sblocca armi Categoria D con CORPO 10.',pro:'Cat D sbloccata (+4 tiro, la categoria piu alta). Prerequisito per spec_cat_d.',con:'Richiede CORPO 10 piu questo talento. Cat D = 2H, tendenzialmente -1 iniziativa.'},
  {id:'gate_mb',     cat:'accesso',stile:'universale',req:null,          nome:'Magia Base',      desc:'Hai aperto una connessione stabile con il flusso arcano, imparando a tradurre pensieri in effetti magici concreti. Sblocca cantrip illimitati e magie L1-L2. MENTE 10 sostituisce questo per l\'accesso a L1-L2, ma non per i talenti spec magia.',pro:'Accesso al sistema magico di base. Prerequisito per gate_ma e tutti i talenti spec_magia.',          con:'Le magie L1-L2 consumano slot. Richiede MENTE o ANIMA adeguati per ogni incantesimo.'},
  {id:'gate_ma',     cat:'accesso',stile:'universale',req:'gate_mb',     nome:'Magia Avanzata',  desc:'La padronanza delle basi ti ha portato oltre. Ora incanalai energie che la maggior parte degli arcanisti definisce pericolose. Sblocca magie L3-L4. MENTE 10 non sostituisce questo talento.',   pro:'Accesso alle magie piu potenti (+6, +8 tiro). Pool slot piu ampio.',    con:'Richiede Magia Base. L3-L4 costano 2 slot ciascuna. Investimento di due talenti.'},
  // ── LIMITI ──
  {id:'cap_12',      cat:'limite', stile:'universale',req:null,          nome:'Limite Elevato',  desc:'Attraverso allenamento prolungato hai spinto il corpo e la mente oltre le limitazioni ordinarie. Alza il cap di tutte le caratteristiche da 10 a 12, sbloccando valori prima irraggiungibili.',                                                    pro:'Piu HP, piu slot magia, competenza maggiore. Prerequisito per Limite Maestro.',   con:'Costa 1 slot talento. Il beneficio reale richiede investire molto nella stat scelta.'},
  {id:'cap_15',      cat:'limite', stile:'universale',req:'cap_12',      nome:'Limite Maestro',  desc:'Sei andato oltre il possibile. Le tue caratteristiche non sono piu quelle di un essere umano comune e la gente lo percepisce guardandoti. Alza il cap da 12 a 15, raggiungendo i valori assoluti del sistema.',                                                 pro:'Valori massimi del sistema. A 15 si toccano bonus di competenza e danno irreplicabili.',           con:'Richiede Limite Elevato. Due talenti investiti solo per aumentare il soffitto stat.'},
  // ── CORPO ──
  {id:'t01',cat:'corpo',stile:'fantasy',   req:null,nome:'Pelle Dura',          desc:'La tua pelle ha assorbito abbastanza colpi nel tempo che il tuo corpo ha sviluppato una risposta naturale ai traumi fisici. Ogni danno fisico subito viene ridotto di 1, con un minimo di 0. Passivo, sempre attivo.',                pro:'Riduzione passiva su ogni colpo fisico ricevuto, senza eccezioni o usi limitati.',        con:'Non funziona contro danni magici, veleno, o effetti di condizione.'},
  {id:'t02',cat:'corpo',stile:'universale',req:null,nome:'Colpo Preciso',       desc:'Sai esattamente dove colpire quando l\'opportunita si presenta. Una volta per combattimento, quando il tuo attacco fisico supera la difesa del bersaglio, il danno inflitto e almeno 5 indipendentemente dalla differenza effettiva.',  pro:'1x/combat: danno fisico minimo garantito 5 su attacco riuscito.',               con:'1 solo uso. Non aggiunge danno se il risultato normale e gia superiore a 5.'},
  {id:'t03',cat:'corpo',stile:'fantasy',   req:null,nome:'Resistenza Innata',   desc:'Il tuo metabolismo elabora le tossine con efficienza insolita. Sei immune alla condizione Avvelenato. Contro veleni particolarmente potenti ottieni +3 al tiro di resistenza su CORPO.',              pro:'Immunity completa a Avvelenato. +3 vs veleni potenziati (CORPO + 3 vs difficolta).',             con:'Situazionale. In sessioni senza veleni questo talento vale zero.'},
  {id:'t04',cat:'corpo',stile:'universale',req:null,nome:'Atletismo Estremo',   desc:'Il tuo corpo e un\'eccellenza atletica: scalare pareti, nuotare correnti, saltare voragini sono problemi ordinari con soluzioni tecniche. Ottieni +3 a tutti i tiri CORPO per attivita fisiche fuori dal combattimento.',            pro:'Esplorazione fisica dominata. +3 a scalate, nuoto, salti, resistenza ambientale.',      con:'Nessun effetto in combattimento. Utile solo in contesti esplorativi.'},
  {id:'t05',cat:'corpo',stile:'universale',req:null,nome:'Sfida',               desc:'Conosci il suono di una sfida. Come azione puoi provocare un nemico che ti vede e ti sente: deve superare un tiro ANIMA contro la tua ANIMA oppure sara costretto a sceglierti come bersaglio prioritario per 1 round.', pro:'Protegge alleati deviando l\'attenzione. Efficace contro nemici con ANIMA bassa.',               con:'Attiri danni su di te. Inutile contro nemici immuni a effetti psicologici o meccanici.'},
  {id:'t06',cat:'corpo',stile:'anime',     req:null,nome:'Furia',               desc:'Quando sei con le spalle al muro il tuo istinto di sopravvivenza trasforma la paura in carburante. Passivo: sotto meta degli HP massimi tutti i tuoi tiri di attacco fisico ottengono +2.',              pro:'Passivo automatico. +2 attacco fisico quando sei ferito. Letale in scontri lunghi.',             con:'Richiede di essere sotto meta HP per attivare. Inutile a HP pieno.'},
  {id:'t07',cat:'corpo',stile:'fantasy',   req:null,nome:'Guarigione Naturale', desc:'Il tuo corpo recupera piu rapidamente del normale. Durante un Riposo Breve recuperi 2 HP aggiuntivi rispetto alla quantita standard. Si somma al recupero base di CORPO HP.',                                   pro:'Passivo. +2 HP extra per ogni Riposo Breve, cumulabile col recupero normale.',                con:'Nessun effetto in combattimento. Solo nel recupero.'},
  {id:'t08',cat:'corpo',stile:'fantasy',   req:null,nome:'Colosso',             desc:'La tua costituzione fisica si traduce in punti vita aggiuntivi attraverso un meccanismo difficile da spiegare razionalmente. Il tuo CORPO conta come se valesse 1 in piu solo per il calcolo degli HP massimi. La stat effettiva non cambia.',                pro:'HP max +1 senza modificare stat. Non influenza tiri, competenza o iniziativa.',       con:'Solo per la sopravvivenza. Nessun altro beneficio.'},
  {id:'t48',cat:'corpo',stile:'anime',     req:null,nome:'Superamento del Limite',desc:'Hai vissuto abbastanza crisi da sapere cosa accade quando il corpo trova quella riserva nascosta di cui non conosceva l\'esistenza. Una volta per sessione, dopo essere sceso sotto 5 HP, recuperi 5 HP e ottieni +2 a tutti i tiri per 2 round.',    pro:'1x/sessione: +5 HP + +2 tiri per 2 round. Rimonta potente nei momenti decisivi.',                con:'1 solo uso. Il GM valuta la coerenza narrativa con una crisi reale.'},
  {id:'t51',cat:'corpo',stile:'universale',req:null,nome:'Doppia Impugnatura',  desc:'Combatti con due armi leggere simultaneamente sacrificando la difesa per il potenziale offensivo doppio. Non puoi usare scudo. Attacchi 2 volte per turno con -3 ciascuno. Se entrambi mancano sei Indebolito (CORPO -1) per 1 round.',pro:'2 attacchi per turno. Alto potenziale di danno con attacchi fortunati.',con:'No scudo. -3 per attacco. Se entrambi mancano: Indebolito 1 round.'},
  {id:'t52',cat:'corpo',stile:'universale',req:null,nome:'Colpo Critico',       desc:'Hai affinato la tecnica fino al punto in cui i tuoi colpi critici fanno qualcosa di piu. Quando ottieni un 12 naturale sul d12, il danno dell\'attacco fisico include +4 danno bonus fisso in aggiunta al risultato normale.',                   pro:'Passivo. +4 danno extra su 12 naturale (circa 8% dei tiri).',               con:'Solo su 12 naturale. Non influenza nessun altro aspetto del combattimento.'},
  // ── MENTE ──
  {id:'t09',cat:'mente',stile:'noir',      req:null,nome:'Analisi del Nemico',  desc:'Ogni nemico ha una debolezza. Se spendi un round intero ad osservare senza attaccare, il GM ti rivela un tratto tattico o una debolezza sfruttabile del bersaglio scelto — stat critica, immunita, tecnica ricorrente.',     pro:'Info tattica gratuita. Svela tratti, stat critiche, o pattern di combattimento.',          con:'Richiede un round senza attaccare. Il GM decide cosa rivelare e quanto e specifico.'},
  {id:'t10',cat:'mente',stile:'horror',    req:null,nome:'Resistenza Mentale',  desc:'La tua mente e un muro. Tentativi di manipolazione magica, controllo mentale e distorsione cognitiva trovano una resistenza insolita. Ottieni +3 alla difesa contro magie mentali e sei immune alla condizione Confuso.',           pro:'Difesa +3 vs magie mentali. Immune a Confuso. Essenziale in sessioni horror.',                   con:'Solo contro magie mentali. Nessun effetto su attacchi fisici o sociali.'},
  {id:'t11',cat:'mente',stile:'noir',      req:null,nome:'Memoria Eidettica',   desc:'La tua memoria e un archivio permanente, non un appunto sbiadito. Ricordi con precisione assoluta tutto cio che hai visto, sentito o letto. Il GM non puo farti perdere informazioni acquisite nel corso dell\'avventura.',                           pro:'Nessuna perdita di informazioni acquisite. Potente per investigatori e diplomatici.',        con:'Puramente narrativo. Nessun effetto meccanico in combattimento.'},
  {id:'t12',cat:'mente',stile:'noir',      req:null,nome:'Polimata',            desc:'Hai coltivato una conoscenza abbastanza ampia da saper rispondere su argomenti diversissimi. Ottieni +3 a tutti i tiri MENTE che riguardano conoscenza, ricerca e identificazione di oggetti, fenomeni o individui.',          pro:'MENTE +3 su conoscenza, identificazione e ricerca. Essenziale per investigatori.',             con:'Solo tiri di conoscenza. Zero vantaggio in combattimento.'},
  {id:'t13',cat:'mente',stile:'fantasy',   req:null,nome:'Concentrazione',      desc:'Molti maghi devono lasciar cadere il primo effetto per attivarne un secondo. Tu no. Puoi mantenere attivi due effetti magici simultaneamente senza che il secondo dissolva il primo.',              pro:'Raddoppia l\'utilita dei caster in combattimento. Combinazioni potenti di effetti.',       con:'Inutile senza magie con effetti persistenti.'},
  {id:'t14',cat:'mente',stile:'fantasy',   req:null,nome:'Occhio di Falco',     desc:'Occhi allenati, mano ferma, e la pazienza di aspettare il momento giusto. Ottieni +2 a tutti i tiri di attacco con armi a distanza, indipendentemente dalla categoria.',                        pro:'CORPO o MENTE +2 con qualsiasi arma a distanza. Si somma a Cat e competenza.',       con:'Solo a distanza. Inutile in mischia.'},
  {id:'t15',cat:'mente',stile:'universale',req:null,nome:'Tattico',             desc:'In combattimento vedi opportunita che gli altri non colgono. Una volta per combattimento puoi reindirizzare come reazione l\'attacco di un alleato verso un bersaglio diverso o piu vulnerabile, senza consumare la sua azione.', pro:'1x/combat: ottimizza attacco alleato come reazione. Nessun costo per l\'alleato.',       con:'1 uso. Richiede coordinazione e il GM deve approvare la coerenza.'},
  {id:'t33',cat:'mente',stile:'cyberpunk', req:null,nome:'Hacker',              desc:'Sistemi digitali, reti neurali, database aziendali: per te sono porte aperte. Ottieni +3 a tutti i tiri MENTE contro sistemi digitali e riesci ad accedere a sistemi semplici senza strumentazione fisica.',          pro:'MENTE +3 vs sistemi digitali. Intrusione senza hardware. Dominio tech.',       con:'Inutile in ambienti senza tecnologia. In sessioni fantasy vale zero.'},
  {id:'t34',cat:'mente',stile:'noir',      req:null,nome:'Investigatore',       desc:'Non esci da una stanza senza aver catalogato tre cose che non quadrano. Il GM segnala passivamente quando qualcosa di rilevante e nascosto nelle tue vicinanze immediate. Ottieni +2 a tiri MENTE di deduzione.',          pro:'Passivo: GM segnala elementi nascosti. MENTE +2 deduzione. Nessun dettaglio sfugge.',        con:'Dipende dalla generosita interpretativa del GM sulla soglia di rilevanza.'},
  {id:'t35',cat:'mente',stile:'universale',req:null,nome:'Adrenalina Innata',   desc:'C\'e un momento in ogni scontro in cui un singolo tiro decide tutto. Una volta per combattimento, prima che il dado smetta di rotolare, puoi dichiarare di ritirarlo e tenere il risultato migliore dei due tiri.',             pro:'1x/combat: ritira qualsiasi tiro, tieni il piu alto. Salva situazioni critiche.',   con:'1 solo uso per combattimento.'},
  {id:'t43',cat:'mente',stile:'horror',    req:null,nome:'Cultista',            desc:'Sei affiliato a una setta con accesso a conoscenze che la societa civile non approverebbe. MENTE +3 su rituali e riti oscuri. Una volta per sessione la setta fornisce una risorsa, un\'informazione o supporto pratico.',pro:'MENTE +3 riti oscuri. 1x/sessione: supporto dalla setta (GM valuta l\'entita).',  con:'La setta ti osserva. Il GM puo assegnarti compiti non richiesti come conseguenza.'},
  {id:'t44',cat:'mente',stile:'horror',    req:null,nome:'Mente Blindata',      desc:'Hai visto abbastanza orrori cosmici da sviluppare un filtro mentale che protegge la sanita a scapito dell\'umanita. MENTE +4 vs follia e orrore cosmico. Immune alla prima maledizione psichica per sessione. Subisci -1 permanente all\'ANIMA.',  pro:'MENTE +4 vs follia. Immune prima maledizione psichica per sessione.',         con:'ANIMA -1 permanente. Distacco emotivo che riduce la connessione con il gruppo.'},
  {id:'t50',cat:'mente',stile:'anime',     req:null,nome:'Discepolo del Maestro',desc:'Hai trascorso tempo con qualcuno che ti ha preparato a riconoscere i modelli nel caos. Contro tecniche, stili di combattimento o situazioni che il tuo maestro ti ha insegnato a identificare, ottieni +2 ai tiri rilevanti.', pro:'Bonus +2 permanente contro pattern riconosciuti. Narrativo e meccanico.',   con:'Se il maestro muore, il GM puo modificare o rimuovere il bonus narrativamente.'},
  {id:'t53',cat:'mente',stile:'fantasy',   req:null,nome:'Metamagia',           desc:'Hai imparato a modellare le formule magiche in modo non standard. Una volta per combattimento puoi alterare un parametro di una magia al lancio: cambiare il bersaglio, estendere la durata di 1 round, o ridurre il costo di 1 slot.',pro:'1x/combat: modifica bersaglio OPPURE durata +1r OPPURE costo -1slot.',con:'1 solo uso per combattimento. Inutile senza magie.'},
  // ── ANIMA ──
  {id:'t16',cat:'anima',stile:'universale',req:null,nome:'Aura di Comando',     desc:'La tua presenza in battaglia non e solo fisica. Quando usi un\'azione per dare indicazioni tattiche chiare a un alleato entro raggio vocale, quell\'alleato ottiene +1 al prossimo tiro prima del tuo turno successivo.',       pro:'Un\'azione: +1 al prossimo tiro di un alleato. Scala con il numero di alleati presenti.',             con:'Richiede la tua azione. Inutile se sei impegnato o gli alleati non possono sentirti.'},
  {id:'t17',cat:'anima',stile:'noir',      req:null,nome:'Empatia',             desc:'La menzogna ha una texture che tu percepisci naturalmente. Passivo: ogni volta che qualcuno ti rivolge la parola, il GM indica se la persona e sincera, mente o crede nella propria versione dei fatti.',  pro:'Passivo: GM rivela sincerita in ogni conversazione. Potente in misteri e noir.',            con:'Il GM puo qualificare con \'crede di dire la verita\'. Non e infallibile per definizione.'},
  {id:'t18',cat:'anima',stile:'anime',     req:null,nome:'Spirito Indomabile',  desc:'Le ferite rallentano gli altri. Te, meno del previsto. Le penalita da Wound Tier si applicano un gradino piu tardi: Ferito non penalizza, Critico da -1 invece di -2.',                 pro:'Penalita ferite ritardate. Operativo piu a lungo nei combattimenti prolungati.',          con:'Non riduce il danno subito. Non previene lo stato a 0 HP.'},
  {id:'t19',cat:'anima',stile:'universale',req:null,nome:'Ispirazione',         desc:'Le tue parole, nel momento giusto, cambiano il peso di un dado. Una volta per riposo lungo puoi concedere a un alleato visibile +4 al suo prossimo tiro. Il bonus va dichiarato prima del tiro.',                         pro:'1x/riposo lungo: +4 al prossimo tiro di un alleato. Potenzialmente decisivo.',        con:'1 solo uso al giorno. Va dichiarato prima che il dado venga lanciato.'},
  {id:'t20',cat:'anima',stile:'universale',req:null,nome:'Senso del Pericolo',  desc:'Il pericolo arriva con un odore che il tuo corpo conosce prima che il cervello l\'abbia elaborato. Non puoi mai essere colto di sorpresa o vittima di un\'imboscata senza aver avuto l\'opportunita di agire nel primo round.',        pro:'Impossibile essere sorpresi. Sempre azione nel primo round di qualsiasi imboscata.',                con:'Situazionale. In combattimento standard dove tutti sono consapevoli vale meno.'},
  {id:'t21',cat:'anima',stile:'noir',      req:null,nome:'Voce della Ragione',  desc:'Sai come parlare alle persone in modo che si sentano ascoltate, anche quando stai cercando di convincerle di qualcosa di difficile. ANIMA +3 su persuasione, diplomazia, negoziazione e de-escalation.',           pro:'ANIMA +3 su tutte le interazioni sociali costruttive. Domina i contesti formali.',        con:'Solo interazioni sociali. Inutile in combattimento.'},
  {id:'t22',cat:'anima',stile:'noir',      req:null,nome:"Nervi d'Acciaio",     desc:'La paura ti e clinicamente indifferente. Non e coraggio, e assenza di risposta. Sei immune alla condizione Spaventato e ottieni +1 contro tentativi di coercizione o intimidazione diretta.',                 pro:'Immune a Spaventato. +1 vs coercizione. Completamente inflessibile sotto pressione.',                   con:'Situazionale contro avversari non intimidatori. Nessun vantaggio offensivo.'},
  {id:'t36',cat:'anima',stile:'anime',     req:null,nome:'Aura di Ki',          desc:'La tua presenza emana qualcosa di piu della semplice forza fisica. ANIMA +2 a tutti i tiri sia per intimidire che per ispirare in contesti diversi. I nemici con MENTE bassa tendono a identificarti come bersaglio prioritario.',     pro:'ANIMA +2 su intimidazione e ispirazione. Utilita doppia con la stessa stat.',               con:'I nemici ti percepiscono come minaccia principale e ti attaccano per primi.'},
  {id:'t37',cat:'anima',stile:'horror',    req:null,nome:'Sangue Maledetto',    desc:'Conosci il prezzo del potere e sei disposto a pagarlo. Una volta per sessione, sacrifica fino a 5 HP volontariamente prima di un tiro: ogni HP sacrificato aggiunge +1 a tutti i tiri per il resto della scena (max +5).',pro:'1x/sessione: sacrifica 1-5 HP per +1/HP ai tiri per tutta la scena (max +5).',          con:'Costa HP reali non recuperabili rapidamente. Pericoloso se gia ferito.'},
  {id:'t45',cat:'anima',stile:'horror',    req:null,nome:"Servo dell'Antico",   desc:'Hai stretto un accordo con qualcosa che non dovresti incontrare. Una volta per sessione puoi invocarlo: l\'entita agisce per 1 round con obiettivo deciso dal GM, poi tu ottieni +3 a tutti i tiri per il round successivo.',pro:'1x/sessione: entita aliata agisce 1 round + ANIMA tuo +3 tiri il round dopo.',                 con:'Il GM controlla l\'entita. Non sempre agisce come previsto o sperato.'},
  {id:'t46',cat:'anima',stile:'horror',    req:null,nome:'Ritualista',          desc:'Con 10 minuti di preparazione e materiali adeguati puoi compiere un rituale che produce uno di questi effetti a scelta: aggiunge +5 a un tiro magico imminente, cura 5 HP a un bersaglio a contatto, oppure applica -2 permanente per 1 scena a un bersaglio che fallisce un tiro ANIMA vs tua ANIMA.',pro:'Ogni 10 min: +5 tiro magico OPPURE cura 5 HP OPPURE -2 a bersaglio (ANIMA vs ANIMA).',    con:'Richiede 10 min di preparazione e materiali. Fallimenti rituali hanno conseguenze.'},
  {id:'t47',cat:'anima',stile:'anime',     req:null,nome:'Nakama',              desc:'Quando uno dei tuoi legami e in pericolo, qualcosa cambia in te. Una volta per combattimento, se un alleato scende sotto un terzo degli HP massimi, ottieni +4 a tutti i tuoi tiri per il round immediatamente successivo.',            pro:'1x/combat: +4 tiri per 1 round quando alleato scende sotto 1/3 HP.',       con:'Solo se un alleato e in pericolo reale. Inutile se combatti in solitaria.'},
  {id:'t54',cat:'anima',stile:'horror',    req:null,nome:'Ultimo Respiro',      desc:'Nessuno muore mentre sei ancora in piedi. Come reazione al momento esatto in cui un alleato entro 5 metri scende a 0 HP, quell\'alleato recupera immediatamente HP pari al tuo valore ANIMA. Una volta per riposo lungo.',pro:'Reazione istantanea: alleato a 0 HP recupera [ANIMA] HP. Clutch puro.',       con:'1 solo uso per riposo lungo. Richiede di essere entro 5m nel momento esatto.'},
  {id:'t55',cat:'anima',stile:'cyberpunk', req:null,nome:'Scarica Adrenalinica',desc:'Il tuo corpo produce adrenalina in modo eccessivo e incontrollato nei picchi di intensita. Una volta per combattimento, come azione gratuita, ignori tutte le condizioni attive per 1 round. Poi subisci Affaticato per 2 round (meno uno ai tiri).',pro:'1x/combat: ignora TUTTE le condizioni per 1 round. Azione gratuita senza costo immediato.',con:'Costo differito: Affaticato 2 round dopo (meno uno ai tiri).'},
  // ── IBRIDO ──
  {id:'t23',cat:'ibrido',stile:'universale',req:null,nome:"Maestro d'Armi",     desc:'Il perk della tua categoria arma corrente non e piu un singolo asso nella manica. Diventa una risorsa che puoi usare due volte per combattimento invece di una.',                           pro:'Raddoppia gli usi del perk arma. Dipende dalla qualita del perk scelto.',                con:'Se il perk scelto e debole, il guadagno e minimo.'},
  {id:'t24',cat:'ibrido',stile:'universale',req:null,nome:'Contrattacco',       desc:'Trasformi ogni mancanza nemica in un\'opportunita. Quando un attacco di un nemico risulta in 0 danno dopo i calcoli, rispondi immediatamente con un contrattacco come reazione fuori turno, senza consumare la tua azione.',   pro:'Reazione ogni volta che un nemico fa 0 danno. Attacco gratuito fuori turno.',   con:'Solo quando il nemico fa 0 danno. Inutile contro nemici con tiri costantemente alti.'},
  {id:'t25',cat:'ibrido',stile:'noir',     req:null,nome:'Sangue Freddo',       desc:'Il dolore e una sensazione che il tuo cervello processa con piu ritardo degli altri. Le penalita da Wound Tier si applicano un gradino piu tardi: Ferito non penalizza, Critico da -1 invece di -2.',                       pro:'Penalita ferite ritardate di un tier. Efficace molto piu a lungo in combattimento.',          con:'Non riduce il danno subito e non previene di arrivare a 0 HP.'},
  {id:'t26',cat:'ibrido',stile:'fantasy',  req:null,nome:'Cacciatore',          desc:'Una volta che colpisci qualcuno lo hai misurato. Dal secondo attacco in poi contro lo stesso bersaglio in un combattimento, ottieni +2 al tiro grazie alla familiarita accumulata con i suoi movimenti e pattern.',       pro:'CORPO/MENTE +2 dal secondo colpo in poi contro stesso bersaglio. Scala sui boss.',              con:'Nessun bonus al primo colpo. Inutile contro molti nemici diversi.'},
  {id:'t27',cat:'ibrido',stile:'universale',req:null,nome:'Adattamento Rapido', desc:'La tua mente si adatta alle situazioni in modo insolito. Una volta per sessione, in accordo col GM, puoi usare una caratteristica diversa da quella normale per un\'azione specifica. Ad esempio: ANIMA invece di CORPO per un atto di forza compiuto con pura volonta.',            pro:'1x/sessione: usa stat alternativa per 1 azione. Flessibilita narrativa massima.',         con:'1 uso. Richiede approvazione GM sulla coerenza della scelta.'},
  {id:'t28',cat:'ibrido',stile:'anime',    req:null,nome:'Riflessi Fulminei',   desc:'La tua mano e piu veloce del pensiero altrui. Ottieni +2 all\'iniziativa permanentemente. In caso di parita di iniziativa agisci sempre tu per primo.',                           pro:'INIT +2 permanente. A parita: sempre primo. Vantaggio tattico costante.',              con:'Solo iniziativa. Nessun effetto sul danno o sulla difesa durante il combattimento.'},
  {id:'t29',cat:'ibrido',stile:'fantasy',  req:null,nome:'Predatore',           desc:'I bersagli che si sono gia mossi nel round corrente si sono esposti. Ottieni +2 ai tiri di attacco contro nemici che hanno gia usato la loro azione di movimento nel round.',                  pro:'CORPO/MENTE +2 contro bersagli che si sono gia mossi nel round corrente.',            con:'Solo vs nemici che usano movimento. Inutile contro nemici completamente statici.'},
  {id:'t30',cat:'ibrido',stile:'anime',    req:null,nome:'Volontà di Ferro',    desc:'C\'e ancora qualcosa che devi fare. La prima volta che scendi a 0 HP in un combattimento, invece di cadere immediatamente puoi agire per 1 round completo prima di perdere conoscenza. Dopo quel round cadi comunque.',          pro:'1x/scontro: quando arrivi a 0 HP agisci ancora 1 round completo prima di cadere.',            con:'Una sola volta per combattimento. Dopo il round extra cadi comunque.'},
  {id:'t31',cat:'ibrido',stile:'universale',req:null,nome:'Doppia Minaccia',    desc:'Hai imparato a combinare le tecniche di armi pesanti con la velocita delle armi leggere nello stesso combattimento. Con Armi Pesanti attivo, puoi alternare il perk Cat C e il perk Cat A nello stesso scontro.',   pro:'Combina perk Cat C + Cat A in un singolo combattimento. Versatilita unica.',          con:'Richiede Armi Pesanti. Funziona solo in combinazione con quell\'accesso.'},
  {id:'t32',cat:'ibrido',stile:'universale',req:null,nome:'Presenza Letale',    desc:'Chi ti attacca in mischia e manca subisce le conseguenze del proprio errore. Passivo: ogni volta che un nemico effettua un attacco corpo a corpo contro di te e manca, quel nemico riceve -1 al suo prossimo tiro di qualsiasi tipo.',        pro:'Passivo: ogni mancanza nemica in mischia infligge -1 al loro prossimo tiro.',          con:'Solo in mischia. Nessun effetto se il nemico colpisce o attacca a distanza.'},
  {id:'t38',cat:'ibrido',stile:'universale',req:null,nome:'Sincronia',          desc:'Quando attacchi lo stesso bersaglio di un alleato nel medesimo round, create una sinergia tattica automatica: entrambi ottenete +2 al tiro di attacco contro quel bersaglio. L\'effetto e reciproco e non richiede coordinazione preventiva.',       pro:'CORPO/MENTE +2 reciproco quando attaccate stesso bersaglio nel round.',               con:'Richiede che un alleato attacchi lo stesso bersaglio nello stesso round.'},
  {id:'t39',cat:'ibrido',stile:'noir',     req:null,nome:'Cacciatore di Taglie',desc:'Una volta che hai fissato un bersaglio nella mente, sai dove trovarlo. MENTE +3 a tutti i tiri per tracciare, seguire o ritrovare un bersaglio specifico che hai gia visto di persona.',                 pro:'MENTE +3 su tracking bersagli noti. Infallibile come tracker e investigatore.',            con:'Solo vs bersagli gia visti. Nessun effetto su individui mai incontrati.'},
  {id:'t40',cat:'ibrido',stile:'post-ap', req:null,nome:'Arma Improvvisata',   desc:'Una sedia, una bottiglia, un pezzo di tubo: nelle tue mani qualsiasi oggetto improvvisato funziona come arma Cat B (+2) senza perk. Non puoi mai essere considerato disarmato se c\'e qualcosa a portata di mano.',                       pro:'Qualsiasi oggetto = Cat B (+2). Mai completamente disarmato.',                  con:'Nessun perk disponibile. Oggetti fragili possono rompersi (GM valuta).'},
  {id:'t41',cat:'ibrido',stile:'horror',   req:null,nome:'Presagio',            desc:'Qualcosa nell\'area ti manda un segnale che non si traduce in parole. Passivo: il GM ti avvisa quando una minaccia soprannaturale o un pericolo non-ordinario e presente nelle tue vicinanze immediate, anche attraverso pareti.',       pro:'Passivo: GM avvisa di pericoli soprannaturali nell\'area. Nessuna sorpresa occulta.',con:'Il GM decide timing e specificita dell\'avviso. Non sempre abbastanza preciso.'},
  {id:'t42',cat:'ibrido',stile:'post-ap', req:null,nome:'Sopravvivenza Estrema',desc:'Hai imparato a leggere l\'ambiente come un libro aperto. CORPO +3 su sopravvivenza in natura. Non puoi perderti in ambienti naturali attraversati. Una volta per giorno trovi risorse essenziali anche in contesti ostili.',pro:'CORPO +3 sopravvivenza. Impossibile perdersi in natura. 1x/giorno: risorse trovate.', con:'Inutile in ambienti urbani o artificiali.'},
  {id:'t49',cat:'ibrido',stile:'anime',   req:null,nome:'Tecnica Segreta',     desc:'Hai una tecnica personale con un nome e una storia. Una volta per sessione, dichiari il nome della tecnica e la applichi: il prossimo tiro ottiene +5. Deve essere narrativamente coerente col tipo di azione.',pro:'1x/sessione: +5 al prossimo tiro. Il bonus singolo piu alto del sistema.',con:'1 uso. Narrativamente vincolato. Il GM puo negare usi non plausibili.'},
  {id:'t56',cat:'ibrido',stile:'fantasy',  req:null,nome:'Legame Familiare',    desc:'Hai un legame speciale con qualcuno. Una volta per combattimento, quando il legame e presente o visibilmente al sicuro, ottieni +2 a tutti i tiri per 2 round. Se il legame viene minacciato: +4 per 1 round.',pro:'1x/combat: +2 tiri x2r (o +4 x1r se il legame e in pericolo).',con:'Dipende dalla presenza del legame. Inutile in solitaria o se il legame e assente.'},

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


  /* ═══ SPECIALIZZAZIONI — ARMI ═══
     Aggiungono il bonus di Competenza ai tiri con armi specifiche.
     Non si cumulano con la Competenza principale se copre gia' la stessa stat.
     Richiedono una Competenza attiva per essere utili.
  ═══════════════════════════════ */
  {id:'spec_cat_a',cat:'corpo',stile:'universale',
   nome:'Precisione Leggera',
   desc:'Hai affinato la tecnica con le armi leggere fino a farne un\'estensione naturale. Aggiungi il tuo bonus di Competenza a tutti i tiri di attacco con armi Categoria A.',
   pro:'+Comp ai tiri Cat A — ottimo per build MENTE/ANIMA che usano armi',
   con:'Solo Cat A. Non si cumula con Comp CORPO gia\ attiva.'},
  {id:'spec_cat_b',cat:'corpo',stile:'universale',
   nome:'Disciplina da Combattimento',
   desc:'Anni di pratica con le armi standard ti hanno dato padronanza completa della categoria. Aggiungi il tuo bonus di Competenza a tutti i tiri di attacco con armi Categoria B.',
   pro:'+Comp ai tiri Cat B — la categoria piu usata in assoluto',
   con:'Solo Cat B. Non si cumula con Comp CORPO.'},
  {id:'spec_cat_c',cat:'corpo',stile:'universale',req:'armi_pesanti',
   nome:'Maestria Pesante',
   desc:'Porti le armi pesanti con la stessa fluidita con cui un altro porta un coltello. Aggiungi il tuo bonus di Competenza a tutti i tiri di attacco con armi Categoria C.',
   pro:'+Comp ai tiri Cat C — trasforma un guerriero pesante in un mostro',
   con:'Richiede Armi Pesanti. Non si cumula con Comp CORPO.'},
  {id:'spec_cat_d',cat:'corpo',stile:'universale',req:'armi_letali',
   nome:'Arte del Devastatore',
   desc:'Non e\ solo forza — e\ tecnica applicata alla devastazione assoluta. Aggiungi il tuo bonus di Competenza ai tiri con armi Categoria D.',
   pro:'+Comp ai tiri Cat D — massimizza la categoria piu\ alta',
   con:'Richiede Armi Letali. Non si cumula con Comp CORPO.'},
  {id:'spec_distanza',cat:'corpo',stile:'universale',
   nome:'Occhio del Cecchino',
   desc:'La distanza non e\ un ostacolo, e\ un vantaggio strategico. Aggiungi il tuo bonus di Competenza a tutti i tiri di attacco con qualsiasi arma a distanza.',
   pro:'+Comp con ogni arma a distanza indipendentemente dalla categoria',
   con:'Solo attacchi a distanza. Inutile in corpo a corpo.'},
  {id:'spec_mischia',cat:'corpo',stile:'universale',
   nome:'Combattente Puro',
   desc:'In mischia sei nel tuo elemento naturale. Aggiungi il tuo bonus di Competenza a tutti i tiri di attacco in corpo a corpo (non a distanza).',
   pro:'+Comp in mischia con qualsiasi categoria di arma',
   con:'Inutile con armi a distanza.'},
  {id:'spec_arcano_corpo',cat:'ibrido',stile:'universale',
   nome:'Canale Arcano',
   desc:'Hai imparato a incanalare le formule magiche direttamente attraverso il filo dell\'arma. Aggiungi il tuo bonus di Competenza ai tiri con armi usate come armi magiche (stat MENTE).',
   pro:'+Comp quando l\'arma usa MENTE come stat di attacco',
   con:'Solo armi con toggle Magica attivo.'},

  /* ═══ SPECIALIZZAZIONI — MAGIE ═══
     Aggiungono Competenza ai tiri con magie specifiche.
     Non si cumulano con Comp MENTE/ANIMA se quella stat e\ gia\ la tua competenza principale.
  ═══════════════════════════════ */
  {id:'spec_cantrip',cat:'mente',stile:'universale',
   nome:'Maestro dei Cantrip',
   desc:'I tuoi cantrip hanno la stessa precisione e potenza di una magia di livello, frutto di pratica ossessiva sulle fondamenta. Aggiungi il tuo bonus di Competenza a tutti i tiri con cantrip.',
   pro:'+Comp su tutti i cantrip illimitati — fortissimo su build orientate ai cantrip',
   con:'Solo cantrip. Non si cumula con Comp MENTE/ANIMA gia\ attiva sulla stessa stat.'},
  {id:'spec_magia_L12',cat:'mente',stile:'universale',req:'gate_mb',
   nome:'Magia Precisa',
   desc:'Le magie di primo e secondo livello escono con chirurgica precisione, come se ogni formula fosse perfettamente incisa nella memoria. Aggiungi il tuo bonus di Competenza ai tiri con magie L1 e L2.',
   pro:'+Comp su L1-L2 — le magie piu usate e ricorrenti in combattimento',
   con:'Solo L1-L2. Richiede Magia Base.'},
  {id:'spec_magia_L34',cat:'mente',stile:'universale',req:'gate_ma',
   nome:'Grande Incantatore',
   desc:'Le magie piu potenti perdono il loro costo cognitivo nelle tue mani — le esegui con la stessa fluidita delle basi. Aggiungi il tuo bonus di Competenza ai tiri con magie L3 e L4.',
   pro:'+Comp su L3-L4 — massimizza le magie piu devastanti',
   con:'Solo L3-L4. Richiede Magia Avanzata. Investimento pesante (2 talenti).'},
  {id:'spec_magia_mente',cat:'mente',stile:'universale',req:'gate_mb',
   nome:'Arcanista Preciso',
   desc:'Le formule arcane basate sulla volonta intellettuale fluiscono attraverso di te con precisione assoluta. Aggiungi il tuo bonus di Competenza a tutte le magie con stat MENTE (cantrip inclusi).',
   pro:'+Comp a TUTTE le magie MENTE — copre ogni livello con una sola scelta',
   con:'Solo magie MENTE. Richiede Magia Base.'},
  {id:'spec_magia_anima',cat:'anima',stile:'universale',req:'gate_mb',
   nome:'Animista Esperto',
   desc:'La connessione con le energie dell\'ANIMA e\ diventata cosi\ profonda che ogni incantesimo animistico amplifica la tua essenza. Aggiungi il tuo bonus di Competenza a tutte le magie con stat ANIMA.',
   pro:'+Comp a TUTTE le magie ANIMA — ideale per build pure ANIMA',
   con:'Solo magie ANIMA. Richiede Magia Base.'},
];

// ═══ AUGMENTS / MIGLIORAMENTI FISICI (max 2) ═══
var AUGMENTS = [
  // CYBERPUNK
  {id:'aug_oc',stile:'cyberpunk',tipo:'Cyberware',nome:'Occhi Cybertici',desc:'Un paio di occhi sostituiti con sistemi ottici ad alta precisione. HUD integrato con overlay tattico in tempo reale, zoom ottico 10x, visione notturna e termica. Vedi nell\'oscurita come in piena luce.',pro:'+2 tiri MENTE visivi. Visione notturna.',con:'Visibili (LED). -1 ANIMA in contesti conservatori.',manutenzione:'Calibrazione mensile.',perk:'Scansione Tattica: 1x/combat, MENTE vs ANIMA per rivelare 1 stat nascosta del bersaglio.'},
  {id:'aug_bm',stile:'cyberpunk',tipo:'Cyberware',nome:'Braccio Meccanico',desc:'Un braccio potenziato con servoassistenza idraulica che moltiplica la forza erogabile senza sforzo percettibile. In mischia il risultato si traduce in prese immobilizzanti difficili da spezzare.',pro:'+2 CORPO attacchi fisici. Solleva il doppio.',con:'-1 ANIMA formale. -1 CORPO stealth.',manutenzione:'Calibrazione settimanale.',perk:'Presa Idraulica: 1x/combat, se colpisci in mischia il bersaglio è Rallentato 1 round.'},
  {id:'aug_rn',stile:'cyberpunk',tipo:'Cyberware',nome:'Riflessi Neurali',desc:'Il tuo sistema nervoso e stato ricablato con conduttori sinaptici artificiali che riducono i tempi di reazione a livelli meccanici. Il cervello elabora il pericolo e il corpo ha gia risposto.',pro:'+3 iniziativa. +1 difesa CORPO.',con:'Stress: CORPO vs 7 o Indebolito (MENTE). Incomp. Limitatore Rimosso.',manutenzione:'Soppressori mensili.',perk:'Schivata Reattiva: 1x/combat, nega un attacco che ti avrebbe colpito con margine <= 2.'},
  {id:'aug_ds',stile:'cyberpunk',tipo:'Cyberware',nome:'Dermascheletro',desc:'Piastre subderminiche in lega composita inserite nello strato sottocutaneo. Invisibili agli occhi ma percepibili al tatto. Il primo impatto violento viene parzialmente assorbito, preparando il sistema alla risposta.',pro:'Riduce 2 danni fisici (min 0).',con:'-1 CORPO atletismo.',manutenzione:null,perk:'Impatto Assorbito: la prima volta che subisci 3+ danni in un combat, il prossimo attacco ha +2.'},
  {id:'aug_in',stile:'cyberpunk',tipo:'Cyberware',nome:'Interfaccia Neurale',desc:'Un jack cranico discreto che permette connessione neurale diretta con qualsiasi sistema digitale compatibile. Dentro la rete, sei piu veloce di qualsiasi interfaccia manuale.',pro:'+3 MENTE vs sistemi digitali.',con:'Vulnerabile ad hacking (MENTE vs MENTE).',manutenzione:'Firmware mensile.',perk:'Download Rapido: 1x/sessione, scarica info da sistema digitale come azione gratuita.'},
  {id:'aug_gp',stile:'cyberpunk',tipo:'Cyberware',nome:'Gambe Potenziate',desc:'Gambe potenziate con pistoni servoassistiti che permettono salti fino a 3 metri di altezza e velocita di corsa doppia rispetto al baseline umano. In combattimento la carica diventa devastante.',pro:'Movimento doppio. +3 CORPO salto.',con:'-2 CORPO stealth in corsa.',manutenzione:'Ammortizzatori settimanali.',perk:'Carica Devastante: se ti muovi di almeno 6m prima di attaccare, +2 al tiro.'},
  {id:'aug_ca',stile:'cyberpunk',tipo:'Cyberware',nome:'Cuore Artificiale',desc:'Una pompa meccatronica sostituisce o supporta il tuo cuore biologico, ottimizzando la distribuzione di ossigeno e resistendo a condizioni che fermerebbero un cuore normale.',pro:'HP max +4. Immune veleni cardiovascolari.',con:'-1 ANIMA permanente.',manutenzione:'Batteria trimestrale.',perk:'Secondo Battito: 1x/sessione, quando arrivi a 0 HP, torni a 3 HP.'},
  {id:'aug_np',stile:'cyberpunk',tipo:'Nanotech',nome:'Nanite Protettive',desc:'Miliardi di nanorobot circolano nel sangue, rilevando e riparando lesioni tissutali in tempo reale. L\'effetto sul campo di battaglia e una rigenerazione minima ma costante.',pro:'+1 HP/round riposo breve. Veleni -1 round.',con:'In EMP: -3 tiri per 2 round.',manutenzione:null,perk:'Riparazione d\'Emergenza: 1x/combat, cura 2 HP come azione gratuita.'},
  // FANTASY
  {id:'aug_sd',stile:'fantasy',tipo:'Alchemico',nome:'Sangue del Drago',desc:'Il tuo metabolismo e stato modificato per elaborare e trasmettere energia geotermica attraverso ghiandole sublinguali sintetiche. Il risultato e un soffio di fuoco biologico a corto raggio.',pro:'Ignora 3 danni fuoco. +1 CORPO.',con:'-1 tiri in climi caldi.',manutenzione:null,perk:'Soffio Minore: 1x/combat, 1d12+CORPO vs CORPO, danno fuoco a un bersaglio entro 3m.'},
  {id:'aug_lp',stile:'fantasy',tipo:'Bioware',nome:'Tessuto Licantropo',desc:'Tessuto rigenerativo di origine licantropa e stato integrato nella tua biologia. La guarigione e rapida ma incontrollata: sotto pressione tende a potenziare anche l\'aggressivita.',pro:'Rigenera 1 HP/round fuori combat. Artigli Cat A.',con:'-1 MENTE in luna piena. ANIMA vs 8 o perdi controllo.',manutenzione:null,perk:'Frenesia Lunare: sotto metà HP, +1 attacchi fisici (cumulabile con Furia).'},
  {id:'aug_ov',stile:'fantasy',tipo:'Magico',nome:'Occhio del Veggente',desc:'Un terzo occhio nascosto nella fronte o nella nuca, frutto di chirurgia magica avanzata. Percepisce flussi di energia, tentativi di inganno e possibilita alternative prima che si concretizzino.',pro:'+2 MENTE tiri magici. Rilevi aure 10m.',con:'-1 ANIMA social. Visioni involontarie.',manutenzione:null,perk:'Preveggenza: 1x/combat, dichiara prima del tiro del nemico: il suo prossimo tiro ha -2.'},
  {id:'aug_rc',stile:'fantasy',tipo:'Runa',nome:'Rune Corporee',desc:'Rune di protezione e reazione sono state incise direttamente nella carne con inchiostro magico permanente. Attivano una risposta offensiva automatica quando sei colpito da vicino.',pro:'+2 difesa CORPO. Immune prima maledizione/sessione.',con:'Dispelling: -1 difesa/round. Visibili.',manutenzione:null,perk:'Runa Esplosiva: 1x/combat, reazione: chi ti colpisce in mischia subisce 3 danni.'},
  {id:'aug_ga',stile:'fantasy',tipo:'Bioware',nome:'Ghiandole Alchemiche',desc:'Ghiandole sintetiche impiantate producono e immagazzinano composti tossici su richiesta, rilasciabili attraverso il sudore o il contatto diretto durante un attacco.',pro:'1x/riposo: sostanza (veleno/acido/adrenalina/siero).',con:'Dieta specifica. Senza: -1 CORPO 1 ora.',manutenzione:'Dieta mensile.',perk:'Veleno Rapido: 1x/combat, il tuo prossimo attacco fisico infligge Avvelenato 2 round.'},
  // HORROR
  {id:'aug_pm',stile:'horror',tipo:'Patto',nome:'Patto col Morto',desc:'Hai stretto un accordo formale con un morto che non e ancora passato oltre. In cambio di qualcosa di non detto, ti sussurra segreti sulle intenzioni altrui.',pro:'1x/sessione: info unica. +1 difesa ANIMA.',con:'Entità può interferire.',manutenzione:'Rispetta patti o -2 tiri.',perk:'Sussurro del Morto: 1x/combat, ANIMA vs ANIMA di un nemico, vinci: conosci la sua prossima azione.'},
  {id:'aug_cm',stile:'horror',tipo:'Biomod',nome:'Carne Modulata',desc:'Il tuo tessuto connettivo e stato reso parzialmente malleabile attraverso modifiche biologiche avanzate. Puoi rimodellare masse muscolari e arti per adattarli a compiti specifici nell\'arco di una scena.',pro:'Rimodella arto (Cat A, strumento, superficie).',con:'-1 ANIMA permanente. Temperature estreme: -2 tiri.',manutenzione:null,perk:'Adattamento: 1x/sessione, rimodella un arto per ottenere +3 a un tipo di tiro CORPO per 1 scena.'},
  {id:'aug_nm',stile:'horror',tipo:'Neurologia',nome:'Nervo Morto',desc:'Una porzione del tuo sistema nervoso e stata deliberatamente desensibilizzata ai segnali di dolore. Continui a funzionare in condizioni che bloccherebbero fisicamente chiunque altro.',pro:'Immune penalità Ferito. +1 CORPO resistenza.',con:'Non senti danni minori. Ferite nascoste (GM).',manutenzione:null,perk:'Resistenza al Dolore: 1x/combat, ignora una condizione per 1 round.'},
  {id:'aug_sc',stile:'horror',tipo:'Patto',nome:'Sigillo Corrotto',desc:'Un sigillo magico oscuro e stato inciso nella tua pelle da qualcuno che conosceva rituali che non avrebbe dovuto conoscere. Trasferisce parte del malfunzionamento arcano su chi ti colpisce.',pro:'+2 a tipo tiro scelto. Sempre attivo.',con:'Ad ogni uso: d6, su 1 entità guarda attraverso te.',manutenzione:null,perk:'Marchio Ardente: 1x/combat, il bersaglio che colpisci subisce -1 a tutti i tiri per 2 round.'},
  {id:'aug_mk',stile:'horror',tipo:'Patto Cosmico',nome:"Marchio dell'Antico",desc:'Il simbolo di un\'entita cosmica e stato impresso nella tua aura in modo permanente. Chi ti fissa troppo a lungo sente qualcosa di sbagliato — qualcosa che non appartiene a questo piano.',pro:'+2 ANIMA vs entità cosmiche. Percepisci elder god 500m.',con:'-1 MENTE per sessione. Sogni cosmici.',manutenzione:'Rituali mensili.',perk:'Terrore Cosmico: 1x/sessione, ANIMA vs ANIMA di tutti entro 5m, chi perde è Spaventato 1 round.'},
  {id:'aug_oc2',stile:'horror',tipo:'Biomod Cosmico',nome:'Occhio del Caos',desc:'Un occhio alieno di origine sconosciuta e stato impiantato in sostituzione di uno dei tuoi. Vede pattern che gli occhi umani filtrano automaticamente, comprese probabilita e possibilita imminenti.',pro:'+3 percezione soprannaturale. 50% futuro 1x/combat.',con:'-1 ANIMA permanente. Visioni non controllabili.',manutenzione:null,perk:'Visione del Caos: 1x/combat, 50% (d6 >= 4) di prevedere il prossimo tiro nemico e annullarlo.'},
  {id:'aug_sang',stile:'horror',tipo:'Rituale di Setta',nome:'Legame di Sangue',desc:'Il tuo sangue contiene frammenti di un rituale collettivo che ti connette psichicamente agli altri membri della setta in modo permanente. Quando hai bisogno di forza, loro la sentono.',pro:'Senti membri 1 km. +2 ANIMA rituali collettivi.',con:'Setta ti localizza sempre. GM ha accesso pensieri.',manutenzione:'Rito mensile.',perk:'Rete Psichica: 1x/combat, un membro della setta entro 1km ti dà +2 al prossimo tiro.'},
  {id:'aug_corp',stile:'horror',tipo:'Corruzione',nome:'Corruzione Benedetta',desc:'Il tuo corpo porta tracce visibili di corruzione magica — vene che pulsano in colori sbagliati, cicatrici che cambiano forma. La corruzione pero e stata trasformata in energia offensiva.',pro:'+1 CORPO, +1 ANIMA. Rigenera 1 HP/round sotto metà HP.',con:'Rigenerazione: d6, su 1 tratto orrorifico. Non-umano.',manutenzione:null,perk:'Rigetto Violento: quando rigeneri HP, 1x/combat il nemico più vicino subisce 2 danni.'},
  {id:'aug_voc',stile:'horror',tipo:'Rituale di Setta',nome:"Voce dell'Abisso",desc:'Un rituale di setta ha modificato le tue corde vocali in modo permanente. A volte, quando parli, chi ascolta sente qualcosa di diverso da cio che hai detto — qualcosa che vuole obbedire.',pro:'+3 ANIMA intimidazione. Vero Nome: entità non attacca 1 round.',con:'-2 ANIMA social normali. Attira attenzione entità.',manutenzione:null,perk:'Comando Abissale: 1x/sessione, pronuncia un ordine: ANIMA vs ANIMA, il bersaglio esegue 1 azione semplice.'},
  // ANIME
  {id:'aug_lr',stile:'anime',tipo:'Neurologia',nome:'Limitatore Rimosso',desc:'Un blocco mentale artificiale che limitava le prestazioni fisiche e stato rimosso chirurgicamente. Il risultato e accesso a picchi di performance prima soppressi, a costo di una certa instabilita.',pro:'1x/combat: stat bonus x1.5 per 1 round.',con:'-5 HP dopo. Incomp. Riflessi Neurali / Gate dell\'Anima.',manutenzione:null,perk:'Sovraccarico: quando usi il Limitatore, il primo attacco del round extra ha +3.'},
  {id:'aug_fd',stile:'anime',tipo:'Biomod',nome:'Forma Duale',desc:'Una forma alternativa biologica dorme nel tuo DNA, attivabile con concentrazione. La trasformazione non e cosmetics: muta la struttura ossea e muscolare in qualcosa di piu adatto al combattimento.',pro:'1x/combat: +2 tiri, +2 HP temp per 3 round.',con:'Dopo: Indebolito (CORPO) 2 round. Aspetto cambia.',manutenzione:null,perk:'Metamorfosi Offensiva: nella Forma Duale, i tuoi attacchi fisici infliggono +2 danni.'},
  {id:'aug_ck',stile:'anime',tipo:'Spirituale',nome:'Core di Ki',desc:'Una riserva di energia spirituale e stata aperta e stabilizzata all\'interno del tuo corpo attraverso meditazione intensiva e rituale. Il ki e ora un serbatoio che puoi svuotare in esplosioni precise.',pro:'+2 attacchi magici. Usa stat più alta per magie.',con:'2 magie consecutive: -2 HP. Ki visibile.',manutenzione:null,perk:'Esplosione di Ki: 1x/combat, il tuo prossimo attacco magico colpisce anche 1 bersaglio adiacente.'},
  {id:'aug_asc',stile:'anime',tipo:'Ascensione',nome:'Forma Ascesa',desc:'Hai toccato la tua vera forma, anche solo brevemente. Nella forma ascesa irradi un\'aura che cambia la chimica del combattimento intorno a te — il tuo gruppo combatte meglio semplicemente standoti vicino.',pro:'1x/sessione: +4 tiri, +5 HP temp per 4 round. Attacchi magici.',con:'Dopo: Stordito 1 round, poi -3 tiri 2 round. No con Forma Duale.',manutenzione:null,perk:'Aura Divina: nella Forma Ascesa, alleati entro 5m hanno +1 a tutti i tiri.'},
  {id:'aug_spirit',stile:'anime',tipo:'Spirituale',nome:"Spirito dell'Arma",desc:'L\'arma che porti ha sviluppato una coscienza propria, forgiata dai combattimenti che avete condiviso. A volte agisce da sola, non perche sia magica, ma perche ha imparato.',pro:'+2 attacchi fisici. +1 iniziativa. 1x/sessione nega critico.',con:'Spirito ha volontà propria (GM). Se distrutta: -bonus 1 sessione.',manutenzione:'Cura narrativa.',perk:'Risonanza: 1x/combat, l\'arma agisce da sola come azione bonus (Cat A, +2 attacco).'},
  {id:'aug_gate',stile:'anime',tipo:'Energia Interiore',nome:"Gate dell'Anima",desc:'I tuoi canali energetici interni sono stati potenziati attraverso training specifico. Quando apri il flusso di energia, la tua presenza amplifica chi ti e vicino.',pro:'+1 tutti tiri. Azione: apri gate +4 attacco 1 round.',con:'Gate: -3 HP. 3+ aperture/sessione: -1 CORPO. Incomp. Limitatore Rimosso.',manutenzione:'Meditazione. Senza: -5 HP.',perk:'Canale Aperto: quando apri il Gate, il prossimo alleato che attacca il tuo bersaglio ha +2.'},
  {id:'aug_manif',stile:'anime',tipo:'Manifestazione',nome:"Eco dell'Anima",desc:'Una manifestazione psichica della tua essenza esiste come presenza semi-indipendente a pochi metri da te. Percepisce minacce e reagisce in modo autonomo a pericoli imminenti.',pro:'Azione bonus Cat A a 5m. +2 ANIMA social. 1x/sessione intercetta.',con:'Danno all\'eco = danno a te. Visibile.',manutenzione:null,perk:'Eco Protettivo: 1x/combat, l\'eco intercetta un attacco a un alleato entro 5m.'},
  // UNIVERSALE / NOIR / POST-AP
  {id:'aug_ws',stile:'universale',tipo:'Biologico',nome:'Cicatrice della Guerra',desc:'Le tue cicatrici di guerra non sono solo estetiche — il tuo sistema immunitario e adattivo le ha trasformate in memoria del combattimento. Contro chi ti ha gia ferito sei piu pericoloso.',pro:'+1 CORPO. Immune Ferito in primo combat/sessione.',con:'-1 ANIMA vs non-combattenti. Trigger: -1 MENTE 1 round.',manutenzione:null,perk:'Veterano: 1x/combat, +2 al prossimo tiro contro un nemico che ti ha già colpito.'},
  {id:'aug_ps',stile:'universale',tipo:'Protesi',nome:'Protesi Specializzata',desc:'Una protesi progettata non per sostituire ma per eccellere in un compito specifico, scelto al momento dell\'installazione. In quella funzione, la meccanica supera nettamente il biologico.',pro:'+3 a tipo specifico tiro CORPO.',con:'-1 altri tiri CORPO.',manutenzione:'Manutenzione mensile.',perk:'Specializzazione Estrema: per il tipo scelto, 1x/combat il tiro ha minimo 6 sul d12.'},
  {id:'aug_mi',stile:'noir',tipo:'Neurologia',nome:'Mente da Investigatore',desc:'Un condizionamento cognitivo intensivo ha ristrutturato il modo in cui il tuo cervello elabora le scene. Noti cio che gli altri non notano, e a volte e abbastanza per cambiare tutto.',pro:'GM dice se hai perso qualcosa. +2 MENTE vs illusioni.',con:'-1 ANIMA in situazioni emotive.',manutenzione:null,perk:'Deduzione Lampo: 1x/sessione, il GM rivela 1 indizio critico sulla scena.'},
  {id:'aug_it',stile:'post-ap',tipo:'Biologico',nome:'Immunizzazione Tossica',desc:'Il tuo organismo e stato esposto gradualmente a una vasta gamma di tossine ambientali e biologiche, sviluppando una risposta adattiva che la maggior parte delle persone non possiede.',pro:'Immune ambienti tossici. +3 vs veleni.',con:'-1 cure magiche/alchemiche.',manutenzione:null,perk:'Metabolismo Adattivo: 1x/sessione, ignora 1 effetto ambientale per 1 ora.'},
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
  /* ═══════ GREGARI — HP 4-8, stat 2-4, 1 colpo ═══════ */
  {id:'mon01',nome:'Goblin',tier:'gregario',stile:'fantasy',corpo:3,mente:2,anima:1,hp:6,armaCat:'A',defBonus:0,competenza:null,talenti:[],magie:[],
   lore:'Piccole creature verdognole che vivono in tane sotterranee. Codardi da soli, pericolosi in branco. Usano trappole e numeri al posto del coraggio.',
   desc:'Creatura gregaria debole ma rapida. Attacca in gruppo e fugge se solo.',
   abilita:'Se in gruppo con altri 2+ goblin: +1 al tiro di attacco (branco). Fugge se HP scende a 1.',
   speciale:null},
  {id:'mon02',nome:'Scheletro',tier:'gregario',stile:'fantasy',corpo:3,mente:1,anima:1,hp:5,armaCat:'A',defBonus:0,competenza:null,talenti:[],magie:[],
   lore:'Resti animati da magia necrotica residua. Nessuna coscienza, nessuna paura, nessun dolore — solo la compulsione di distruggere i vivi.',
   desc:'Non-morto scheletrico. Immune alle condizioni psicologiche.',
   abilita:'Immune a Spaventato e Charme. Vulnerabile a danni contundenti (+1 danno). Immune a veleno.',
   speciale:null},
  {id:'mon03',nome:'Drone da Combattimento',tier:'gregario',stile:'cyberpunk',corpo:3,mente:2,anima:1,hp:5,armaCat:'B',defBonus:1,competenza:null,talenti:[],magie:[],
   lore:'Unita automatizzata di pattugliamento, prodotta in serie. Economica, sostituibile, e programmata per sparare prima di fare domande.',
   desc:'Robot da combattimento economico. Vulnerabile a EMP e hacking.',
   abilita:'Immune a Spaventato e Veleno. Vulnerabile a magie tecnologiche (-1 DEF contro impulsi EMP). Ricarica: se ucciso, 1x/combat un secondo drone identico puo arrivare (GM valuta).',
   speciale:null},
  {id:'mon_gr4',nome:'Teppista',tier:'gregario',stile:'noir',corpo:3,mente:2,anima:2,hp:6,armaCat:'B',defBonus:0,competenza:null,talenti:[],magie:[],
   lore:'Criminale di basso rango. Vive per le piccole estorsioni e la violenza di quartiere. Impressionabile, segue ordini solo finche conviene.',
   desc:'Criminale comune. Intimidabile facilmente.',
   abilita:'Tiro ANIMA vs 8 se subisce danni critici: se fallisce, fugge o si arrende. +1 attacco se ha un ostaggio.',
   speciale:null},
  {id:'mon_gr5',nome:'Cultista',tier:'gregario',stile:'horror',corpo:2,mente:2,anima:4,hp:6,armaCat:'A',defBonus:0,competenza:'anima',talenti:[],magie:['ct_lamento_oscuro'],
   lore:'Devoto convinto che il sacrificio porti ricompense da entita oltre la comprensione umana. Non teme la morte propria — teme di deludere il suo dio.',
   desc:'Seguace fanatico con accesso a magia oscura basica.',
   abilita:'Immune a Spaventato (fanatico). Cantrip Lamento Oscuro (ANIMA 4, +1 tiro). Muore senza ritirarsi se a meno di meta HP.',
   speciale:null},
  {id:'mon_gr6',nome:'Kimono Fantasma',tier:'gregario',stile:'anime',corpo:2,mente:3,anima:3,hp:5,armaCat:'A',defBonus:0,competenza:'mente',talenti:[],magie:['c04'],
   lore:'Spirito vendicativo rimasto intrappolato nel mondo dei vivi. Appare come sagoma luminosa in abiti tradizionali. Vuole solo che qualcuno si ricordi di lui.',
   desc:'Spirito incorporeo. Vulnerabile a magie di purificazione.',
   abilita:'Immune a danni fisici normali (richiede magie o armi incantate). Cantrip Disturbo (MENTE 3). Vulnerabile ad ANIMA: magie ANIMA infliggono +2 danno.',
   speciale:null},

  /* ═══════ NORMALI — HP 9-16, stat 4-7, 2-3 colpi ═══════ */
  {id:'mon04',nome:'Cavaliere Corrotto',tier:'normale',stile:'fantasy',corpo:7,mente:3,anima:2,hp:12,armaCat:'C',defBonus:3,competenza:'corpo',talenti:['armi_pesanti'],magie:[],
   lore:'Un tempo servitore onorevole, corrotto dalla magia oscura o da un patto sbagliato. Il suo senso dell\'onore e ora un guscio vuoto a servizio del potere.',
   desc:'Guerriero pesantemente armato. Difficile da abbattere.',
   abilita:'Armatura pesante +3 DEF. Competenza CORPO +3. 1x/combat: Carica — attacca con +2 al tiro e spinge il bersaglio di 2m (se colpisce).',
   speciale:'Resistenza Oscura: primo attacco magico ogni combat riduce il danno di 2.'},
  {id:'mon05',nome:'Cultista Maggiore',tier:'normale',stile:'horror',corpo:3,mente:4,anima:7,hp:14,armaCat:'B',defBonus:0,competenza:'anima',talenti:['gate_mb'],magie:['m07','m04'],
   lore:'Un convertito di vecchia data che ha assistito a riti proibiti abbastanza a lungo da toccare qualcosa di reale. Il suo sguardo non e piu del tutto umano.',
   desc:'Cultista avanzato con accesso a magie di livello 1.',
   abilita:'Competenza ANIMA +3. Voce del Terrore (L1, ANIMA 7, +2 tiro). Cura Ferite (L1). 2 slot magia totali.',
   speciale:'Benedizione di Sangue: se un alleato muore entro 5m, recupera 3 HP (1x/combat).'},
  {id:'mon06',nome:'Cyborg Mercenario',tier:'normale',stile:'cyberpunk',corpo:6,mente:5,anima:2,hp:12,armaCat:'C',defBonus:1,competenza:'corpo',talenti:['interfaccia_neurale'],magie:[],
   lore:'Ex-soldato riconvertito in mercenario con impianti militari di seconda mano. Lavora per chiunque paghi abbastanza e non fa domande.',
   desc:'Combattente potenziato con impianti militari.',
   abilita:'Competenza CORPO +3. Impianti: +1 DEF, visione notturna. 1x/combat: Scarica EMP — tutti i sistemi tecnologici entro 3m si riavviano (turno perso per chi li usa).',
   speciale:'Targeting Avanzato: 1x/combat, ignora bonus scudo del bersaglio su un attacco.'},
  {id:'mon_n4',nome:'Samurai Nemico',tier:'normale',stile:'anime',corpo:7,mente:3,anima:5,hp:13,armaCat:'C',defBonus:1,competenza:'corpo',talenti:['contrattacco'],magie:[],
   lore:'Guerriero disciplinato legato a un codice d\'onore sovvertito. Combatte con eleganza mortale e non mostra misericordia a chi considera indegno.',
   desc:'Combattente esperto con tecnica di contrattacco.',
   abilita:'Competenza CORPO +3. 1x/combat: Contrattacco — se un attacco lo manca, risponde immediatamente con un attacco gratuito. DEF +1 (postura).',
   speciale:'Postura del Vuoto: se non si muove in un round, DEF +2 per quel round.'},
  {id:'mon_n5',nome:'Detective Corrotto',tier:'normale',stile:'noir',corpo:4,mente:7,anima:4,hp:11,armaCat:'B',defBonus:0,competenza:'mente',talenti:['istinto_sopravvivenza'],magie:[],
   lore:'Un investigatore che ha visto troppo e ha scelto il lato sbagliato. Usa la sua conoscenza della legge per aggirarla sistematicamente.',
   desc:'Investigatore nemico con alto MENTE e tattiche dirty.',
   abilita:'Competenza MENTE +3. 1x/combat: Parole Taglienti — tiro MENTE vs MENTE, se vince applica -1 al prossimo tiro del bersaglio (parole che destabilizzano). Sempre va per primo (alta INIT).',
   speciale:'Conoscenza Criminale: sa sempre dove si trovano oggetti nascosti o uscite di emergenza (narrativo).'},
  {id:'mon_n6',nome:'Vampiro',tier:'normale',stile:'horror',corpo:6,mente:4,anima:6,hp:14,armaCat:'B',defBonus:0,competenza:'corpo',talenti:['patto_abisso'],magie:['c14'],
   lore:'Non-morto intellettuale che si e adattato a secoli di sopravvivenza. Freddo, calcolatore, e sempre tre mosse avanti. Non ama essere disturbato.',
   desc:'Non-morto con tocco necrotico e rigenerazione.',
   abilita:'Rigenerazione: recupera 2 HP all\'inizio di ogni turno (non al sole o fuoco). Tocco Necrotico cantrip (MENTE 4, +1). Vulnerabile a fuoco (+2 danno) e luce solare.',
   speciale:'Fascino Vampirico: 1x/combat, tiro ANIMA vs ANIMA — se vince, bersaglio non attacca per 1 round (Charme).'},

  /* ═══════ ELITE — HP 17-25, stat 7-11, 4-6 colpi ═══════ */
  {id:'mon07',nome:'Drago Giovane',tier:'elite',stile:'fantasy',corpo:10,mente:6,anima:7,hp:23,armaCat:'D',defBonus:4,competenza:'corpo',talenti:['armi_letali','limite_ultimo'],magie:['m13'],
   lore:'Non ancora adulto ma gia letale. Ogni drago giovane sta sviluppando una personalita propria — certo di essere superiore a tutte le forme di vita inferiori, incluso te.',
   desc:'Drago in crescita con soffio e artigli devastanti.',
   abilita:'CORPO 10 + Armi Letali: Cat D. Competenza CORPO +5. Armatura naturale +4 DEF. Palla di Fuoco (L2, MENTE 6, +4 tiro, 1 slot). Soffio di Fuoco: attacco Cat D che colpisce tutti in un cono di 6m (1x/combat).',
   speciale:'Volo: ignora terreno difficile e attacchi corpo a corpo se in aria (DEF +1). Terrore Draconico: creature con CORPO o ANIMA inferiore a 6 devono superare tiro vs 10 o subiscono Spaventato.'},
  {id:'mon_e2',nome:'Vampiro Anziano',tier:'elite',stile:'horror',corpo:9,mente:7,anima:9,hp:20,armaCat:'C',defBonus:2,competenza:'anima',talenti:['patto_abisso','furia'],magie:['m07','c14','m26'],
   lore:'Esistito per centinaia di anni, ogni decennio piu cinico e piu potente. Ha visto empiri nascere e cadere, e pensa di avere tutto il tempo del mondo.',
   desc:'Antico vampiro con pieno accesso alla magia mentale.',
   abilita:'Competenza ANIMA +4. Rigenerazione 3 HP/turno. Tocco Necrotico, Voce del Terrore (L1), Controllo Mentale (L3, 2 slot). Pool slot: 7. Immune Spaventato. Vulnerabile luce solare/fuoco.',
   speciale:'Trasformazione: 1x/combat si trasforma in nebbia — invulnerabile per 1 round, poi riemerge.'},
  {id:'mon_e3',nome:'Hacker Militare',tier:'elite',stile:'cyberpunk',corpo:5,mente:11,anima:4,hp:17,armaCat:'B',defBonus:0,competenza:'mente',talenti:['interfaccia_neurale','recupero_arcano'],magie:['m22','m33','c15'],
   lore:'Specialista di guerra informatica che non ha mai sparato un colpo — non ce bisogno. Dentro la rete giusta, puo spegnere una citta intera da una sedia.',
   desc:'Especialista cybernetico con controllo totale delle tecnologie.',
   abilita:'MENTE 11: Intuizione Magica + accesso magie. Competenza MENTE +5. Overload Neurale (L2, +5 IM), Hacking di Massa (L3, 2slot), Impulso Digitale cantrip. Pool slot: 9. Recupero Arcano: recupera 1 slot/round se non attaccato.',
   speciale:'God Mode: 1x/combat, puo spegnere tutti i dispositivi tecnologici nell\'area (30m) per 2 round.'},
  {id:'mon_e4',nome:'Maestro del Dojo Nemico',tier:'elite',stile:'anime',corpo:9,mente:7,anima:8,hp:22,armaCat:'C',defBonus:2,competenza:'corpo',talenti:['contrattacco','furia','adrenalina_pura'],magie:['m50'],
   lore:'Guerriero che ha dedicato decenni alla perfezione del combattimento. Il suo dojo e un tempio di disciplina — e la sua sconfitta e qualcosa che non riesce a concepire.',
   desc:'Maestro delle arti marziali con tecniche di livello alto.',
   abilita:'Competenza CORPO +4. DEF +2 (postura). Contrattacco (perk), Furia: +2 danno per 2 round. Tecnica Ultimo Stadio (L3, 2slot): prossimo attacco +4 tiro. Adrenalina Pura: 1x/fight ignora condizioni.',
   speciale:'Mille Pugni: 1x/combat, effettua 2 attacchi in un turno al -1 ciascuno.'},
  {id:'mon_e5',nome:'Fantasma dell Abisso',tier:'elite',stile:'horror',corpo:4,mente:8,anima:11,hp:18,armaCat:'A',defBonus:0,competenza:'anima',talenti:['gate_mb','gate_ma','conoscenza_proibita'],magie:['m07','m29','m39','c14'],
   lore:'Non e un fantasma nel senso comune — e un frammento di coscienza di qualcosa di cosmico, intrappolato tra i piani. Sa cose che gli esseri mortali non dovrebbero sapere.',
   desc:'Entita cosmica parzialmente incorporea con magia piena.',
   abilita:'Competenza ANIMA +5. Immune danni fisici non-magici. Magie L1-L4: Voce del Terrore, Maledizione, Dominio. Pool slot: 9. Cantrip Tocco Necrotico. Incorporeo: DEF +3 contro attacchi non-magici.',
   speciale:'Conoscenza Proibita: conosce debolezze di ogni PG (narrativo) — il GM puo dichiarare che attacca il punto debole.'},

  /* ═══════ BOSS — HP 26-45, stat 10-15, 8-15 colpi ═══════ */
  {id:'mon09',nome:'Lich Antico',tier:'boss',stile:'horror',corpo:8,mente:14,anima:12,hp:38,armaCat:'C',defBonus:3,competenza:'mente',talenti:['gate_mb','gate_ma','patto_abisso','conoscenza_proibita'],magie:['m25','m26','m29','m41','m47','c14'],
   lore:'Un tempo il piu grande stregone della sua era, ora qualcosa di radicalmente altro. Duecento anni di lichdom hanno sostituito ogni emozione umana con logica e ambizione cosmica pura.',
   desc:'Incantatore non-morto supremo. Immune a quasi tutto. Richiede un piano.',
   abilita:'MENTE 14: pool slot enorme (12pt). Competenza MENTE +7. Immune Veleno, Spaventato, Necrotico. Fulmine, Controllo Mentale, Maledizione, Grande Maledizione, Frammentazione Cosmica, Tocco Necrotico. DEF = 8+3 = 11. Rigenerazione 3 HP/round.',
   speciale:'Resistenza Magica: 1x/round puo ignorare completamente un singolo effetto magico. Filocosmos: se ridotto a 0 HP, torna a 3 HP la volta successiva (ha nascosto il suo Lich Phylactery — i giocatori devono trovarlo e distruggerlo prima di poter uccidere il Lich).'},
  {id:'mon10',nome:'Shogun Demoniaco',tier:'boss',stile:'anime',corpo:13,mente:9,anima:11,hp:42,armaCat:'D',defBonus:5,competenza:'corpo',talenti:['armi_letali','furia','contrattacco','limite_ultimo'],magie:['m32','m28'],
   lore:'Conquistatore che ha stretto un patto con forze demoniache per ottenere potere assoluto. Il suo esercito ha raso al suolo tre regni. Il quarto lo teme ancora.',
   desc:'Generale demoniaco con statistiche massime e tecnica devastante.',
   abilita:'CORPO 13: Cat D garantita. Competenza CORPO +6. DEF = 13+5 = 18. Furia: +2 danno per 2 round. Contrattacco. Tempesta di Lame (L3, 2slot): tutti entro 4m subiscono danno. Grido di Guerra (L3): +1 danno alleati. Pool slot: 9.',
   speciale:'Forma Demoniaca: quando scende sotto 15 HP, il suo CORPO sale a 15 e guadagna +2 danno permanente fino a fine scontro. Ira Assoluta: se un alleato cade, effettua immediatamente un attacco extra gratuito fuori turno.'},
  {id:'mon_b3',nome:'Sovrano dell Abisso',tier:'boss',stile:'horror',corpo:9,mente:12,anima:15,hp:40,armaCat:'C',defBonus:2,competenza:'anima',talenti:['gate_mb','gate_ma','patto_abisso','conoscenza_proibita'],magie:['m39','m41','m47','m30','c14','m07'],
   lore:'Non viene da questo piano di esistenza. E stato invocato, e ora vuole restare. Il suo corpo fisico e un prestito — la vera entita e qualcosa che la mente umana non riesce a visualizzare completamente.',
   desc:'Entita cosmica al massimo delle capacita magiche e psichiche.',
   abilita:'ANIMA 15: pool slot 13pt. Competenza ANIMA +7. Immune a danni non-magici, Spaventato, Veleno. Dominio (L4, 2slot), Grande Maledizione (L4), Frammentazione Cosmica (L4), Aura di Morte (L3), Voce del Terrore (L1), Tocco Necrotico. DEF = 9+2 = 11.',
   speciale:'Aura Abissale: tutti i PG a 5m subiscono -1 a tutti i tiri mentre sono in quella zona. Piena Manifestazione: 1x/combat, come azione bonus lancia gratuitamente una magia L1-L2 senza usare slot.'},
  {id:'mon_b4',nome:'Imperatore Cibernetico',tier:'boss',stile:'cyberpunk',corpo:10,mente:15,anima:8,hp:36,armaCat:'D',defBonus:6,competenza:'mente',talenti:['interfaccia_neurale','cap_15','gate_mb','gate_ma'],magie:['m33','m22','m42','c15'],
   lore:'CEO di una megacorporazione che ha trasferito il 70% della sua coscienza in un corpo sintetico. Non si considera piu umano — e questo lo ha liberato da qualunque remora.',
   desc:'Ibridazione perfetta tra uomo e macchina al picco delle capacita.',
   abilita:'MENTE 15: pool slot 13pt. Competenza MENTE +7. DEF = 10+6 = 16. Hacking di Massa (L3), Overload Neurale (L2), Trasferimento Coscienza (L4): se ridotto a 0 HP puo trasferirsi in un altro sistema entro 20m (1x). Impulso Digitale cantrip.',
   speciale:'Corpo Sintetico: immune a veleni e magie psicologiche. Protocollo Omega: sotto 10 HP, il corpo sintetico si potenzia automaticamente — DEF +3 e +2 attacco per 3 round (disperazione meccanica). Upgrade in tempo reale: ogni 3 round guadagna una nuova resistenza casuale (GM decide).'},
  {id:'mon_b5',nome:'Il Padrino',tier:'boss',stile:'noir',corpo:7,mente:13,anima:12,hp:32,armaCat:'B',defBonus:2,competenza:'anima',talenti:['istinto_sopravvivenza','parole_piombo','gate_mb','limite_ultimo'],magie:['m17','m26','m07'],
   lore:'Non ha bisogno di uccidere personalmente — non da decenni. Ma quando decide di scendere in campo lui stesso, e perche ha gia vinto in quattro mosse diverse. Il terrore e il suo vero potere.',
   desc:'Capo criminale supremo con intelligenza tattica e controllo mentale.',
   abilita:'Competenza ANIMA +6. Blocco del Pensiero (L2, 1slot), Controllo Mentale (L3, 2slot), Voce del Terrore (L1). Pool slot: 11. Parole Piombo: tiro ANIMA vs ANIMA come azione — se vince, applica Spaventato. DEF = 7+2 = 9. MENTE 13 alta iniziativa.',
   speciale:'Rete di Contatti: 1x/combat, chiama rinforzi — arrivano 2 Tirapiedi (gregari) al prossimo turno. Non Si Tocca: la prima volta che scende sotto 15 HP, un lacche si getta davanti assorbendo un attacco per lui (1x, narrativo).'}
];

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
