// ── Analytics Tab ────────────────────────────────────────────────────────────
// Pure vanilla JS charts rendered with CSS — no external chart library.
// All data is derived from the in-memory `props` array and the active project.

// ── Utility ─────────────────────────────────────────────────────────────────
function _aProps(){
  let list=activeProject?props.filter(p=>projectFilter(p,activeProject)):props;
  return list.filter(p=>(p.stage||'inbox')!=='archived');
}

function _median(arr){
  if(!arr.length) return 0;
  const s=[...arr].sort((a,b)=>a-b);
  const m=Math.floor(s.length/2);
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
}

function _percentile(arr,pct){
  if(!arr.length) return 0;
  const s=[...arr].sort((a,b)=>a-b);
  const i=Math.max(0,Math.ceil(s.length*pct)-1);
  return s[i];
}

function _groupBy(arr,fn){
  const m={};
  arr.forEach(item=>{const k=fn(item);if(!m[k])m[k]=[];m[k].push(item);});
  return m;
}

// ── CSS Bar Chart ───────────────────────────────────────────────────────────
function _barChart(data,{label='',valueLabel='',color='var(--green)',maxOverride=null,formatVal=null}={}){
  if(!data.length) return '<div class="an-empty">No data</div>';
  const max=maxOverride||Math.max(...data.map(d=>Math.abs(d.value)),1);
  const fmt=formatVal||(v=>v.toFixed(1));
  return `<div class="an-bars">${data.map(d=>{
    const pct=Math.min(Math.abs(d.value)/max*100,100);
    const c=d.color||color;
    return `<div class="an-bar-row">
      <div class="an-bar-lbl">${esc(d.label)}</div>
      <div class="an-bar-track"><div class="an-bar-fill" style="width:${pct}%;background:${c}"></div></div>
      <div class="an-bar-val" style="color:${c}">${fmt(d.value)}</div>
    </div>`;
  }).join('')}</div>`;
}

// ── Scatter Plot (CSS grid-based) ───────────────────────────────────────────
function _scatterPlot(points,{xLabel='',yLabel='',xFmt=null,yFmt=null}={}){
  if(!points.length) return '<div class="an-empty">No data</div>';
  const xf=xFmt||(v=>v.toFixed(1));
  const yf=yFmt||(v=>v.toFixed(1));
  const xMin=Math.min(...points.map(p=>p.x)), xMax=Math.max(...points.map(p=>p.x));
  const yMin=Math.min(...points.map(p=>p.y)), yMax=Math.max(...points.map(p=>p.y));
  const xRange=xMax-xMin||1, yRange=yMax-yMin||1;
  // quadrant lines at medians
  const xMed=_median(points.map(p=>p.x)), yMed=_median(points.map(p=>p.y));
  const xMedPct=((xMed-xMin)/xRange)*100, yMedPct=100-((yMed-yMin)/yRange)*100;
  return `<div class="an-scatter">
    <div class="an-scatter-inner">
      <div class="an-scatter-y">${esc(yLabel)}</div>
      <div class="an-scatter-area">
        <div class="an-scatter-midx" style="left:${xMedPct}%"></div>
        <div class="an-scatter-midy" style="top:${yMedPct}%"></div>
        <div class="an-scatter-qlabel" style="top:4px;right:4px;color:var(--green)">High CF + Appreci</div>
        <div class="an-scatter-qlabel" style="bottom:4px;left:4px;color:var(--text3)">Low CF + Deprec</div>
        ${points.map(p=>{
          const x=((p.x-xMin)/xRange)*100, y=100-((p.y-yMin)/yRange)*100;
          const c=p.color||'var(--amber)';
          return `<div class="an-dot" style="left:${x}%;top:${y}%;background:${c}" title="${esc(p.label||'')}\nCoC: ${xf(p.x)} | Appreci: ${yf(p.y)}"></div>`;
        }).join('')}
      </div>
    </div>
    <div class="an-scatter-x">${esc(xLabel)}</div>
  </div>`;
}

// ── Donut Chart (pure CSS) ──────────────────────────────────────────────────
function _donutChart(slices,{size=120}={}){
  if(!slices.length) return '<div class="an-empty">No data</div>';
  const total=slices.reduce((s,d)=>s+d.value,0);
  if(!total) return '<div class="an-empty">No data</div>';
  let cumPct=0;
  const gradParts=[];
  slices.forEach(s=>{
    const pct=(s.value/total)*100;
    gradParts.push(`${s.color} ${cumPct}% ${cumPct+pct}%`);
    cumPct+=pct;
  });
  return `<div class="an-donut-wrap">
    <div class="an-donut" style="width:${size}px;height:${size}px;background:conic-gradient(${gradParts.join(',')})">
      <div class="an-donut-hole">${total}</div>
    </div>
    <div class="an-donut-legend">${slices.map(s=>
      `<div class="an-legend-item"><span class="an-legend-dot" style="background:${s.color}"></span>${esc(s.label)} <strong>${s.value}</strong> (${Math.round(s.value/total*100)}%)</div>`
    ).join('')}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANALYTICS PANELS
// ═══════════════════════════════════════════════════════════════════════════

function _cocDistribution(list){
  const withCoc=list.filter(p=>p._cocL!==null);
  if(!withCoc.length) return '<div class="an-empty">No CoC data — need rent estimates</div>';
  const buckets=[
    {label:'< 0%',min:-Infinity,max:0,color:'var(--red)'},
    {label:'0-4%',min:0,max:0.04,color:'var(--red)'},
    {label:'4-8%',min:0.04,max:0.08,color:'var(--orange)'},
    {label:'8-12%',min:0.08,max:0.12,color:'var(--amber)'},
    {label:'12-16%',min:0.12,max:0.16,color:'var(--green)'},
    {label:'16%+',min:0.16,max:Infinity,color:'var(--green)'},
  ];
  const data=buckets.map(b=>({
    label:b.label,
    value:withCoc.filter(p=>p._cocL>=b.min&&p._cocL<b.max).length,
    color:b.color,
  }));
  const passRate=withCoc.filter(p=>p._cocL>=GP.cocMin).length/withCoc.length;
  return `<div class="an-metric-row">
    <div class="an-mini"><div class="an-mini-label">Median CoC</div><div class="an-mini-val" style="color:var(--amber)">${PCT(_median(withCoc.map(p=>p._cocL)))}</div></div>
    <div class="an-mini"><div class="an-mini-label">Pass Rate</div><div class="an-mini-val" style="color:${passRate>=0.15?'var(--green)':'var(--red)'}">${Math.round(passRate*100)}%</div></div>
    <div class="an-mini"><div class="an-mini-label">Best CoC</div><div class="an-mini-val" style="color:var(--green)">${PCT(Math.max(...withCoc.map(p=>p._cocL)))}</div></div>
  </div>`+_barChart(data,{formatVal:v=>v.toString()});
}

function _priceToRent(list){
  const valid=list.filter(p=>p.listed&&effectiveRent(p));
  if(!valid.length) return '<div class="an-empty">Need price + rent data</div>';
  const ratios=valid.map(p=>({addr:p.address,ratio:p.listed/(effectiveRent(p)*12)}));
  const medianRatio=_median(ratios.map(r=>r.ratio));
  // Group by city
  const byCity=_groupBy(valid,p=>p.city||'Unknown');
  const cityData=Object.entries(byCity).map(([city,ps])=>{
    const r=_median(ps.map(p=>p.listed/(effectiveRent(p)*12)));
    return {label:city,value:r,color:r<=medianRatio?'var(--green)':'var(--red)'};
  }).sort((a,b)=>a.value-b.value);
  return `<div class="an-metric-row">
    <div class="an-mini"><div class="an-mini-label">Median P/R Ratio</div><div class="an-mini-val">${medianRatio.toFixed(1)}x</div></div>
    <div class="an-mini"><div class="an-mini-label">Best (lowest)</div><div class="an-mini-val" style="color:var(--green)">${Math.min(...ratios.map(r=>r.ratio)).toFixed(1)}x</div></div>
    <div class="an-mini"><div class="an-mini-label">Properties</div><div class="an-mini-val">${valid.length}</div></div>
  </div><div class="an-subtitle">Price-to-Annual-Rent ratio by city (lower = better cash flow)</div>`+_barChart(cityData,{formatVal:v=>v.toFixed(1)+'x'});
}

function _priceVsRentTrend(list){
  const valid=list.filter(p=>p.listed&&effectiveRent(p)&&p.city);
  if(!valid.length) return '<div class="an-empty">Need price + rent data</div>';
  const byCity=_groupBy(valid,p=>p.city||'Unknown');
  const rows=Object.entries(byCity).map(([city,ps])=>{
    const medPrice=_median(ps.map(p=>p.listed));
    const medRent=_median(ps.map(p=>effectiveRent(p)));
    const medCoc=_median(ps.filter(p=>p._cocL!==null).map(p=>p._cocL));
    return {city,count:ps.length,medPrice,medRent,medCoc};
  }).sort((a,b)=>b.medCoc-a.medCoc);
  return `<table class="ot"><thead><tr><th>City</th><th>Props</th><th>Med. Price</th><th>Med. Rent</th><th>Med. CoC</th></tr></thead><tbody>
    ${rows.map(r=>`<tr>
      <td class="tl">${esc(r.city)}</td>
      <td>${r.count}</td>
      <td>${M(r.medPrice)}</td>
      <td>${M(r.medRent)}/mo</td>
      <td><span class="coc ${r.medCoc>=GP.cocMin?'p':'f'}">${PCT(r.medCoc)}</span></td>
    </tr>`).join('')}
  </tbody></table>`;
}

function _neighborhoodPerformance(list){
  const withHood=list.filter(p=>p._hood&&p._nbScore!==null);
  if(!withHood.length) return '<div class="an-empty">No neighborhood data</div>';
  const byArea=_groupBy(withHood,p=>p._hood.area||p.zip||'Unknown');
  const areas=Object.entries(byArea).map(([area,ps])=>{
    const avgScore=Math.round(ps.reduce((s,p)=>s+p._nbScore,0)/ps.length);
    const avgCoc=ps.filter(p=>p._cocL!==null).length?
      ps.filter(p=>p._cocL!==null).reduce((s,p)=>s+p._cocL,0)/ps.filter(p=>p._cocL!==null).length:0;
    return {label:area,score:avgScore,coc:avgCoc,count:ps.length};
  }).sort((a,b)=>b.score-a.score);
  const data=areas.map(a=>({
    label:`${a.label} (${a.count})`,
    value:a.score,
    color:a.score>=68?'var(--green)':a.score>=50?'var(--amber)':'var(--red)',
  }));
  return `<div class="an-subtitle">Neighborhood score by area (schools 35% + safety 35% + rent growth 30%)</div>`
    +_barChart(data,{maxOverride:100,formatVal:v=>Math.round(v)+'/100'});
}

function _appreciationVsCashFlow(list){
  const valid=list.filter(p=>p._cocL!==null&&p._hood);
  if(valid.length<3) return '<div class="an-empty">Need 3+ properties with CoC + neighborhood data</div>';
  const points=valid.map(p=>{
    const appreci=(p._hood.appreci1||p._hood.rentGrowth||0);
    const isFav=(p.stage||'inbox')==='shortlist';
    return {
      x:p._cocL*100,
      y:appreci,
      label:p.address,
      color:isFav?'var(--amber)':p._cocL>=GP.cocMin?'var(--green)':'var(--text3)',
    };
  });
  return _scatterPlot(points,{
    xLabel:'Cash-on-Cash Return (%)',
    yLabel:'Appreciation Rate (%)',
    xFmt:v=>v.toFixed(1)+'%',
    yFmt:v=>v.toFixed(1)+'%',
  });
}

function _budgetPosition(list){
  const priced=list.filter(p=>p.listed);
  if(!priced.length) return '<div class="an-empty">No priced properties</div>';
  const prices=priced.map(p=>p.listed).sort((a,b)=>a-b);
  const maxBudget=activeProject?.max_price||_percentile(prices,0.5);
  if(!maxBudget) return '<div class="an-empty">Set a max price on your project to see budget position</div>';
  const below=priced.filter(p=>p.listed<=maxBudget).length;
  const pctBelow=Math.round(below/priced.length*100);
  // Price buckets
  const step=50000;
  const buckets=[];
  const minP=Math.floor(prices[0]/step)*step;
  const maxP=Math.ceil(prices[prices.length-1]/step)*step;
  for(let b=minP;b<maxP;b+=step){
    const count=priced.filter(p=>p.listed>=b&&p.listed<b+step).length;
    buckets.push({
      label:M(b)+'-'+M(b+step),
      value:count,
      color:b+step<=maxBudget?'var(--green)':b<maxBudget?'var(--amber)':'var(--text3)',
    });
  }
  return `<div class="an-metric-row">
    <div class="an-mini"><div class="an-mini-label">Budget</div><div class="an-mini-val">${M(maxBudget)}</div></div>
    <div class="an-mini"><div class="an-mini-label">In Budget</div><div class="an-mini-val" style="color:var(--green)">${below} (${pctBelow}%)</div></div>
    <div class="an-mini"><div class="an-mini-label">Median Price</div><div class="an-mini-val">${M(_median(prices))}</div></div>
  </div><div class="an-subtitle">Price distribution — green = within your budget</div>`+_barChart(buckets,{formatVal:v=>v.toString()});
}

function _targetVsActual(list){
  const favs=list.filter(p=>(p.stage||'inbox')==='shortlist');
  const pass=list.filter(p=>p.status==='pass');
  if(favs.length<2&&pass.length<2) return '<div class="an-empty">Favorite or pass 2+ properties to compare</div>';
  const pool=favs.length>=2?favs:pass;
  const poolLabel=favs.length>=2?'Favorites':'Passing';
  const allPriced=list.filter(p=>p.listed);
  if(!allPriced.length) return '<div class="an-empty">No data</div>';
  const metrics=[
    {label:'Price',all:_median(allPriced.map(p=>p.listed)),pick:_median(pool.filter(p=>p.listed).map(p=>p.listed)),fmt:M},
    {label:'Rent',all:_median(list.filter(p=>effectiveRent(p)).map(p=>effectiveRent(p))),pick:_median(pool.filter(p=>effectiveRent(p)).map(p=>effectiveRent(p))),fmt:v=>M(v)+'/mo'},
    {label:'CoC',all:_median(list.filter(p=>p._cocL!==null).map(p=>p._cocL)),pick:_median(pool.filter(p=>p._cocL!==null).map(p=>p._cocL)),fmt:PCT},
    {label:'Sqft',all:_median(list.filter(p=>p.sqft).map(p=>p.sqft)),pick:_median(pool.filter(p=>p.sqft).map(p=>p.sqft)),fmt:v=>Math.round(v).toLocaleString()},
    {label:'Beds',all:_median(list.filter(p=>p.beds).map(p=>p.beds)),pick:_median(pool.filter(p=>p.beds).map(p=>p.beds)),fmt:v=>v.toFixed(1)},
    {label:'NB Score',all:_median(list.filter(p=>p._nbScore!==null).map(p=>p._nbScore)),pick:_median(pool.filter(p=>p._nbScore!==null).map(p=>p._nbScore)),fmt:v=>Math.round(v)+'/100'},
  ];
  return `<div class="an-subtitle">Median of your ${poolLabel} vs. all properties in this view</div>
    <table class="ot"><thead><tr><th>Metric</th><th>All Properties</th><th>${poolLabel}</th><th>Delta</th></tr></thead><tbody>
    ${metrics.map(m=>{
      const delta=m.pick-m.all;
      const isGood=(m.label==='Price')?delta<0:delta>0;
      return `<tr><td class="tl">${m.label}</td><td>${m.fmt(m.all)}</td><td><strong>${m.fmt(m.pick)}</strong></td>
        <td style="color:${isGood?'var(--green)':'var(--red)'}">${delta>=0?'+':''}${m.label==='CoC'?PCT(delta):m.label==='Price'||m.label==='Rent'?MS(delta):delta.toFixed(1)}</td></tr>`;
    }).join('')}
  </tbody></table>`;
}

function _portfolioComposition(list){
  const favs=list.filter(p=>(p.stage||'inbox')==='shortlist');
  if(!favs.length) return '<div class="an-empty">Favorite properties to see portfolio composition</div>';
  // By type
  const byType=_groupBy(favs,p=>p.type||'SFR');
  const typeSlices=Object.entries(byType).map(([t,ps])=>{
    const colors={SFR:'var(--green)',DUPLEX:'#A78BFA',TRIPLEX:'#7C3AED',QUAD:'#6D28D9',CONDO:'var(--blue)',LOT:'var(--orange)'};
    return {label:t,value:ps.length,color:colors[t]||'var(--text3)'};
  });
  // By city
  const byCity=_groupBy(favs,p=>p.city||'Unknown');
  const cityColors=['var(--green)','var(--amber)','var(--blue)','#A78BFA','var(--teal)','var(--orange)','var(--red)','#EC4899'];
  const citySlices=Object.entries(byCity).map(([c,ps],i)=>({label:c,value:ps.length,color:cityColors[i%cityColors.length]}));
  // Blended returns
  const totalCost=favs.reduce((s,p)=>s+(p.listed||0)*(GP.downPct+GP.closingPct),0);
  const totalCf=favs.reduce((s,p)=>s+(p._cfL||0),0);
  const avgCoc=favs.filter(p=>p._cocL!==null).length?
    favs.filter(p=>p._cocL!==null).reduce((s,p)=>s+p._cocL,0)/favs.filter(p=>p._cocL!==null).length:0;
  return `<div class="an-metric-row">
    <div class="an-mini"><div class="an-mini-label">Total Capital</div><div class="an-mini-val">${M(totalCost)}</div></div>
    <div class="an-mini"><div class="an-mini-label">Total CF/mo</div><div class="an-mini-val" style="color:${totalCf>=0?'var(--green)':'var(--red)'}">${MS(totalCf)}</div></div>
    <div class="an-mini"><div class="an-mini-label">Blended CoC</div><div class="an-mini-val" style="color:var(--amber)">${PCT(avgCoc)}</div></div>
  </div>
  <div class="an-donut-row">
    <div><div class="an-subtitle">By Type</div>${_donutChart(typeSlices,{size:110})}</div>
    <div><div class="an-subtitle">By City</div>${_donutChart(citySlices,{size:110})}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN RENDER
// ═══════════════════════════════════════════════════════════════════════════

let _analyticsOpen=false;

function toggleAnalytics(){
  _analyticsOpen=!_analyticsOpen;
  const btn=document.getElementById('analytics-btn');
  const panel=document.getElementById('analytics-panel');
  if(!panel) return;
  if(_analyticsOpen){
    btn.classList.add('on');
    panel.style.display='';
    renderAnalytics();
  } else {
    btn.classList.remove('on');
    panel.style.display='none';
  }
}

function renderAnalytics(){
  const panel=document.getElementById('analytics-panel');
  if(!panel||!_analyticsOpen) return;
  const list=_aProps();
  if(!list.length){
    panel.innerHTML='<div class="an-empty" style="padding:2rem">No properties to analyze. Add properties via email alerts or the bookmarklet.</div>';
    return;
  }
  const projName=activeProject?activeProject.name:'All Properties';
  panel.innerHTML=`
    <div class="an-header">
      <div class="an-title">Market Analytics — ${esc(projName)}</div>
      <div class="an-count">${list.length} properties</div>
    </div>
    <div class="an-grid">
      <div class="an-card">
        <div class="an-card-title">CoC Return Distribution</div>
        <div class="an-card-body">${_cocDistribution(list)}</div>
      </div>
      <div class="an-card">
        <div class="an-card-title">Price-to-Rent by City</div>
        <div class="an-card-body">${_priceToRent(list)}</div>
      </div>
      <div class="an-card">
        <div class="an-card-title">City Comparison</div>
        <div class="an-card-body">${_priceVsRentTrend(list)}</div>
      </div>
      <div class="an-card">
        <div class="an-card-title">Neighborhood Performance</div>
        <div class="an-card-body">${_neighborhoodPerformance(list)}</div>
      </div>
      <div class="an-card an-card-wide">
        <div class="an-card-title">Cash Flow vs. Appreciation</div>
        <div class="an-card-body">${_appreciationVsCashFlow(list)}</div>
      </div>
      <div class="an-card">
        <div class="an-card-title">Budget Position</div>
        <div class="an-card-body">${_budgetPosition(list)}</div>
      </div>
      <div class="an-card">
        <div class="an-card-title">Your Picks vs. Market</div>
        <div class="an-card-body">${_targetVsActual(list)}</div>
      </div>
      <div class="an-card an-card-wide">
        <div class="an-card-title">Portfolio Composition (Favorites)</div>
        <div class="an-card-body">${_portfolioComposition(list)}</div>
      </div>
    </div>`;
}
