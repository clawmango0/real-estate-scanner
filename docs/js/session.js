
// Cached access-token — always kept fresh by onAuthStateChange
let _accessToken = null;

// Helper: get a guaranteed-valid access token.
// 1) Returns cached token from last auth event (always fresh).
// 2) Fallback: getSession → refreshSession.  Never calls signOut.
async function getAccessToken(){
  if(_accessToken) return _accessToken;
  const {data:{session}} = await sb.auth.getSession();
  if(session?.access_token){ _accessToken=session.access_token; return _accessToken; }
  const {data:r} = await sb.auth.refreshSession();
  if(r?.session?.access_token){ _accessToken=r.session.access_token; return _accessToken; }
  return null;
}

sb.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth event:', event, session?.user?.email);
  if(event === 'SIGNED_OUT' || !session?.user) {
    currentUser = null;
    _accessToken = null;
    // Re-enable sign-in button in case it was left spinning
    const authBtn=document.getElementById('auth-submit');
    if(authBtn){authBtn.disabled=false;authBtn.textContent=authMode==='signup'?'Create Account':'Sign In';}
    document.getElementById('auth-screen').style.display='flex';
    document.getElementById('setup-screen').style.display='none';
    document.getElementById('app').style.display='none';
    return;
  }
  // Any authenticated event: SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED, etc.
  // Always cache the latest access-token so API calls use a fresh one.
  _accessToken = session.access_token;
  const firstLogin = !currentUser;
  currentUser = session.user;
  document.getElementById('user-email-btn').textContent = currentUser.email;
  showApp(); // idempotent — always ensure app is visible
  if(firstLogin){
    loadMailboxBg();
    loadProperties();
    loadProjects();
  }
});

async function loadMailboxBg(){
  try {
    console.log('Loading mailbox in background...');
    const {data, error} = await sb.from('mailboxes').select('*').eq('user_id', currentUser.id).maybeSingle();
    console.log('Mailbox result:', data, error);
    if(data) {
      userMailbox = data;
      // Update inbox display if visible
      const inboxEl = document.getElementById('inbox-addr');
      if(inboxEl) inboxEl.textContent = data.slug + '@' + data.domain;
    }
  } catch(e) {
    console.error('loadMailboxBg error:', e);
  }
}

async function loadMailbox(){
  console.log('loadMailbox: fetching for user', currentUser.id);
  const {data, error}=await sb.from('mailboxes').select('*').eq('user_id',currentUser.id).maybeSingle();
  console.log('mailbox result:', data, error);
  if(data){
    userMailbox=data;
    console.log('Found mailbox:', data.slug);
    showApp();
  } else {
    console.log('No mailbox found, going to app anyway');
    // Insert mailbox directly via Supabase instead of Edge Function
    const slug = currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'-').slice(0,20) + '-' + Math.random().toString(36).slice(2,6);
    const {data:mb, error:mbErr} = await sb.from('mailboxes').insert({
      user_id: currentUser.id,
      slug: slug,
      domain: 'alerts.LockBoxIQ.com',
      display_name: 'My Alerts'
    }).select().maybeSingle();
    console.log('Created mailbox:', mb, mbErr);
    if(mb) userMailbox=mb;
    showApp();
  }
}

async function createMailbox(){
  const token = await getAccessToken();
  if(!token) return;
  const res=await fetch(`${EDGE_BASE}/create-mailbox`,{
    method:'POST',
    headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({display_name:'My Alerts'})
  });
  const mb=await res.json();
  userMailbox={slug:mb.slug,domain:'alerts.LockBoxIQ.com',full_address:mb.full_address};
  document.getElementById('setup-email').textContent=mb.full_address;
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('setup-screen').style.display='flex';
}

function copyEmail(){
  const addr=document.getElementById('setup-email').textContent;
  navigator.clipboard.writeText(addr).then(()=>{
    const btn=document.querySelector('.copy-btn');
    btn.textContent='Copied!';
    setTimeout(()=>btn.textContent='Copy',2000);
  });
}

function goToApp(){
  document.getElementById('setup-screen').style.display='none';
  showApp();
}

function showApp(){
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('app').style.display='block';
  renderApp();
}

function showInbox(){
  if(!userMailbox) return;
  const addr=`${userMailbox.slug}@${userMailbox.domain||'alerts.LockBoxIQ.com'}`;
  alert(`Your inbound email address:\n\n${addr}\n\nAdd this to your Zillow, Realtor.com, and HAR saved searches.`);
}

