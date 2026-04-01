// Named constants for magic numbers used throughout financial calculations
const RENT_EST_LOW=0.88, RENT_EST_HIGH=1.12, RENT_ROUND=25;
const FLIP_MAO_PCT=0.70, FLIP_HOLD_MO=6, HARD_MONEY_RATE=0.12;
const REFI_LTV_DEFAULT=0.75, SEASON_MO_DEFAULT=6;
const DFW_RENT_SQFT_FLOOR=0.80, DFW_RENT_SQFT_CAP=1.40;
const STR_MGMT_RATE=0.20, STR_DEFAULT_OCC=0.70, STR_DEFAULT_PLAT=0.03;
const GP={rate:0.0525,termYrs:30,downPct:0.20,closingPct:0.03,pointsPct:0.01,landPct:0.20,deprecYrs:27.5,appreci:0.03,propTaxRate:0.019,insurRate:0.006,mgmtRate:0.08,repairRate:0.01,vacancyRate:0.05,sellCostPct:0.06,cocMin:0.08,cocStrong:0.12,margRate:0.32,ltcgRate:0.15,recapRate:0.25,agi:120000,filingStatus:'single',costSegPct:0.20,bonusDepPct:1.00,sec179:0,participation:'active',showWalkScore:false,cleanMaintRate:0.015,utilityMo:150,hoaMo:0,legalProfRate:0.003,travelMo:100,suppliesMo:25,advertisingYr:300};
const GP_DEFAULTS={...GP};
const EXIT_YRS=[5,10,15];

// ── 2025 IRS Tax Tables (Rev. Proc. 2024-40 / rp-25-32) ──────────────────────
const TAX25={
  stdDed:{single:15000,mfj:30000,hoh:22500,mfs:15000},
  brackets:{
    single:[{max:11925,r:.10},{max:48475,r:.12},{max:103350,r:.22},{max:197300,r:.24},{max:250525,r:.32},{max:626350,r:.35},{max:Infinity,r:.37}],
    mfj:   [{max:23850,r:.10},{max:96950,r:.12},{max:206700,r:.22},{max:394600,r:.24},{max:501050,r:.32},{max:751600,r:.35},{max:Infinity,r:.37}],
    hoh:   [{max:17000,r:.10},{max:64650,r:.12},{max:103350,r:.22},{max:197300,r:.24},{max:250500,r:.32},{max:626350,r:.35},{max:Infinity,r:.37}],
    mfs:   [{max:11925,r:.10},{max:48475,r:.12},{max:103350,r:.22},{max:197300,r:.24},{max:250525,r:.32},{max:375800,r:.35},{max:Infinity,r:.37}],
  },
  ltcg:{
    single:[{max:48350,r:.00},{max:533400,r:.15},{max:Infinity,r:.20}],
    mfj:   [{max:96700,r:.00},{max:600050,r:.15},{max:Infinity,r:.20}],
    hoh:   [{max:64750,r:.00},{max:533400,r:.15},{max:Infinity,r:.20}],
    mfs:   [{max:48350,r:.00},{max:300025,r:.15},{max:Infinity,r:.20}],
  },
};
function agiToRates(agi,filing){
  const fs=['single','mfj','mfs','hoh'].includes(filing)?filing:'single';
  const taxable=Math.max(0,agi-(TAX25.stdDed[fs]||15000));
  const marg=(TAX25.brackets[fs].find(b=>taxable<=b.max)||TAX25.brackets[fs].at(-1)).r;
  const ltcg=(TAX25.ltcg[fs].find(b=>taxable<=b.max)||TAX25.ltcg[fs].at(-1)).r;
  return{marg,ltcg};
}
const COND={distressed:{label:'🔴 Distressed',adj:-0.25},needswork:{label:'🟡 Needs Work',adj:-0.10},good:{label:'🟢 Good',adj:0.00},updated:{label:'🔵 Updated',adj:0.05}};
const IMPR={asis:{label:'As-Is',costPct:0,upliftPct:0,improvPct:0},cosmetic:{label:'Cosmetic',costPct:0.04,upliftPct:0.08,improvPct:0.02},moderate:{label:'Moderate',costPct:0.10,upliftPct:0.16,improvPct:0.07},fullrehab:{label:'Full Rehab',costPct:0.20,upliftPct:0.28,improvPct:0.16}};

function pmt(p,r,y){if(p<=0)return 0;const m=r/12,n=y*12;return p*m*Math.pow(1+m,n)/(Math.pow(1+m,n)-1);}
function balAt(p,r,y,mo){if(p<=0||mo<=0)return p;const m=r/12,pm2=pmt(p,r,y);return p*Math.pow(1+m,mo)-pm2*(Math.pow(1+m,mo)-1)/m;}
function intInYr(p,r,y,yr){const m=r/12,pm2=pmt(p,r,y);let t=0;for(let mo=(yr-1)*12;mo<yr*12;mo++){t+=balAt(p,r,y,mo)*m;}return t;}
function cocCalc(price,rent){if(!rent||!price)return null;const loan=price*(1-GP.downPct),annMort=pmt(loan,GP.rate,GP.termYrs)*12;const gr=rent*12,pt=price*GP.propTaxRate,ins=price*GP.insurRate,mgmt=gr*GP.mgmtRate,rep=price*GP.repairRate,oth=gr*GP.vacancyRate;const cleanMaint=price*GP.cleanMaintRate,utilities=GP.utilityMo*12,hoa=GP.hoaMo*12,legalProf=price*GP.legalProfRate,travel=GP.travelMo*12,supplies=GP.suppliesMo*12,advertising=GP.advertisingYr;const noi=gr-pt-ins-mgmt-rep-oth-cleanMaint-utilities-hoa-legalProf-travel-supplies-advertising,cf=noi-annMort,ci=price*(GP.downPct+GP.closingPct);return{coc:cf/ci,cfMo:cf/12,cfAnn:cf,cashIn:ci,noi,annMort,gr,pt,ins,mgmt,rep,oth,cleanMaint,utilities,hoa,legalProf,travel,supplies,advertising};}
function maxPrice(rent,tgt){if(!rent)return 0;let lo=5e3,hi=4e6,mid;for(let i=0;i<64;i++){mid=(lo+hi)/2;const r=cocCalc(mid,rent);if(r&&r.coc>tgt)lo=mid;else hi=mid;}return Math.round(mid/1000)*1000;}
function getTiers(rent){if(!rent)return null;return{strong:maxPrice(rent,GP.cocStrong),consider:maxPrice(rent,GP.cocMin),stretch:Math.round(maxPrice(rent,GP.cocMin)*1.055/1000)*1000};}
function classify(price,t){if(!t)return{label:'N/A',cls:''};if(price<=t.strong)return{label:'Strong Buy',cls:'ts'};if(price<=t.consider)return{label:'Consider',cls:'tc'};if(price<=t.stretch)return{label:'Stretch',cls:'tx'};return{label:'Walk Away',cls:'tw2'};}
function passAllow(agi,participation){
  // Material participation or RE professional: losses are non-passive, no limit
  if(participation==='material'||participation==='repro') return Infinity;
  // Active participation: $25k allowance phased out $100k-$150k AGI
  if(agi<=100000)return 25000;if(agi>=150000)return 0;return 25000*(1-(agi-100000)/50000);
}
function nbScore(h){if(!h)return null;return Math.round((h.schools/10)*35+(h.crime/10)*35+Math.min(h.rentGrowth/5,1)*30);}
function nbLabel(score){if(score===null)return{cls:'',txt:'—'};if(score>=68)return{cls:'great'};if(score>=50)return{cls:'ok'};return{cls:'poor'};}
function schedE(price,rent,condKey,imprKey,yr,tp,carryIn){
  const imprObj=IMPR[imprKey]||IMPR.asis;
  const improvCapCost=price*imprObj.improvPct;
  const buildBasis=price*(1-GP.landPct),closingBasis=price*GP.closingPct*(1-GP.landPct);
  const deprBasis=buildBasis+closingBasis+improvCapCost;

  // Cost Segregation + Bonus Depreciation (One Big Beautiful Bill Act 2025)
  const costSegAmt=deprBasis*GP.costSegPct;          // Short-life portion (5-15yr assets)
  const sec179Amt=Math.min(GP.sec179,Math.max(0,deprBasis-costSegAmt),2500000); // §179 cap $2.5M
  const stdDeprBasis=deprBasis-costSegAmt-sec179Amt;  // Remaining 27.5yr basis
  const stdDepr=stdDeprBasis/GP.deprecYrs;

  // Year 1: bonus dep + sec179 + standard; Year 2+: standard only
  const bonusDep=(yr===1)?costSegAmt*GP.bonusDepPct:0;
  const sec179=(yr===1)?sec179Amt:0;
  const annDepr=bonusDep+sec179+stdDepr;

  // Loan
  const loan=price*(1-GP.downPct),annPoints=(loan*GP.pointsPct)/GP.termYrs;
  const mortInt=intInYr(loan,GP.rate,GP.termYrs,yr);

  // Income & expenses
  // IRS Schedule E Lines 3-19 — all deductible rental expenses
  const gr=(rent||0)*12;                                    // Line 3: Gross rents
  const pt=price*GP.propTaxRate;                            // Line 16: Taxes
  const ins=price*GP.insurRate;                             // Line 9: Insurance
  const mgmt=gr*GP.mgmtRate;                               // Line 11: Management fees
  const rep=price*GP.repairRate;                            // Line 14: Repairs
  const oth=gr*GP.vacancyRate;                              // Vacancy allowance
  const cleanMaint=price*GP.cleanMaintRate;                 // Line 7: Cleaning & maintenance
  const utilities=GP.utilityMo*12;                          // Line 17: Utilities
  const hoa=GP.hoaMo*12;                                    // Line 19: HOA (Other)
  const legalProf=price*GP.legalProfRate;                   // Line 10: Legal & professional
  const travel=GP.travelMo*12;                              // Line 6: Auto & travel
  const supplies=GP.suppliesMo*12;                          // Line 15: Supplies
  const advertising=GP.advertisingYr;                       // Line 5: Advertising
  const proratedTax=(yr===1)?pt*(3/12):0,proratedIns=(yr===1)?ins*(2/12):0;
  const totalDeduct=mortInt+annPoints+pt+proratedTax+ins+proratedIns+mgmt+rep+oth+cleanMaint+utilities+hoa+legalProf+travel+supplies+advertising+annDepr;
  const netInc=gr-totalDeduct;

  // Passive activity loss rules based on participation level
  const participation=tp.participation||GP.participation||'active';
  const allow=passAllow(tp.agi,participation);
  let taxSav=0,usedAllow=0,newCarry=0;

  if(netInc<0){
    const loss=-netInc+carryIn;
    usedAllow=Math.min(loss,allow);
    newCarry=loss-usedAllow;
    taxSav=usedAllow*tp.marginal;
  }else{
    const netAC=Math.max(0,netInc-carryIn);
    newCarry=Math.max(0,carryIn-netInc);
    taxSav=-(netAC*tp.marginal);
  }

  return{gr,mortInt,annPoints,pt,proratedTax,ins,proratedIns,mgmt,rep,oth,
    cleanMaint,utilities,hoa,legalProf,travel,supplies,advertising,
    annDepr,bonusDep,sec179,stdDepr,costSegAmt,
    totalDeduct,netInc,taxSav,usedAllow,passCarry:Math.max(0,newCarry),
    deprBasis,improvCapCost,participation};
}
function exitAt(price,rent,condKey,imprKey,holdYrs,tp,appreciRate){const cond=COND[condKey]||COND.good,imprObj=IMPR[imprKey]||IMPR.asis;const totalImprovCost=price*imprObj.costPct,improvUplift=price*imprObj.upliftPct;const arv=price*(1+cond.adj)+improvUplift;const appr=appreciRate??GP.appreci;const exitVal=arv*Math.pow(1+appr,holdYrs);const loan=price*(1-GP.downPct),loanBal=balAt(loan,GP.rate,GP.termYrs,holdYrs*12);const cashIn=price*(GP.downPct+GP.closingPct)+totalImprovCost;let cumCF=0,cumTaxSav=0,cumDepr=0,carry=0;const annMort=pmt(loan,GP.rate,GP.termYrs)*12;for(let yr=1;yr<=holdYrs;yr++){const se=schedE(price,rent,condKey,imprKey,yr,tp,carry);carry=se.passCarry;cumDepr+=se.annDepr;cumTaxSav+=se.taxSav;const cashExp=se.pt+se.ins+se.mgmt+se.rep+se.oth+se.cleanMaint+se.utilities+se.hoa+se.legalProf+se.travel+se.supplies+se.advertising;cumCF+=(se.gr-cashExp-annMort);}const sellCosts=exitVal*GP.sellCostPct,netProc=exitVal-loanBal-sellCosts;const closingBasis=price*GP.closingPct,improvCapTotal=price*(IMPR[imprKey]?.improvPct||0);const adjBasis=price+closingBasis+improvCapTotal-cumDepr;const capGain=Math.max(0,exitVal-sellCosts-adjBasis);const recapAmt=Math.min(cumDepr,capGain),ltcgAmt=Math.max(0,capGain-recapAmt);const exitTax=recapAmt*tp.recap+ltcgAmt*tp.ltcg;const totalProfit=netProc-cashIn+cumCF+cumTaxSav-exitTax;const totalROI=cashIn>0?totalProfit/cashIn:0;const annROI=cashIn>0?Math.pow(Math.max(1+totalROI,0.001),1/holdYrs)-1:0;return{exitVal,arv,totalImprovCost,loanBal,cashIn,sellCosts,netProc,cumCF,cumTaxSav,cumDepr,adjBasis,capGain,recapAmt,ltcgAmt,exitTax,totalProfit,totalROI,annROI};}

// ── Flipper ───────────────────────────────────────────────────────────────────
function flipCalc(price,condKey,imprKey){
  if(!price)return null;
  const cond=COND[condKey]||COND.good,imprObj=IMPR[imprKey]||IMPR.asis;
  const rehabCost=price*imprObj.costPct;
  const arv=price*(1+cond.adj)+price*imprObj.upliftPct;
  const mao=arv*FLIP_MAO_PCT-rehabCost; // 70% rule
  const holdMo=FLIP_HOLD_MO; // assume 6 month project
  const hmRate=HARD_MONEY_RATE; // hard money ~12% annual
  const loan=price*(1-GP.downPct);
  const holdInt=loan*hmRate*(holdMo/12);
  const holdTax=price*GP.propTaxRate*(holdMo/12);
  const holdIns=price*GP.insurRate*(holdMo/12);
  const holdCosts=holdInt+holdTax+holdIns;
  const sellCosts=arv*GP.sellCostPct;
  const closingCosts=price*GP.closingPct;
  const totalCost=price+rehabCost+holdCosts+sellCosts+closingCosts;
  const netProfit=arv-totalCost;
  const cashIn=price*GP.downPct+closingCosts+rehabCost;
  const roi=cashIn>0?netProfit/cashIn:0;
  return{arv,rehabCost,mao,holdCosts,holdMo,sellCosts,closingCosts,totalCost,netProfit,cashIn,roi};
}

// ── BRRRR ─────────────────────────────────────────────────────────────────────
function brrrrCalc(price,rent,condKey,imprKey,refiLTV,seasonMo){
  if(!price)return null;
  refiLTV=refiLTV||REFI_LTV_DEFAULT; seasonMo=seasonMo||SEASON_MO_DEFAULT;
  const cond=COND[condKey]||COND.good,imprObj=IMPR[imprKey]||IMPR.asis;
  const rehabCost=price*imprObj.costPct;
  const arv=price*(1+cond.adj)+price*imprObj.upliftPct;
  const bh=rent?cocCalc(price,rent):null;
  const origLoan=price*(1-GP.downPct);
  const closingCosts=price*GP.closingPct;
  const cashIn=price*GP.downPct+closingCosts+rehabCost;
  // Refi at ARV * LTV after seasoning
  const refiAmount=arv*refiLTV;
  const origBal=balAt(origLoan,GP.rate,GP.termYrs,seasonMo);
  const refiProceeds=refiAmount-origBal;
  const capitalRecycled=Math.min(refiProceeds,cashIn);
  const cashLeftIn=Math.max(0,cashIn-capitalRecycled);
  const infinite=cashLeftIn<=0;
  // New loan payment after refi
  const newPmt=pmt(refiAmount,GP.rate,GP.termYrs)*12;
  const noi=bh?bh.noi:0;
  const adjCF=noi-newPmt;
  const adjCoC=cashLeftIn>0?adjCF/cashLeftIn:Infinity;
  return{arv,rehabCost,refiAmount,origBal,refiProceeds,capitalRecycled,cashIn,cashLeftIn,infinite,newPmt,adjCF,adjCoC,bh};
}

// ── STR (Airbnb) ──────────────────────────────────────────────────────────────
function strCalc(price,adr,occupancy,cleaningFee,platformFeePct){
  if(!price||!adr)return null;
  occupancy=occupancy||STR_DEFAULT_OCC; cleaningFee=cleaningFee||0; platformFeePct=platformFeePct||STR_DEFAULT_PLAT;
  const nights=365*occupancy;
  const grossRev=adr*nights+cleaningFee*nights;
  const platformFees=grossRev*platformFeePct;
  const netRev=grossRev-platformFees;
  // Expenses (STR uses 20% mgmt, no vacancy since occupancy is explicit)
  const pt=price*GP.propTaxRate,ins=price*GP.insurRate;
  const mgmt=netRev*STR_MGMT_RATE,rep=price*GP.repairRate;
  const noi=netRev-pt-ins-mgmt-rep;
  const loan=price*(1-GP.downPct),annMort=pmt(loan,GP.rate,GP.termYrs)*12;
  const cf=noi-annMort;
  const cashIn=price*(GP.downPct+GP.closingPct);
  const coc=cashIn>0?cf/cashIn:0;
  const revPAR=adr*occupancy;
  return{grossRev,platformFees,netRev,pt,ins,mgmt,rep,noi,annMort,cf,cashIn,coc,revPAR,nights,adr,occupancy};
}

// ── Wholesaler ────────────────────────────────────────────────────────────────
function wholesaleCalc(price,arv,assignFeePct,estRehabPct){
  if(!price)return null;
  assignFeePct=assignFeePct||0.07; estRehabPct=estRehabPct||0.10;
  const estRehab=arv?arv*estRehabPct:price*estRehabPct;
  const useARV=arv||price;
  const mao=useARV*0.70-estRehab;
  const assignFee=useARV*assignFeePct;
  const offerPrice=mao-assignFee;
  const spread=mao-price; // how much room if buying at list
  return{arv:useARV,estRehab,mao,assignFee,offerPrice,spread};
}

// ── Commercial / Multi-family ────────────────────────────────────────────────
function commercialCalc(price,units,rentPerUnit,vacRate){
  if(!price||!units)return null;
  rentPerUnit=rentPerUnit||0; vacRate=vacRate||0.05;
  const gri=units*rentPerUnit*12;
  const egi=gri*(1-vacRate);
  const pt=price*GP.propTaxRate,ins=price*GP.insurRate;
  const mgmt=egi*GP.mgmtRate,rep=price*GP.repairRate;
  const noi=egi-pt-ins-mgmt-rep;
  const capRate=price>0?noi/price:0;
  const loan=price*(1-GP.downPct),annMort=pmt(loan,GP.rate,GP.termYrs)*12;
  const dscr=annMort>0?noi/annMort:0;
  const grm=gri>0?price/gri:0;
  const debtYield=loan>0?noi/loan:0;
  const pricePerUnit=units>0?price/units:0;
  const cf=noi-annMort;
  const cashIn=price*(GP.downPct+GP.closingPct);
  const coc=cashIn>0?cf/cashIn:0;
  return{gri,egi,pt,ins,mgmt,rep,noi,capRate,annMort,dscr,grm,debtYield,pricePerUnit,cf,cashIn,coc,units};
}

// ── Passive / Syndication ─────────────────────────────────────────────────────
function passiveCalc(investAmt,prefReturn,holdYrs,equityMultiple){
  if(!investAmt)return null;
  prefReturn=prefReturn||0.08; holdYrs=holdYrs||5; equityMultiple=equityMultiple||2.0;
  const annDist=investAmt*prefReturn;
  const totalReturn=investAmt*equityMultiple;
  const totalDistributions=annDist*holdYrs;
  const exitProceeds=totalReturn-totalDistributions;
  const profit=totalReturn-investAmt;
  // IRR via Newton's method
  let irr=0.10;
  for(let i=0;i<50;i++){
    let npv=-investAmt,dnpv=0;
    for(let y=1;y<=holdYrs;y++){
      const cf=y<holdYrs?annDist:annDist+exitProceeds;
      const disc=Math.pow(1+irr,y);
      npv+=cf/disc; dnpv-=y*cf/Math.pow(1+irr,y+1);
    }
    if(Math.abs(npv)<1) break;
    if(dnpv!==0) irr-=npv/dnpv;
  }
  // NPV at 8% discount
  const discRate=0.08;
  let npv=-investAmt;
  for(let y=1;y<=holdYrs;y++){
    const cf=y<holdYrs?annDist:annDist+exitProceeds;
    npv+=cf/Math.pow(1+discRate,y);
  }
  return{annDist,totalReturn,totalDistributions,exitProceeds,profit,irr,npv,equityMultiple,prefReturn,holdYrs};
}

// ── Target Property Profile — reverse-solve ideal deal from financials ───────
function buildTargetProfile(visible){
  if(!visible||!visible.length) return null;
  const med=arr=>{const s=[...arr].sort((a,b)=>a-b);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
  const mode=arr=>{const f={};arr.forEach(v=>{f[v]=(f[v]||0)+1});return Object.entries(f).sort((a,b)=>b[1]-a[1])[0]?.[0]||'SFR';};

  // Step 1 — median specs from visible properties
  const withBeds=visible.filter(p=>p.beds>0), withBaths=visible.filter(p=>p.baths>0);
  const withSqft=visible.filter(p=>p.sqft>0), withPrice=visible.filter(p=>p.listed>0);
  if(withBeds.length<2||withSqft.length<2||withPrice.length<2) return null;

  const beds=Math.round(med(withBeds.map(p=>p.beds)));
  const baths=Math.round(med(withBaths.map(p=>p.baths))*2)/2; // round to nearest .5
  const sqft=Math.round(med(withSqft.map(p=>p.sqft))/50)*50;  // round to 50
  const ptype=mode(visible.map(p=>p.type||'SFR'));

  // Average appreciation from neighborhood data
  const apprVals=visible.filter(p=>p._hood&&p._hood.appreci5!=null).map(p=>Number(p._hood.appreci5));
  const avgAppr=apprVals.length?apprVals.reduce((a,b)=>a+b,0)/apprVals.length:GP.appreci;

  // Step 2 — estimate rent for median property
  const synthProp={listed:med(withPrice.map(p=>p.listed)),beds,baths,sqft,type:ptype,condition:'good',improvement:'asis',_hood:visible.find(p=>p._hood)?._hood||{}};
  const rentEst=localRentEstimate(synthProp);
  if(rentEst.error) return null;
  const targetRent=Math.round(rentEst.estimate*1.05/25)*25; // mid+5%, round to $25

  // Step 3 — max price for CoC targets
  const maxPriceConsider=maxPrice(targetRent,GP.cocMin);     // 8% CoC ceiling
  const maxPriceStrong=maxPrice(targetRent,GP.cocStrong);     // 12% CoC ceiling
  if(!maxPriceConsider) return null;

  // Step 4 — full financial profile at consider price
  const cc=cocCalc(maxPriceConsider,targetRent);
  if(!cc) return null;

  // Tax calc
  const ap=activeProject;
  const fs=GP.filingStatus||'single';
  const r=agiToRates(GP.agi,fs);
  const taxP={filing:fs,marginal:r.marg,ltcg:r.ltcg,recap:GP.recapRate,agi:GP.agi,
    participation:ap?.participation||GP.participation||'active'};
  GP.costSegPct=ap?.cost_seg_pct??GP.costSegPct??0.20;
  GP.sec179=ap?.sec179||GP.sec179||0;
  GP.participation=taxP.participation;

  const se1=schedE(maxPriceConsider,targetRent,'good','asis',1,taxP,0);
  const exit5=exitAt(maxPriceConsider,targetRent,'good','asis',5,taxP,avgAppr);

  // Step 5 — build profile
  const downPct=Math.round(GP.downPct*100);
  const desc=`Look for ${beds}bd/${baths}ba ${ptype} around ${sqft.toLocaleString()} sqft, listed ≤${M(maxPriceConsider)}, renting ${M(targetRent)}+/mo. At ${downPct}% down → ${PCT(cc.coc)} CoC, ${MS(cc.cfMo)}/mo CF, ${se1?MS(se1.taxSav):'$0'} Yr 1 tax savings.`;

  return{
    maxPrice:maxPriceConsider, strongPrice:maxPriceStrong, targetRent,
    beds, baths, sqft, ptype,
    coc:cc.coc, cfMo:cc.cfMo, cfAnn:cc.cfAnn, cashIn:cc.cashIn,
    yr1TaxSav:se1?se1.taxSav:0,
    yr5Return:exit5?exit5.totalROI:0, yr5AnnROI:exit5?exit5.annROI:0,
    yr5Profit:exit5?exit5.totalProfit:0,
    avgAppr, desc
  };
}

// ── Local Rent Estimator (DFW-calibrated, no API) ────────────────────────────
function localRentEstimate(p){
  // Validation
  if(!p.listed) return{error:'Listed price is required'};
  if(!p.beds)   return{error:'Please enter beds'};
  if(!p.baths)  return{error:'Please enter baths'};
  if(!p.sqft)   return{error:'Please enter sqft'};
  if((p.type||'').toUpperCase()==='LOT') return{error:'Rent estimation not available for lots'};

  const price=p.listed, beds=p.beds, baths=p.baths, sqft=p.sqft;
  const hood=p._hood||{};
  const condKey=(typeof mCond!=='undefined'&&mCond[p.id])||p.condition||'good';
  const imprKey=(typeof mImpr!=='undefined'&&mImpr[p.id])||p.improvement||'asis';
  const parts=[];  // reasoning fragments

  // A. Base yield from price-to-rent ratio (DFW-calibrated, 2025-26 market)
  let yieldPct;
  if(price<=75000)       yieldPct=0.0095;
  else if(price<=150000) yieldPct=0.0088;
  else if(price<=250000) yieldPct=0.0078;
  else if(price<=400000) yieldPct=0.0065;
  else                   yieldPct=0.0055;
  let baseRent=price*yieldPct;
  parts.push(`${(yieldPct*100).toFixed(2)}% yield on ${M(price)} = ${M(baseRent)} base`);

  // B. ZHVI adjustment
  const zhvi=hood.zhvi;
  if(zhvi&&zhvi>0){
    const ratio=price/zhvi;
    const zhviAdj=1-(1-ratio)*0.15;
    const clamped=Math.max(0.85,Math.min(1.15,zhviAdj));
    baseRent*=clamped;
    if(Math.abs(clamped-1)>0.01){
      parts.push(`ZHVI ${M(zhvi)} adj ${clamped<1?'':'+'}`+((clamped-1)*100).toFixed(1)+'%');
    }
  }

  // C. Property type adjustment
  const typeUpper=(p.type||'SFR').toUpperCase();
  const typeAdj={SFR:1.0,DUPLEX:1.10,TRIPLEX:1.05,QUAD:1.05,CONDO:0.92}[typeUpper]||1.0;
  baseRent*=typeAdj;
  if(typeAdj!==1.0) parts.push(`${typeUpper} adj ${typeAdj>1?'+':''}${((typeAdj-1)*100).toFixed(0)}%`);

  // D. Bedroom/bath adjustment (3bd/2ba baseline)
  const bedAdj=1+(beds-3)*0.05;
  const bathAdj=1+Math.max(0,baths-2)*0.025;
  baseRent*=bedAdj*bathAdj;
  if(beds!==3||baths!==2) parts.push(`${beds}bd/${baths}ba adj`);

  // E. Sqft reasonableness check ($0.80-$1.40/sqft for DFW)
  let rentPerSqft=baseRent/sqft;
  if(rentPerSqft<DFW_RENT_SQFT_FLOOR){baseRent=sqft*DFW_RENT_SQFT_FLOOR; parts.push(`floor at $${DFW_RENT_SQFT_FLOOR}/sqft`);}
  else if(rentPerSqft>DFW_RENT_SQFT_CAP){baseRent=sqft*DFW_RENT_SQFT_CAP; parts.push(`cap at $${DFW_RENT_SQFT_CAP}/sqft`);}
  rentPerSqft=baseRent/sqft;

  // F. Condition adjustment
  const condAdj={distressed:-0.10,needswork:-0.05,good:0,updated:0.05}[condKey]||0;
  if(condAdj!==0){baseRent*=(1+condAdj); parts.push(`${condKey} ${condAdj>0?'+':''}${(condAdj*100).toFixed(0)}%`);}

  // G. Improvement adjustment (post-rehab expected rent)
  const imprAdj={asis:0,cosmetic:0.02,moderate:0.04,fullrehab:0.08}[imprKey]||0;
  if(imprAdj!==0){baseRent*=(1+imprAdj); parts.push(`${imprKey} +${(imprAdj*100).toFixed(0)}%`);}

  // H. Market heat from appreciation
  const appr1=hood.appreci1;
  if(appr1!==undefined&&appr1!==null){
    if(appr1>4){baseRent*=1.03; parts.push(`hot market (+${appr1.toFixed(1)}%/yr)`);}
    else if(appr1<0){baseRent*=0.97; parts.push(`weak market (${appr1.toFixed(1)}%/yr)`);}
  }

  // I. School district premium — A/B-rated ISDs command higher rents
  const schools=hood.schools;
  if(schools&&schools>=8){
    // 9-10 (A-rated): +12%, 8 (B+/B): +6%
    const schAdj=schools>=9?0.12:0.06;
    baseRent*=(1+schAdj);
    parts.push(`schools ${schools}/10 +${(schAdj*100).toFixed(0)}%`);
  } else if(schools&&schools<=4){
    baseRent*=0.95;
    parts.push(`weak schools ${schools}/10 -5%`);
  }

  // J. ZORI calibration — blend toward actual market rent data when available
  const zoriRent=hood.zori;
  if(zoriRent&&zoriRent>0){
    const divergence=Math.abs(baseRent-zoriRent)/baseRent;
    if(divergence>0.15){
      // Blend 35% toward ZORI when our estimate diverges >15% from market data
      baseRent=baseRent*0.65+zoriRent*0.35;
      parts.push(`ZORI blend: ${M(zoriRent)} (${divergence>0.3?'large':'moderate'} divergence)`);
    }
  }

  // Round to nearest $25
  const estimate=Math.round(baseRent/RENT_ROUND)*RENT_ROUND;
  const low=Math.round(estimate*RENT_EST_LOW/RENT_ROUND)*RENT_ROUND;
  const high=Math.round(estimate*RENT_EST_HIGH/RENT_ROUND)*RENT_ROUND;

  // Build reasoning string
  const zip=p.zip||hood.zip||'';
  const areaName=hood.area?` (${hood.area})`:'';
  const reasoning=`Based on ${typeUpper} at ${M(price)} in ${zip}${areaName}: `
    +`${beds}bd/${baths}ba, ${sqft.toLocaleString()} sqft ($${rentPerSqft.toFixed(2)}/sqft). `
    +(zhvi?`ZIP ZHVI ${M(zhvi)}${price<zhvi?' (below market)':price>zhvi?' (above market)':''}. `:'' )
    +`Range: ${M(low)} \u2013 ${M(high)}/mo.`;

  return{estimate,low,high,reasoning};
}

const M=n=>'$'+Math.abs(Math.round(n)).toLocaleString();
const MS=n=>(n>=0?'+':'')+M(n);
const PCT=n=>(n*100).toFixed(1)+'%';

if(typeof module!=='undefined') module.exports={GP,GP_DEFAULTS,COND,IMPR,TAX25,RENT_EST_LOW,RENT_EST_HIGH,RENT_ROUND,FLIP_MAO_PCT,FLIP_HOLD_MO,HARD_MONEY_RATE,REFI_LTV_DEFAULT,SEASON_MO_DEFAULT,DFW_RENT_SQFT_FLOOR,DFW_RENT_SQFT_CAP,STR_MGMT_RATE,STR_DEFAULT_OCC,STR_DEFAULT_PLAT,pmt,balAt,intInYr,cocCalc,maxPrice,getTiers,classify,passAllow,nbScore,nbLabel,schedE,exitAt,flipCalc,brrrrCalc,strCalc,wholesaleCalc,commercialCalc,passiveCalc,localRentEstimate,agiToRates,M,MS,PCT};

