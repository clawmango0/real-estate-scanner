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

  container.innerHTML=`
    <div class="tw">
      <table>
        <thead><tr>
          <th onclick="srt('address')">Address</th>
          <th onclick="srt('listed')" class="hs">Listed</th>
          <th>Offer Range</th>
          <th class="hs">Type</th>
          <th onclick="srt('monthlyRent')">Rent</th>
          <th onclick="srt('_cocL')">CoC</th>
          <th onclick="srt('_nbScore')" class="hs">Neighborhood</th>
          <th>Status</th>
          <th>⭐</th>
        </tr></thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>`;

  const tbody=document.getElementById('tbody');
  list.forEach((p,i)=>{
    const tr=document.createElement('tr');
    tr.style.animationDelay=(i*0.02)+'s';
    if(p.curated==='fav')tr.classList.add('fav');
    if(p.curated==='ni')tr.classList.add('ni');
    const isDuplex=['DUPLEX','TRIPLEX','QUAD'].includes(p.type);
    let badges=sourceBadge(p.source);
    if(p.isNew)badges+=`<span class="bdg bn">🆕</span>`;
    if(p.priceDrop)badges+=`<span class="bdg bd">📉</span>`;
    const nbl=nbLabel(p._nbScore);
    let offerHtml='<span style="color:var(--text2)">No rent est.</span>';
    if(p._tiers){
      const tc=classify(p.listed,p._tiers);
      offerHtml=`<div style="display:flex;gap:3px;align-items:baseline;flex-wrap:wrap"><span class="om g">${M(p._tiers.strong)}</span><span style="color:var(--text3);font-size:.55rem">/</span><span class="om a">${M(p._tiers.consider)}</span><span style="color:var(--text3);font-size:.55rem">/</span><span class="om r">${M(p._tiers.stretch)}</span></div><div style="font-size:.58rem;color:var(--text2)">List: <span class="${tc.cls}" style="font-weight:600">${tc.label}</span></div>`;
    }
    const statusDot=p.status==='pass'?'p':p.status==='fail'?'f':'n';
    const statusLabel=p.status==='pass'?'Pass':p.status==='fail'?'Fail':'New';
    tr.innerHTML=`
      <td onclick="openM('${p.id}')"><div style="margin-bottom:2px">${badges}</div><div class="am">${esc(p.address)}</div><div class="as">${esc(p.city)}</div></td>
      <td class="hs" onclick="openM('${p.id}')"><span class="mn">${M(p.listed)}</span></td>
      <td onclick="openM('${p.id}')">${offerHtml}</td>
      <td class="hs" onclick="openM('${p.id}')"><span style="font-size:.7rem;color:${isDuplex?'#A78BFA':'var(--text2)'}">${esc(p.type)}</span></td>
      <td onclick="openM('${p.id}')">${(()=>{
        if(p.monthlyRent) return `<span class="mn a">${M(p.monthlyRent)}/mo</span>`;
        const er=effectiveRent(p);
        if(!er) return '<span style="color:var(--text2)">—</span>';
        const modeLabel={low:'Low',mid:'Mid','high':'High','mid+5':'Mid+5%'}[gRentMode]||'Mid';
        return `<div style="font-size:.72rem;color:var(--amber)">${M(er)}/mo</div><div style="font-size:.57rem;color:var(--text3)">${modeLabel} est.</div>`;
      })()}</td>
      <td onclick="openM('${p.id}')">
        <span class="coc ${p._cocL!==null&&p._cocL>=GP.cocMin?'p':'f'}">${p._cocL!==null?PCT(p._cocL):'—'}</span>
        ${p._cfL!==null?`<div style="font-size:.6rem;color:${p._cfL>=0?'var(--green)':'var(--red)'}">${MS(p._cfL)}/mo</div>`:''}
      </td>
      <td class="hs" onclick="openM('${p.id}')">
        ${p._nbScore!==null?`<span class="nbhd ${nbl.cls}">${p._nbScore}</span><div style="font-size:.6rem;color:var(--text2);margin-top:2px">${esc(p._hood?.area||'')}</div>`:'—'}
      </td>
      <td onclick="openM('${p.id}')"><span class="dot ${statusDot}"></span>${statusLabel}</td>
      <td>
        <div class="cc">
          <button class="cb ${p.curated==='fav'?'af':''}" onclick="event.stopPropagation();curate('${p.id}','fav')">⭐</button>
          <button class="cb ${p.curated==='ni'?'ani':''}" onclick="event.stopPropagation();curate('${p.id}','ni')">👎</button>
          <button class="cb ${p.curated==='blk'?'abl':''}" onclick="event.stopPropagation();curate('${p.id}','blk')">🚫</button>
        </div>
      </td>`;
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

