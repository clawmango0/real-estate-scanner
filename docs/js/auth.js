let authMode='login';
function authTab(mode, el){
  authMode=mode;
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('name-field').style.display=mode==='signup'?'block':'none';
  document.getElementById('auth-submit').textContent=mode==='signup'?'Create Account':'Sign In';
  document.getElementById('auth-err').style.display='none';
}

async function doAuth(){
  const email=document.getElementById('auth-email').value.trim();
  const pass=document.getElementById('auth-pass').value;
  const btn=document.getElementById('auth-submit');
  const errEl=document.getElementById('auth-err');
  errEl.style.display='none';
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span>'+btn.textContent;

  try{
    if(authMode==='signup'){
      const name=document.getElementById('auth-name').value.trim();
      const {error}=await sb.auth.signUp({email,password:pass,options:{data:{full_name:name}}});
      if(error)throw error;
    } else {
      const {error}=await sb.auth.signInWithPassword({email,password:pass});
      if(error)throw error;
    }
    // Auth succeeded — re-enable button as a safety net (auth state change will show app)
    btn.disabled=false;
    btn.textContent=authMode==='signup'?'Create Account':'Sign In';
  } catch(e){
    errEl.textContent=e.message||'Authentication failed';
    errEl.style.display='block';
    btn.disabled=false;
    btn.textContent=authMode==='signup'?'Create Account':'Sign In';
  }
}

async function signOut(){
  await sb.auth.signOut();
  location.reload();
}

