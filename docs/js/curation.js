async function curate(id, val){
  const p=props.find(x=>x.id===id);
  if(!p) return;
  const newVal=p.curated===val?null:val;
  p.curated=newVal;
  renderApp();
  if(openId===id)buildMod(id);
  await saveProperty(id,{curated:newVal});
}

