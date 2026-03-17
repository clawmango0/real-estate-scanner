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
  const ptype=(g('ep-type')?.value||'').trim(); if(ptype)updates.property_type=ptype;
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
    if(updates.property_type)p.type=updates.property_type;
    if(updates.rent_estimate){const re=updates.rent_estimate;p.rentRange={low:Math.round(re*0.88/25)*25,high:Math.round(re*1.12/25)*25,source:'manual'};}
    if(updates.monthly_rent) p.monthlyRent=updates.monthly_rent;
    recomputeOne(p);
  }
  mEdit[id]=false;
  buildMod(id);
  renderApp();
}

/* ── Add Property from URL ─────────────────────────────── */

// Parse a Zillow or Realtor URL into address components.
// Strips tracking params (everything after _zpid/ or after the path slug).
function parseListingUrl(raw){
  try{
    const u=new URL(raw.trim());
    // Clean tracking params
    const clean=u.origin+u.pathname.replace(/\/$/, '');
    const path=u.pathname;

    // Zillow: /homedetails/4621-Waterway-Dr-Fort-Worth-TX-76137/29214998_zpid
    const zm=path.match(/\/homedetails\/([^/]+)\/(\d+)_zpid/);
    if(zm){
      const parts=zm[1].split('-');
      // Last part is zip, before that is state, rest is address+city
      const zip=parts.pop();
      const state=parts.pop();
      // Find where city starts — typically after the street type (Dr, St, Ln, Rd, Blvd, Ave, Ct, Pl, Way, Trl, Cir, Loop)
      const streetTypes=/^(Dr|St|Ln|Rd|Blvd|Ave|Ct|Pl|Way|Trl|Cir|Loop|Pkwy|Ter|Pass|Cv|Run|Xing|Holw|Mdw|Brk)$/i;
      let splitIdx=parts.length;
      for(let i=parts.length-1;i>=2;i--){
        if(streetTypes.test(parts[i])){splitIdx=i+1;break;}
      }
      const street=parts.slice(0,splitIdx).join(' ');
      const city=parts.slice(splitIdx).join(' ');
      return{street,city,state,zip,source:'zillow',listingUrl:clean,zpid:zm[2]};
    }

    // Realtor: /realestateandhomes-detail/1912-Shadowood-Trl_Colleyville_TX_76034_M87442-23548
    const rm=path.match(/\/realestateandhomes-detail\/([^/]+)/);
    if(rm){
      // Strip MLS ID suffix (e.g. _M87442-23548)
      const slug=rm[1].replace(/_M\d[\w-]*$/, '');
      const parts=slug.split('_');
      const zip=parts.pop()||'';
      const state=parts.pop()||'';
      const city=(parts.pop()||'').replace(/-/g,' ');
      const street=(parts.join('_')).replace(/-/g,' ');
      return{street,city,state,zip,source:'realtor',listingUrl:clean};
    }

    return null;
  }catch(_){return null;}
}

function openAddProp(){
  const ov=document.getElementById('aov');
  document.getElementById('ap-body').innerHTML=_buildAddPropHTML();
  ov.classList.add('open');
}
function closeAddProp(e){
  if(e&&e.target!==e.currentTarget)return;
  document.getElementById('aov').classList.remove('open');
}

function _buildAddPropHTML(){
  return`<div style="margin-bottom:1rem">
    <label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:4px">Paste Zillow or Realtor.com URL</label>
    <div style="display:flex;gap:.4rem">
      <input id="ap-url" type="url" placeholder="https://www.zillow.com/homedetails/..." style="flex:1;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.45rem .6rem;font-size:.8rem" oninput="parseAddUrl()">
    </div>
    <div id="ap-parsed" style="margin-top:.5rem;font-size:.7rem;color:var(--text2)"></div>
  </div>
  <div class="sec" style="margin-top:0">Property Details</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:1rem">
    <div style="grid-column:span 2"><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Address</label><input id="ap-addr" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem"></div>
    <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">City</label><input id="ap-city" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem"></div>
    <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">ZIP</label><input id="ap-zip" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem"></div>
    <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Listed Price ($)</label><input id="ap-price" type="text" inputmode="numeric" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
    <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Property Type</label><select id="ap-type" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem">${['SFR','DUPLEX','TRIPLEX','QUAD','CONDO','LOT'].map(t=>'<option value="'+t+'">'+t+'</option>').join('')}</select></div>
    <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Beds</label><input id="ap-beds" type="text" inputmode="numeric" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
    <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Baths</label><input id="ap-baths" type="text" inputmode="decimal" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
    <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Sqft</label><input id="ap-sqft" type="text" inputmode="numeric" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
    <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Rent Estimate ($/mo)</label><input id="ap-rent" type="text" inputmode="numeric" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
  </div>
  <div id="ap-err" style="color:var(--red);font-size:.75rem;margin-bottom:.5rem;display:none"></div>
  <button id="ap-save-btn" onclick="submitAddProp()" style="width:100%;padding:.55rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.85rem;font-weight:600">➕ Add Property</button>`;
}

let _fetchAbort=null;
function parseAddUrl(){
  const url=document.getElementById('ap-url').value;
  const info=document.getElementById('ap-parsed');
  if(!url.trim()){info.textContent='';return;}
  const p=parseListingUrl(url);
  if(!p){info.innerHTML='<span style="color:var(--red)">Could not parse URL — enter details manually</span>';return;}
  // Immediately fill what we can from the URL pattern
  const full=p.street+(p.city?', '+p.city:'');
  document.getElementById('ap-addr').value=full;
  document.getElementById('ap-city').value=p.city||'';
  document.getElementById('ap-zip').value=p.zip||'';
  info.innerHTML=`✅ Parsed: <strong>${p.street}</strong>, ${p.city}, ${p.state} ${p.zip} (${p.source}) — <span class="ap-loading">⏳ Fetching property details<span class="ap-dots"></span></span>`;
  // Now fetch full details from the listing page via edge function
  fetchListingDetails(url.trim(),info);
}

async function fetchListingDetails(url,infoEl){
  if(_fetchAbort)_fetchAbort.abort();
  _fetchAbort=new AbortController();
  try{
    const token=await getAccessToken();
    if(!token){infoEl.innerHTML+=' <span style="color:var(--red)">(not signed in)</span>';return;}
    const res=await fetch(`${EDGE_BASE}/fetch-listing`,{
      method:'POST',signal:_fetchAbort.signal,
      headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({url})
    });
    if(!res.ok){
      const err=await res.json().catch(()=>({}));
      infoEl.innerHTML=infoEl.innerHTML.replace(/<span class="ap-loading">.*?<\/span>/,'<span style="color:var(--amber)">Fetch failed — enter details manually</span>');
      console.warn('fetch-listing:',err.error||res.status);
      return;
    }
    const d=await res.json();
    console.log('fetch-listing result:',d);
    // Fill all available fields
    const g=id=>document.getElementById(id);
    if(d.address)g('ap-addr').value=d.address.replace(/,\s*(TX|tx)\s*\d{5}$/,'').trim();
    if(d.city)g('ap-city').value=d.city;
    if(d.zip)g('ap-zip').value=d.zip;
    if(d.price)g('ap-price').value=d.price;
    if(d.property_type)g('ap-type').value=d.property_type;
    if(d.beds)g('ap-beds').value=d.beds;
    if(d.baths)g('ap-baths').value=d.baths;
    if(d.sqft)g('ap-sqft').value=d.sqft;
    if(d.rent_estimate)g('ap-rent').value=d.rent_estimate;
    // Update parsed info line
    const parts=[];
    if(d.price)parts.push('$'+Number(d.price).toLocaleString());
    if(d.beds)parts.push(d.beds+'bd');
    if(d.baths)parts.push(d.baths+'ba');
    if(d.sqft)parts.push(d.sqft.toLocaleString()+' sqft');
    if(d.rent_estimate)parts.push('rent $'+d.rent_estimate.toLocaleString()+'/mo');
    const street=d.address?d.address.split(',')[0]:(g('ap-addr').value||'');
    infoEl.innerHTML=`✅ <strong>${street}</strong>, ${d.city||''}, ${d.state||'TX'} ${d.zip||''} — ${parts.join(' · ')||'details fetched'}`;
  }catch(e){
    if(e.name==='AbortError')return;
    console.error('fetchListingDetails error:',e);
    infoEl.innerHTML=infoEl.innerHTML.replace(/<span class="ap-loading">.*?<\/span>/,'<span style="color:var(--amber)">Fetch failed — enter details manually</span>');
  }finally{_fetchAbort=null;}
}

async function submitAddProp(){
  const g=s=>(document.getElementById(s)?.value||'').trim();
  const addr=g('ap-addr');
  if(!addr){_showAddErr('Address is required');return;}

  const city=g('ap-city');
  const zip=g('ap-zip');
  const state='TX';
  const fullAddr=addr+(city&&!addr.includes(city)?', '+city:'')+', '+state+(zip?' '+zip:'');

  const body={
    address:fullAddr,
    city, state, zip,
    source:g('ap-url')?(g('ap-url').includes('realtor.com')?'realtor':'zillow'):'manual',
    property_type:g('ap-type')||'SFR',
  };
  // Clean the listing URL — strip tracking params
  const rawUrl=g('ap-url');
  if(rawUrl){
    const parsed=parseListingUrl(rawUrl);
    body.listing_url=parsed?parsed.listingUrl:rawUrl.split('?')[0];
  }
  const price=Math.round(+g('ap-price').replace(/[^0-9]/g,'')||0);if(price)body.listed_price=price;
  const beds=+g('ap-beds')||0;if(beds)body.beds=beds;
  const baths=+g('ap-baths')||0;if(baths)body.baths=baths;
  const sqft=Math.round(+g('ap-sqft').replace(/[^0-9]/g,'')||0);if(sqft)body.sqft=sqft;
  const rent=Math.round(+g('ap-rent').replace(/[^0-9]/g,'')||0);if(rent)body.rent_estimate=rent;

  const btn=document.getElementById('ap-save-btn');
  btn.disabled=true;btn.textContent='Adding…';
  try{
    const token=await getAccessToken();
    if(!token){_showAddErr('Not signed in');return;}
    const res=await fetch(`${EDGE_BASE}/properties`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    if(!res.ok){
      const err=await res.json().catch(()=>({error:'Unknown error'}));
      // Duplicate key — find existing property and open its modal
      if(err.code==='23505'){
        const needle=addr.toLowerCase().replace(/,/g,'').split(/\s+/).slice(0,3).join(' ');
        const match=props.find(p=>(p.address||'').toLowerCase().replace(/,/g,'').startsWith(needle));
        closeAddProp();
        if(match){openM(match.id);}
        else{_showAddErr('Property already exists');}
        return;
      }
      _showAddErr(err.error||`HTTP ${res.status}`);return;
    }
    const newProp=await res.json();
    // Add to local state
    const h=newProp.hood;
    props.unshift({
      ...newProp,
      _tiers:null,_cocL:null,_cfL:null,
      _hood:h||null,
      _nbScore:h?nbScore({schools:h.schools,crime:h.crime,rentGrowth:h.rentGrowth}):null,
    });
    refreshAll();
    closeAddProp();
  }catch(e){
    _showAddErr(e.message||String(e));
  }finally{
    btn.disabled=false;btn.textContent='➕ Add Property';
  }
}

function _showAddErr(msg){
  const el=document.getElementById('ap-err');
  el.textContent=msg;el.style.display='block';
  setTimeout(()=>{el.style.display='none';},5000);
}

