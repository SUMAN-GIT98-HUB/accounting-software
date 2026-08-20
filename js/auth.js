/* ============================= AUTHENTICATION ============================= */

let authUser = null;

function showAuthScreen(msg){
  document.getElementById('shell').style.display = 'none';
  const el = document.getElementById('auth-screen');
  el.style.display = 'flex';
  el.innerHTML = authScreenHTML(msg);
}

function showApp(){
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('shell').style.display = 'flex';
}

function authScreenHTML(msg, mode){
  mode = mode || (window.__authMode || 'login');
  window.__authMode = mode;
  return `
  <div class="auth-wrap">
    <div class="auth-brand-panel">
      <div>
        <div class="auth-logo"><div class="mark-sq">L</div><div class="wordmark">Lekha</div></div>
        <h2>Run your books with confidence.</h2>
        <p class="tagline">One place for ledgers, statements, payroll and tax — synced securely across every device you work from.</p>
        <ul class="auth-feature-list">
          <li><span class="dot"></span>Journal entries that post straight through to every statement</li>
          <li><span class="dot"></span>Trial Balance, P&amp;L, Financial Position &amp; Cash Flow — built automatically</li>
          <li><span class="dot"></span>Payroll, tax settings and payslips, all in one ledger</li>
        </ul>
      </div>
      <div class="auth-foot">© ${new Date().getFullYear()} Lekha. Your data is encrypted and backed up automatically.</div>
    </div>
    <div class="auth-form-panel">
      <div class="mobile-logo"><div class="mark-sq">L</div><div class="wordmark">Lekha</div></div>
      <h1>${mode==='login'?'Sign in':'Create your account'}</h1>
      <p class="sub">${mode==='login'?'Access your books from any device.':'Your books, synced and backed up in the cloud.'}</p>
      ${msg ? `<div class="auth-msg">${esc(msg)}</div>` : ''}
      <label>Email</label>
      <input type="email" id="auth-email" placeholder="you@company.com" autocomplete="email">
      <label style="margin-top:12px;">Password</label>
      <input type="password" id="auth-password" placeholder="••••••••" autocomplete="${mode==='login'?'current-password':'new-password'}" onkeydown="if(event.key==='Enter') submitAuth('${mode}')">
      <button class="btn brass" style="width:100%;justify-content:center;margin-top:20px;padding:10px;" onclick="submitAuth('${mode}')">${mode==='login'?'Sign in':'Sign up'}</button>
      <p class="hint" style="text-align:center;margin-top:16px;">
        ${mode==='login' ? `New here? <a href="#" onclick="event.preventDefault();showAuthScreen(null);window.__authMode='signup';document.getElementById('auth-screen').innerHTML=authScreenHTML(null,'signup');">Create an account</a>`
                          : `Already have an account? <a href="#" onclick="event.preventDefault();document.getElementById('auth-screen').innerHTML=authScreenHTML(null,'login');">Sign in</a>`}
      </p>
    </div>
  </div>`;
}

async function submitAuth(mode){
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if(!email || !password){
    document.getElementById('auth-screen').innerHTML =
      authScreenHTML('Enter an email and password.', mode);
    return;
  }

  const { data, error } = mode==='login'
    ? await sb.auth.signInWithPassword({ email, password })
    : await sb.auth.signUp({ email, password });

  if(error){
    document.getElementById('auth-screen').innerHTML =
      authScreenHTML(error.message, mode);
    return;
  }

  if(mode==='signup' && !data.session){
    document.getElementById('auth-screen').innerHTML =
      authScreenHTML(
        'Check your inbox to confirm your email, then sign in.',
        'login'
      );
    return;
  }

  authUser = data.user;
  await bootApp();
}


/*
 * Clears locally cached company data for this application.
 * This prevents a new account on the same browser from inheriting
 * another user's locally cached bookkeeping data.
 */
function clearLocalAppStorage(){
  try{
    const keys = [];

    for(let i=0;i<localStorage.length;i++){
      keys.push(localStorage.key(i));
    }

    keys.forEach(k=>{
      if(k && k.indexOf('ledger_app_')===0){
        localStorage.removeItem(k);
      }
    });

  }catch(e){
    console.error(
      'Could not clear local storage on sign-out',
      e
    );
  }
}

async function signOutUser(){
  await sb.auth.signOut();

  authUser = null;
  state = null;
  activeCompanyId = null;

  clearLocalAppStorage();

  showAuthScreen(null);
}

async function initAuth(){
  const { data: { session } } = await sb.auth.getSession();

  if(session){
    authUser = session.user;
    await bootApp();
  }else{
    showAuthScreen(null);
  }
}

sb.auth.onAuthStateChange((event)=>{
  if(event==='SIGNED_OUT'){
    authUser = null;
    state = null;
    activeCompanyId = null;
    clearLocalAppStorage();
    showAuthScreen(null);
  }
});
