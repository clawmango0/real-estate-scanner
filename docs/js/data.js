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
    // Auto-estimate rent for properties that have no monthly_rent set
    autoEstimateAll();
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
  if(!token) return false;
  const idx=props.findIndex(p=>p.id===id);
  // Snapshot for rollback
  const snapshot=idx>=0?{...props[idx]}:null;
  // Optimistic local update
  if(idx>=0){
    Object.assign(props[idx],updates);
    if('monthly_rent' in updates) props[idx].monthlyRent=updates.monthly_rent;
  }
  try{
    const res=await fetch(`${EDGE_BASE}/properties/${id}`,{
      method:'PATCH',
      headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify(updates)
    });
    if(!res.ok){
      console.error(`saveProperty failed: ${res.status}`);
      // Rollback local state
      if(idx>=0&&snapshot) Object.assign(props[idx],snapshot);
      return false;
    }
    return true;
  }catch(e){
    console.error('saveProperty error:',e);
    if(idx>=0&&snapshot) Object.assign(props[idx],snapshot);
    return false;
  }
}

function estimateRent(id){
  const p=props.find(x=>x.id===id);
  if(!p) return null;
  const result=localRentEstimate(p);
  if(result.error) throw new Error(result.error);
  // Save estimate to DB (fire-and-forget)
  saveProperty(id,{rent_estimate:result.estimate});
  // Update local state
  p.rentRange={low:result.low,high:result.high,source:'local'};
  return result;
}

// Auto-run rent estimation on all properties missing monthlyRent, set to mid+10%
function autoEstimateAll(){
  let updated=0;
  for(const p of props){
    if(p.monthlyRent) continue; // already has confirmed rent
    const result=localRentEstimate(p);
    if(!result||result.error) continue;
    p.rentRange={low:result.low,high:result.high,source:'local'};
    const mid10=Math.round(result.estimate*1.10/25)*25; // midpoint + 10%
    p.monthlyRent=mid10;
    mRent[p.id]=mid10;
    // Fire-and-forget DB save
    saveProperty(p.id,{rent_estimate:result.estimate,monthly_rent:mid10});
    updated++;
  }
  if(updated) console.log(`Auto-estimated rent for ${updated} properties (mid+10%)`);
}

function maybeReEstimate(id){
  const p=props.find(x=>x.id===id);
  if(!p||!p.rentRange||p.rentRange.source!=='local') return;
  const result=localRentEstimate(p);
  if(!result||result.error) return;
  p.rentRange={low:result.low,high:result.high,source:'local'};
  mRent[id]=result.estimate;
  saveProperty(id,{rent_estimate:result.estimate});
  recomputeOne(p);
}

function toggleEdit(){if(openId){mEdit[openId]=!mEdit[openId];buildMod(openId);}}

async function savePropertyEdit(id){
  const g=s=>document.getElementById(s);
  const updates={};
  const addr=(g('ep-addr')?.value||'').trim(); if(addr)updates.address=addr;
  const city=(g('ep-city')?.value||'').trim(); updates.city=city; // allow clearing
  const zip=(g('ep-zip')?.value||'').trim(); if(zip)updates.zip=zip;
  const url=(g('ep-url')?.value||'').trim(); if(url)updates.listing_url=url;
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
    if('city' in updates){p.rawCity=updates.city; p.city=updates.city?(updates.city+', TX'+(updates.zip?' '+updates.zip:p.zip?' '+p.zip:'')):(p.city);}
    if(updates.zip)p.zip=updates.zip;
    if(updates.listing_url)p.listingUrl=updates.listing_url;
    if(updates.listed_price)p.listed=updates.listed_price;
    if(updates.beds)p.beds=updates.beds;
    if(updates.baths)p.baths=updates.baths;
    if(updates.sqft)p.sqft=updates.sqft;
    if(updates.lot_size)p.lotSize=updates.lot_size;
    if(updates.property_type)p.type=updates.property_type;
    if(updates.rent_estimate){const re=updates.rent_estimate;p.rentRange={low:Math.round(re*0.88/25)*25,high:Math.round(re*1.12/25)*25,source:'manual'};}
    if(updates.monthly_rent) p.monthlyRent=updates.monthly_rent;
    maybeReEstimate(id);
    recomputeOne(p);
  }
  mEdit[id]=false;
  buildMod(id);
  renderApp();
}

/* ── Add Property from URL ─────────────────────────────── */

// Parse a Zillow, Realtor, or Redfin URL into address components.
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
      const zip=parts.pop();
      const state=parts.pop();
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
      const slug=rm[1].replace(/_M\d[\w-]*$/, '');
      const parts=slug.split('_');
      const zip=parts.pop()||'';
      const state=parts.pop()||'';
      const city=(parts.pop()||'').replace(/-/g,' ');
      const street=(parts.join('_')).replace(/-/g,' ');
      return{street,city,state,zip,source:'realtor',listingUrl:clean};
    }

    // Redfin: /TX/Euless/816-Midcreek-Dr-76039/home/32211524
    if(u.hostname.includes('redfin.com')){
      const rfm=path.match(/\/([A-Z]{2})\/([^/]+)\/([^/]+?)(?:-(\d{5}))?\/(home|unit)\/(\d+)/);
      if(rfm){
        const state=rfm[1];
        const city=rfm[2].replace(/-/g,' ');
        const streetSlug=rfm[3];
        const zip=rfm[4]||'';
        const street=streetSlug.replace(/-/g,' ');
        return{street,city,state,zip,source:'redfin',listingUrl:clean};
      }
    }

    // Redfin short link: redf.in/sOZLBS — pass through, edge function resolves it
    if(u.hostname==='redf.in'){
      return{street:'',city:'',state:'',zip:'',source:'redfin',listingUrl:raw.trim()};
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

function _bookmarkletCode(){
  // The bookmarklet runs on the listing page, grabs HTML + URL, and POSTs to our parse endpoint
  return `javascript:void((function(){var u=location.href;var h=['zillow.com','realtor.com','redfin.com'];if(!h.some(function(d){return u.includes(d)})){alert('Open a Zillow, Realtor, or Redfin listing first');return;}var html=document.documentElement.outerHTML;var s=document.createElement('script');var overlay=document.createElement('div');overlay.style.cssText='position:fixed;top:0;left:0;right:0;z-index:999999;background:linear-gradient(135deg,rgb(13,148,136),rgb(20,184,166));color:white;padding:12px 20px;font:600 14px/1.4 system-ui;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.3)';overlay.textContent='Sending to LockBoxIQ...';document.body.appendChild(overlay);fetch('https://tgborqvdkujajsggfbcy.supabase.co/functions/v1/fetch-listing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html:html.slice(0,200000),source_url:u})}).then(function(r){return r.json()}).then(function(d){if(d.error){overlay.style.background='rgb(220,38,38)';overlay.textContent='Error: '+d.error;setTimeout(function(){overlay.remove()},4000);return;}var p=[];if(d.price)p.push('$'+Number(d.price).toLocaleString());if(d.beds)p.push(d.beds+'bd');if(d.baths)p.push(d.baths+'ba');if(d.sqft)p.push(d.sqft.toLocaleString()+' sqft');overlay.innerHTML='<span style=font-size:18px>LockBoxIQ</span><br>'+p.join(' / ')+'<br><a href=https://lockboxiq.com/?add='+encodeURIComponent(JSON.stringify(d))+' style=color:white;text-decoration:underline>Open in dashboard</a>';setTimeout(function(){overlay.remove()},8000);}).catch(function(e){overlay.style.background='rgb(220,38,38)';overlay.textContent='Failed: '+e.message;setTimeout(function(){overlay.remove()},4000);});})())`;
}

function _buildAddPropHTML(){
  return`<div style="margin-bottom:.8rem;padding:.6rem .8rem;background:linear-gradient(135deg,rgba(13,148,136,.1),rgba(20,184,166,.08));border:1px solid rgba(20,184,166,.25);border-radius:8px">
    <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
      <span style="font-size:.8rem;font-weight:600;color:var(--accent)">Bookmarklet</span>
      <span style="font-size:.65rem;color:var(--text2)">Drag to your bookmarks bar</span>
    </div>
    <div style="display:flex;align-items:center;gap:.6rem">
      <a href="${_bookmarkletCode()}" onclick="event.preventDefault();alert('Drag this button to your bookmarks bar, then click it on any Zillow/Realtor/Redfin listing page!')" style="display:inline-block;background:linear-gradient(135deg,#0D9488,#14B8A6);color:#fff;padding:.35rem .8rem;border-radius:6px;font-size:.72rem;font-weight:600;text-decoration:none;cursor:grab;white-space:nowrap">📌 Add to LockBoxIQ</a>
      <span style="font-size:.62rem;color:var(--text2);line-height:1.3">Visit any listing → click the bookmarklet → property details auto-captured from your browser (bypasses scraper blocks)</span>
    </div>
  </div>
  <div style="margin-bottom:1rem">
    <label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:4px">Paste Zillow, Realtor, or Redfin URL</label>
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
    const d=await res.json().catch(()=>({}));
    console.log('fetch-listing result:',d);
    // Handle 422 with partial data from URL pattern
    if(!res.ok&&d.partial){
      const g=id=>document.getElementById(id);
      if(d.partial.address)g('ap-addr').value=d.partial.address;
      if(d.partial.city)g('ap-city').value=d.partial.city;
      if(d.partial.zip)g('ap-zip').value=d.partial.zip;
      const miss=(d.missing||[]).join(', ');
      infoEl.innerHTML=`<span style="color:var(--amber)">⚠️ Partial — got address from URL but missing: ${miss}. Enter details manually.</span>`;
      return;
    }
    if(!res.ok){
      infoEl.innerHTML=infoEl.innerHTML.replace(/<span class="ap-loading">.*?<\/span>/,`<span style="color:var(--amber)">Fetch failed: ${d.error||res.status} — enter details manually</span>`);
      console.warn('fetch-listing:',d.error||res.status);
      return;
    }
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
    // Build info line
    const parts=[];
    if(d.price)parts.push('$'+Number(d.price).toLocaleString());
    if(d.beds)parts.push(d.beds+'bd');
    if(d.baths)parts.push(d.baths+'ba');
    if(d.sqft)parts.push(d.sqft.toLocaleString()+' sqft');
    if(d.rent_estimate)parts.push('rent $'+d.rent_estimate.toLocaleString()+'/mo');
    const street=d.address?d.address.split(',')[0]:(g('ap-addr').value||'');
    const miss=d._missing||[];
    let line=`✅ <strong>${street}</strong>, ${d.city||''}, ${d.state||'TX'} ${d.zip||''} — ${parts.join(' · ')||'details fetched'}`;
    if(miss.length>0) line+=` <span style="color:var(--amber)">(missing: ${miss.join(', ')})</span>`;
    infoEl.innerHTML=line;
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
    source:g('ap-url')?(g('ap-url').includes('realtor.com')?'realtor':g('ap-url').includes('redfin.com')||g('ap-url').includes('redf.in')?'redfin':'zillow'):'manual',
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

