/* ============================= STATE / DATA LAYER ============================= */
const STORAGE_KEY = 'ledger_app_state_v1'; // legacy single-company key, used for one-time migration
const COMPANIES_KEY = 'ledger_app_companies_v1';
const ACTIVE_COMPANY_KEY = 'ledger_app_active_company_v1';
function companyStateKey(id){ return 'ledger_app_state_v1__'+id; }

function uid(prefix){ return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function defaultGroups(){
  // nature: Asset|Liability|Equity|Income|Expense
  // subCategory depends on nature (see NATURE_SUBCATS)
  // cf: cash-flow activity classification used for the Statement of Cash Flow (Operating/Investing/Financing/Excluded)
  // nonCash: for Income/Expense groups — flags a non-cash item to add back/deduct under the Indirect method (e.g. Depreciation)
  const G = (id,name,nature,subCategory,cf,isCash,nonCash)=>({id,name,nature,subCategory,cf,isCash:!!isCash,nonCash:!!nonCash});
  return [
    G('g1','Property, Plant & Equipment','Asset','Non-Current','Investing'),
    G('g2','Intangible Assets','Asset','Non-Current','Investing'),
    G('g3','Long-term Investments','Asset','Non-Current','Investing'),
    G('g4','Cash and Cash Equivalents','Asset','Cash','Excluded',true),
    G('g5','Trade Receivables','Asset','Current','Operating'),
    G('g6','Inventory','Asset','Current','Operating'),
    G('g7','Prepaid Expenses','Asset','Current','Operating'),
    G('g8','Advances & Deposits','Asset','Current','Operating'),
    G('g9','Other Current Assets','Asset','Current','Operating'),
    G('g10','Long-term Loans','Liability','Non-Current','Financing'),
    G('g11','Deferred Tax Liability','Liability','Non-Current','Operating'),
    G('g12','Trade Payables','Liability','Current','Operating'),
    G('g13','Short-term Loans','Liability','Current','Financing'),
    G('g14','Accrued Expenses','Liability','Current','Operating'),
    G('g15','Advances Received','Liability','Current','Operating'),
    G('g16','Provisions','Liability','Current','Operating'),
    G('g17','TDS Payable','Liability','Current','Operating'),
    G('g18','VAT Payable','Liability','Current','Operating'),
    G('g19','Other Current Liabilities','Liability','Current','Operating'),
    G('g20','Share Capital','Equity','Equity','Financing'),
    G('g21','Retained Earnings','Equity','Equity','Financing'),
    G('g22','Reserves & Surplus','Equity','Equity','Financing'),
    G('g23','Sales Revenue','Income','Direct','Operating'),
    G('g24','Other Income','Income','Indirect','Operating'),
    G('g25','Cost of Sales / Direct Expenses','Expense','Direct','Operating'),
    G('g26','Administrative Expenses','Expense','Indirect','Operating'),
    G('g27','Selling & Distribution Expenses','Expense','Indirect','Operating'),
    G('g28','Finance Costs','Expense','Indirect','Operating'),
    G('g29','Depreciation & Amortization','Expense','Indirect','Operating',false,true),
  ];
}
function defaultLedgers(){
  return [
    {id:'l1',name:'Cash in Hand',groupId:'g4',openingBalance:0,openingType:'Dr'},
    {id:'l2',name:'Bank Account',groupId:'g4',openingBalance:0,openingType:'Dr'},
    {id:'l3',name:'Share Capital',groupId:'g20',openingBalance:0,openingType:'Cr'},
    {id:'l4',name:'Retained Earnings',groupId:'g21',openingBalance:0,openingType:'Cr'},
  ];
}
function defaultState(){
  const today = new Date();
  const y = today.getFullYear();
  return {
    meta:{ companyName:'My Company Pvt. Ltd.', periodStart:(y)+'-01-01', periodEnd:(y)+'-12-31', logoDataUrl:'', address:'', email:'', phone:'', currency:'NPR' },
    groups: defaultGroups(),
    ledgers: defaultLedgers(),
    entries: [],
    templates: [],
    assetCategories: [],
    assets: [],
    stockItems: [],
    stockTxns: [],
    employees: [],
    payrollTax: defaultPayrollTax(),
    payrollRuns: []
  };
}
function defaultPayrollTax(){
  // Generic, fully editable progressive-slab model — defaults are placeholders only.
  // Nepal's income tax slabs, SSF rates and the SSF exemption rule change most fiscal
  // years, so nothing here should be relied on as authoritative; always confirm current
  // figures against the FY's Finance Act before running real payroll.
  return {
    slabsSingle: [
      {upto:500000, rate:1},
      {upto:700000, rate:10},
      {upto:1000000, rate:20},
      {upto:2000000, rate:30},
      {upto:null, rate:36}
    ],
    slabsCouple: [
      {upto:600000, rate:1},
      {upto:800000, rate:10},
      {upto:1100000, rate:20},
      {upto:2000000, rate:30},
      {upto:null, rate:36}
    ],
       ssfEmployeeRate: 11,
    ssfEmployerRate: 20,
    ssfBase: 'basic', // 'basic' or 'gross'
    ssfDeductibleFromTaxable: true,
    waiveFirstSlabIfSSF: true, // treats the first slab as the SST portion, waived when the employee is SSF-enrolled
    roundTax: true,
    // Retirement contribution deduction (SSF + CIT combined) — Income Tax Act style rule:
    // deductible amount is the LOWEST of the actual contribution, this absolute annual cap,
    // and this fraction of assessable (gross) income. All editable — confirm against the
    // current Finance Act before relying on these for real payroll.
    retirementCombinedCap: 500000,
    retirementFractionPercent: 33.33,
    lifeInsuranceCap: 40000,
    otherDeductionLabel: 'Other Allowable Deduction (e.g. health insurance)',
    otherDeductionCap: 20000
  };
}

let state = null;
let activeCompanyId = null;
let editingCompanyId = null; // 'NEW' | company id | null, for the Companies panel in Settings

function listCompanies(){
  try{ return JSON.parse(localStorage.getItem(COMPANIES_KEY)||'[]'); }catch(e){ return []; }
}
function saveCompanyRegistry(list){
  try{ localStorage.setItem(COMPANIES_KEY, JSON.stringify(list)); }catch(e){ console.error('Could not save company list', e); }
}
function peekCompanyStats(id){
  try{
    const raw = localStorage.getItem(companyStateKey(id));
    if(!raw) return {ledgers:0, entries:0};
    const st = JSON.parse(raw);
    return {ledgers:(st.ledgers||[]).length, entries:(st.entries||[]).length};
  }catch(e){ return {ledgers:0, entries:0}; }
}
function loadState(){
  try{
    let companies = listCompanies();
    if(!companies.length){
      // Fresh install, or pre-multi-company data saved under the old single-company key — migrate it in as the first company.
      const legacyRaw = localStorage.getItem(STORAGE_KEY);
      const id = uid('co');
      if(legacyRaw){
        const legacyState = JSON.parse(legacyRaw);
        localStorage.setItem(companyStateKey(id), legacyRaw);
        companies = [{id, name: legacyState.meta?.companyName || 'My Company'}];
      } else {
        const st = defaultState();
        localStorage.setItem(companyStateKey(id), JSON.stringify(st));
        companies = [{id, name: st.meta.companyName}];
      }
      saveCompanyRegistry(companies);
      localStorage.setItem(ACTIVE_COMPANY_KEY, id);
    }
    let activeId = localStorage.getItem(ACTIVE_COMPANY_KEY);
    if(!activeId || !companies.some(c=>c.id===activeId)) activeId = companies[0].id;
    activeCompanyId = activeId;
    const raw = localStorage.getItem(companyStateKey(activeId));
    state = raw ? JSON.parse(raw) : defaultState();
    migrateState();
  }catch(e){
    console.error('Load failed, using defaults', e);
    state = defaultState();
    if(!activeCompanyId) activeCompanyId = uid('co');
  }
}
function migrateState(){
  // Backward-compatibility: older saved data may predate the nonCash flag on groups.
  (state.groups||[]).forEach(g=>{
    if(g.nonCash===undefined){
      g.nonCash = g.nature==='Expense' && /deprec|amortiz/i.test(g.name||'');
    }
  });
  // Backward-compatibility: older saved data predates voucher types and templates.
  (state.entries||[]).forEach(e=>{ if(!e.voucherType) e.voucherType = 'Journal'; });
  if(!state.templates) state.templates = [];
  // Backward-compatibility: older saved data predates the Fixed Asset Register.
  if(!state.assetCategories) state.assetCategories = [];
  if(!state.assets) state.assets = [];
  // Backward-compatibility: older saved data predates the Inventory Register.
  if(!state.stockItems) state.stockItems = [];
  if(!state.stockTxns) state.stockTxns = [];
  // Backward-compatibility: older saved data predates Payroll.
 if(!state.employees) state.employees = [];
  if(!state.payrollTax) state.payrollTax = defaultPayrollTax();
  // Backward-compatibility: older saved data predates the CIT / life insurance / other
  // allowable deduction fields on Tax Settings — merge in defaults for any that are missing.
  {
    const ptDefaults = defaultPayrollTax();
    ['retirementCombinedCap','retirementFractionPercent','lifeInsuranceCap','otherDeductionLabel','otherDeductionCap'].forEach(k=>{
      if(state.payrollTax[k]===undefined) state.payrollTax[k] = ptDefaults[k];
    });
  }
  if(!state.payrollRuns) state.payrollRuns = [];
}
function persist(){
  try{
    localStorage.setItem(companyStateKey(activeCompanyId), JSON.stringify(state));
    const companies = listCompanies();
    const idx = companies.findIndex(c=>c.id===activeCompanyId);
    if(idx>=0 && companies[idx].name !== state.meta.companyName){
      companies[idx].name = state.meta.companyName;
      saveCompanyRegistry(companies);
    }
    schedulePush();
  }
  catch(e){ console.error('Save failed', e); toast('Could not save — storage unavailable in this view'); }
}
