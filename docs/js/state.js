// ═══════════════════════════════════════════════════════════
// GLOBAL APPLICATION STATE
// All state lives here. Other modules read/write these directly.
// Future: migrate to AppState object with event-driven updates.
// ═══════════════════════════════════════════════════════════
// props[]          — all properties from DB (source of truth)
// aV / currentView — active tab view ('all'|stage name)
// aF / currentFilter — active filter chip ('all'|'pass'|'fail'|etc.)
// sCol / sortColumn — current sort column (null = default)
// sDir / sortDirection — sort direction (1 asc, -1 desc)
// openId           — ID of property with open modal (null = closed)
// expandedId       — ID of expanded inline row (null = none)
// gRentMode        — rent assumption mode ('low'|'mid'|'high'|'mid+5')
// projects[]       — user's projects from DB
// activeProject    — currently selected project (null = all)
// mCond/mImpr/mTax/mRent/mEdit — per-property modal overrides
// ═══════════════════════════════════════════════════════════
let currentUser=null, userMailbox=null;
let props=[], aV='all', aF='all', sCol=null, sDir=-1, openId=null;
let mCond={}, mImpr={}, mTax={}, mRent={}, mEdit={};
let expandedId = null;
const STAGES=['inbox','shortlist','diligence','offer','contract','closed','archived'];
const STAGE_LABELS={inbox:'Inbox',shortlist:'Shortlist',diligence:'Due Diligence',offer:'Offer',contract:'Contract',closed:'Closed',archived:'Archived'};
const STAGE_ICONS={inbox:'📥',shortlist:'⭐',diligence:'🔍',offer:'📝',contract:'📋',closed:'✅',archived:'📦'};
let gRentMode='mid'; // global rent assumption: 'low' | 'mid' | 'high' | 'mid+5'
// Readable aliases for cryptic state vars (backwards-compat via property descriptors)
Object.defineProperty(window,'currentView',{get:()=>aV,set:v=>{aV=v;}});
Object.defineProperty(window,'currentFilter',{get:()=>aF,set:v=>{aF=v;}});
Object.defineProperty(window,'sortColumn',{get:()=>sCol,set:v=>{sCol=v;}});
Object.defineProperty(window,'sortDirection',{get:()=>sDir,set:v=>{sDir=v;}});

// ── PROJECTS STATE ──────────────────────────────────────
let projects=[];       // loaded from DB
let activeProject=null; // null = "All Properties"
let _gpOrig={};        // snapshot of GP before project overrides
let _editProj=null;    // in-progress project form state

// Returns the effective rent for a property given the global assumption.
// Confirmed monthlyRent always wins; otherwise applies gRentMode to rentRange.
function effectiveRent(p){
  if(p.monthlyRent) return p.monthlyRent;
  if(!p.rentRange) return 0;
  const {low,high}=p.rentRange;
  const mid=Math.round((low+high)/2);
  if(gRentMode==='low') return low;
  if(gRentMode==='high') return high;
  if(gRentMode==='mid+5') return Math.round(mid*1.05/25)*25;
  return mid; // 'mid' default
}

// Recompute derived fields for a single property using current GP + gRentMode.
function recomputeOne(p){
  const oldStatus=p.status;
  const r=effectiveRent(p);
  p._tiers=getTiers(r)||null;
  const c=r?cocCalc(p.listed,r):null;
  p._cocL=c?c.coc:null;
  p._cfL=c?c.cfMo:null;
  if(p._cocL!==null) p.status=p._cocL>=GP.cocMin?'pass':'fail';
  // Smart resurface: flag skipped properties that now pass
  if(oldStatus==='fail'&&p.status==='pass'&&(p.stage||'inbox')==='archived'){
    p._resurface=true;
    p._resurfaceReason='Now passes criteria with current settings';
  }
  computeRiskFlags(p);
}

function computeRiskFlags(p){
  const flags=[];
  if(!p.beds&&!p.baths&&!p.sqft) flags.push({key:'incomplete',label:'Missing beds/baths/sqft',severity:'warn'});
  else if(!p.beds||!p.baths) flags.push({key:'partial',label:'Missing '+(p.beds?'':'beds ')+(p.baths?'':'baths'),severity:'info'});
  if(!p.sqft) flags.push({key:'nosqft',label:'No sqft data',severity:'info'});
  if(p._cocL!==null&&p._cocL<0) flags.push({key:'negative',label:'Negative cash flow',severity:'alert'});
  if(p.rentRange&&!p.monthlyRent) flags.push({key:'unconfirmed',label:'Rent is estimated, not confirmed',severity:'info'});
  if(!p._hood) flags.push({key:'nohood',label:'No neighborhood data for this ZIP',severity:'warn'});
  if(!p.listed) flags.push({key:'noprice',label:'No listing price',severity:'alert'});
  if(p.createdAt){const days=(Date.now()-new Date(p.createdAt).getTime())/(1000*60*60*24);if(days>60&&!p.priceDrop) flags.push({key:'stale',label:'Listing is '+Math.round(days)+' days old',severity:'warn'});}
  p._riskFlags=flags;
}

function autoAssignStage(p){
  if((p.stage||'inbox')!=='inbox') return;
  if(p._cocL===null) return;
  const coc=p._cocL,nb=p._nbScore;
  if(coc>=GP.cocStrong&&nb!==null&&nb>=60){if(typeof trackStageChange==='function')trackStageChange(p.id,'inbox','shortlist',true);p.stage='shortlist';p._autoStaged=true;p._autoStageReason='Strong returns ('+PCT(coc)+') in quality area (NB '+nb+')';return;}
  if(coc<0||(coc<0.02&&nb!==null&&nb<40)){if(typeof trackStageChange==='function')trackStageChange(p.id,'inbox','archived',true);p.stage='archived';p._autoStaged=true;p._autoStageReason=coc<0?'Negative cash flow':'Very weak returns in poor area';return;}
}

function autoStageAll(){
  let s=0,a=0;
  for(const p of props){const b=p.stage||'inbox';autoAssignStage(p);if(p.stage!==b){if(p.stage==='shortlist')s++;if(p.stage==='archived')a++;const cm={shortlist:'fav',archived:'ni'};saveProperty(p.id,{pipeline_stage:p.stage,curated:cm[p.stage]||null});}}
  if(s||a) console.log(`Auto-staged: ${s} shortlisted, ${a} archived`);
}

// Recompute _tiers / _cocL / _cfL / status for all props.
function recomputeRents(){ props.forEach(recomputeOne); }

// Clear tax caches, recompute all props, and re-render everything.
function refreshAll(){
  Object.keys(mTax).forEach(k=>delete mTax[k]);
  recomputeRents();
  if(typeof Bus!=='undefined') Bus.emit('stateChanged');
  else { renderApp(); if(typeof renderProjectCards==='function') renderProjectCards(); }
}

function setRentMode(mode){
  gRentMode=mode;
  if(typeof trackRentModeChange==='function') trackRentModeChange(mode);
  document.querySelectorAll('.rm').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll(`.rm[data-m="${mode}"]`).forEach(b=>b.classList.add('on'));
  recomputeRents();
  if(typeof Bus!=='undefined') Bus.emit('stateChanged');
  else { renderApp(); if(typeof renderProjectCards==='function') renderProjectCards(); }
}

