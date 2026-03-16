async function loadProperties(){
  try {
    let token = await getAccessToken();
    if(!token){
      console.warn('loadProperties: no access token available');
      _showPropsError('Not signed in. Please reload and sign in.');
      return;
    }
    let res=await fetch(`${EDGE_BASE}/properties`,{
      headers:{'Authorization':`Bearer ${token}`}
    });
    // On 401, try ONE refresh then retry — never auto-signout
    if(res.status===401){
      console.warn('loadProperties: 401, refreshing token…');
      const {data:refreshed} = await sb.auth.refreshSession();
      if(refreshed?.session?.access_token){
        _accessToken = refreshed.session.access_token;
        token = _accessToken;
        res = await fetch(`${EDGE_BASE}/properties`,{
          headers:{'Authorization':`Bearer ${token}`}
        });
      }
    }
    if(!res.ok){
      let errBody='';
      try{ errBody=await res.text(); }catch(_){}
      console.error('loadProperties failed',res.status,errBody);
      _showPropsError(`HTTP ${res.status} — ${errBody||'unknown error'}`);
      return;
    }
    const data=await res.json();
    props=data.map(p=>{
      const h=p.hood;
      return{
        ...p,
        _tiers:null, _cocL:null, _cfL:null, // filled by recomputeRents()
        _hood:h||null,
        _nbScore:h?nbScore({schools:h.schools,crime:h.crime,rentGrowth:h.rentGrowth}):null,
      };
    });
    refreshAll();
  } catch(e) {
    console.error('loadProperties exception:', e);
    _showPropsError(e.message||String(e));
  }
}

function _showPropsError(msg){
  const c=document.getElementById('props-container');
  if(!c) return;
  c.innerHTML=`<div class="empty-state">
    <div class="e-icon">⚠️</div>
    <h3>Could not load properties</h3>
    <p style="font-family:monospace;font-size:.8rem;word-break:break-all">${msg}</p>
    <button onclick="loadProperties()" style="margin-top:1.2rem;padding:.55rem 1.4rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.9rem">↺ Retry</button>
  </div>`;
}

async function saveProperty(id, updates){
  const token = await getAccessToken();
  if(!token) return;
  await fetch(`${EDGE_BASE}/properties/${id}`,{
    method:'PATCH',
    headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify(updates)
  });
  // Update local state
  const idx=props.findIndex(p=>p.id===id);
  if(idx>=0){
    Object.assign(props[idx],updates);
    if('monthly_rent' in updates) props[idx].monthlyRent=updates.monthly_rent;
  }
}

function toggleEdit(){if(openId){mEdit[openId]=!mEdit[openId];buildMod(openId);}}

async function savePropertyEdit(id){
  const g=s=>document.getElementById(s);
  const updates={};
  const addr=(g('ep-addr')?.value||'').trim(); if(addr)updates.address=addr;
  const price=Math.round(+g('ep-price')?.value||0); if(price)updates.listed_price=price;
  const beds=+g('ep-beds')?.value||0; if(beds)updates.beds=beds;
  const baths=+g('ep-baths')?.value||0; if(baths)updates.baths=baths;
  const sqft=Math.round(+g('ep-sqft')?.value||0); if(sqft)updates.sqft=sqft;
  const lot=Math.round(+g('ep-lot')?.value||0); if(lot)updates.lot_size=lot;
  const rentEst=Math.round(+g('ep-rent-est')?.value||0); if(rentEst)updates.rent_estimate=rentEst;
  const rent=Math.round(+g('ep-rent')?.value||0); if(rent)updates.monthly_rent=rent;
  if(!Object.keys(updates).length)return;
  const btn=g('m-edit-btn');if(btn)btn.disabled=true;
  await saveProperty(id,updates);
  // Rebuild derived fields on local prop
  const p=props.find(x=>x.id===id);
  if(p){
    if(updates.address)p.address=updates.address;
    if(updates.listed_price)p.listed=updates.listed_price;
    if(updates.beds)p.beds=updates.beds;
    if(updates.baths)p.baths=updates.baths;
    if(updates.sqft)p.sqft=updates.sqft;
    if(updates.lot_size)p.lotSize=updates.lot_size;
    if(updates.rent_estimate){const re=updates.rent_estimate;p.rentRange={low:Math.round(re*0.88/25)*25,high:Math.round(re*1.12/25)*25,source:'manual'};}
    if(updates.monthly_rent) p.monthlyRent=updates.monthly_rent;
    recomputeOne(p);
  }
  mEdit[id]=false;
  buildMod(id);
  renderApp();
}

