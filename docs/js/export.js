// ── Export ────────────────────────────────────────────────────────────────
function exportCSV(){
  const list=vis();
  if(!list.length){alert('No properties to export');return;}
  const it=activeProject?.investment_type||'buyhold';
  // Build headers + rows based on investment type
  let headers,rowFn;
  if(it==='flipper'){
    headers=['Address','City','ZIP','Listed','ARV','MAO','Rehab','Profit','ROI','Type','Stage','Source'];
    rowFn=p=>{
      const f=flipCalc(p.listed,mCond[p.id]||p.condition||'good',mImpr[p.id]||p.improvement||'asis');
      return[p.address,p.rawCity||p.city,p.zip||'',p.listed,f?Math.round(f.arv):'',f?Math.round(f.mao):'',
        f?Math.round(f.rehabCost):'',f?Math.round(f.netProfit):'',f?(f.roi*100).toFixed(1)+'%':'',
        p.type,p.stage||'inbox',p.source];
    };
  } else if(it==='str'){
    headers=['Address','City','ZIP','Listed','RevPAR','Gross Rev/yr','Net CF/mo','CoC','Type','Stage','Source'];
    rowFn=p=>{
      const pp=activeProject||{};
      const sc=strCalc(p.listed,pp._str_adr||150,pp._str_occ||0.70,pp._str_clean||75,pp._str_plat||0.03);
      return[p.address,p.rawCity||p.city,p.zip||'',p.listed,sc?Math.round(sc.revPAR):'',
        sc?Math.round(sc.grossRev):'',sc?Math.round(sc.cf/12):'',
        sc?(sc.coc*100).toFixed(1)+'%':'',p.type,p.stage||'inbox',p.source];
    };
  } else if(it==='wholesaler'){
    headers=['Address','City','ZIP','Listed','ARV','MAO','Fee','Spread','Type','Stage','Source'];
    rowFn=p=>{
      const pp=activeProject||{};
      const cond=mCond[p.id]||p.condition||'good',im=mImpr[p.id]||p.improvement||'asis';
      const arv=p.listed*(1+(COND[cond]?.adj||0))+(p.listed*(IMPR[im]?.upliftPct||0));
      const w=wholesaleCalc(p.listed,arv,pp._ws_assign||0.07,pp._ws_rehab||0.10);
      return[p.address,p.rawCity||p.city,p.zip||'',p.listed,w?Math.round(w.arv):'',
        w?Math.round(w.mao):'',w?Math.round(w.assignFee):'',w?Math.round(w.spread):'',
        p.type,p.stage||'inbox',p.source];
    };
  } else if(it==='commercial'){
    headers=['Address','City','ZIP','Listed','Units','NOI/yr','Cap Rate','DSCR','Price/Unit','Stage','Source'];
    rowFn=p=>{
      const pp=activeProject||{};
      const c=commercialCalc(p.listed,pp._comm_units||p.beds||2,pp._comm_rpu||800,pp._comm_vac||0.05);
      return[p.address,p.rawCity||p.city,p.zip||'',p.listed,c?c.units:'',
        c?Math.round(c.noi):'',c?(c.capRate*100).toFixed(1)+'%':'',
        c?c.dscr.toFixed(2):'',c?Math.round(c.pricePerUnit):'',p.stage||'inbox',p.source];
    };
  } else {
    // buyhold / brrrr / passive default
    headers=['Address','City','ZIP','Listed','Beds','Baths','Sqft','Type','Rent','CoC','CF/mo',
             'NB Score','Status','Stage','Source','Listing URL'];
    rowFn=p=>{
      const rent=effectiveRent(p);
      return[p.address,p.rawCity||p.city,p.zip||'',p.listed,p.beds||'',p.baths||'',p.sqft||'',
        p.type,rent||'',p._cocL!==null?(p._cocL*100).toFixed(1)+'%':'',
        p._cfL!==null?Math.round(p._cfL):'',p._nbScore!==null?p._nbScore:'',
        p.status||'',p.stage||'inbox',p.source||'',p.listingUrl||''];
    };
  }
  const rows=list.map(rowFn);
  const csvEsc=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return s.includes(',')||s.includes('"')||s.includes('\n')?'"'+s.replace(/"/g,'""')+'"':s;};
  const csv=[headers.map(csvEsc).join(','),...rows.map(r=>r.map(csvEsc).join(','))].join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`lockboxiq-${(activeProject?.name||'all').replace(/[^a-z0-9]/gi,'-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
