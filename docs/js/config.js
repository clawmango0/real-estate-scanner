const SUPABASE_URL  = "https://tgborqvdkujajsggfbcy.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYm9ycXZka3VqYWpzZ2dmYmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTczNTcsImV4cCI6MjA4ODU5MzM1N30.zOxjjFeeYV_7tNOydh_kxVh85cBX-QYYzMLP4WYjKs8";
const EDGE_BASE     = `${SUPABASE_URL}/functions/v1`;

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// HTML escape — use for ALL user data interpolated into innerHTML
function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

// Tagged template for safe HTML — auto-escapes all interpolated values
function safeHTML(strings, ...vals) {
  return strings.reduce((out, str, i) => out + str + (i < vals.length ? esc(String(vals[i] ?? '')) : ''), '');
}

// Minimal pub/sub event bus — decouples state changes from rendering
const Bus={_:{},on(e,fn){(this._[e]=this._[e]||[]).push(fn);},off(e,fn){this._[e]=(this._[e]||[]).filter(f=>f!==fn);},emit(e,d){(this._[e]||[]).forEach(fn=>{try{fn(d);}catch(err){console.error('Bus error:',e,err);}});}};

// ── Theme Toggle ───────────────────────────────────────
function _applyTheme(theme){
  document.documentElement.classList.toggle('light',theme==='light');
  const btn=document.getElementById('theme-btn');
  if(btn) btn.textContent=theme==='light'?'☀️':'🌙';
  try{localStorage.setItem('lbiq_theme',theme);}catch(_){}
}
function toggleTheme(){
  const current=document.documentElement.classList.contains('light')?'light':'dark';
  _applyTheme(current==='light'?'dark':'light');
}
// Apply saved theme on load (before first paint)
(function(){try{const t=localStorage.getItem('lbiq_theme');if(t)_applyTheme(t);}catch(_){}})();

// Source badge HTML — single source of truth for source→badge mapping
function sourceBadge(src){
  if(src==='auction')return'<span class="bdg ba">Auction</span>';
  if(src==='tax')return'<span class="bdg bt">Tax Sale</span>';
  if(src==='har')return'<span class="bdg bz">HAR</span>';
  if(src==='realtor')return'<span class="bdg br">Realtor</span>';
  if(src==='redfin')return'<span class="bdg bf">Redfin</span>';
  return'<span class="bdg bz">Zillow</span>';
}

