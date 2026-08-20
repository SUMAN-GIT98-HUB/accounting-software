/* ============================= UI SHELL ============================= */
const TABS = [
  {id:'dashboard', label:'Dashboard', icon:'dashboard', section:'Overview'},
  {id:'journal', label:'New Journal Entry', icon:'journal', section:'Books'},
  {id:'templates', label:'Recurring Entries', icon:'repeat', section:'Books'},
  {id:'register', label:'Journal Register', icon:'register', section:'Books'},
  {id:'ledgerview', label:'View Ledger', icon:'ledgerview', section:'Books'},
  {id:'trialbalance', label:'Trial Balance', icon:'trialbalance', section:'Statements'},
  {id:'pl', label:'Profit & Loss', icon:'pl', section:'Statements'},
  {id:'sfp', label:'Financial Position', icon:'sfp', section:'Statements'},
  {id:'equity', label:'Changes in Equity', icon:'equity', section:'Statements'},
  {id:'cashflow', label:'Cash Flow', icon:'cashflow', section:'Statements'},
  {id:'fixedassets', label:'Fixed Asset Register', icon:'assets', section:'Reports'},
  {id:'inventory', label:'Inventory Register', icon:'box', section:'Reports'},
  {id:'ageing', label:'Ageing Analysis', icon:'ageing', section:'Reports'},
  {id:'ratios', label:'Ratio Analysis', icon:'ratios', section:'Reports'},
  {id:'payroll', label:'Payroll', icon:'payroll', section:'Reports'},
  {id:'accounts', label:'Chart of Accounts', icon:'accounts', section:'Setup'},
  {id:'settings', label:'Settings & Backup', icon:'settings', section:'Setup'},
];
const TAB_SECTIONS = ['Overview','Books','Statements','Reports','Setup'];
let activeTab = 'dashboard';

function renderNav(){
  const nav = document.getElementById('nav');
  nav.innerHTML = TAB_SECTIONS.map(sec=>{
    const tabs = TABS.filter(t=>t.section===sec);
    return `<div class="nav-section"><div class="grp-label">${sec}</div>${tabs.map(t=>
      `<button class="tab ${t.id===activeTab?'active':''}" onclick="goTab('${t.id}')">${icon(t.icon)}${t.label}</button>`
    ).join('')}</div>`;
  }).join('');
  document.getElementById('brand-co').textContent = state.meta.companyName || 'Company';
  document.getElementById('brand-period').textContent = 'FY ' + state.meta.periodStart + ' → ' + state.meta.periodEnd;
  const brandMark = document.getElementById('brand-mark');
  if(brandMark){
    brandMark.innerHTML = state.meta.logoDataUrl ? `<img src="${state.meta.logoDataUrl}" alt="Logo">` : '₹';
    brandMark.classList.toggle('has-logo', !!state.meta.logoDataUrl);
  }
  const tp = document.getElementById('topbar-period');
  if(tp) tp.textContent = state.meta.periodStart + '  →  ' + state.meta.periodEnd;
  const companies = listCompanies();
  const cs = document.getElementById('company-switcher');
  if(cs){
    cs.innerHTML = companies.length ? `
      <div style="padding:0 14px 14px;display:flex;gap:6px;align-items:center;">
        <select onchange="handleCompanySwitch(this.value)" style="flex:1;min-width:0;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);color:#C7D0E4;font-size:12px;padding:6px 8px;border-radius:5px;cursor:pointer;">
          ${companies.map(c=>`<option value="${c.id}" ${c.id===activeCompanyId?'selected':''}>${esc(c.name)}</option>`).join('')}
        </select>
        <button onclick="openNewCompanyModal()" title="Add new company" style="flex-shrink:0;width:26px;height:26px;border-radius:5px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#C7D0E4;font-size:15px;line-height:1;cursor:pointer;">+</button>
      </div>` : '';
  }
}
function goTab(id){
  activeTab = id;
  if(id==='journal' && editingEntryId===null){ jLines = [ {ledgerId:'', debit:'', credit:'', fxAmount:'', fxRate:'', fxSide:'debit'}, {ledgerId:'', debit:'', credit:'', fxAmount:'', fxRate:'', fxSide:'debit'} ]; jNewLedgerLineIndex = null; jVoucherType = 'Journal'; }
  document.getElementById('sidebar').classList.remove('open');
  render();
  window.scrollTo(0,0);
}
function render(){
  renderNav();
  const c = document.getElementById('content');
  const fns = {
    dashboard: renderDashboard, accounts: renderAccounts, journal: renderJournal, templates: renderTemplates,
    register: renderRegister, ledgerview: renderLedgerView, trialbalance: renderTrialBalance,
    pl: renderPL, sfp: renderSFP, equity: renderEquity, cashflow: renderCashflow, fixedassets: renderFixedAssets, inventory: renderInventory, ageing: renderAgeing, ratios: renderRatios, payroll: renderPayroll, settings: renderSettings
  };
  c.innerHTML = fns[activeTab] ? fns[activeTab]() : '<p>Not found</p>';
  if(activeTab==='accounts' && editingGroupId){
    const g = editingGroupId==='NEW' ? null : groupById(editingGroupId);
    refreshGroupSubcats(g ? g.subCategory : null);
  }
}

