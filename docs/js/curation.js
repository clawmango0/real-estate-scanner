async function curate(id, val){
  const p=props.find(x=>x.id===id);
  if(!p) return;
  const newVal=p.curated===val?null:val;
  const ok=await saveProperty(id,{curated:newVal});
  if(!ok){console.error('Failed to save curation');return;}
  renderApp();
  if(openId===id)buildMod(id);
}

async function setStage(id, stage){
  const p=props.find(x=>x.id===id);
  if(!p) return;
  if(typeof trackStageChange==='function') trackStageChange(id,p.stage||'inbox',stage,false);
  // Map stage to legacy curated for backwards compat
  const curatedMap={shortlist:'fav',archived:'ni'};
  const updates={pipeline_stage:stage,curated:curatedMap[stage]||null};
  // Clear resurface when user acts on property
  if(p._resurface){p._resurface=false;p._resurfaceReason=null;}
  const ok=await saveProperty(id,updates);
  if(!ok){console.error('Failed to set stage');return;}
  p.stage=stage;
  p.curated=updates.curated;
  renderApp();
  if(typeof renderProjectCards==='function') renderProjectCards();
  if(openId===id)buildMod(id);
}

function nextStage(id){
  const p=props.find(x=>x.id===id);
  if(!p) return;
  const active=STAGES.filter(s=>s!=='archived');
  const idx=active.indexOf(p.stage||'inbox');
  if(idx<active.length-1) setStage(id,active[idx+1]);
}

function prevStage(id){
  const p=props.find(x=>x.id===id);
  if(!p) return;
  const active=STAGES.filter(s=>s!=='archived');
  const idx=active.indexOf(p.stage||'inbox');
  if(idx>0) setStage(id,active[idx-1]);
}
