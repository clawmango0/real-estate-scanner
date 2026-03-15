const GP={rate:0.0525,termYrs:30,downPct:0.20,closingPct:0.03,pointsPct:0.01,landPct:0.20,deprecYrs:27.5,appreci:0.03,propTaxRate:0.019,insurRate:0.006,mgmtRate:0.08,repairRate:0.01,vacancyRate:0.05,sellCostPct:0.06,cocMin:0.08,cocStrong:0.12,margRate:0.32,ltcgRate:0.15,recapRate:0.25,agi:120000,filingStatus:'single'};
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
function cocCalc(price,rent){if(!rent||!price)return null;const loan=price*(1-GP.downPct),annMort=pmt(loan,GP.rate,GP.termYrs)*12;const gr=rent*12,pt=price*GP.propTaxRate,ins=price*GP.insurRate,mgmt=gr*GP.mgmtRate,rep=price*GP.repairRate,oth=gr*GP.vacancyRate;const noi=gr-pt-ins-mgmt-rep-oth,cf=noi-annMort,ci=price*(GP.downPct+GP.closingPct);return{coc:cf/ci,cfMo:cf/12,cfAnn:cf,cashIn:ci,noi,annMort,gr,pt,ins,mgmt,rep,oth};}
function maxPrice(rent,tgt){if(!rent)return 0;let lo=5e3,hi=4e6,mid;for(let i=0;i<64;i++){mid=(lo+hi)/2;const r=cocCalc(mid,rent);if(r&&r.coc>tgt)lo=mid;else hi=mid;}return Math.round(mid/1000)*1000;}
function getTiers(rent){if(!rent)return null;return{strong:maxPrice(rent,GP.cocStrong),consider:maxPrice(rent,GP.cocMin),stretch:Math.round(maxPrice(rent,GP.cocMin)*1.055/1000)*1000};}
function classify(price,t){if(!t)return{label:'N/A',cls:''};if(price<=t.strong)return{label:'Strong Buy',cls:'ts'};if(price<=t.consider)return{label:'Consider',cls:'tc'};if(price<=t.stretch)return{label:'Stretch',cls:'tx'};return{label:'Walk Away',cls:'tw2'};}
function passAllow(agi){if(agi<=100000)return 25000;if(agi>=150000)return 0;return 25000*(1-(agi-100000)/50000);}
function nbScore(h){if(!h)return null;return Math.round((h.schools/10)*35+(h.crime/10)*35+Math.min(h.rentGrowth/5,1)*30);}
function nbLabel(score){if(score===null)return{cls:'',txt:'—'};if(score>=68)return{cls:'great'};if(score>=50)return{cls:'ok'};return{cls:'poor'};}
function schedE(price,rent,condKey,imprKey,yr,tp,carryIn){const imprObj=IMPR[imprKey]||IMPR.asis;const improvCapCost=price*imprObj.improvPct;const buildBasis=price*(1-GP.landPct),closingBasis=price*GP.closingPct*(1-GP.landPct);const deprBasis=buildBasis+closingBasis+improvCapCost,annDepr=deprBasis/GP.deprecYrs;const loan=price*(1-GP.downPct),annPoints=(loan*GP.pointsPct)/GP.termYrs;const mortInt=intInYr(loan,GP.rate,GP.termYrs,yr);const gr=(rent||0)*12,pt=price*GP.propTaxRate,ins=price*GP.insurRate;const mgmt=gr*GP.mgmtRate,rep=price*GP.repairRate,oth=gr*GP.vacancyRate;const proratedTax=(yr===1)?pt*(3/12):0,proratedIns=(yr===1)?ins*(2/12):0;const totalDeduct=mortInt+annPoints+pt+proratedTax+ins+proratedIns+mgmt+rep+oth+annDepr;const netInc=gr-totalDeduct,allow=passAllow(tp.agi);let taxSav=0,usedAllow=0,newCarry=0;if(netInc<0){const loss=-netInc+carryIn;usedAllow=Math.min(loss,allow);newCarry=loss-usedAllow;taxSav=usedAllow*tp.marginal;}else{const netAC=Math.max(0,netInc-carryIn);newCarry=Math.max(0,carryIn-netInc);taxSav=-(netAC*tp.marginal);}return{gr,mortInt,annPoints,pt,proratedTax,ins,proratedIns,mgmt,rep,oth,annDepr,totalDeduct,netInc,taxSav,usedAllow,passCarry:Math.max(0,newCarry),deprBasis,improvCapCost};}
function exitAt(price,rent,condKey,imprKey,holdYrs,tp,appreciRate){const cond=COND[condKey]||COND.good,imprObj=IMPR[imprKey]||IMPR.asis;const totalImprovCost=price*imprObj.costPct,improvUplift=price*imprObj.upliftPct;const arv=price*(1+cond.adj)+improvUplift;const appr=appreciRate??GP.appreci;const exitVal=arv*Math.pow(1+appr,holdYrs);const loan=price*(1-GP.downPct),loanBal=balAt(loan,GP.rate,GP.termYrs,holdYrs*12);const cashIn=price*(GP.downPct+GP.closingPct)+totalImprovCost;let cumCF=0,cumTaxSav=0,cumDepr=0,carry=0;const annMort=pmt(loan,GP.rate,GP.termYrs)*12;for(let yr=1;yr<=holdYrs;yr++){const se=schedE(price,rent,condKey,imprKey,yr,tp,carry);carry=se.passCarry;cumDepr+=se.annDepr;cumTaxSav+=se.taxSav;const cashExp=se.pt+se.ins+se.mgmt+se.rep+se.oth;cumCF+=(se.gr-cashExp-annMort);}const sellCosts=exitVal*GP.sellCostPct,netProc=exitVal-loanBal-sellCosts;const closingBasis=price*GP.closingPct,improvCapTotal=price*(IMPR[imprKey]?.improvPct||0);const adjBasis=price+closingBasis+improvCapTotal-cumDepr;const capGain=Math.max(0,exitVal-sellCosts-adjBasis);const recapAmt=Math.min(cumDepr,capGain),ltcgAmt=Math.max(0,capGain-recapAmt);const exitTax=recapAmt*tp.recap+ltcgAmt*tp.ltcg;const totalProfit=netProc-cashIn+cumCF+cumTaxSav-exitTax;const totalROI=cashIn>0?totalProfit/cashIn:0;const annROI=cashIn>0?Math.pow(Math.max(1+totalROI,0.001),1/holdYrs)-1:0;return{exitVal,arv,totalImprovCost,loanBal,cashIn,sellCosts,netProc,cumCF,cumTaxSav,cumDepr,adjBasis,capGain,recapAmt,ltcgAmt,exitTax,totalProfit,totalROI,annROI};}

const M=n=>'$'+Math.abs(Math.round(n)).toLocaleString();
const MS=n=>(n>=0?'+':'')+M(n);
const PCT=n=>(n*100).toFixed(1)+'%';

