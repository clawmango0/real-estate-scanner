// ── Table head/row generators per investment type ────────────────────────────
function _verdict(p) {
  const coc = p._cocL, nb = p._nbScore, cf = p._cfL;
  const cocOk = coc !== null && coc >= GP.cocMin;
  const cocStrong = coc !== null && coc >= GP.cocStrong;
  const nbGood = nb !== null && nb >= 68;
  const nbOk = nb !== null && nb >= 50;
  if (cocStrong && nbGood) return { text: 'Strong buy — excellent cash flow in a top neighborhood', color: 'var(--green)' };
  if (cocStrong && nbOk) return { text: 'Strong cash flow, solid neighborhood', color: 'var(--green)' };
  if (cocStrong) return { text: 'Great returns but weaker area — verify neighborhood', color: 'var(--amber)' };
  if (cocOk && nbGood) return { text: 'Passing deal in a great area — worth a closer look', color: 'var(--green)' };
  if (cocOk && nbOk) return { text: 'Solid returns, decent neighborhood', color: 'var(--amber)' };
  if (cocOk) return { text: 'Passes CoC but weak neighborhood — verify area', color: 'var(--amber)' };
  if (p._tiers && p.listed <= p._tiers.consider) return { text: 'Near target price — needs rent verification', color: 'var(--amber)' };
  if (p._tiers && p.listed > p._tiers.stretch) {
    const over = p.listed - p._tiers.consider;
    return { text: `Overpriced by ~${M(over)} — would need to drop to ${M(p._tiers.consider)}`, color: 'var(--red)' };
  }
  if (coc !== null && coc < 0) return { text: 'Negative returns at current price/rent', color: 'var(--red)' };
  return { text: 'Insufficient data for verdict', color: 'var(--text3)' };
}

function _expandHtml(p) {
  const v = _verdict(p);
  const rent = effectiveRent(p);
  const _rentLabels = { low: 'Low est.', mid: 'Mid est.', high: 'High est.', 'mid+5': 'Mid+5% est.' };
  const rentSrc = p.monthlyRent ? 'Confirmed' : (p.rentRange ? (_rentLabels[gRentMode] || 'Estimated') : 'None');
  const rentConf = p.monthlyRent ? 'confirmed' : (p.rentRange ? `±12% (${M(p.rentRange.low)}–${M(p.rentRange.high)})` : 'no estimate');

  // Neighborhood mini breakdown
  let nbHtml = '<span style="color:var(--text3)">No neighborhood data</span>';
  if (p._hood) {
    const h = p._hood;
    const bar = (val, max, color) => `<div style="display:flex;align-items:center;gap:4px"><div style="width:50px;height:4px;background:var(--border2);border-radius:2px;overflow:hidden"><div style="width:${Math.min(val/max*100,100)}%;height:100%;background:${color};border-radius:2px"></div></div><span style="font-size:.6rem;color:var(--text2)">${val}/${max}</span></div>`;
    nbHtml = `<div style="display:flex;gap:1rem;flex-wrap:wrap">
      <div><span style="font-size:.58rem;color:var(--text3)">Schools</span>${bar(h.schools||0, 10, 'var(--green)')}</div>
      <div><span style="font-size:.58rem;color:var(--text3)">Safety</span>${bar(h.crime||0, 10, 'var(--blue)')}</div>
      <div><span style="font-size:.58rem;color:var(--text3)">Rent Growth</span>${bar(Math.min(h.rentGrowth||0, 5), 5, 'var(--amber)')}</div>
    </div>`;
  }

  // Key metrics (strategy-aware)
  const it = activeProject?.investment_type || 'buyhold';
  let metricsHtml = '';
  if (it === 'buyhold' || !activeProject) {
    const tc = p._tiers ? classify(p.listed, p._tiers) : null;
    metricsHtml = `
      <div class="ex-metric"><span class="ex-ml">CoC Return</span><span class="ex-mv" style="color:${p._cocL>=GP.cocMin?'var(--green)':'var(--red)'}">${p._cocL!==null?PCT(p._cocL):'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">Cash Flow</span><span class="ex-mv" style="color:${(p._cfL||0)>=0?'var(--green)':'var(--red)'}">${p._cfL!==null?MS(p._cfL)+'/mo':'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">Offer Tier</span><span class="ex-mv ${tc?tc.cls:''}">${tc?tc.label:'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">NB Score</span><span class="ex-mv">${p._nbScore!==null?p._nbScore+'/100':'—'}</span></div>`;
  } else if (it === 'flipper') {
    const f = flipCalc(p.listed, mCond[p.id]||p.condition||'good', mImpr[p.id]||p.improvement||'asis');
    metricsHtml = `
      <div class="ex-metric"><span class="ex-ml">ARV</span><span class="ex-mv">${f?M(f.arv):'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">MAO</span><span class="ex-mv" style="color:${f&&p.listed<=f.mao?'var(--green)':'var(--red)'}">${f?M(f.mao):'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">Profit</span><span class="ex-mv" style="color:${f&&f.netProfit>=0?'var(--green)':'var(--red)'}">${f?MS(f.netProfit):'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">ROI</span><span class="ex-mv" style="color:${f&&f.roi>=0.15?'var(--green)':'var(--amber)'}">${f?PCT(f.roi):'—'}</span></div>`;
  } else if (it === 'brrrr') {
    const b = brrrrCalc(p.listed, rent, mCond[p.id]||p.condition||'good', mImpr[p.id]||p.improvement||'asis');
    metricsHtml = `
      <div class="ex-metric"><span class="ex-ml">ARV</span><span class="ex-mv">${b?M(b.arv):'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">CoC</span><span class="ex-mv">${p._cocL!==null?PCT(p._cocL):'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">Refi Amt</span><span class="ex-mv">${b?M(b.refiAmount):'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">Cash Left</span><span class="ex-mv">${b?(b.infinite?'∞':M(b.cashLeftIn)):'—'}</span></div>`;
  } else if (it === 'str') {
    const pp = activeProject || {};
    const sc = strCalc(p.listed, pp._str_adr||150, pp._str_occ||0.70, pp._str_clean||75, pp._str_plat||0.03);
    metricsHtml = `
      <div class="ex-metric"><span class="ex-ml">RevPAR</span><span class="ex-mv">${sc?M(sc.revPAR):'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">Gross Rev</span><span class="ex-mv">${sc?M(sc.grossRev)+'/yr':'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">Net CF</span><span class="ex-mv">${sc?MS(sc.cf/12)+'/mo':'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">CoC</span><span class="ex-mv">${sc?PCT(sc.coc):'—'}</span></div>`;
  } else {
    // Generic fallback for wholesaler, commercial, passive
    metricsHtml = `
      <div class="ex-metric"><span class="ex-ml">CoC Return</span><span class="ex-mv">${p._cocL!==null?PCT(p._cocL):'—'}</span></div>
      <div class="ex-metric"><span class="ex-ml">Listed</span><span class="ex-mv">${M(p.listed)}</span></div>
      <div class="ex-metric"><span class="ex-ml">NB Score</span><span class="ex-mv">${p._nbScore!==null?p._nbScore+'/100':'—'}</span></div>`;
  }

  return `<td colspan="20" class="ex-td">
    <div class="ex-verdict" style="color:${v.color}">${v.text}</div>
    <div class="ex-grid">
      <div class="ex-section">
        <div class="ex-slabel">Key Metrics</div>
        <div class="ex-metrics">${metricsHtml}</div>
      </div>
      <div class="ex-section">
        <div class="ex-slabel">Rent: ${rent ? M(rent)+'/mo' : '—'} <span style="font-size:.58rem;color:var(--text3)">(${rentSrc}, ${rentConf})</span></div>
      </div>
      <div class="ex-section">
        <div class="ex-slabel">Neighborhood</div>
        ${nbHtml}
      </div>
    </div>
    <div style="margin-top:.5rem"><button class="ex-open" onclick="event.stopPropagation();openM('${p.id}')">Open Full Details →</button></div>
  </td>`;
}

function toggleExpand(id, event) {
  if (event) event.stopPropagation();
  const wasOpen = expandedId === id;
  // Collapse any open row
  const prev = document.querySelector('.expand-row.open');
  if (prev) prev.classList.remove('open');
  if (wasOpen) { expandedId = null; return; }
  // Expand new row
  expandedId = id;
  const row = document.getElementById('exr-' + id);
  if (row) {
    const p = props.find(x => x.id === id);
    if (p) row.innerHTML = _expandHtml(p);
    row.classList.add('open');
  }
}

function _tableHead(it){
  const addr='<th onclick="srt(\'address\')">Address</th>';
  const listed='<th onclick="srt(\'listed\')" class="hs">Listed</th>';
  const star='<th>⭐</th>';
  if(it==='flipper') return `${addr}${listed}<th>ARV</th><th>MAO</th><th class="hs">Rehab</th><th>Profit</th><th>ROI</th>${star}`;
  if(it==='brrrr')   return `${addr}${listed}<th>ARV</th><th onclick="srt('monthlyRent')">Rent</th><th onclick="srt('_cocL')">CoC</th><th>Refi</th><th class="hs">Cash Left</th>${star}`;
  if(it==='str')     return `${addr}${listed}<th>RevPAR</th><th>Gross Rev</th><th>Net CF</th><th onclick="srt('_cocL')">CoC</th>${star}`;
  if(it==='wholesaler') return `${addr}${listed}<th>ARV</th><th>MAO</th><th>Fee</th><th>Spread</th>${star}`;
  if(it==='commercial') return `${addr}${listed}<th>Units</th><th>NOI</th><th>Cap Rate</th><th>DSCR</th><th class="hs">Price/Unit</th>${star}`;
  if(it==='passive') return `${addr}${listed}<th>Invest</th><th>Ann Dist</th><th>IRR</th><th>Eq Multiple</th>${star}`;
  // buyhold default
  return `${addr}${listed}<th>Offer Range</th><th class="hs">Type</th><th onclick="srt('monthlyRent')">Rent</th><th onclick="srt('_cocL')">CoC</th><th onclick="srt('_nbScore')" class="hs">Neighborhood</th><th>Status</th>${star}`;
}

function _addrCell(p){
  let badges=sourceBadge(p.source);
  if(p.isNew)badges+=`<span class="bdg bn">🆕</span>`;
  if(p.priceDrop)badges+=`<span class="bdg bd">📉</span>`;
  if(p._resurface)badges+=`<span class="bdg brf">🔄</span>`;
  return `<td><div style="display:flex;gap:6px;align-items:flex-start"><button class="ex-chev" onclick="toggleExpand('${p.id}',event)" title="Quick view">▸</button><div onclick="openM('${p.id}')" style="cursor:pointer;flex:1"><div style="margin-bottom:2px">${badges}</div><div class="am">${esc(p.address)}</div><div class="as">${esc(p.city)}</div></div></div></td>`;
}
function _listedCell(p){return `<td class="hs" onclick="openM('${p.id}')"><span class="mn">${M(p.listed)}</span></td>`;}
function _starCell(p){
  const s=p.stage||'inbox';
  const icon=STAGE_ICONS[s]||'📥';
  return `<td><div class="cc">
    <button class="cb stg-prev" onclick="event.stopPropagation();prevStage('${p.id}')" title="Previous stage">◂</button>
    <span class="stg-badge stg-${s}" title="${STAGE_LABELS[s]||s}">${icon}</span>
    <button class="cb stg-next" onclick="event.stopPropagation();nextStage('${p.id}')" title="Next stage">▸</button>
    <button class="cb stg-arch ${s==='archived'?'abl':''}" onclick="event.stopPropagation();setStage('${p.id}','archived')" title="Archive">📦</button>
  </div></td>`;
}

function _tableRow(p,it){
  const oc=`onclick="openM('${p.id}')"`;
  const a=_addrCell(p), l=_listedCell(p), s=_starCell(p);

  if(it==='flipper'){
    const cond=mCond[p.id]||p.condition||'good',im=mImpr[p.id]||p.improvement||'asis';
    const f=flipCalc(p.listed,cond,im);
    return `${a}${l}
      <td ${oc}>${f?M(f.arv):'—'}</td>
      <td ${oc}>${f?`<span style="color:${p.listed<=f.mao?'var(--green)':'var(--red)'}">${M(f.mao)}</span>`:'—'}</td>
      <td class="hs" ${oc}>${f?M(f.rehabCost):'—'}</td>
      <td ${oc}>${f?`<span style="color:${f.netProfit>=0?'var(--green)':'var(--red)'}">${MS(f.netProfit)}</span>`:'—'}</td>
      <td ${oc}>${f?`<span style="color:${f.roi>=0.15?'var(--green)':f.roi>=0?'var(--amber)':'var(--red)'}">${PCT(f.roi)}</span>`:'—'}</td>${s}`;
  }

  if(it==='brrrr'){
    const rent=mRent[p.id]??p.monthlyRent;
    const cond=mCond[p.id]||p.condition||'good',im=mImpr[p.id]||p.improvement||'asis';
    const b=brrrrCalc(p.listed,rent,cond,im);
    return `${a}${l}
      <td ${oc}>${b?M(b.arv):'—'}</td>
      <td ${oc}>${rent?M(rent)+'/mo':'<span style="color:var(--text2)">—</span>'}</td>
      <td ${oc}>${p._cocL!==null?`<span class="coc ${p._cocL>=GP.cocMin?'p':'f'}">${PCT(p._cocL)}</span>`:'—'}</td>
      <td ${oc}>${b?M(b.refiAmount):'—'}</td>
      <td class="hs" ${oc}>${b?(b.infinite?'<span style="color:var(--green)">∞ Return</span>':M(b.cashLeftIn)):'—'}</td>${s}`;
  }

  if(it==='str'){
    const pp=activeProject||{};
    const sc=strCalc(p.listed,pp._str_adr||150,pp._str_occ||0.70,pp._str_clean||75,pp._str_plat||0.03);
    return `${a}${l}
      <td ${oc}>${sc?M(sc.revPAR):'—'}</td>
      <td ${oc}>${sc?M(sc.grossRev)+'/yr':'—'}</td>
      <td ${oc}>${sc?`<span style="color:${sc.cf>=0?'var(--green)':'var(--red)'}">${MS(sc.cf/12)}/mo</span>`:'—'}</td>
      <td ${oc}>${sc?`<span class="coc ${sc.coc>=GP.cocMin?'p':'f'}">${PCT(sc.coc)}</span>`:'—'}</td>${s}`;
  }

  if(it==='wholesaler'){
    const pp=activeProject||{};
    const cond=mCond[p.id]||p.condition||'good',im=mImpr[p.id]||p.improvement||'asis';
    const arv=p.listed*(1+(COND[cond]?.adj||0))+(p.listed*(IMPR[im]?.upliftPct||0));
    const w=wholesaleCalc(p.listed,arv,pp._ws_assign||0.07,pp._ws_rehab||0.10);
    return `${a}${l}
      <td ${oc}>${w?M(w.arv):'—'}</td>
      <td ${oc}>${w?M(w.mao):'—'}</td>
      <td ${oc}>${w?`<span style="color:var(--green)">${M(w.assignFee)}</span>`:'—'}</td>
      <td ${oc}>${w?`<span style="color:${w.spread>=0?'var(--green)':'var(--red)'}">${MS(w.spread)}</span>`:'—'}</td>${s}`;
  }

  if(it==='commercial'){
    const pp=activeProject||{};
    const c=commercialCalc(p.listed,pp._comm_units||p.beds||2,pp._comm_rpu||800,pp._comm_vac||0.05);
    return `${a}${l}
      <td ${oc}>${c?c.units:'—'}</td>
      <td ${oc}>${c?M(c.noi)+'/yr':'—'}</td>
      <td ${oc}>${c?`<span style="color:${c.capRate>=0.06?'var(--green)':'var(--red)'}">${PCT(c.capRate)}</span>`:'—'}</td>
      <td ${oc}>${c?`<span style="color:${c.dscr>=1.25?'var(--green)':'var(--red)'}">${c.dscr.toFixed(2)}x</span>`:'—'}</td>
      <td class="hs" ${oc}>${c?M(c.pricePerUnit):'—'}</td>${s}`;
  }

  if(it==='passive'){
    const pp=activeProject||{};
    const invest=pp._pass_invest||p.listed*GP.downPct||50000;
    const ps=passiveCalc(invest,pp._pass_pref||0.08,pp._pass_hold||5,pp._pass_eqm||2.0);
    return `${a}${l}
      <td ${oc}>${ps?M(invest):'—'}</td>
      <td ${oc}>${ps?`<span style="color:var(--green)">${M(ps.annDist)}/yr</span>`:'—'}</td>
      <td ${oc}>${ps?`<span style="color:${ps.irr>=0.12?'var(--green)':'var(--amber)'}">${PCT(ps.irr)}</span>`:'—'}</td>
      <td ${oc}>${ps?ps.equityMultiple.toFixed(1)+'×':'—'}</td>${s}`;
  }

  // buyhold default
  const isDuplex=['DUPLEX','TRIPLEX','QUAD'].includes(p.type);
  const nbl=nbLabel(p._nbScore);
  let offerHtml='<span style="color:var(--text2)">No rent est.</span>';
  if(p._tiers){
    const tc=classify(p.listed,p._tiers);
    offerHtml=`<div style="display:flex;gap:3px;align-items:baseline;flex-wrap:wrap"><span class="om g">${M(p._tiers.strong)}</span><span style="color:var(--text3);font-size:.55rem">/</span><span class="om a">${M(p._tiers.consider)}</span><span style="color:var(--text3);font-size:.55rem">/</span><span class="om r">${M(p._tiers.stretch)}</span></div><div style="font-size:.58rem;color:var(--text2)">List: <span class="${tc.cls}" style="font-weight:600">${tc.label}</span></div>`;
  }
  const statusDot=p.status==='pass'?'p':p.status==='fail'?'f':'n';
  const statusLabel=p.status==='pass'?'Pass':p.status==='fail'?'Fail':'New';
  return `${a}${l}
    <td ${oc}>${offerHtml}</td>
    <td class="hs" ${oc}><span style="font-size:.7rem;color:${isDuplex?'#A78BFA':'var(--text2)'}">${esc(p.type)}</span></td>
    <td ${oc}>${(()=>{
      if(p.monthlyRent) return `<span class="mn a">${M(p.monthlyRent)}/mo</span>`;
      const er=effectiveRent(p);
      if(!er) return '<span style="color:var(--text2)">—</span>';
      const modeLabel={low:'Low',mid:'Mid','high':'High','mid+5':'Mid+5%'}[gRentMode]||'Mid';
      return `<div style="font-size:.72rem;color:var(--amber)">${M(er)}/mo</div><div style="font-size:.57rem;color:var(--text3)">${modeLabel} est.</div>`;
    })()}</td>
    <td ${oc}>
      <span class="coc ${p._cocL!==null&&p._cocL>=GP.cocMin?'p':'f'}">${p._cocL!==null?PCT(p._cocL):'—'}</span>
      ${p._cfL!==null?`<div style="font-size:.6rem;color:${p._cfL>=0?'var(--green)':'var(--red)'}">${MS(p._cfL)}/mo</div>`:''}
    </td>
    <td class="hs" ${oc}>
      ${p._nbScore!==null?`<span class="nbhd ${nbl.cls}">${p._nbScore}</span><div style="font-size:.6rem;color:var(--text2);margin-top:2px">${esc(p._hood?.area||'')}</div>`:'—'}
    </td>
    <td ${oc}><span class="dot ${statusDot}"></span>${statusLabel}</td>${s}`;
}

function vis(){
  let l=[...props];
  if(activeProject) l=l.filter(p=>projectFilter(p,activeProject)); // project primary filter
  if(STAGES.includes(aV))l=l.filter(p=>(p.stage||'inbox')===aV);
  else l=l.filter(p=>(p.stage||'inbox')!=='archived');
  if(aF==='pass')l=l.filter(p=>p.status==='pass');
  if(aF==='fail')l=l.filter(p=>p.status==='fail');
  if(aF==='duplex')l=l.filter(p=>p.type==='DUPLEX'||p.type==='TRIPLEX'||p.type==='QUAD');
  if(aF==='new')l=l.filter(p=>p.isNew);
  if(aF==='drop')l=l.filter(p=>p.priceDrop);
  if(aF==='resurface')l=l.filter(p=>p._resurface);
  if(sCol)l.sort((a,b)=>sDir*((a[sCol]??-9e9)>(b[sCol]??-9e9)?1:(a[sCol]??-9e9)<(b[sCol]??-9e9)?-1:0));
  return l;
}

function renderApp(){
  const list=vis();
  const container=document.getElementById('props-container');

  if(!props.length){
    container.innerHTML=`
      <div class="empty-state">
        <div class="e-icon">📭</div>
        <h3>No properties yet</h3>
        <p>Add your inbound address to your Zillow and Realtor.com saved searches. Properties will appear here automatically when alert emails arrive.</p>
        <div class="empty-email">${userMailbox?userMailbox.slug+'@'+(userMailbox.domain||'alerts.LockBoxIQ.com'):'loading…'}</div>
      </div>`;
    updateStats();
    return;
  }

  if(!list.length){
    container.innerHTML=`<div class="empty-state"><div class="e-icon">🔍</div><h3>No properties match this filter</h3><p>Try a different filter or tab above.</p></div>`;
    updateStats();
    return;
  }

  const _it=activeProject?.investment_type||'buyhold';
  const thead=_tableHead(_it);
  container.innerHTML=`<div class="tw"><table><thead><tr>${thead}</tr></thead><tbody id="tbody"></tbody></table></div>`;

  const tbody=document.getElementById('tbody');
  expandedId = null; // collapse on re-render
  list.forEach((p,i)=>{
    const tr=document.createElement('tr');
    tr.style.animationDelay=(i*0.02)+'s';
    if(p.stage==='shortlist')tr.classList.add('fav');
    if(p.stage==='archived')tr.classList.add('ni');
    tr.innerHTML=_tableRow(p,_it);
    tbody.appendChild(tr);
    // Expand row (hidden by default)
    const exr=document.createElement('tr');
    exr.className='expand-row';
    exr.id='exr-'+p.id;
    tbody.appendChild(exr);
  });
  updateStats();
}

function updateStats(){
  // When a project is active, scope all stats + Top Deal to that project's filtered set
  const base=activeProject?props.filter(p=>projectFilter(p,activeProject)):props;
  const visible=base.filter(p=>(p.stage||'inbox')!=='archived');
  const pass=visible.filter(p=>p.status==='pass');
  const favs=base.filter(p=>(p.stage||'inbox')==='shortlist');
  const news=visible.filter(p=>p.isNew||p.priceDrop).length;
  const resurface=visible.filter(p=>p._resurface).length;
  const rfChip=document.querySelector('.fc[onclick*="resurface"]');
  if(rfChip){rfChip.style.display=resurface?'':'none';if(resurface)rfChip.innerHTML=`🔄 Revisit <span class="n">${resurface}</span>`;}
  const cfs=pass.filter(p=>p._cfL>0).map(p=>p._cfL);
  const avgCf=cfs.length?Math.round(cfs.reduce((a,b)=>a+b,0)/cfs.length):0;
  document.getElementById('s-tot').textContent=visible.length;
  document.getElementById('s-pass').textContent=pass.length;
  document.getElementById('s-favs').textContent=favs.length;
  document.getElementById('s-new').textContent=news;
  document.getElementById('s-cf').textContent=(avgCf>=0?'+':'')+M(avgCf)+'/mo';
  // Tab counts always use full props list (not project-scoped)
  document.getElementById('tc-a').textContent=props.filter(p=>(p.stage||'inbox')!=='archived').length;
  STAGES.forEach(s=>{const el=document.getElementById('tc-'+s);if(el)el.textContent=props.filter(p=>(p.stage||'inbox')===s).length;});
  // Top Deal: when project active → best available in scope (visible, regardless of pass/fail)
  //           when no project → pass-only (global view keeps quality bar high)
  const topPool=activeProject?visible:pass;
  const topDeal=topPool.filter(p=>p._tiers&&effectiveRent(p)).sort((a,b)=>(b._cocL||0)-(a._cocL||0))[0];
  if(topDeal){
    document.getElementById('td-name').textContent=`${topDeal.address} — ${topDeal.type}`;
    document.getElementById('td-list').textContent=M(topDeal.listed);
    document.getElementById('td-s').textContent=topDeal._tiers?M(topDeal._tiers.strong):'—';
    const er=effectiveRent(topDeal);
    document.getElementById('td-rent').textContent=er?M(er)+'/mo':'—';
    document.getElementById('td-nbhd').textContent=topDeal._nbScore!==null?topDeal._nbScore+' / 100':'—';
  } else {
    // No qualifying deal in this project scope — clear the panel
    ['td-name','td-list','td-s','td-rent','td-nbhd'].forEach(id=>document.getElementById(id).textContent='—');
  }

  // Target Property Profile
  const tpEl=document.getElementById('target-profile');
  if(tpEl){
    const tp=buildTargetProfile(visible);
    if(tp){
      tpEl.style.display='';
      document.getElementById('tp-price').textContent='≤ '+M(tp.maxPrice);
      document.getElementById('tp-strong').textContent='≤ '+M(tp.strongPrice);
      document.getElementById('tp-rent').textContent=M(tp.targetRent)+'/mo';
      document.getElementById('tp-bb').textContent=tp.beds+' / '+tp.baths;
      document.getElementById('tp-sqft').textContent='~'+tp.sqft.toLocaleString();
      const cfEl=document.getElementById('tp-cf');
      cfEl.textContent=MS(tp.cfMo)+'/mo';
      cfEl.style.color=tp.cfMo>=0?'var(--green)':'var(--red)';
      const taxEl=document.getElementById('tp-tax');
      taxEl.textContent=tp.yr1TaxSav>0?'+'+M(tp.yr1TaxSav):'$0';
      taxEl.style.color=tp.yr1TaxSav>0?'var(--green)':'var(--text3)';
      const roiEl=document.getElementById('tp-roi');
      roiEl.textContent=tp.yr5AnnROI?PCT(tp.yr5AnnROI)+'/yr':'—';
      roiEl.style.color=tp.yr5AnnROI>0?'var(--green)':'var(--red)';
      document.getElementById('tp-desc').textContent=tp.desc;
    } else {
      tpEl.style.display='none';
    }
  }
}

