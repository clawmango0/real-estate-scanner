
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

// ── SETTINGS ───────────────────────────────────────────────
// Load saved GP from localStorage on startup
(function loadSavedGP(){
  try{
    const saved=localStorage.getItem('lbiq_gp');
    if(saved){const o=JSON.parse(saved);Object.keys(o).forEach(k=>{if(k in GP)GP[k]=o[k];});}
  }catch(e){console.warn('Failed to load saved settings',e);}
})();

const _settingsFields=[
  {group:'Loan & Purchase',items:[
    {key:'downPct',label:'Down Payment',unit:'%',min:5,max:50,step:1,mult:100},
    {key:'rate',label:'Interest Rate',unit:'%',min:2,max:12,step:0.125,mult:100},
    {key:'termYrs',label:'Loan Term',unit:'yr',type:'select',options:[15,20,30]},
    {key:'closingPct',label:'Closing Costs',unit:'%',min:1,max:6,step:0.5,mult:100},
    {key:'pointsPct',label:'Loan Points',unit:'%',min:0,max:3,step:0.25,mult:100},
  ]},
  {group:'Operating Expenses',items:[
    {key:'propTaxRate',label:'Property Tax',unit:'%',min:0.5,max:4,step:0.1,mult:100},
    {key:'insurRate',label:'Insurance',unit:'%',min:0.2,max:2,step:0.1,mult:100},
    {key:'mgmtRate',label:'Management',unit:'%',min:0,max:15,step:1,mult:100},
    {key:'repairRate',label:'Repairs / Maint.',unit:'%',min:0,max:5,step:0.5,mult:100},
    {key:'vacancyRate',label:'Vacancy',unit:'%',min:0,max:15,step:1,mult:100},
  ]},
  {group:'Investment Thresholds',items:[
    {key:'cocMin',label:'CoC Minimum (Pass)',unit:'%',min:4,max:15,step:0.5,mult:100},
    {key:'cocStrong',label:'CoC Strong Buy',unit:'%',min:6,max:20,step:0.5,mult:100},
    {key:'appreci',label:'Default Appreciation',unit:'%',min:0,max:10,step:0.5,mult:100},
    {key:'sellCostPct',label:'Selling Costs',unit:'%',min:3,max:10,step:0.5,mult:100},
  ]},
  {group:'Tax Defaults',items:[
    {key:'filingStatus',label:'Filing Status',type:'select',options:['single','mfj','hoh','mfs'],optionLabels:{single:'Single',mfj:'Married Filing Jointly',hoh:'Head of Household',mfs:'Married Filing Separately'}},
    {key:'agi',label:'Adjusted Gross Income',unit:'$',type:'text'},
    {key:'landPct',label:'Land % of Value',unit:'%',min:10,max:40,step:5,mult:100},
  ]},
];

function _buildSettingsHTML(){
  let html='';
  _settingsFields.forEach(g=>{
    html+=`<div class="s-group">${g.group}</div>`;
    g.items.forEach(f=>{
      const val=GP[f.key];
      const displayVal=f.mult?(val*f.mult):val;
      if(f.type==='select'){
        const opts=f.options.map(o=>`<option value="${o}" ${val===o||val+''===o+''?'selected':''}>${f.optionLabels?f.optionLabels[o]:o}</option>`).join('');
        html+=`<div class="s-row"><label>${f.label}</label><select id="sg-${f.key}" class="s-sel">${opts}</select>${f.unit?`<span class="s-unit">${f.unit}</span>`:''}</div>`;
      }else if(f.type==='text'){
        html+=`<div class="s-row"><label>${f.label}</label><input id="sg-${f.key}" type="text" inputmode="numeric" value="${Math.round(val).toLocaleString()}" class="s-text no-spin"><span class="s-unit">${f.unit}</span></div>`;
      }else{
        html+=`<div class="s-row"><label>${f.label}</label><input id="sg-${f.key}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${+displayVal.toFixed(4)}" oninput="document.getElementById('sv-${f.key}').textContent=this.value+'${f.unit}'"><span class="s-val" id="sv-${f.key}">${+displayVal.toFixed(2)}${f.unit}</span></div>`;
      }
    });
  });
  html+=`<div style="margin-top:1.25rem;display:flex;gap:.5rem">
    <button class="psave-btn" onclick="saveSettings()">Save & Recalculate</button>
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:.75rem">
    <button onclick="resetSettings()" style="background:none;border:1px solid var(--border);color:var(--text2);border-radius:6px;padding:.4rem .75rem;font-size:.7rem;cursor:pointer;font-family:inherit">Reset to Defaults</button>
    <button onclick="closeSettings();signOut()" style="background:none;border:1px solid var(--red);color:var(--red);border-radius:6px;padding:.4rem .75rem;font-size:.7rem;cursor:pointer;font-family:inherit">Sign Out</button>
  </div>`;
  return html;
}

function openSettings(){
  document.getElementById('s-body').innerHTML=_buildSettingsHTML();
  document.getElementById('sov').classList.add('open');
}

function closeSettings(e){
  if(e&&e.target!==document.getElementById('sov'))return;
  document.getElementById('sov').classList.remove('open');
}

function saveSettings(){
  const saved={};
  _settingsFields.forEach(g=>{
    g.items.forEach(f=>{
      const el=document.getElementById('sg-'+f.key);
      if(!el)return;
      let v;
      if(f.type==='select')v=f.optionLabels?el.value:+el.value;
      else if(f.type==='text')v=Math.round(+el.value.replace(/[^0-9]/g,''))||0;
      else v=f.mult?(+el.value/f.mult):(+el.value);
      GP[f.key]=v;
      saved[f.key]=v;
    });
  });
  localStorage.setItem('lbiq_gp',JSON.stringify(saved));
  refreshAll();
  document.getElementById('sov').classList.remove('open');
}

function resetSettings(){
  Object.keys(GP_DEFAULTS).forEach(k=>{GP[k]=GP_DEFAULTS[k];});
  localStorage.removeItem('lbiq_gp');
  document.getElementById('s-body').innerHTML=_buildSettingsHTML();
  refreshAll();
}

