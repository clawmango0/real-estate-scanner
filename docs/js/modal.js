function _invType(){return activeProject?.investment_type||'buyhold';}

function buildMod(id){
  const p=props.find(x=>x.id===id); if(!p) return;
  const cond=mCond[id]||p.condition||'good';
  const impr=mImpr[id]||p.improvement||'asis';
  // Seed tax state from AGI on first open
  if(!mTax[id]){const fs=GP.filingStatus||'single';const r=agiToRates(GP.agi,fs);mTax[id]={agi:GP.agi,filing:fs,marg:r.marg,ltcg:r.ltcg,recap:GP.recapRate,participation:GP.participation||'active',costSegPct:GP.costSegPct??0.20,sec179:GP.sec179||0};}
  const taxP={filing:(mTax[id].filing||GP.filingStatus||'single'),marginal:mTax[id].marg,ltcg:mTax[id].ltcg,recap:mTax[id].recap,agi:mTax[id].agi,participation:mTax[id].participation||'active'};
  const _autoRates=agiToRates(taxP.agi,taxP.filing);
  const rent=mRent[id]??p.monthlyRent;
  const ofPrc=p._tiers?Math.min(p.listed,p._tiers.consider):p.listed;
  const cocList=rent?cocCalc(p.listed,rent):null;
  const tiers=getTiers(rent);
  const cocStr=tiers&&rent?cocCalc(tiers.strong,rent):null;
  const cocCon=tiers&&rent?cocCalc(tiers.consider,rent):null;
  const tc=classify(p.listed,tiers);
  const h=p._hood;
  const nbs=p._nbScore;
  const zipAppr=h?Number(h.appreci5??h.appreci3??h.appreci1??null):null;
  const apprUsed=zipAppr!=null&&!isNaN(zipAppr)?zipAppr:GP.appreci;
  // Apply cost seg / sec179 from modal tax state to GP for this calc
  GP.costSegPct=mTax[id].costSegPct||0;
  GP.sec179=mTax[id].sec179||0;
  GP.participation=mTax[id].participation||'active';
  const exits=EXIT_YRS.map(yr=>rent?exitAt(ofPrc,rent,cond,impr,yr,taxP,apprUsed):null);
  // 5-year Schedule E calculations
  const yrs=[];
  if(rent){let carry=0;for(let yr=1;yr<=5;yr++){const se=schedE(ofPrc,rent,cond,impr,yr,taxP,carry);carry=se.passCarry;yrs.push(se);}}
  const y1=yrs[0]||null,y2=yrs[1]||null;

  let badges=sourceBadge(p.source);
  if(p.isNew)badges+=`<span class="bdg bn">🆕 New</span>`;
  if(p.priceDrop)badges+=`<span class="bdg bd">📉 −${M(p.dropAmt||0)}</span>`;

  document.getElementById('m-adr').textContent=`${p.address}, ${p.city}`;
  document.getElementById('m-bdg').innerHTML=badges;

  const condBtns=Object.entries(COND).map(([k,v])=>`<button class="${cond===k?'sel':''}" onclick="setMC('${id}','${k}')">${v.label}</button>`).join('');
  const imprBtns=Object.entries(IMPR).map(([k,v])=>`<button class="${impr===k?'sel':''}" onclick="setMI('${id}','${k}')">${v.label}</button>`).join('');

  const editBtn=document.getElementById('m-edit-btn');
  if(editBtn)editBtn.style.background=mEdit[id]?'var(--amber)':'var(--adim)';

  if(mEdit[id]){
    const _is=`style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem"`;
    const _ls=`style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px"`;
    document.getElementById('m-body').innerHTML=`
    <div class="sec">✏️ Edit Property Data</div>
    <div style="margin-bottom:.8rem">
      <label ${_ls}>Listing URL — paste to re-scrape property details</label>
      <div style="display:flex;gap:.4rem">
        <input id="ep-url" value="${esc(p.listingUrl||'')}" placeholder="https://www.zillow.com/homedetails/..." ${_is} style="flex:1;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem">
        <button onclick="rescrapeEdit('${id}')" id="ep-scrape-btn" style="padding:.35rem .7rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.75rem;white-space:nowrap">🔄 Scrape</button>
        <button onclick="searchByAddrEdit('${id}')" style="padding:.35rem .7rem;background:var(--adim);border:1px solid var(--accent);color:var(--accent);border-radius:6px;cursor:pointer;font-size:.75rem;white-space:nowrap">🔍 Search</button>
      </div>
      <div id="ep-scrape-status" style="font-size:.68rem;color:var(--text2);margin-top:.3rem;display:none"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:1rem">
      <div><label ${_ls}>Address</label><input id="ep-addr" value="${esc(p.address||'')}" ${_is}></div>
      <div><label ${_ls}>City</label><input id="ep-city" value="${esc(p.rawCity||'')}" ${_is}></div>
      <div><label ${_ls}>ZIP</label><input id="ep-zip" value="${esc(p.zip||'')}" ${_is} inputmode="numeric" pattern="[0-9]*" maxlength="5"></div>
      <div><label ${_ls}>Listed Price ($)</label><input id="ep-price" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.listed||''}" ${_is} class="no-spin"></div>
      <div><label ${_ls}>Beds</label><input id="ep-beds" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.beds||''}" ${_is} class="no-spin"></div>
      <div><label ${_ls}>Baths</label><input id="ep-baths" type="text" inputmode="decimal" pattern="[0-9.]*" value="${p.baths||''}" ${_is} class="no-spin"></div>
      <div><label ${_ls}>Sqft</label><input id="ep-sqft" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.sqft||''}" ${_is} class="no-spin"></div>
      <div><label ${_ls}>Lot Size (sqft)</label><input id="ep-lot" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.lotSize||''}" ${_is} class="no-spin"></div>
      <div><label ${_ls}>Property Type</label><select id="ep-type" ${_is}>${['SFR','DUPLEX','TRIPLEX','QUAD','CONDO','LOT'].map(t=>`<option value="${t}"${p.type===t?' selected':''}>${t}</option>`).join('')}</select></div>
      <div><label ${_ls}>Rent Estimate ($/mo)</label><input id="ep-rent-est" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.rentRange?.mid||''}" ${_is} class="no-spin"></div>
      <div><label ${_ls}>Monthly Rent (confirmed)</label><input id="ep-rent" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.monthlyRent||''}" ${_is} class="no-spin"></div>
    </div>
    <div style="display:flex;gap:.5rem">
      <button onclick="savePropertyEdit('${id}')" style="flex:1;padding:.55rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.85rem;font-weight:600">💾 Save Changes</button>
      <button onclick="mEdit['${id}']=false;buildMod('${id}')" style="padding:.55rem 1rem;background:var(--adim);border:1px solid var(--border2);color:var(--text2);border-radius:6px;cursor:pointer;font-size:.85rem">Cancel</button>
    </div>`;
    return;
  }

  const _it=_invType();
  if(_it!=='buyhold'){
    _buildTypedModal(id,p,cond,impr,_it,taxP);
    return;
  }

  document.getElementById('m-body').innerHTML=`
    <div class="sec">🏠 Property Details</div>
    <div class="k3" style="grid-template-columns:repeat(auto-fit,minmax(90px,1fr));margin-bottom:.75rem">
      ${p.beds?`<div class="kpi"><div class="kl">Beds</div><div class="kv" style="font-size:1.1rem">${p.beds}</div></div>`:''}
      ${p.baths?`<div class="kpi"><div class="kl">Baths</div><div class="kv" style="font-size:1.1rem">${p.baths}</div></div>`:''}
      ${p.sqft?`<div class="kpi"><div class="kl">Living Area</div><div class="kv" style="font-size:1.1rem">${p.sqft.toLocaleString()}<span style="font-size:.6rem;color:var(--text2)"> sqft</span></div></div>`:''}
      ${p.lotSize?`<div class="kpi"><div class="kl">Lot Size</div><div class="kv" style="font-size:1.1rem">${p.lotSize>=43560?(p.lotSize/43560).toFixed(2)+'<span style="font-size:.6rem;color:var(--text2)"> ac</span>':p.lotSize.toLocaleString()+'<span style="font-size:.6rem;color:var(--text2)"> sqft</span>'}</div></div>`:''}
      ${p.listed&&p.sqft?`<div class="kpi"><div class="kl">Price/sqft</div><div class="kv" style="font-size:1.1rem">${M(Math.round(p.listed/p.sqft))}</div></div>`:''}
      ${p.listed?`<div class="kpi"><div class="kl">Listed</div><div class="kv" style="font-size:1.1rem">${M(p.listed)}</div></div>`:''}
    </div>
    ${p.listingUrl?`<div style="margin-bottom:.75rem"><a href="${p.listingUrl}" target="_blank" rel="noopener" style="font-size:.72rem;color:var(--amber);text-decoration:none">🔗 View Property ↗</a></div>`:''}
    ${h?`<div class="sec">📍 Neighborhood — ${h.area} (${h.zip||''})</div>
    <div class="nbhd-grid">
      <div class="nbhd-card"><div class="nl">Schools</div><div class="nv" style="color:${h.schools>=7?'var(--green)':h.schools>=5?'var(--amber)':'var(--red)'}">${h.schools}/10</div><div class="nbhd-bar"><div class="nbhd-fill" style="width:${h.schools*10}%;background:${h.schools>=7?'var(--green)':h.schools>=5?'var(--amber)':'var(--red)'}"></div></div><div class="ns">GreatSchools</div></div>
      <div class="nbhd-card"><div class="nl">Crime Safety</div><div class="nv" style="color:${h.crime>=7?'var(--green)':h.crime>=5?'var(--amber)':'var(--red)'}">${h.crime}/10</div><div class="nbhd-bar"><div class="nbhd-fill" style="width:${h.crime*10}%;background:${h.crime>=7?'var(--green)':h.crime>=5?'var(--amber)':'var(--red)'}"></div></div><div class="ns">10 = safest</div></div>
      <div class="nbhd-card"><div class="nl">Walk Score</div><div class="nv" style="color:${h.walkScore>=50?'var(--green)':h.walkScore>=35?'var(--amber)':'var(--red)'}">${h.walkScore}</div><div class="nbhd-bar"><div class="nbhd-fill" style="width:${h.walkScore}%;background:${h.walkScore>=50?'var(--green)':h.walkScore>=35?'var(--amber)':'var(--red)'}"></div></div><div class="ns">Walkability</div></div>
      <div class="nbhd-card"><div class="nl">Rent Growth</div><div class="nv" style="color:${h.rentGrowth>=4?'var(--green)':h.rentGrowth>=3?'var(--amber)':'var(--red)'}">${h.rentGrowth}%/yr</div><div class="nbhd-bar"><div class="nbhd-fill" style="width:${Math.min(h.rentGrowth/5*100,100)}%;background:${h.rentGrowth>=4?'var(--green)':h.rentGrowth>=3?'var(--amber)':'var(--red)'}"></div></div><div class="ns">YoY trend</div></div>
      ${h.appreci5!=null||h.appreci3!=null||h.appreci1!=null?(()=>{const a5=h.appreci5!=null?Number(h.appreci5):null;const a3=h.appreci3!=null?Number(h.appreci3):null;const a1=h.appreci1!=null?Number(h.appreci1):null;const best=a5??a3??a1??0;const pct=(best*100).toFixed(1);const clr=best>=0.04?'var(--green)':best>=0.02?'var(--amber)':'var(--red)';const barW=Math.min(Math.max((best+0.05)/0.15*100,0),100);const zhviFmt=h.zhvi?'$'+Math.round(Number(h.zhvi)/1000)+'k typical':'';const sub=[a1!=null?`1yr: ${(a1*100).toFixed(1)}%`:null,a3!=null?`3yr: ${(a3*100).toFixed(1)}%`:null,a5!=null?`5yr: ${(a5*100).toFixed(1)}%`:null].filter(Boolean).join(' · ');return`<div class="nbhd-card"><div class="nl">Appreciation</div><div class="nv" style="color:${clr}">${pct}%/yr</div><div class="nbhd-bar"><div class="nbhd-fill" style="width:${barW}%;background:${clr}"></div></div><div class="ns">${sub}</div>${zhviFmt?`<div class="ns" style="margin-top:2px">${zhviFmt}</div>`:''}</div>`;})():''}
    </div>
    <div class="infobox" style="display:flex;align-items:center;gap:1rem"><span class="nbhd ${nbLabel(nbs).cls}" style="font-size:.82rem;padding:.3rem .7rem">${nbs} / 100</span><span style="font-size:.73rem;color:var(--text2)">Composite — Schools 35% · Crime 35% · Rent Growth 30%</span></div>`
    :`<div class="sec">📍 Neighborhood</div><div class="infobox" style="color:var(--text2)">No ZIP data available.</div>`}

    <div class="sec">💰 Est. Monthly Rent</div>
    ${p.rentRange?`<div class="infobox" style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;flex-wrap:wrap">
      <span style="color:var(--amber);font-size:.72rem">${p.rentRange.source==='local'?'📊 Rent Est:':'💡 Rent Estimate:'}</span>
      <strong style="color:var(--amber)">${M(p.rentRange.low)} – ${M(p.rentRange.high)}/mo</strong>
      <button onclick="mRent['${id}']=${Math.round((p.rentRange.low+p.rentRange.high)/2)};autoRentBlur('${id}')" style="background:var(--adim);border:1px solid var(--amber);color:var(--amber);border-radius:5px;padding:.2rem .5rem;font-size:.65rem;cursor:pointer;margin-left:auto">Use midpoint</button>
    </div>`:''}
    <div class="rent-input-row">
      <label>Set estimated rent to unlock offer analysis</label>
      <input type="text" id="rent-inp-${id}" value="${rent||''}" placeholder="e.g. 1800" inputmode="numeric" pattern="[0-9]*" class="no-spin" oninput="mRent['${id}']=Math.round(+this.value.replace(/[^0-9]/g,''))||0" onblur="autoRentBlur('${id}')">
      <button class="save-btn" onclick="saveRent('${id}')">Save</button>
      <button class="est-btn" id="ai-rent-${id}" onclick="doEstimateRent('${id}')">📊 Estimate Rent</button>
    </div>
    <div id="ai-reason-${id}" style="display:none;font-size:.68rem;color:var(--text2);margin-top:.3rem;padding:.3rem .5rem;background:var(--card);border-radius:5px;border:1px solid var(--border)"></div>

    ${(()=>{
      const sc=p.rentRange?{lo:p.rentRange.low,mid:Math.round((p.rentRange.low+p.rentRange.high)/2),hi:p.rentRange.high}:null;
      const useRent=rent||(sc?sc.mid:0);
      if(!useRent)return`<div class="infobox" style="color:var(--text2)">Enter rent above to calculate offer range.</div>`;
      if(sc){
        const tLo=getTiers(sc.lo),tMid=getTiers(sc.mid),tHi=getTiers(sc.hi);
        const tcMid=classify(p.listed,tMid);
        const rows=[['✅ Strong Buy','ts','strong'],['⚠️ Consider','tc','consider'],['⚡ Stretch','tx','stretch'],['🚫 Walk Away','tw2',null]];
        return`<div class="sec">📊 Offer Range — Rent Scenarios</div>
    <table class="ot" style="font-size:.72rem">
      <thead><tr><th style="text-align:left">Tier</th><th style="text-align:right">Conservative<br><span style="color:var(--text2);font-weight:400">${M(sc.lo)}/mo</span></th><th style="text-align:right">Midpoint<br><span style="color:var(--amber);font-weight:400">${M(sc.mid)}/mo</span></th><th style="text-align:right">Optimistic<br><span style="color:var(--green);font-weight:400">${M(sc.hi)}/mo</span></th></tr></thead>
      <tbody>
        <tr><td class="tl ts">✅ Strong Buy</td><td class="ts" style="text-align:right">${M(tLo.strong)}</td><td class="ts" style="text-align:right;font-weight:600">${M(tMid.strong)}</td><td class="ts" style="text-align:right">${M(tHi.strong)}</td></tr>
        <tr><td class="tl tc">⚠️ Consider</td><td class="tc" style="text-align:right">${M(tLo.consider)}</td><td class="tc" style="text-align:right;font-weight:600">${M(tMid.consider)}</td><td class="tc" style="text-align:right">${M(tHi.consider)}</td></tr>
        <tr><td class="tl tx">⚡ Stretch</td><td class="tx" style="text-align:right">${M(tLo.stretch)}</td><td class="tx" style="text-align:right;font-weight:600">${M(tMid.stretch)}</td><td class="tx" style="text-align:right">${M(tHi.stretch)}</td></tr>
        <tr><td class="tl tw2">🚫 Walk Away</td><td colspan="3" class="tw2" style="text-align:center;font-size:.68rem">&gt;${M(tMid.stretch)}</td></tr>
      </tbody>
    </table>
    <div class="infobox">Listed ${M(p.listed)} at midpoint rent → <strong class="${tcMid.cls}">${tcMid.label}</strong></div>
    <div class="sec" style="margin-top:.75rem">💵 At List Price ${M(p.listed)}</div>
    <div class="k3" style="grid-template-columns:repeat(3,1fr)">
      ${[['Conservative',sc.lo,'var(--text2)'],['Midpoint',sc.mid,'var(--amber)'],['Optimistic',sc.hi,'var(--green)']].map(([lbl,r,col])=>{const c=cocCalc(p.listed,r);return`<div class="kpi"><div class="kl" style="color:${col}">${lbl}<br><span style="font-size:.65rem">${M(r)}/mo</span></div><div class="kv" style="color:${c&&c.coc>=GP.cocMin?'var(--green)':'var(--red)'}">${c?PCT(c.coc):'—'}</div><div class="ks">${c?MS(c.cfMo)+'/mo':'—'}</div></div>`;}).join('')}
    </div>`;
      }
      return`<div class="sec">📊 Offer Range — ${M(useRent)}/mo rent</div>
    <table class="ot">
      <thead><tr><th>Tier</th><th>Max Offer</th><th>CoC</th><th>CF/mo</th><th>Cash In</th></tr></thead>
      <tbody>
        <tr><td class="tl ts">✅ Strong Buy</td><td class="ts">${M(tiers.strong)}</td><td class="ts">${cocStr?PCT(cocStr.coc):'—'}</td><td class="ts">${cocStr?MS(cocStr.cfMo)+'/mo':'—'}</td><td>${cocStr?M(cocStr.cashIn):'—'}</td></tr>
        <tr><td class="tl tc">⚠️ Consider</td><td class="tc">${M(tiers.consider)}</td><td class="tc">${cocCon?PCT(cocCon.coc):'—'}</td><td class="tc">${cocCon?MS(cocCon.cfMo)+'/mo':'—'}</td><td>${cocCon?M(cocCon.cashIn):'—'}</td></tr>
        <tr><td class="tl tx">⚡ Stretch</td><td class="tx">${M(tiers.stretch)}</td><td colspan="3" style="color:var(--text2)">~6–7% CoC</td></tr>
        <tr><td class="tl tw2">🚫 Walk Away</td><td class="tw2">&gt;${M(tiers.stretch)}</td><td colspan="3" class="tw2">&lt;6% CoC</td></tr>
      </tbody>
    </table>
    <div class="infobox">Listed ${M(p.listed)} → <strong class="${tc.cls}">${tc.label}</strong>${tiers&&p.listed>tiers.strong?` · Offer ${M(tiers.strong)} for 12% CoC (${Math.round((1-tiers.strong/p.listed)*100)}% below list)`:' · Within Strong Buy zone'}</div>`;
    })()}

    ${rent?`<div class="sec">💵 At List Price ${M(p.listed)}</div>
    <div class="k3">
      <div class="kpi"><div class="kl">Monthly CF</div><div class="kv" style="color:${cocList&&cocList.cfMo>=0?'var(--green)':'var(--red)'}">${cocList?MS(cocList.cfMo)+'/mo':'N/A'}</div><div class="ks">${cocList?MS(cocList.cfAnn)+'/yr':''}</div></div>
      <div class="kpi"><div class="kl">CoC Return</div><div class="kv" style="color:${cocList&&cocList.coc>=GP.cocMin?'var(--green)':'var(--red)'}">${cocList?PCT(cocList.coc):'N/A'}</div><div class="ks">target ≥ 8%</div></div>
      <div class="kpi"><div class="kl">Cash Required</div><div class="kv">${cocList?M(cocList.cashIn):'N/A'}</div><div class="ks">20% down + 3% close</div></div>
    </div>`:''}

    <div class="sec">🏚️ Condition</div><div class="g4">${condBtns}</div>
    <div class="sec">🔨 Improvement Plan</div><div class="g4 g4i">${imprBtns}</div>

    <div class="sec">🧾 Tax Parameters</div>
    <div class="txs">
      <div class="tr2">
        <label>Filing Status</label>
        <select onchange="uTax('${id}','filing',this.value)" style="background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.25rem .4rem;font-size:.72rem;cursor:pointer">
          <option value="single" ${taxP.filing==='single'?'selected':''}>Single</option>
          <option value="mfj"    ${taxP.filing==='mfj'   ?'selected':''}>Married Filing Jointly</option>
          <option value="hoh"    ${taxP.filing==='hoh'   ?'selected':''}>Head of Household</option>
          <option value="mfs"    ${taxP.filing==='mfs'   ?'selected':''}>Married Filing Separately</option>
        </select>
      </div>
      <div class="tr2"><label>AGI</label><input type="text" value="${taxP.agi}" inputmode="numeric" pattern="[0-9]*" oninput="uTaxAgi('${id}',Math.min(10000000,Math.round(+this.value.replace(/[^0-9]/g,''))||0))" onblur="buildMod('${id}')" class="no-spin" style="width:120px"><span style="font-size:.65rem;color:var(--text3);flex-shrink:0">→ sets rates below</span></div>
      <div class="tr2"><label>Income Tax Rate</label><input type="range" min="10" max="37" step="1" value="${Math.round(taxP.marginal*100)}" id="tax-marg-${id}" oninput="uTax('${id}','marg',+this.value/100);document.getElementById('tv-mg-${id}').textContent=this.value+'%'"><span class="tv2" id="tv-mg-${id}">${Math.round(taxP.marginal*100)}%</span></div>
      <div class="tr2">
        <label>LTCG Rate <span style="font-size:.6rem;color:${Math.round(taxP.ltcg*100)===Math.round(_autoRates.ltcg*100)?'var(--amber)':'var(--text3)'};">${Math.round(taxP.ltcg*100)===Math.round(_autoRates.ltcg*100)?'(auto)':'(manual)'}</span></label>
        <input type="range" min="0" max="20" step="5" value="${Math.round(taxP.ltcg*100)}" id="tax-ltcg-${id}" oninput="uTax('${id}','ltcg',+this.value/100);document.getElementById('tv-lg-${id}').textContent=this.value+'%'">
        <span class="tv2" id="tv-lg-${id}">${Math.round(taxP.ltcg*100)}%</span>
      </div>
      <div class="tr2"><label>§1250 Recapture</label><input type="range" min="15" max="25" step="5" value="${Math.round(taxP.recap*100)}" oninput="uTax('${id}','recap',+this.value/100);document.getElementById('tv-rc-${id}').textContent=this.value+'%'"><span class="tv2" id="tv-rc-${id}">${Math.round(taxP.recap*100)}%</span></div>
      <div class="tr2">
        <label>Participation</label>
        <select onchange="uTax('${id}','participation',this.value)" style="background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.25rem .4rem;font-size:.72rem;cursor:pointer">
          <option value="active" ${(mTax[id].participation||'active')==='active'?'selected':''}>Active ($25k limit)</option>
          <option value="material" ${mTax[id].participation==='material'?'selected':''}>Material (no limit)</option>
          <option value="repro" ${mTax[id].participation==='repro'?'selected':''}>RE Professional (no limit)</option>
        </select>
      </div>
      <div class="tr2"><label>Cost Segregation</label><input type="range" min="0" max="50" step="5" value="${Math.round((mTax[id].costSegPct||0)*100)}" oninput="uTax('${id}','costSegPct',+this.value/100);document.getElementById('tv-cs-${id}').textContent=this.value+'%'"><span class="tv2" id="tv-cs-${id}">${Math.round((mTax[id].costSegPct||0)*100)}%</span></div>
      <div class="tr2"><label>§179 Expense</label><input type="text" value="${mTax[id].sec179||0}" inputmode="numeric" pattern="[0-9]*" class="no-spin" style="width:100px" oninput="uTax('${id}','sec179',Math.min(2500000,Math.round(+this.value.replace(/[^0-9]/g,''))||0))" onblur="buildMod('${id}')"><span style="font-size:.6rem;color:var(--text3)">max $2.5M</span></div>
      <div style="font-size:.6rem;color:var(--text3);margin-top:.25rem;padding-left:.1rem">2025 brackets · 100% bonus dep (OBBBA) · std deduction applied</div>
    </div>

    ${_taxYearsHtml(id,ofPrc,rent,cond,impr,taxP)}`:''}

    ${exits.some(Boolean)?`<div class="sec">📈 Exit Analysis — 5 / 10 / 15 Year</div>
    <table class="ext">
      <thead><tr><th class="rh">Line Item</th><th class="yrh y5">5-Year</th><th class="yrh y10">10-Year</th><th class="yrh y15">15-Year</th></tr></thead>
      <tbody>
        <tr><td>Exit Value (${(apprUsed*100).toFixed(1)}%/yr${zipAppr!=null?' ZHVI':''})</td>${exits.map((e,i)=>e?`<td class="c y${EXIT_YRS[i]}" style="color:${apprUsed>=0?'var(--green)':'var(--red)'}">${M(e.exitVal)}</td>`:'<td class="c">—</td>').join('')}</tr>
        <tr><td>Less: Selling Costs + Loan</td>${exits.map((e,i)=>e?`<td class="c" style="color:var(--red)">−${M(e.sellCosts+e.loanBal)}</td>`:'<td class="c">—</td>').join('')}</tr>
        <tr class="sub"><td><strong>Net Proceeds</strong></td>${exits.map((e,i)=>e?`<td class="c y${EXIT_YRS[i]}"><strong>${MS(e.netProc)}</strong></td>`:'<td class="c">—</td>').join('')}</tr>
        <tr><td>+ Cumul. CF + Tax Savings</td>${exits.map((e,i)=>e?`<td class="c" style="color:var(--teal)">${MS(e.cumCF+e.cumTaxSav)}</td>`:'<td class="c">—</td>').join('')}</tr>
        <tr><td>− Cash Invested</td>${exits.map((e,i)=>e?`<td class="c" style="color:var(--red)">−${M(e.cashIn)}</td>`:'<td class="c">—</td>').join('')}</tr>
        <tr><td>− Exit Taxes (recap + LTCG)</td>${exits.map((e,i)=>e?`<td class="c" style="color:var(--red)">−${M(e.exitTax)}</td>`:'<td class="c">—</td>').join('')}</tr>
        <tr class="${exits.every(e=>!e||e.totalProfit<0)?'totr':'totg'}">
          <td><strong>After-Tax Profit</strong></td>
          ${exits.map((e,i)=>e?`<td class="c y${EXIT_YRS[i]}" style="color:${e.totalProfit>=0?'var(--green)':'var(--red)'}"><div style="font-size:.88rem;font-weight:700">${MS(e.totalProfit)}</div><div style="font-size:.63rem;margin-top:2px">${PCT(e.totalROI)} total · ${PCT(e.annROI)}/yr IRR</div></td>`:'<td class="c">—</td>').join('')}
        </tr>
      </tbody>
    </table>`:''}

    <div class="sec">Curate</div>
    <div class="curbar">
      <button class="${p.curated==='fav'?'af':''}" onclick="curate('${id}','fav')">⭐ ${p.curated==='fav'?'Favorited':'Favorite'}</button>
      <button class="${p.curated==='ni'?'ani':''}" onclick="curate('${id}','ni')">👎 ${p.curated==='ni'?'Marked':'Not Interested'}</button>
      <button class="${p.curated==='blk'?'abl':''}" onclick="curate('${id}','blk')">🚫 Block Forever</button>
    </div>
    ${p.listingUrl?`<a class="el" href="${p.listingUrl}" target="_blank">↗ View Listing</a>`:''}
  `;
}

// ── 5-Year Tax Savings Table (shared across modals) ──────────────────────────
function _taxYearsHtml(id,price,rent,cond,impr,taxP){
  if(!rent||!price)return '';
  const yrs=[];let carry=0;let cumSav=0;
  for(let yr=1;yr<=5;yr++){const se=schedE(price,rent,cond,impr,yr,taxP,carry);carry=se.passCarry;cumSav+=se.taxSav;yrs.push({...se,cumSav});}
  const anyBenefit=yrs.some(y=>y.taxSav>0);
  return `
  <div class="sec">📋 5-Year Federal Tax Impact</div>
  <table class="ext" style="font-size:.72rem">
    <thead><tr><th class="rh" style="width:auto"></th>${yrs.map((_,i)=>`<th class="yrh" style="min-width:70px">Yr ${i+1}</th>`).join('')}</tr></thead>
    <tbody>
      <tr><td>Rental Income</td>${yrs.map(y=>`<td class="c" style="color:var(--green)">${M(y.gr)}</td>`).join('')}</tr>
      <tr><td>− Expenses</td>${yrs.map(y=>`<td class="c" style="color:var(--red)">−${M(y.mortInt+y.pt+y.ins+y.mgmt+y.rep+y.oth)}</td>`).join('')}</tr>
      <tr><td>− Depreciation</td>${yrs.map(y=>`<td class="c" style="color:var(--purple)">−${M(y.annDepr)}</td>`).join('')}</tr>
      ${yrs[0].bonusDep>0?`<tr><td style="font-size:.62rem;color:var(--text3);padding-left:.5rem">↳ Bonus Dep (${Math.round((mTax[id]?.costSegPct||GP.costSegPct)*100)}%)</td>${yrs.map(y=>`<td class="c" style="font-size:.62rem;color:var(--purple)">${y.bonusDep>0?'−'+M(y.bonusDep):'—'}</td>`).join('')}</tr>`:''}
      <tr style="border-top:2px solid var(--border2)"><td style="font-weight:600">Net Taxable</td>${yrs.map(y=>`<td class="c" style="color:${y.netInc>=0?'var(--red)':'var(--green)'}"><strong>${MS(y.netInc)}</strong></td>`).join('')}</tr>
      ${yrs.some(y=>y.passCarry>0)?`<tr><td style="font-size:.62rem;color:var(--amber)">Suspended Loss</td>${yrs.map(y=>`<td class="c" style="font-size:.62rem;color:var(--amber)">${y.passCarry>0?M(y.passCarry):'—'}</td>`).join('')}</tr>`:''}
      <tr class="${anyBenefit?'totg':'totr'}"><td style="font-weight:700">Tax Savings</td>${yrs.map(y=>`<td class="c" style="color:${y.taxSav>=0?'var(--green)':'var(--red)'};font-weight:700">${MS(y.taxSav)}</td>`).join('')}</tr>
      <tr><td style="font-weight:600;color:var(--teal)">Cumulative</td>${yrs.map(y=>`<td class="c" style="color:var(--teal);font-weight:600">${MS(y.cumSav)}</td>`).join('')}</tr>
    </tbody>
  </table>
  ${anyBenefit?`<div class="infobox" style="background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(5,150,105,.05));border:1px solid rgba(16,185,129,.25);margin-top:.5rem">
    <div style="font-weight:600;color:var(--green);font-size:.82rem;margin-bottom:.3rem">💰 5-Year W-2 Tax Savings: ${MS(yrs[4].cumSav)}</div>
    <div style="font-size:.72rem;color:var(--text2);line-height:1.5">
      Year 1: <strong style="color:var(--green)">${MS(yrs[0].taxSav)}</strong> (bonus dep + std depr)<br>
      Years 2–5: <strong style="color:var(--green)">${MS(yrs[4].cumSav-yrs[0].taxSav)}</strong> (std depreciation @ ${Math.round(taxP.marginal*100)}% rate)<br>
      <span style="color:var(--amber)">${(taxP.participation||GP.participation)==='active'?'Active participation: $25k passive loss limit (AGI phaseout $100k–$150k)':((taxP.participation||GP.participation)==='material'?'Material participation: full loss offsets W-2 income':'RE Professional: full loss offsets W-2 income')}</span>
    </div>
  </div>`:''}`;
}

// ── Property details snippet shared across typed modals ───────────────────────
function _propDetailsHtml(p){
  return `<div class="sec">🏠 Property Details</div>
  <div class="k3" style="grid-template-columns:repeat(auto-fit,minmax(90px,1fr));margin-bottom:.75rem">
    ${p.beds?`<div class="kpi"><div class="kl">Beds</div><div class="kv" style="font-size:1.1rem">${p.beds}</div></div>`:''}
    ${p.baths?`<div class="kpi"><div class="kl">Baths</div><div class="kv" style="font-size:1.1rem">${p.baths}</div></div>`:''}
    ${p.sqft?`<div class="kpi"><div class="kl">Living Area</div><div class="kv" style="font-size:1.1rem">${p.sqft.toLocaleString()}<span style="font-size:.6rem;color:var(--text2)"> sqft</span></div></div>`:''}
    ${p.listed?`<div class="kpi"><div class="kl">Listed</div><div class="kv" style="font-size:1.1rem">${M(p.listed)}</div></div>`:''}
    ${p.listed&&p.sqft?`<div class="kpi"><div class="kl">Price/sqft</div><div class="kv" style="font-size:1.1rem">${M(Math.round(p.listed/p.sqft))}</div></div>`:''}
  </div>
  ${p.listingUrl?`<div style="margin-bottom:.75rem"><a href="${p.listingUrl}" target="_blank" rel="noopener" style="font-size:.72rem;color:var(--amber);text-decoration:none">🔗 View Property ↗</a></div>`:''}`;
}

// ── Condition/Improvement buttons shared across typed modals ──────────────────
function _condImprHtml(id,cond,impr){
  const condBtns=Object.entries(COND).map(([k,v])=>`<button class="${cond===k?'sel':''}" onclick="setMC('${id}','${k}')">${v.label}</button>`).join('');
  const imprBtns=Object.entries(IMPR).map(([k,v])=>`<button class="${impr===k?'sel':''}" onclick="setMI('${id}','${k}')">${v.label}</button>`).join('');
  return `<div class="sec">🏚️ Condition</div><div class="g4">${condBtns}</div>
  <div class="sec">🔨 Improvement Plan</div><div class="g4 g4i">${imprBtns}</div>`;
}

// ── Curation buttons shared across typed modals ──────────────────────────────
function _curateHtml(id,p){
  return `<div class="sec">Curate</div>
  <div class="curbar">
    <button class="${p.curated==='fav'?'af':''}" onclick="curate('${id}','fav')">⭐ ${p.curated==='fav'?'Favorited':'Favorite'}</button>
    <button class="${p.curated==='ni'?'ani':''}" onclick="curate('${id}','ni')">👎 ${p.curated==='ni'?'Marked':'Not Interested'}</button>
    <button class="${p.curated==='blk'?'abl':''}" onclick="curate('${id}','blk')">🚫 Block Forever</button>
  </div>
  ${p.listingUrl?`<a class="el" href="${p.listingUrl}" target="_blank">↗ View Listing</a>`:''}`;
}

// ── Typed modal dispatcher ───────────────────────────────────────────────────
function _buildTypedModal(id,p,cond,impr,type,taxP){
  let badges=sourceBadge(p.source);
  if(p.isNew)badges+=`<span class="bdg bn">🆕 New</span>`;
  if(p.priceDrop)badges+=`<span class="bdg bd">📉 −${M(p.dropAmt||0)}</span>`;
  document.getElementById('m-adr').textContent=`${p.address}, ${p.city}`;
  document.getElementById('m-bdg').innerHTML=badges;
  const editBtn=document.getElementById('m-edit-btn');
  if(editBtn)editBtn.style.background=mEdit[id]?'var(--amber)':'var(--adim)';

  const builders={flipper:_modFlip,brrrr:_modBrrrr,str:_modSTR,wholesaler:_modWholesale,commercial:_modCommercial,passive:_modPassive};
  const fn=builders[type];
  if(fn) document.getElementById('m-body').innerHTML=fn(id,p,cond,impr,taxP);
  else document.getElementById('m-body').innerHTML='<div class="infobox">Unknown investment type.</div>';
}

// ── Flipper Modal ────────────────────────────────────────────────────────────
function _modFlip(id,p,cond,impr){
  const f=flipCalc(p.listed,cond,impr);
  return _propDetailsHtml(p)+_condImprHtml(id,cond,impr)+
  (f?`
  <div class="sec">🏗️ Flip Analysis</div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">ARV</div><div class="kv" style="color:var(--green)">${M(f.arv)}</div></div>
    <div class="kpi"><div class="kl">Rehab Cost</div><div class="kv" style="color:var(--red)">${M(f.rehabCost)}</div></div>
    <div class="kpi"><div class="kl">MAO (70%)</div><div class="kv" style="color:var(--amber)">${M(f.mao)}</div></div>
  </div>
  <div class="sec">💰 Flip P&L</div>
  <div class="tacc"><button class="ttog" onclick="togAcc('flip-${id}')"><span>Net Profit: <strong style="color:${f.netProfit>=0?'var(--green)':'var(--red)'}">${MS(f.netProfit)}</strong> · ROI: <strong style="color:${f.roi>=0.15?'var(--green)':f.roi>=0?'var(--amber)':'var(--red)'}">${PCT(f.roi)}</strong></span><span style="font-size:.62rem">▼</span></button>
  <div class="tbody2" id="flip-${id}">
    <div class="tl2"><span class="tl2-l">Purchase Price</span><span class="tl2-v">${M(p.listed)}</span></div>
    <div class="tl2"><span class="tl2-l">+ Rehab Cost</span><span class="tl2-v" style="color:var(--red)">${M(f.rehabCost)}</span></div>
    <div class="tl2"><span class="tl2-l">+ Closing Costs</span><span class="tl2-v" style="color:var(--red)">${M(f.closingCosts)}</span></div>
    <div class="tl2"><span class="tl2-l">+ Holding (${f.holdMo}mo)</span><span class="tl2-v" style="color:var(--red)">${M(f.holdCosts)}</span></div>
    <div class="tl2"><span class="tl2-l">+ Selling Costs (6%)</span><span class="tl2-v" style="color:var(--red)">${M(f.sellCosts)}</span></div>
    <div class="tl2" style="border-top:2px solid var(--border2);margin-top:.3rem;padding-top:.4rem"><span class="tl2-l" style="font-weight:600">Total Cost</span><span class="tl2-v" style="font-weight:600">${M(f.totalCost)}</span></div>
    <div class="tl2"><span class="tl2-l" style="font-weight:600">ARV (Sale Price)</span><span class="tl2-v" style="color:var(--green);font-weight:600">${M(f.arv)}</span></div>
    <div class="tl2" style="border-top:2px solid var(--border2);margin-top:.3rem;padding-top:.4rem"><span class="tl2-l" style="font-weight:700">Net Profit</span><span class="tl2-v" style="color:${f.netProfit>=0?'var(--green)':'var(--red)'};font-size:.92rem;font-weight:700">${MS(f.netProfit)}</span></div>
  </div></div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr);margin-top:.5rem">
    <div class="kpi"><div class="kl">Cash Required</div><div class="kv">${M(f.cashIn)}</div></div>
    <div class="kpi"><div class="kl">ROI</div><div class="kv" style="color:${f.roi>=0.15?'var(--green)':'var(--red)'}">${PCT(f.roi)}</div></div>
    <div class="kpi"><div class="kl">Listed vs MAO</div><div class="kv" style="color:${p.listed<=f.mao?'var(--green)':'var(--red)'}">${p.listed<=f.mao?'✅ Below MAO':'⚠️ Above MAO'}</div><div class="ks">${M(p.listed)} vs ${M(f.mao)}</div></div>
  </div>`:'<div class="infobox" style="color:var(--text2)">Set condition & improvement plan above to calculate flip metrics.</div>')+
  _curateHtml(id,p);
}

// ── BRRRR Modal ──────────────────────────────────────────────────────────────
function _modBrrrr(id,p,cond,impr,taxP){
  const rent=mRent[id]??p.monthlyRent;
  const b=brrrrCalc(p.listed,rent,cond,impr);
  const bh=rent?cocCalc(p.listed,rent):null;
  return _propDetailsHtml(p)+
  `<div class="sec">💰 Est. Monthly Rent</div>
  ${p.rentRange?`<div class="infobox" style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;flex-wrap:wrap">
    <span style="color:var(--amber);font-size:.72rem">${p.rentRange.source==='local'?'📊 Rent Est:':'💡 Rent Estimate:'}</span>
    <strong style="color:var(--amber)">${M(p.rentRange.low)} – ${M(p.rentRange.high)}/mo</strong>
    <button onclick="mRent['${id}']=${Math.round((p.rentRange.low+p.rentRange.high)/2)};autoRentBlur('${id}')" style="background:var(--adim);border:1px solid var(--amber);color:var(--amber);border-radius:5px;padding:.2rem .5rem;font-size:.65rem;cursor:pointer;margin-left:auto">Use midpoint</button>
  </div>`:''}
  <div class="rent-input-row">
    <label>Set estimated rent for BRRRR analysis</label>
    <input type="text" id="rent-inp-${id}" value="${rent||''}" placeholder="e.g. 1800" inputmode="numeric" pattern="[0-9]*" class="no-spin" oninput="mRent['${id}']=Math.round(+this.value.replace(/[^0-9]/g,''))||0" onblur="autoRentBlur('${id}')">
    <button class="save-btn" onclick="saveRent('${id}')">Save</button>
    <button class="est-btn" id="ai-rent-${id}" onclick="doEstimateRent('${id}')">📊 Estimate Rent</button>
  </div>
  <div id="ai-reason-${id}" style="display:none;font-size:.68rem;color:var(--text2);margin-top:.3rem;padding:.3rem .5rem;background:var(--card);border-radius:5px;border:1px solid var(--border)"></div>`+
  _condImprHtml(id,cond,impr)+
  (b?`
  <div class="sec">🔁 BRRRR Analysis</div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">ARV</div><div class="kv" style="color:var(--green)">${M(b.arv)}</div></div>
    <div class="kpi"><div class="kl">Rehab Cost</div><div class="kv" style="color:var(--red)">${M(b.rehabCost)}</div></div>
    <div class="kpi"><div class="kl">Cash In</div><div class="kv">${M(b.cashIn)}</div></div>
  </div>
  <div class="sec">🏦 Refinance @ 75% LTV</div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">Refi Amount</div><div class="kv">${M(b.refiAmount)}</div></div>
    <div class="kpi"><div class="kl">Capital Recycled</div><div class="kv" style="color:var(--green)">${M(b.capitalRecycled)}</div></div>
    <div class="kpi"><div class="kl">Cash Left In</div><div class="kv" style="color:${b.infinite?'var(--green)':'var(--amber)'}">${b.infinite?'$0 — ∞ Return!':M(b.cashLeftIn)}</div></div>
  </div>
  ${rent?`<div class="sec">💵 Post-Refi Cash Flow</div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">Monthly CF</div><div class="kv" style="color:${b.adjCF>=0?'var(--green)':'var(--red)'}">${MS(b.adjCF/12)}/mo</div></div>
    <div class="kpi"><div class="kl">Post-Refi CoC</div><div class="kv" style="color:${(b.infinite||b.adjCoC>=GP.cocMin)?'var(--green)':'var(--red)'}">${b.infinite?'∞':PCT(b.adjCoC)}</div></div>
    <div class="kpi"><div class="kl">Pre-Refi CoC</div><div class="kv" style="color:${bh&&bh.coc>=GP.cocMin?'var(--green)':'var(--red)'}">${bh?PCT(bh.coc):'—'}</div></div>
  </div>`:''}`
  :'<div class="infobox" style="color:var(--text2)">Enter rent and set condition/improvement above to calculate BRRRR metrics.</div>')+
  (taxP?_taxYearsHtml(id,p.listed,rent,cond,impr,taxP):'')+
  _curateHtml(id,p);
}

// ── STR Modal ────────────────────────────────────────────────────────────────
function _modSTR(id,p,cond,impr,taxP){
  const projParams=activeProject||{};
  const adr=projParams._str_adr||150;
  const occ=projParams._str_occ||0.70;
  const clean=projParams._str_clean||75;
  const plat=projParams._str_plat||0.03;
  const s=strCalc(p.listed,adr,occ,clean,plat);
  return _propDetailsHtml(p)+
  `<div class="sec">🏖️ STR Revenue Inputs</div>
  <div class="txs">
    <div class="tr2"><label>Avg Daily Rate</label><input type="text" value="${adr}" inputmode="numeric" class="no-spin" style="width:80px" onblur="if(activeProject)activeProject._str_adr=+this.value||150;buildMod('${id}')"></div>
    <div class="tr2"><label>Occupancy %</label><input type="text" value="${Math.round(occ*100)}" inputmode="numeric" class="no-spin" style="width:80px" onblur="if(activeProject)activeProject._str_occ=(+this.value||70)/100;buildMod('${id}')"><span style="font-size:.65rem;color:var(--text3)">%</span></div>
    <div class="tr2"><label>Cleaning Fee</label><input type="text" value="${clean}" inputmode="numeric" class="no-spin" style="width:80px" onblur="if(activeProject)activeProject._str_clean=+this.value||0;buildMod('${id}')"></div>
    <div class="tr2"><label>Platform Fee</label><input type="text" value="${Math.round(plat*100)}" inputmode="numeric" class="no-spin" style="width:80px" onblur="if(activeProject)activeProject._str_plat=(+this.value||3)/100;buildMod('${id}')"><span style="font-size:.65rem;color:var(--text3)">%</span></div>
  </div>`+
  (s?`
  <div class="sec">💰 STR Analysis</div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">RevPAR</div><div class="kv" style="color:var(--green)">${M(s.revPAR)}</div><div class="ks">ADR × Occ</div></div>
    <div class="kpi"><div class="kl">Gross Revenue</div><div class="kv">${M(s.grossRev)}/yr</div></div>
    <div class="kpi"><div class="kl">Net Revenue</div><div class="kv">${M(s.netRev)}/yr</div></div>
  </div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">Monthly CF</div><div class="kv" style="color:${s.cf>=0?'var(--green)':'var(--red)'}">${MS(s.cf/12)}/mo</div></div>
    <div class="kpi"><div class="kl">CoC Return</div><div class="kv" style="color:${s.coc>=GP.cocMin?'var(--green)':'var(--red)'}">${PCT(s.coc)}</div></div>
    <div class="kpi"><div class="kl">Cash Required</div><div class="kv">${M(s.cashIn)}</div></div>
  </div>
  <div class="tacc"><button class="ttog" onclick="togAcc('str-${id}')"><span>NOI: <strong style="color:var(--green)">${M(s.noi)}</strong>/yr</span><span style="font-size:.62rem">▼</span></button>
  <div class="tbody2" id="str-${id}">
    <div class="tl2"><span class="tl2-l">Gross Revenue</span><span class="tl2-v" style="color:var(--green)">${M(s.grossRev)}</span></div>
    <div class="tl2"><span class="tl2-l">Platform Fees</span><span class="tl2-v" style="color:var(--red)">−${M(s.platformFees)}</span></div>
    <div class="tl2"><span class="tl2-l">Property Tax</span><span class="tl2-v" style="color:var(--red)">−${M(s.pt)}</span></div>
    <div class="tl2"><span class="tl2-l">Insurance</span><span class="tl2-v" style="color:var(--red)">−${M(s.ins)}</span></div>
    <div class="tl2"><span class="tl2-l">Management (20%)</span><span class="tl2-v" style="color:var(--red)">−${M(s.mgmt)}</span></div>
    <div class="tl2"><span class="tl2-l">Repairs</span><span class="tl2-v" style="color:var(--red)">−${M(s.rep)}</span></div>
    <div class="tl2" style="border-top:2px solid var(--border2);margin-top:.3rem;padding-top:.4rem"><span class="tl2-l" style="font-weight:600">NOI</span><span class="tl2-v" style="color:var(--green);font-weight:600">${M(s.noi)}</span></div>
    <div class="tl2"><span class="tl2-l">Annual Mortgage</span><span class="tl2-v" style="color:var(--red)">−${M(s.annMort)}</span></div>
    <div class="tl2" style="border-top:2px solid var(--border2);margin-top:.3rem;padding-top:.4rem"><span class="tl2-l" style="font-weight:700">Cash Flow</span><span class="tl2-v" style="color:${s.cf>=0?'var(--green)':'var(--red)'};font-weight:700">${MS(s.cf)}/yr</span></div>
  </div></div>`:'<div class="infobox" style="color:var(--text2)">Set STR revenue inputs above to calculate.</div>')+
  (taxP&&s?_taxYearsHtml(id,p.listed,Math.round(s.netRev/12),cond,impr,taxP):'')+
  _curateHtml(id,p);
}

// ── Wholesaler Modal ─────────────────────────────────────────────────────────
function _modWholesale(id,p,cond,impr){
  const projParams=activeProject||{};
  const assignPct=projParams._ws_assign||0.07;
  const rehabPct=projParams._ws_rehab||0.10;
  const w=wholesaleCalc(p.listed,p.listed*(1+(COND[cond]?.adj||0))+(p.listed*(IMPR[impr]?.upliftPct||0)),assignPct,rehabPct);
  return _propDetailsHtml(p)+_condImprHtml(id,cond,impr)+
  (w?`
  <div class="sec">📋 Wholesale Analysis</div>
  <div class="txs" style="margin-bottom:.5rem">
    <div class="tr2"><label>Assignment Fee %</label><input type="text" value="${Math.round(assignPct*100)}" inputmode="numeric" class="no-spin" style="width:60px" onblur="if(activeProject)activeProject._ws_assign=(+this.value||7)/100;buildMod('${id}')"><span style="font-size:.65rem;color:var(--text3)">%</span></div>
    <div class="tr2"><label>Est. Rehab %</label><input type="text" value="${Math.round(rehabPct*100)}" inputmode="numeric" class="no-spin" style="width:60px" onblur="if(activeProject)activeProject._ws_rehab=(+this.value||10)/100;buildMod('${id}')"><span style="font-size:.65rem;color:var(--text3)">%</span></div>
  </div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">ARV</div><div class="kv" style="color:var(--green)">${M(w.arv)}</div></div>
    <div class="kpi"><div class="kl">MAO (70%)</div><div class="kv" style="color:var(--amber)">${M(w.mao)}</div></div>
    <div class="kpi"><div class="kl">Est. Rehab</div><div class="kv" style="color:var(--red)">${M(w.estRehab)}</div></div>
  </div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">Your Offer</div><div class="kv" style="font-size:1.1rem">${M(w.offerPrice)}</div><div class="ks">MAO − fee</div></div>
    <div class="kpi"><div class="kl">Assignment Fee</div><div class="kv" style="color:var(--green);font-size:1.1rem">${M(w.assignFee)}</div><div class="ks">${Math.round(assignPct*100)}% of ARV</div></div>
    <div class="kpi"><div class="kl">Spread at List</div><div class="kv" style="color:${w.spread>=0?'var(--green)':'var(--red)'}; font-size:1.1rem">${MS(w.spread)}</div><div class="ks">${w.spread>=0?'Room to deal':'No margin'}</div></div>
  </div>`:'<div class="infobox" style="color:var(--text2)">No price data available.</div>')+
  _curateHtml(id,p);
}

// ── Commercial Modal ─────────────────────────────────────────────────────────
function _modCommercial(id,p,cond,impr,taxP){
  const projParams=activeProject||{};
  const units=projParams._comm_units||p.beds||2;
  const rpu=projParams._comm_rpu||800;
  const vac=projParams._comm_vac||0.05;
  const c=commercialCalc(p.listed,units,rpu,vac);
  return _propDetailsHtml(p)+
  `<div class="sec">🏢 Commercial Inputs</div>
  <div class="txs">
    <div class="tr2"><label>Units</label><input type="text" value="${units}" inputmode="numeric" class="no-spin" style="width:60px" onblur="if(activeProject)activeProject._comm_units=+this.value||2;buildMod('${id}')"></div>
    <div class="tr2"><label>Rent/Unit/mo</label><input type="text" value="${rpu}" inputmode="numeric" class="no-spin" style="width:80px" onblur="if(activeProject)activeProject._comm_rpu=+this.value||800;buildMod('${id}')"></div>
    <div class="tr2"><label>Vacancy %</label><input type="text" value="${Math.round(vac*100)}" inputmode="numeric" class="no-spin" style="width:60px" onblur="if(activeProject)activeProject._comm_vac=(+this.value||5)/100;buildMod('${id}')"><span style="font-size:.65rem;color:var(--text3)">%</span></div>
  </div>`+
  (c?`
  <div class="sec">📊 Commercial Analysis</div>
  <div class="k3" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi"><div class="kl">Cap Rate</div><div class="kv" style="color:${c.capRate>=0.06?'var(--green)':c.capRate>=0.04?'var(--amber)':'var(--red)'}">${PCT(c.capRate)}</div></div>
    <div class="kpi"><div class="kl">DSCR</div><div class="kv" style="color:${c.dscr>=1.25?'var(--green)':c.dscr>=1?'var(--amber)':'var(--red)'}">${c.dscr.toFixed(2)}x</div></div>
    <div class="kpi"><div class="kl">GRM</div><div class="kv">${c.grm.toFixed(1)}</div></div>
    <div class="kpi"><div class="kl">Price/Unit</div><div class="kv">${M(c.pricePerUnit)}</div></div>
  </div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">NOI</div><div class="kv" style="color:var(--green)">${M(c.noi)}/yr</div></div>
    <div class="kpi"><div class="kl">Cash Flow</div><div class="kv" style="color:${c.cf>=0?'var(--green)':'var(--red)'}">${MS(c.cf/12)}/mo</div></div>
    <div class="kpi"><div class="kl">CoC Return</div><div class="kv" style="color:${c.coc>=GP.cocMin?'var(--green)':'var(--red)'}">${PCT(c.coc)}</div></div>
  </div>
  <div class="k3" style="grid-template-columns:repeat(2,1fr)">
    <div class="kpi"><div class="kl">Debt Yield</div><div class="kv">${PCT(c.debtYield)}</div></div>
    <div class="kpi"><div class="kl">Cash Required</div><div class="kv">${M(c.cashIn)}</div></div>
  </div>`:'<div class="infobox" style="color:var(--text2)">Set unit count and rent above.</div>')+
  (taxP&&c?_taxYearsHtml(id,p.listed,Math.round(units*rpu*(1-vac)),cond,impr,taxP):'')+
  _curateHtml(id,p);
}

// ── Passive/Syndication Modal ────────────────────────────────────────────────
function _modPassive(id,p,cond,impr){
  const projParams=activeProject||{};
  const invest=projParams._pass_invest||p.listed*GP.downPct||50000;
  const pref=projParams._pass_pref||0.08;
  const hold=projParams._pass_hold||5;
  const eqm=projParams._pass_eqm||2.0;
  const ps=passiveCalc(invest,pref,hold,eqm);
  return _propDetailsHtml(p)+
  `<div class="sec">💼 Syndication Inputs</div>
  <div class="txs">
    <div class="tr2"><label>Investment Amount</label><input type="text" value="${invest}" inputmode="numeric" class="no-spin" style="width:100px" onblur="if(activeProject)activeProject._pass_invest=+this.value||50000;buildMod('${id}')"></div>
    <div class="tr2"><label>Pref Return %</label><input type="text" value="${Math.round(pref*100)}" inputmode="numeric" class="no-spin" style="width:60px" onblur="if(activeProject)activeProject._pass_pref=(+this.value||8)/100;buildMod('${id}')"><span style="font-size:.65rem;color:var(--text3)">%</span></div>
    <div class="tr2"><label>Hold Years</label><input type="text" value="${hold}" inputmode="numeric" class="no-spin" style="width:60px" onblur="if(activeProject)activeProject._pass_hold=+this.value||5;buildMod('${id}')"></div>
    <div class="tr2"><label>Equity Multiple</label><input type="text" value="${eqm}" inputmode="decimal" class="no-spin" style="width:60px" onblur="if(activeProject)activeProject._pass_eqm=+this.value||2.0;buildMod('${id}')"><span style="font-size:.65rem;color:var(--text3)">×</span></div>
  </div>`+
  (ps?`
  <div class="sec">📈 Syndication Returns</div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">Annual Distribution</div><div class="kv" style="color:var(--green)">${M(ps.annDist)}/yr</div></div>
    <div class="kpi"><div class="kl">Total Return</div><div class="kv" style="color:var(--green)">${M(ps.totalReturn)}</div></div>
    <div class="kpi"><div class="kl">Profit</div><div class="kv" style="color:${ps.profit>=0?'var(--green)':'var(--red)'}">${MS(ps.profit)}</div></div>
  </div>
  <div class="k3" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi"><div class="kl">Equity Multiple</div><div class="kv">${ps.equityMultiple.toFixed(1)}×</div></div>
    <div class="kpi"><div class="kl">IRR</div><div class="kv" style="color:${ps.irr>=0.12?'var(--green)':ps.irr>=0.08?'var(--amber)':'var(--red)'}">${PCT(ps.irr)}</div></div>
    <div class="kpi"><div class="kl">NPV (8% disc)</div><div class="kv" style="color:${ps.npv>=0?'var(--green)':'var(--red)'}">${MS(ps.npv)}</div></div>
  </div>`:'<div class="infobox" style="color:var(--text2)">Set syndication inputs above.</div>')+
  _curateHtml(id,p);
}

async function saveRent(id){
  const val=mRent[id];
  if(!val)return;
  const p=props.find(x=>x.id===id);
  if(!p)return;
  p.monthlyRent=val;
  recomputeOne(p);
  renderApp();
  buildMod(id);
  await saveProperty(id,{monthly_rent:val,status:p.status});
}
// Auto-save rent on blur — keeps calcs + table in sync without needing Save click
function autoRentBlur(id){
  const val=mRent[id];
  if(!val)return;
  const p=props.find(x=>x.id===id);
  if(!p)return;
  p.monthlyRent=val;
  recomputeOne(p);
  renderApp();
  buildMod(id);
  saveProperty(id,{monthly_rent:val,status:p.status});
}

function doEstimateRent(id){
  const btn=document.getElementById('ai-rent-'+id);
  const reason=document.getElementById('ai-reason-'+id);
  if(!btn)return;
  try{
    const data=estimateRent(id);
    if(!data)throw new Error('No estimate returned');
    mRent[id]=data.estimate;
    const p=props.find(x=>x.id===id);
    if(p){
      p.monthlyRent=data.estimate;
      recomputeOne(p);
      saveProperty(id,{monthly_rent:data.estimate,rent_estimate:data.estimate,status:p.status});
    }
    renderApp();
    buildMod(id);
    const r2=document.getElementById('ai-reason-'+id);
    if(r2&&data.reasoning){r2.textContent='📊 '+data.reasoning;r2.style.display='block';}
  }catch(e){
    console.error('doEstimateRent error:',e);
    if(reason){reason.textContent='⚠️ '+(e.message||String(e));reason.style.display='block';}
  }
}

// Fill edit form fields from scraped data object, return summary
function _fillEditFields(d){
  const g=s=>document.getElementById(s);
  if(d.address){const street=d.address.split(',')[0].trim();if(g('ep-addr'))g('ep-addr').value=street;}
  if(d.city&&g('ep-city')) g('ep-city').value=d.city;
  if(d.zip&&g('ep-zip')) g('ep-zip').value=d.zip;
  if(d.price&&g('ep-price')) g('ep-price').value=d.price;
  if(d.property_type&&g('ep-type')) g('ep-type').value=d.property_type;
  if(d.beds&&g('ep-beds')) g('ep-beds').value=d.beds;
  if(d.baths&&g('ep-baths')) g('ep-baths').value=d.baths;
  if(d.sqft&&g('ep-sqft')) g('ep-sqft').value=d.sqft;
  if(d.rent_estimate&&g('ep-rent-est')) g('ep-rent-est').value=d.rent_estimate;
  const parts=[];
  if(d.price)parts.push('$'+Number(d.price).toLocaleString());
  if(d.beds)parts.push(d.beds+'bd');
  if(d.baths)parts.push(d.baths+'ba');
  if(d.sqft)parts.push(d.sqft.toLocaleString()+' sqft');
  return parts.join(' · ');
}

// Re-scrape listing URL from edit form
async function rescrapeEdit(id){
  const url=(document.getElementById('ep-url')?.value||'').trim();
  const status=document.getElementById('ep-scrape-status');
  const btn=document.getElementById('ep-scrape-btn');
  if(!url){if(status){status.textContent='⚠️ Paste a listing URL first';status.style.display='block';}return;}
  if(btn){btn.disabled=true;btn.textContent='⏳ Scraping...';}
  if(status){status.textContent='Trying URL variants & fallbacks...';status.style.display='block';status.style.color='var(--text2)';}
  try{
    const token=await getAccessToken();
    if(!token) throw new Error('Not signed in');
    const res=await fetch(`${EDGE_BASE}/fetch-listing`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({url})
    });
    const d=await res.json();
    console.log('rescrape result:',d);
    // Handle 422 with partial data
    if(!res.ok&&d.partial){
      _fillEditFields(d.partial);
      const miss=(d.missing||[]).join(', ');
      status.innerHTML=`⚠️ Partial data from URL — missing: <strong>${miss}</strong>. Enter manually or <a href="#" onclick="searchByAddrEdit('${id}');return false" style="color:var(--accent)">🔍 search by address</a>`;
      status.style.color='var(--amber)';
      return;
    }
    if(!res.ok) throw new Error(d.error||`HTTP ${res.status}`);
    const summary=_fillEditFields(d);
    // Show missing fields warning if any
    const miss=d._missing||[];
    if(miss.length>0){
      status.innerHTML=`✅ Scraped: ${summary} — <span style="color:var(--amber)">missing: ${miss.join(', ')}</span>`;
      status.style.color='var(--green)';
    } else {
      status.innerHTML='✅ Scraped: '+summary+' — review & save';
      status.style.color='var(--green)';
    }
  }catch(e){
    console.error('rescrapeEdit error:',e);
    if(status){
      status.innerHTML=`❌ ${e.message||String(e)} — <a href="#" onclick="searchByAddrEdit('${id}');return false" style="color:var(--accent)">🔍 Try search by address</a>`;
      status.style.color='var(--red)';
    }
  }finally{
    if(btn){btn.disabled=false;btn.textContent='🔄 Scrape';}
  }
}

// Search by address when URL scrape fails
async function searchByAddrEdit(id){
  const g=s=>(document.getElementById(s)?.value||'').trim();
  const addr=g('ep-addr');
  const city=g('ep-city');
  const zip=g('ep-zip');
  if(!addr){const st=document.getElementById('ep-scrape-status');if(st){st.textContent='⚠️ Enter an address first';st.style.display='block';}return;}
  const status=document.getElementById('ep-scrape-status');
  const btn=document.getElementById('ep-scrape-btn');
  if(btn){btn.disabled=true;btn.textContent='🔍 Searching...';}
  if(status){status.textContent='Searching for property by address...';status.style.display='block';status.style.color='var(--text2)';}
  try{
    const token=await getAccessToken();
    if(!token) throw new Error('Not signed in');
    const res=await fetch(`${EDGE_BASE}/fetch-listing`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({address:addr,city,state:'TX',zip})
    });
    const d=await res.json();
    if(!res.ok) throw new Error(d.error||`HTTP ${res.status}`);
    const summary=_fillEditFields(d);
    const miss=d._missing||[];
    if(miss.length>0){
      status.innerHTML=`✅ Found: ${summary} — <span style="color:var(--amber)">missing: ${miss.join(', ')}</span>`;
    } else {
      status.innerHTML='✅ Found: '+summary+' — review & save';
    }
    status.style.color='var(--green)';
  }catch(e){
    console.error('searchByAddrEdit error:',e);
    if(status){status.textContent='❌ '+(e.message||String(e));status.style.color='var(--red)';}
  }finally{
    if(btn){btn.disabled=false;btn.textContent='🔄 Scrape';}
  }
}

function togAcc(id){const el=document.getElementById(id);if(el)el.classList.toggle('open');}
function setMC(id,v){mCond[id]=v;saveProperty(id,{condition:v});maybeReEstimate(id);const p=props.find(x=>x.id===id);if(p){p.condition=v;recomputeOne(p);}renderApp();buildMod(id);}
function setMI(id,v){mImpr[id]=v;saveProperty(id,{improvement:v});maybeReEstimate(id);const p=props.find(x=>x.id===id);if(p){p.improvement=v;recomputeOne(p);}renderApp();buildMod(id);}
function uTax(id,key,val){
  if(!mTax[id]){const fs=GP.filingStatus||'single';const r=agiToRates(GP.agi,fs);mTax[id]={agi:GP.agi,filing:fs,marg:r.marg,ltcg:r.ltcg,recap:GP.recapRate};}
  mTax[id][key]=val;
  // When filing status changes, auto-derive marginal and LTCG rates
  if(key==='filing'){
    const r=agiToRates(mTax[id].agi??GP.agi, mTax[id].filing||GP.filingStatus||'single');
    mTax[id].marg=r.marg; mTax[id].ltcg=r.ltcg;
  }
  clearTimeout(uTax._t);uTax._t=setTimeout(()=>buildMod(id),150);
}
// AGI input: update state + sliders in-place (no modal rebuild while typing; buildMod fires on blur)
function uTaxAgi(id,val){
  if(!mTax[id]){const fs=GP.filingStatus||'single';const r=agiToRates(GP.agi,fs);mTax[id]={agi:GP.agi,filing:fs,marg:r.marg,ltcg:r.ltcg,recap:GP.recapRate};}
  mTax[id].agi=val;
  const r=agiToRates(val,mTax[id].filing||GP.filingStatus||'single');
  mTax[id].marg=r.marg;mTax[id].ltcg=r.ltcg;
  const ms=document.getElementById('tax-marg-'+id);
  const ls=document.getElementById('tax-ltcg-'+id);
  const ml=document.getElementById('tv-mg-'+id);
  const ll=document.getElementById('tv-lg-'+id);
  if(ms)ms.value=Math.round(r.marg*100);
  if(ml)ml.textContent=Math.round(r.marg*100)+'%';
  if(ls)ls.value=Math.round(r.ltcg*100);
  if(ll)ll.textContent=Math.round(r.ltcg*100)+'%';
}
function printMod(){
  const modal=document.querySelector('#ov .modal');if(!modal)return;
  document.body.classList.add('printing-modal');
  const cleanup=()=>document.body.classList.remove('printing-modal');
  window.addEventListener('afterprint',cleanup,{once:true});
  window.print();
}
function openM(id){
  openId=id;buildMod(id);
  document.getElementById('ov').classList.add('open');
  document.getElementById('ov').scrollTop=0;
  // Mark as viewed — clear "New" badge
  const p=props.find(x=>x.id===id);
  if(p&&p.isNew){
    p.isNew=false;
    saveProperty(id,{is_new:false});
    renderApp();
  }
}
function closeMod(e){if(e&&e.target!==document.getElementById('ov'))return;document.getElementById('ov').classList.remove('open');openId=null;}
function srt(col){if(sCol===col)sDir*=-1;else{sCol=col;sDir=-1;}renderApp();}
function setView(v,el){aV=v;document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));el.classList.add('on');renderApp();}
function setFil(f,el){aF=f;document.querySelectorAll('.fc').forEach(c=>c.classList.remove('on'));el.classList.add('on');renderApp();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.getElementById('ov').classList.remove('open');document.getElementById('sov').classList.remove('open');document.getElementById('aov').classList.remove('open');openId=null;}});
document.getElementById('auth-email').addEventListener('keydown',e=>{if(e.key==='Enter')doAuth();});
document.getElementById('auth-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doAuth();});
