let currentUser=null, userMailbox=null;
let props=[], aV='all', aF='all', sCol=null, sDir=-1, openId=null;
let mCond={}, mImpr={}, mTax={}, mRent={}, mEdit={};
let gRentMode='mid'; // global rent assumption: 'low' | 'mid' | 'high' | 'mid+5'

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

// Recompute _tiers / _cocL / _cfL / status for all props using current GP + gRentMode.
function recomputeRents(){
  props.forEach(p=>{
    const r=effectiveRent(p);
    p._tiers=getTiers(r)||null;
    const c=r?cocCalc(p.listed,r):null;
    p._cocL=c?c.coc:null;
    p._cfL=c?c.cfMo:null;
    // Reclassify pass/fail against current thresholds
    if(p._cocL!==null) p.status=p._cocL>=GP.cocMin?'pass':'fail';
  });
}

function setRentMode(mode){
  gRentMode=mode;
  document.querySelectorAll('.rm').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll(`.rm[data-m="${mode}"]`).forEach(b=>b.classList.add('on'));
  recomputeRents();
  renderApp();
}

