function buildMod(id){
  const p=props.find(x=>x.id===id); if(!p) return;
  const cond=mCond[id]||p.condition||'good';
  const impr=mImpr[id]||p.improvement||'asis';
  // Seed tax state from AGI on first open
  if(!mTax[id]){const fs=GP.filingStatus||'single';const r=agiToRates(GP.agi,fs);mTax[id]={agi:GP.agi,filing:fs,marg:r.marg,ltcg:r.ltcg,recap:GP.recapRate};}
  const taxP={filing:(mTax[id].filing||GP.filingStatus||'single'),marginal:mTax[id].marg,ltcg:mTax[id].ltcg,recap:mTax[id].recap,agi:mTax[id].agi};
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
  const exits=EXIT_YRS.map(yr=>rent?exitAt(ofPrc,rent,cond,impr,yr,taxP,apprUsed):null);
  const y1=rent?schedE(ofPrc,rent,cond,impr,1,taxP,0):null;

  let badges='';
  if(p.source==='auction')badges=`<span class="bdg ba">Auction</span>`;
  else if(p.source==='har')badges=`<span class="bdg bz">HAR</span>`;
  else badges=`<span class="bdg bz">Zillow</span>`;
  if(p.isNew)badges+=`<span class="bdg bn">🆕 New</span>`;
  if(p.priceDrop)badges+=`<span class="bdg bd">📉 −${M(p.dropAmt||0)}</span>`;

  document.getElementById('m-adr').textContent=`${p.address}, ${p.city}`;
  document.getElementById('m-bdg').innerHTML=badges;

  const condBtns=Object.entries(COND).map(([k,v])=>`<button class="${cond===k?'sel':''}" onclick="setMC('${id}','${k}')">${v.label}</button>`).join('');
  const imprBtns=Object.entries(IMPR).map(([k,v])=>`<button class="${impr===k?'sel':''}" onclick="setMI('${id}','${k}')">${v.label}</button>`).join('');

  const editBtn=document.getElementById('m-edit-btn');
  if(editBtn)editBtn.style.background=mEdit[id]?'var(--amber)':'var(--adim)';

  if(mEdit[id]){
    document.getElementById('m-body').innerHTML=`
    <div class="sec">✏️ Edit Property Data</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:1rem">
      <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Address</label><input id="ep-addr" value="${(p.address||'').replace(/"/g,'&quot;')}" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem"></div>
      <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Listed Price ($)</label><input id="ep-price" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.listed||''}" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
      <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Beds</label><input id="ep-beds" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.beds||''}" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
      <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Baths</label><input id="ep-baths" type="text" inputmode="decimal" pattern="[0-9.]*" value="${p.baths||''}" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
      <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Sqft</label><input id="ep-sqft" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.sqft||''}" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
      <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Lot Size (sqft)</label><input id="ep-lot" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.lotSize||''}" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
      <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Property Type</label><select id="ep-type" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem">${['SFR','DUPLEX','TRIPLEX','QUAD','CONDO','LOT'].map(t=>`<option value="${t}"${p.type===t?' selected':''}>${t}</option>`).join('')}</select></div>
      <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Rent Estimate ($/mo)</label><input id="ep-rent-est" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.rentRange?.mid||''}" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
      <div><label style="font-size:.68rem;color:var(--text2);display:block;margin-bottom:2px">Monthly Rent (confirmed)</label><input id="ep-rent" type="text" inputmode="numeric" pattern="[0-9]*" value="${p.monthlyRent||''}" style="width:100%;background:var(--card);border:1px solid var(--border2);color:var(--text);border-radius:6px;padding:.35rem .5rem;font-size:.8rem" class="no-spin"></div>
    </div>
    <div style="display:flex;gap:.5rem">
      <button onclick="savePropertyEdit('${id}')" style="flex:1;padding:.55rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.85rem;font-weight:600">💾 Save Changes</button>
      <button onclick="mEdit['${id}']=false;buildMod('${id}')" style="padding:.55rem 1rem;background:var(--adim);border:1px solid var(--border2);color:var(--text2);border-radius:6px;cursor:pointer;font-size:.85rem">Cancel</button>
    </div>`;
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
    ${p.listingUrl?`<div style="margin-bottom:.75rem"><a href="${p.listingUrl}" target="_blank" rel="noopener" style="font-size:.72rem;color:var(--amber);text-decoration:none">🔗 View on Zillow ↗</a></div>`:''}
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
      <span style="color:var(--amber);font-size:.72rem">💡 Zillow Rent Est:</span>
      <strong style="color:var(--amber)">${M(p.rentRange.low)} – ${M(p.rentRange.high)}/mo</strong>
      <button onclick="mRent['${id}']=${Math.round((p.rentRange.low+p.rentRange.high)/2)};document.getElementById('rent-inp-${id}').value=mRent['${id}'];buildMod('${id}')" style="background:var(--adim);border:1px solid var(--amber);color:var(--amber);border-radius:5px;padding:.2rem .5rem;font-size:.65rem;cursor:pointer;margin-left:auto">Use midpoint</button>
    </div>`:''}
    <div class="rent-input-row">
      <label>Set estimated rent to unlock offer analysis</label>
      <input type="text" id="rent-inp-${id}" value="${rent||''}" placeholder="e.g. 1800" inputmode="numeric" pattern="[0-9]*" class="no-spin" oninput="mRent['${id}']=Math.round(+this.value.replace(/[^0-9]/g,''))||0" onblur="if(mRent['${id}'])buildMod('${id}')">
      <button class="save-btn" onclick="saveRent('${id}')">Save</button>
    </div>

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
      <div style="font-size:.6rem;color:var(--text3);margin-top:.25rem;padding-left:.1rem">2025 brackets · std deduction applied · drag sliders to override</div>
    </div>

    ${y1?`<div class="sec">📋 Schedule E — Year 1</div>
    <div class="tacc"><button class="ttog" onclick="togAcc('ta-${id}')"><span>Net Income: <strong style="color:${y1.netInc>=0?'var(--red)':'var(--green)'}">${MS(y1.netInc)}</strong> → Tax ${y1.taxSav>=0?'Savings':'Liability'}: <strong style="color:${y1.taxSav>=0?'var(--green)':'var(--red)'}">${MS(y1.taxSav)}</strong></span><span style="font-size:.62rem">▼</span></button>
    <div class="tbody2" id="ta-${id}">
      <div class="tl2"><span class="tl2-l">Gross Rental Income</span><span class="tl2-v" style="color:var(--green)">${M(y1.gr)}</span></div>
      <div class="tl2"><span class="tl2-l">Mortgage Interest</span><span class="tl2-v" style="color:var(--red)">−${M(y1.mortInt)}</span></div>
      <div class="tl2"><span class="tl2-l">Property Taxes (1.9%)</span><span class="tl2-v" style="color:var(--red)">−${M(y1.pt)}</span></div>
      <div class="tl2"><span class="tl2-l">Insurance (0.6%)</span><span class="tl2-v" style="color:var(--red)">−${M(y1.ins)}</span></div>
      <div class="tl2"><span class="tl2-l">Management (8%)</span><span class="tl2-v" style="color:var(--red)">−${M(y1.mgmt)}</span></div>
      <div class="tl2"><span class="tl2-l">Repairs (1%)</span><span class="tl2-v" style="color:var(--red)">−${M(y1.rep)}</span></div>
      <div class="tl2"><span class="tl2-l">Depreciation (27.5yr MACRS)</span><span class="tl2-v" style="color:var(--purple)">−${M(y1.annDepr)}</span></div>
      <div class="tl2" style="border-top:2px solid var(--border2);margin-top:.3rem;padding-top:.4rem"><span class="tl2-l" style="font-weight:600">Net Taxable Income</span><span class="tl2-v" style="color:${y1.netInc>=0?'var(--red)':'var(--green)'};font-size:.92rem">${MS(y1.netInc)}</span></div>
      <div class="tl2"><span class="tl2-l" style="font-weight:600">Year 1 Tax ${y1.taxSav>=0?'Savings':'Liability'}</span><span class="tl2-v" style="color:${y1.taxSav>=0?'var(--green)':'var(--red)'};font-size:.92rem;font-weight:700">${MS(y1.taxSav)}</span></div>
    </div></div>`:''}

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

function togAcc(id){const el=document.getElementById(id);if(el)el.classList.toggle('open');}
function setMC(id,v){mCond[id]=v;buildMod(id);}
function setMI(id,v){mImpr[id]=v;buildMod(id);}
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.getElementById('ov').classList.remove('open');document.getElementById('sov').classList.remove('open');openId=null;}});
document.getElementById('auth-email').addEventListener('keydown',e=>{if(e.key==='Enter')doAuth();});
document.getElementById('auth-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doAuth();});
