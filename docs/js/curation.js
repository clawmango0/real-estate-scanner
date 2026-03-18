async function curate(id, val){
  const p=props.find(x=>x.id===id);
  if(!p) return;
  const newVal=p.curated===val?null:val;
  const ok=await saveProperty(id,{curated:newVal});
  if(!ok){console.error('Failed to save curation');return;}
  renderApp();
  if(openId===id)buildMod(id);
}

