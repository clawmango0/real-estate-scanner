let authMode='login';

function showLogin(){
  document.getElementById('landing').style.display='none';
  document.getElementById('auth-screen').style.display='flex';
  document.getElementById('auth-email')?.focus();
}
function showLanding(){
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('landing').style.display='';
}

async function doAuth(){
  const email=document.getElementById('auth-email').value.trim();
  const pass=document.getElementById('auth-pass').value;
  const btn=document.getElementById('auth-submit');
  const errEl=document.getElementById('auth-err');
  errEl.style.display='none';
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span> Signing in...';

  try{
    const {error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error)throw error;
    btn.disabled=false;
    btn.textContent='Sign In';
  } catch(e){
    errEl.textContent=e.message||'Authentication failed';
    errEl.style.display='block';
    btn.disabled=false;
    btn.textContent='Sign In';
  }
}

async function signOut(){
  await sb.auth.signOut();
  location.reload();
}
