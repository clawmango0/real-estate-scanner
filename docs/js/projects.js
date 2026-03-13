
// GP override helpers — save/restore global financial params per project
function _applyProjectGP(proj){
  if(!Object.keys(_gpOrig).length) _gpOrig={rate:GP.rate,downPct:GP.downPct};
  if(proj.rate!=null)     GP.rate=proj.rate;
  if(proj.down_pct!=null) GP.downPct=proj.down_pct;
}
function _restoreGP(){
  if(_gpOrig.rate!==undefined)    GP.rate=_gpOrig.rate;
  if(_gpOrig.downPct!==undefined) GP.downPct=_gpOrig.downPct;
  _gpOrig={};
}

// City match: uses rawCity (the actual DB city column) for exact case-insensitive comparison.
// rawCity is populated for all properties (backfilled from address parsing 2026-03-13).
// Falls back to hood.area substring check only if rawCity is empty (shouldn't happen).
function _matchCity(p,cities){
  if(!cities||!cities.length) return true;
  const raw=(p.rawCity||'').toLowerCase().trim();
  return cities.some(x=>{
    const xL=x.toLowerCase().trim();
    if(raw) return raw===xL;
    // fallback: substring on display city (includes "City, ST ZIP")
    return (p.city||'').toLowerCase().includes(xL);
  });
}

// Returns true if property passes all project criteria.
// Beds/baths filters are skipped when property has no value (unknown = include).
// Price filter uses Number() coercion to handle string listed_price from DB.
function projectFilter(p,proj){
  if(!proj) return true;
  if(!_matchCity(p,proj.cities)) return false;
  if(proj.prop_types&&proj.prop_types.length&&!proj.prop_types.includes(p.type)) return false;
  if(proj.min_beds !=null&&p.beds !=null&&Number(p.beds) <Number(proj.min_beds))  return false;
  if(proj.max_beds !=null&&p.beds !=null&&Number(p.beds) >Number(proj.max_beds))  return false;
  if(proj.min_baths!=null&&p.baths!=null&&Number(p.baths)<Number(proj.min_baths)) return false;
  if(proj.max_baths!=null&&p.baths!=null&&Number(p.baths)>Number(proj.max_baths)) return false;
  if(proj.max_price!=null&&p.listed!=null&&Number(p.listed)>Number(proj.max_price)) return false;
  return true;
}

// Compute card stats for an array of properties
function _projStats(list){
  const v=list.filter(p=>p.curated!=='blk');
  const pass=v.filter(p=>p.status==='pass');
  const cfs=pass.filter(p=>p._cfL>0).map(p=>p._cfL);
  return{count:v.length,pass:pass.length,
         favs:v.filter(p=>p.curated==='fav').length,
         newDrop:v.filter(p=>p.isNew||p.priceDrop).length,
         avgCf:cfs.length?Math.round(cfs.reduce((a,b)=>a+b,0)/cfs.length):0};
}

// Switch active project — applies GP overrides and re-renders everything
function setProject(proj){
  _restoreGP();
  activeProject=proj;
  if(proj) _applyProjectGP(proj);
  recomputeRents();
  renderProjectCards();
  renderApp();
}

// Build and inject the project cards row
function renderProjectCards(){
  const row=document.getElementById('prow');
  if(!row) return;
  const M2=v=>v==null?'—':'$'+Math.round(v/1000)+'k';
  const allSt=_projStats(props);
  const allActive=activeProject===null;
  let html=`<div class="pcard${allActive?' pactive':''}" onclick="setProject(null)">
    <div class="pc-name">All Properties</div>
    <div class="pc-meta">No filters active</div>
    <div class="pc-map" data-proj-id="all"></div>
    <div class="pc-grid">
      <div><div class="pcl">Props</div><div class="pcv">${allSt.count}</div></div>
      <div><div class="pcl">Pass</div><div class="pcv" style="color:var(--green)">${allSt.pass}</div></div>
      <div><div class="pcl">Favs</div><div class="pcv" style="color:var(--amber)">${allSt.favs}</div></div>
      <div><div class="pcl">New/Drop</div><div class="pcv">${allSt.newDrop}</div></div>
    </div>
  </div>`;
  projects.forEach(proj=>{
    const filtered=props.filter(p=>projectFilter(p,proj));
    const st=_projStats(filtered);
    const isActive=activeProject&&activeProject.id===proj.id;
    const cfSign=st.avgCf>=0?'+':'';
    const cfStr=st.avgCf?cfSign+'$'+Math.abs(st.avgCf).toLocaleString():'—';
    const parts=[];
    if(proj.cities&&proj.cities.length) parts.push(proj.cities.slice(0,2).join(', ')+(proj.cities.length>2?'…':''));
    if(proj.prop_types&&proj.prop_types.length) parts.push(proj.prop_types.join('/'));
    if(proj.max_price) parts.push('≤'+M2(proj.max_price));
    const meta=parts.join(' · ')||'All types';
    html+=`<div class="pcard${isActive?' pactive':''}" onclick="setProject(projects.find(x=>x.id==='${proj.id}'))">
      <div class="pc-act">
        <button onclick="event.stopPropagation();openProjMod('${proj.id}')">✏ Edit</button>
        <button class="del-btn" onclick="event.stopPropagation();deleteProject('${proj.id}')">🗑 Delete</button>
      </div>
      <div class="pc-name">${proj.name}</div>
      <div class="pc-meta">${meta}</div>
      <div class="pc-map" data-proj-id="${proj.id}"></div>
      <div class="pc-grid">
        <div><div class="pcl">Props</div><div class="pcv">${st.count}</div></div>
        <div><div class="pcl">Pass</div><div class="pcv" style="color:var(--green)">${st.pass}</div></div>
        <div><div class="pcl">Favs</div><div class="pcv" style="color:var(--amber)">${st.favs}</div></div>
        <div><div class="pcl">AvgCF</div><div class="pcv" style="color:${st.avgCf>=0?'var(--green)':'#f87171'}">${cfStr}</div></div>
      </div>
    </div>`;
  });
  html+=`<div class="pcard-add" onclick="openProjMod(null)" title="New project">+</div>`;
  row.innerHTML=html;
  _initProjectMaps();
}

// Initialize mini-maps on project cards
function _initProjectMaps(){
  if(typeof L==='undefined') return;
  if(window._projMaps){window._projMaps.forEach(m=>{try{m.remove()}catch(e){}});}
  window._projMaps=[];
  document.querySelectorAll('.pc-map').forEach(el=>{
    const pid=el.dataset.projId;
    let filtered;
    if(pid==='all'){
      filtered=props.filter(p=>p.lat&&p.lng);
    }else{
      const proj=projects.find(x=>x.id===pid);
      filtered=props.filter(p=>p.lat&&p.lng&&projectFilter(p,proj));
    }
    if(!filtered.length){
      el.innerHTML='<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:.5rem;color:var(--text3)">No map data</div>';
      return;
    }
    const map=L.map(el,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,boxZoom:false,keyboard:false});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);
    const bounds=[];
    filtered.forEach(p=>{
      const ll=[p.lat,p.lng];
      bounds.push(ll);
      L.circleMarker(ll,{radius:3,color:'#1CCEBB',fillColor:'#1CCEBB',fillOpacity:.8,weight:1}).addTo(map);
    });
    if(bounds.length===1) map.setView(bounds[0],12);
    else map.fitBounds(bounds,{padding:[8,8]});
    window._projMaps.push(map);
  });
  // Invalidate sizes after DOM paint to fix tile rendering
  setTimeout(()=>{if(window._projMaps) window._projMaps.forEach(m=>{try{m.invalidateSize()}catch(e){}});},100);
}

// Load projects from DB
async function loadProjects(){
  if(!currentUser) return;
  const{data,error}=await sb.from('projects').select('*').eq('user_id',currentUser.id).order('created_at');
  if(error){console.error('loadProjects:',error);return;}
  projects=data||[];
  renderProjectCards();
}

// ── Project modal ─────────────────────────────────────────
const _PTYPES=['SFR','DUPLEX','TRIPLEX','QUAD','CONDO','LOT'];

function openProjMod(id){
  _editProj=id
    ?{...projects.find(p=>p.id===id)}
    :{id:null,name:'',cities:[],prop_types:[],min_beds:null,max_beds:null,
      min_baths:null,max_baths:null,max_price:null,down_pct:null,rate:null,hold_yrs:null};
  _buildProjModal();
  document.getElementById('pov').classList.add('open');
  // Init map AFTER modal is visible (display:flex) + animation settles (0.2s)
  setTimeout(()=>_initModalMap(),350);
}

function closeProjMod(e){
  if(window._projModalMap){try{window._projModalMap.remove()}catch(e){};window._projModalMap=null;}
  if(e&&e.target!==document.getElementById('pov')) return;
  document.getElementById('pov').classList.remove('open');
  _editProj=null;
}

function _buildProjModal(){
  // Destroy existing map before innerHTML replaces its container
  if(window._projModalMap){try{window._projModalMap.remove()}catch(e){};window._projModalMap=null;}
  const p=_editProj;
  document.getElementById('pm-title').textContent=p.id?'Edit Project':'New Project';
  const cityTags=(p.cities||[]).map(c=>`<span class="ptag">${c}<button onclick="_projRemoveCity('${c.replace(/'/g,"\\'")}')">✕</button></span>`).join('');
  const typeBoxes=_PTYPES.map(t=>`<button class="ptyp${(p.prop_types||[]).includes(t)?' on':''}" onclick="_projToggleType('${t}')">${t}</button>`).join('');
  document.getElementById('pm-body').innerHTML=`
    <div class="pm-map-wrap" id="pm-map"></div>
    <div class="txs">
      <div class="pf-row"><span class="pf-lbl">Project Name</span>
        <input type="text" id="pf-name" value="${(p.name||'').replace(/"/g,'&quot;')}" placeholder="e.g. SFR Duplex FW" style="flex:1">
      </div>
    </div>
    <div class="sec" style="margin:.6rem 0 .3rem;font-size:.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Filters</div>
    <div class="txs">
      <div class="pf-row" style="flex-direction:column;align-items:flex-start">
        <span class="pf-lbl" style="margin-bottom:.3rem">Cities</span>
        <div class="tag-wrap" id="pf-city-tags">${cityTags}
          <input class="tag-in" id="pf-city-in" placeholder="Type city, press Enter"
            onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();_projAddCity();}">
        </div>
      </div>
      <div class="pf-row"><span class="pf-lbl">Property Types</span><div class="ptypes">${typeBoxes}</div></div>
      <div class="pf-row">
        <span class="pf-lbl">Beds</span>
        <input type="number" class="no-spin" id="pf-minbeds" placeholder="Min" value="${p.min_beds??''}">
        <span style="color:var(--text3);font-size:.7rem">–</span>
        <input type="number" class="no-spin" id="pf-maxbeds" placeholder="Max" value="${p.max_beds??''}">
      </div>
      <div class="pf-row">
        <span class="pf-lbl">Baths</span>
        <input type="number" class="no-spin" id="pf-minbaths" placeholder="Min" value="${p.min_baths??''}">
        <span style="color:var(--text3);font-size:.7rem">–</span>
        <input type="number" class="no-spin" id="pf-maxbaths" placeholder="Max" value="${p.max_baths??''}">
      </div>
      <div class="pf-row"><span class="pf-lbl">Max Listed Price</span>
        <input type="number" class="no-spin" id="pf-maxprice" placeholder="e.g. 350000" value="${p.max_price??''}" style="flex:1">
      </div>
    </div>
    <div class="sec" style="margin:.6rem 0 .3rem;font-size:.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Financial Overrides <span style="font-size:.55rem;opacity:.6">(blank = use global)</span></div>
    <div class="txs">
      <div class="pf-row"><span class="pf-lbl">Down Payment</span>
        <input type="number" class="no-spin" id="pf-down" placeholder="${(GP.downPct*100).toFixed(0)}" value="${p.down_pct!=null?(p.down_pct*100).toFixed(0):''}">
        <span style="color:var(--text3);font-size:.7rem">%</span>
      </div>
      <div class="pf-row"><span class="pf-lbl">Interest Rate</span>
        <input type="number" class="no-spin" id="pf-rate" placeholder="${(GP.rate*100).toFixed(2)}" value="${p.rate!=null?(p.rate*100).toFixed(2):''}">
        <span style="color:var(--text3);font-size:.7rem">%</span>
      </div>
      <div class="pf-row"><span class="pf-lbl">Hold Period</span>
        <select id="pf-hold">
          <option value="">None (global)</option>
          <option value="5"  ${p.hold_yrs===5 ?'selected':''}>5 years</option>
          <option value="10" ${p.hold_yrs===10?'selected':''}>10 years</option>
          <option value="15" ${p.hold_yrs===15?'selected':''}>15 years</option>
        </select>
      </div>
    </div>
    <button class="psave-btn" onclick="saveProject()">${p.id?'Save Changes':'Create Project'}</button>
    ${p.id?`<button class="pdel-btn" onclick="deleteProject('${p.id}')">Delete Project</button>`:''}`;
  // Note: _initModalMap() is NOT called here because the modal may still be display:none.
  // It's called from openProjMod() after the modal becomes visible,
  // or directly from _projRemoveCity() when the modal is already visible.
}

// Initialize interactive map in project modal.
// IMPORTANT: Only call this when the modal container is visible (display:flex),
// otherwise Leaflet calculates 0×0 dimensions and the map breaks.
function _initModalMap(){
  if(typeof L==='undefined') return;
  const el=document.getElementById('pm-map');
  if(!el) return;
  // Destroy previous map instance (container may have been replaced by innerHTML)
  if(window._projModalMap){try{window._projModalMap.remove()}catch(e){};window._projModalMap=null;}
  const allWithCoords=props.filter(p=>p.lat&&p.lng);
  if(!allWithCoords.length){
    el.innerHTML='<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:var(--text3)">No geocoded properties</div>';
    return;
  }
  // Verify the container is actually visible and has dimensions
  if(el.offsetWidth===0||el.offsetHeight===0){
    console.warn('_initModalMap: container has 0 dimensions, deferring...');
    setTimeout(()=>_initModalMap(),200);
    return;
  }
  const proj=_editProj;
  if(!proj) return;
  const matching=proj.id?allWithCoords.filter(p=>projectFilter(p,proj)):allWithCoords;
  const excluded=proj.id?allWithCoords.filter(p=>!projectFilter(p,proj)):[];
  const map=L.map(el,{zoomControl:true,attributionControl:false});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);
  excluded.forEach(p=>{
    L.circleMarker([p.lat,p.lng],{radius:5,color:'#4A5E7A',fillColor:'#4A5E7A',fillOpacity:.4,weight:1}).addTo(map);
  });
  const bounds=[];
  matching.forEach(p=>{
    const ll=[p.lat,p.lng];
    bounds.push(ll);
    L.circleMarker(ll,{radius:5,color:'#1CCEBB',fillColor:'#1CCEBB',fillOpacity:.8,weight:1})
      .bindPopup(`<b>${p.address}</b><br>$${Number(p.listed||0).toLocaleString()}`,{className:'dark-popup'})
      .addTo(map);
  });
  function fitMap(){
    if(bounds.length===1) map.setView(bounds[0],12);
    else if(bounds.length>1) map.fitBounds(bounds,{padding:[20,20]});
    else{const all=allWithCoords.map(p=>[p.lat,p.lng]);map.fitBounds(all,{padding:[20,20]});}
  }
  fitMap();
  window._projModalMap=map;
  // Safety: invalidateSize after CSS animation fully settles (.2s ease on .modal)
  setTimeout(()=>{map.invalidateSize();fitMap();},300);
}

function _projAddCity(){
  const inp=document.getElementById('pf-city-in');
  if(!inp) return;
  const val=inp.value.replace(/,/g,'').trim();
  if(!val) return;
  if(!_editProj.cities) _editProj.cities=[];
  if(!_editProj.cities.map(x=>x.toLowerCase()).includes(val.toLowerCase())){
    _editProj.cities.push(val);
    const tags=document.getElementById('pf-city-tags');
    if(tags){
      const span=document.createElement('span');
      span.className='ptag';
      span.innerHTML=`${val}<button onclick="_projRemoveCity('${val.replace(/'/g,"\\'")}')">✕</button>`;
      tags.insertBefore(span,document.getElementById('pf-city-in'));
    }
  }
  inp.value='';
  inp.focus();
}

function _projRemoveCity(city){
  if(!_editProj) return;
  _editProj.cities=(_editProj.cities||[]).filter(c=>c!==city);
  _buildProjModal();
  _initModalMap(); // modal already visible, safe to create map immediately
  setTimeout(()=>{const i=document.getElementById('pf-city-in');if(i)i.focus();},0);
}

function _projToggleType(t){
  if(!_editProj) return;
  if(!_editProj.prop_types) _editProj.prop_types=[];
  const idx=_editProj.prop_types.indexOf(t);
  if(idx>=0) _editProj.prop_types.splice(idx,1);
  else       _editProj.prop_types.push(t);
  // Toggle the button visually without full rebuild
  const btns=document.querySelectorAll('#pm-body .ptyp');
  btns.forEach(b=>{if(b.textContent===t)b.classList.toggle('on');});
}

async function saveProject(){
  if(!_editProj) return;
  const name=(document.getElementById('pf-name')?.value||'').trim();
  if(!name){alert('Please enter a project name.');return;}
  const downRaw =document.getElementById('pf-down')?.value;
  const rateRaw =document.getElementById('pf-rate')?.value;
  const holdRaw =document.getElementById('pf-hold')?.value;
  const maxP    =document.getElementById('pf-maxprice')?.value;
  const n=v=>v!==''&&v!=null?+v:null;
  const record={
    user_id:currentUser.id, name,
    cities:_editProj.cities||[],
    prop_types:_editProj.prop_types||[],
    min_beds: n(document.getElementById('pf-minbeds')?.value),
    max_beds: n(document.getElementById('pf-maxbeds')?.value),
    min_baths:n(document.getElementById('pf-minbaths')?.value),
    max_baths:n(document.getElementById('pf-maxbaths')?.value),
    max_price:n(maxP),
    down_pct: downRaw?+downRaw/100:null,
    rate:     rateRaw?+rateRaw/100:null,
    hold_yrs: holdRaw?+holdRaw:null
  };
  let saved;
  if(_editProj.id){
    const{data,error}=await sb.from('projects').update(record).eq('id',_editProj.id).select().single();
    if(error){console.error('saveProject:',error);return;}
    saved=data;
    const idx=projects.findIndex(x=>x.id===_editProj.id);
    if(idx>=0) projects[idx]=saved;
    if(activeProject&&activeProject.id===saved.id) setProject(saved);
  } else {
    const{data,error}=await sb.from('projects').insert(record).select().single();
    if(error){console.error('saveProject:',error);return;}
    saved=data;
    projects.push(saved);
  }
  document.getElementById('pov').classList.remove('open');
  _editProj=null;
  renderProjectCards();
}

async function deleteProject(id){
  if(!confirm('Delete this project? This cannot be undone.')) return;
  const{error}=await sb.from('projects').delete().eq('id',id);
  if(error){console.error('deleteProject:',error);return;}
  projects=projects.filter(x=>x.id!==id);
  if(activeProject&&activeProject.id===id) setProject(null);
  else renderProjectCards();
  document.getElementById('pov').classList.remove('open');
  _editProj=null;
}

