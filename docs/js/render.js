// ── Table head/row generators per investment type ────────────────────────────
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
  return `<td onclick="openM('${p.id}')"><div style="margin-bottom:2px">${badges}</div><div class="am">${esc(p.address)}</div><div class="as">${esc(p.city)}</div></td>`;
}
function _listedCell(p){return `<td class="hs" onclick="openM('${p.id}')"><span class="mn">${M(p.listed)}</span></td>`;}
function _starCell(p){
  return `<td><div class="cc">
    <button class="cb ${p.curated==='fav'?'af':''}" onclick="event.stopPropagation();curate('${p.id}','fav')">⭐</button>
    <button class="cb ${p.curated==='ni'?'ani':''}" onclick="event.stopPropagation();curate('${p.id}','ni')">👎</button>
    <button class="cb ${p.curated==='blk'?'abl':''}" onclick="event.stopPropagation();curate('${p.id}','blk')">🚫</button>
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
  if(aV==='favs')l=l.filter(p=>p.curated==='fav');
  else if(aV==='ni')l=l.filter(p=>p.curated==='ni');
  else l=l.filter(p=>p.curated!=='blk');
  if(aF==='pass')l=l.filter(p=>p.status==='pass');
  if(aF==='fail')l=l.filter(p=>p.status==='fail');
  if(aF==='duplex')l=l.filter(p=>p.type==='DUPLEX'||p.type==='TRIPLEX'||p.type==='QUAD');
  if(aF==='new')l=l.filter(p=>p.isNew);
  if(aF==='drop')l=l.filter(p=>p.priceDrop);
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
  list.forEach((p,i)=>{
    const tr=document.createElement('tr');
    tr.style.animationDelay=(i*0.02)+'s';
    if(p.curated==='fav')tr.classList.add('fav');
    if(p.curated==='ni')tr.classList.add('ni');
    tr.innerHTML=_tableRow(p,_it);
    tbody.appendChild(tr);
  });
  updateStats();
}

function updateStats(){
  // When a project is active, scope all stats + Top Deal to that project's filtered set
  const base=activeProject?props.filter(p=>projectFilter(p,activeProject)):props;
  const visible=base.filter(p=>p.curated!=='blk');
  const pass=visible.filter(p=>p.status==='pass');
  const favs=base.filter(p=>p.curated==='fav');
  const news=visible.filter(p=>p.isNew||p.priceDrop).length;
  const cfs=pass.filter(p=>p._cfL>0).map(p=>p._cfL);
  const avgCf=cfs.length?Math.round(cfs.reduce((a,b)=>a+b,0)/cfs.length):0;
  document.getElementById('s-tot').textContent=visible.length;
  document.getElementById('s-pass').textContent=pass.length;
  document.getElementById('s-favs').textContent=favs.length;
  document.getElementById('s-new').textContent=news;
  document.getElementById('s-cf').textContent=(avgCf>=0?'+':'')+M(avgCf)+'/mo';
  // Tab counts always use full props list (not project-scoped)
  document.getElementById('tc-a').textContent=props.filter(p=>p.curated!=='blk').length;
  document.getElementById('tc-f').textContent=props.filter(p=>p.curated==='fav').length;
  document.getElementById('tc-n').textContent=props.filter(p=>p.curated==='ni').length;
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
}

