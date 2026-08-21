/* ============================= GLOBAL SEARCH ============================= */

// Searches ledgers (by name) and journal entries (by voucher, narration, or the name of any
// ledger touched by the entry) across the whole company.
// Only updates the #search-results dropdown, never calls the full render(),
// so the input never loses focus while typing.

let searchQuery = '';

function handleGlobalSearch(val){
  searchQuery = val;
  renderSearchResults();
}

function closeSearch(){
  searchQuery = '';

  const input = document.getElementById('global-search');
  if(input) input.value = '';

  const res = document.getElementById('search-results');
  if(res) res.innerHTML = '';
}

function handleSearchKeydown(ev){
  if(ev.key === 'Escape'){
    ev.target.blur();
    closeSearch();
  }

  if(ev.key === 'Enter'){
    const first = document.querySelector('#search-results .sr-item');
    if(first) first.click();
  }
}

function searchSelectLedger(id){
  selectedLedgerId = id;
  closeSearch();
  goTab('ledgerview');
}

function searchSelectEntry(id){
  closeSearch();
  startEditEntry(id);
}

function renderSearchResults(){
  const root = document.getElementById('search-results');

  if(!root) return;

  const q = (searchQuery || '').trim().toLowerCase();

  if(!q){
    root.innerHTML = '';
    return;
  }

  const ledgerMatches = state.ledgers.filter(l =>
    l.name.toLowerCase().includes(q)
  );

  const entryMatches = state.entries.filter(e => {

    if((e.voucher || '').toLowerCase().includes(q)){
      return true;
    }

    if((e.narration || '').toLowerCase().includes(q)){
      return true;
    }

    return e.lines.some(ln => {
      const led = ledgerById(ln.ledgerId);

      return led &&
             led.name.toLowerCase().includes(q);
    });

  }).sort((a,b) =>
    b.date.localeCompare(a.date)
  );

  const LMAX = 6;
  const EMAX = 6;

  const lShown = ledgerMatches.slice(0, LMAX);
  const eShown = entryMatches.slice(0, EMAX);

  if(!lShown.length && !eShown.length){

    root.innerHTML = `
      <div class="search-dropdown">
        <div class="sr-empty">
          No matches for "${esc(searchQuery)}"
        </div>
      </div>
    `;

    return;
  }

  let html = '<div class="search-dropdown">';

  /* ---------- Ledger Results ---------- */

  if(lShown.length){

    html += '<div class="sr-group-label">Ledgers</div>';

    lShown.forEach(l => {

      const g = groupById(l.groupId);

      html += `
        <div class="sr-item"
             onclick="searchSelectLedger('${l.id}')">

          <div class="sr-main">

            <div class="sr-title">
              ${esc(l.name)}
            </div>

            <div class="sr-sub">
              ${esc(g ? g.name : '')}
            </div>

          </div>

        </div>
      `;
    });

    if(ledgerMatches.length > LMAX){

      html += `
        <div class="sr-more">
          + ${ledgerMatches.length - LMAX}
          more ledger${ledgerMatches.length - LMAX === 1 ? '' : 's'}
        </div>
      `;
    }
  }

  /* ---------- Journal Entry Results ---------- */

  if(eShown.length){

    html += '<div class="sr-group-label">Journal Entries</div>';

    eShown.forEach(e => {

      const total = e.lines.reduce(
        (s, ln) => s + Number(ln.debit || 0),
        0
      );

      html += `
        <div class="sr-item"
             onclick="searchSelectEntry('${e.id}')">

          <div class="sr-main">

            <div class="sr-title">
              ${esc(e.voucher || '(no voucher no.)')}
              — ${esc(e.narration || '')}
            </div>

            <div class="sr-sub">
              ${e.date} · ${esc(e.voucherType || 'Journal')}
            </div>

          </div>

          <div class="sr-amt">
            ${fmt(total)}
          </div>

        </div>
      `;
    });

    if(entryMatches.length > EMAX){

      html += `
        <div class="sr-more">
          + ${entryMatches.length - EMAX}
          more entr${entryMatches.length - EMAX === 1 ? 'y' : 'ies'}
        </div>
      `;
    }
  }

  html += '</div>';

  root.innerHTML = html;
}


/* Close search dropdown when clicking outside */

document.addEventListener('click', (ev) => {

  const wrap = document.querySelector('.search-wrap');

  if(wrap && !wrap.contains(ev.target)){
    closeSearch();
  }

});

/* ============================= DASHBOARD ============================= */
function computeMonthlySeries(){
  const period = entriesInPeriod();
  const byMonth = {};
  period.forEach(e=>{
    const key = e.date.slice(0,7); // YYYY-MM
    if(!byMonth[key]) byMonth[key] = {income:0, expense:0};
    e.lines.forEach(ln=>{
      const g = groupById(ledgerById(ln.ledgerId)?.groupId);
      if(!g) return;
      if(g.nature==='Income') byMonth[key].income += Number(ln.credit||0)-Number(ln.debit||0);
      if(g.nature==='Expense') byMonth[key].expense += Number(ln.debit||0)-Number(ln.credit||0);
    });
  });
  const months = Object.keys(byMonth).sort();
  const last = months.slice(-6);
  return last.map(m=>{
    const d = new Date(m+'-01T00:00:00');
    const label = isNaN(d) ? m : d.toLocaleDateString('en-US',{month:'short'});
    return {month:m, label, income:byMonth[m].income, expense:byMonth[m].expense};
  });
}
function computeCashTrend(){
  const cashLedgerIds = new Set(state.ledgers.filter(l=>groupById(l.groupId)?.isCash).map(l=>l.id));
  let running = 0;
  state.ledgers.forEach(l=>{ if(cashLedgerIds.has(l.id)) running += l.openingType==='Dr' ? Number(l.openingBalance||0) : -Number(l.openingBalance||0); });
  const points = [{date:state.meta.periodStart, balance:running}];
  entriesInPeriod().forEach(e=>{
    let delta = 0;
    e.lines.forEach(ln=>{ if(cashLedgerIds.has(ln.ledgerId)) delta += Number(ln.debit||0)-Number(ln.credit||0); });
    if(Math.abs(delta)>0.004){ running += delta; points.push({date:e.date, balance:running}); }
  });
  return points;
}
function svgBarChart(series, w, h){
  if(!series.length) return `<div class="empty" style="padding:40px 8px;">No transactions in this period yet.</div>`;
  const padL=44, padB=22, padT=10, padR=8;
  const plotW = w-padL-padR, plotH = h-padT-padB;
  const maxVal = Math.max(1, ...series.flatMap(s=>[s.income,s.expense]));
  const niceMax = Math.pow(10, Math.floor(Math.log10(maxVal))) * Math.ceil(maxVal/Math.pow(10, Math.floor(Math.log10(maxVal))));
  const groupW = plotW/series.length;
  const barW = Math.min(20, groupW*0.32);
  let bars='', gridLines='', labels='';
  [0,0.5,1].forEach(f=>{
    const y = padT + plotH*(1-f);
    gridLines += `<line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="var(--rule)" stroke-width="1"/>`;
    gridLines += `<text x="${padL-8}" y="${y+3}" font-size="9" fill="var(--slate-light)" text-anchor="end" font-family="IBM Plex Mono, monospace">${fmtShort(niceMax*f)}</text>`;
  });
  series.forEach((s,i)=>{
    const cx = padL + groupW*i + groupW/2;
    const hInc = (s.income/niceMax)*plotH;
    const hExp = (s.expense/niceMax)*plotH;
    bars += `<rect x="${cx-barW-2}" y="${padT+plotH-hInc}" width="${barW}" height="${Math.max(hInc,0)}" rx="2" fill="var(--green)" opacity="0.85"/>`;
    bars += `<rect x="${cx+2}" y="${padT+plotH-hExp}" width="${barW}" height="${Math.max(hExp,0)}" rx="2" fill="var(--red)" opacity="0.85"/>`;
    labels += `<text x="${cx}" y="${h-6}" font-size="10" fill="var(--slate)" text-anchor="middle" font-family="Inter, sans-serif">${s.label}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;">${gridLines}${bars}${labels}</svg>`;
}
function svgAreaChart(points, w, h){
  if(points.length<2) return `<div class="empty" style="padding:40px 8px;">Not enough activity yet to chart a trend.</div>`;
  const padL=54, padB=20, padT=10, padR=8;
  const plotW = w-padL-padR, plotH = h-padT-padB;
  const vals = points.map(p=>p.balance);
  const minV = Math.min(0, ...vals), maxV = Math.max(...vals, 1);
  const range = (maxV-minV)||1;
  const x = i => padL + (plotW * i/(points.length-1));
  const y = v => padT + plotH * (1 - (v-minV)/range);
  const linePts = points.map((p,i)=>`${x(i)},${y(p.balance)}`).join(' ');
  const areaPts = `${x(0)},${y(minV)} ${linePts} ${x(points.length-1)},${y(minV)}`;
  let gridLines='';
  [0,0.5,1].forEach(f=>{
    const yy = padT+plotH*(1-f);
    const val = minV + range*f;
    gridLines += `<line x1="${padL}" y1="${yy}" x2="${w-padR}" y2="${yy}" stroke="var(--rule)" stroke-width="1"/>`;
    gridLines += `<text x="${padL-8}" y="${yy+3}" font-size="9" fill="var(--slate-light)" text-anchor="end" font-family="IBM Plex Mono, monospace">${fmtShort(val)}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;">
    <defs><linearGradient id="cashfill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--blue)" stop-opacity="0.28"/><stop offset="100%" stop-color="var(--blue)" stop-opacity="0.02"/>
    </linearGradient></defs>
    ${gridLines}
    <polygon points="${areaPts}" fill="url(#cashfill)"/>
    <polyline points="${linePts}" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(points.length-1)}" cy="${y(points[points.length-1].balance)}" r="3.2" fill="var(--blue)"/>
  </svg>`;
}
function fmtShort(n){
  const abs = Math.abs(n);
  if(abs>=100000) return (n/100000).toFixed(1)+'L';
  if(abs>=1000) return (n/1000).toFixed(1)+'k';
  return Math.round(n).toString();
}
function renderDashboard(){
  const tb = computeTrialBalance();
  const totalDr = tb.reduce((s,r)=>s+r.dr,0);
  const totalCr = tb.reduce((s,r)=>s+r.cr,0);
  const income = tb.filter(r=>r.group.nature==='Income').reduce((s,r)=>s+(r.cr-r.dr),0);
  const expense = tb.filter(r=>r.group.nature==='Expense').reduce((s,r)=>s+(r.dr-r.cr),0);
  const netProfit = income - expense;
  const cash = tb.filter(r=>r.group.isCash).reduce((s,r)=>s+(r.dr-r.cr),0);
  const assets = tb.filter(r=>r.group.nature==='Asset').reduce((s,r)=>s+(r.dr-r.cr),0);
  const recent = [...state.entries].sort((a,b)=> b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0,6);
  const balanced = Math.abs(totalDr-totalCr)<0.01;
  const monthly = computeMonthlySeries();
  const cashTrend = computeCashTrend();
  const natureColor = {Income:'var(--green)', Expense:'var(--red)', Asset:'var(--blue)', Liability:'var(--brass-dark)', Equity:'var(--ink)'};

  return `
  <div class="pagehead">
    <div><div class="eyebrow">Overview</div><h1>${esc(state.meta.companyName)}</h1><p class="sub">Books for the period ${state.meta.periodStart} to ${state.meta.periodEnd}.</p></div>
    <div id="toolbar-inline" class="no-print" style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn brass" onclick="goTab('journal')">${icon('journal','btn-icon')}New Journal Entry</button>
      <button class="btn secondary" onclick="openTBImportModal()">⬆ Import Trial Balance</button>
      <button class="btn secondary" onclick="downloadAllStatementsXLSX()" title="Trial Balance, P&amp;L, Financial Position, Changes in Equity, Cash Flow and Ratios — one workbook, one click">⬇ Complete Statements (Excel)</button>
      <button class="btn secondary" onclick="printAllStatements()" title="Same set as one continuous print job — use your browser's Save as PDF">🖶 Complete Statements (PDF)</button>
    </div>
  </div>
  <div class="kpi-row">
    <div class="kpi spine-blue"><div class="k-top"><span class="k-label">Total Assets</span>${icon('wallet','k-icon')}</div><div class="k-val">${fmt(assets)}</div><div class="k-sub">${state.ledgers.length} ledger${state.ledgers.length===1?'':'s'} tracked</div></div>
    <div class="kpi spine-ink"><div class="k-top"><span class="k-label">Cash &amp; Bank</span>${icon('banknote','k-icon')}</div><div class="k-val">${fmt(cash)}</div><div class="k-sub">as of ${state.meta.periodEnd}</div></div>
    <div class="kpi spine-green"><div class="k-top"><span class="k-label">Net Profit / (Loss)</span>${icon('trend','k-icon')}</div><div class="k-val ${netProfit>=0?'pos':'neg'}">${fmtSigned(netProfit)}</div><div class="k-sub">for the period</div></div>
    <div class="kpi spine-brass"><div class="k-top"><span class="k-label">Trial Balance</span>${icon('shieldCheck','k-icon')}</div><div class="k-val ${balanced?'pos':'neg'}">${balanced? 'Balanced' : 'Off by '+fmt(totalDr-totalCr)}</div><div class="k-sub">${balanced?'Books tie out':'Needs review'}</div></div>
  </div>
  <div class="grid-cols">
    <div class="sheet">
      <div class="card-title"><span class="card-title-row">${icon('pl','card-icon')}Income vs Expenses</span></div>
      <div class="chart-legend"><span class="lg"><span class="sw" style="background:var(--green);"></span>Income</span><span class="lg"><span class="sw" style="background:var(--red);"></span>Expense</span></div>
      ${svgBarChart(monthly, 460, 190)}
    </div>
    <div class="sheet">
      <div class="card-title"><span class="card-title-row">${icon('cashflow','card-icon')}Cash Position Trend</span></div>
      ${svgAreaChart(cashTrend, 460, 190)}
    </div>
  </div>
  <div class="grid-cols">
    <div class="sheet">
      <div class="card-title">Recent Activity</div>
      ${recent.length? recent.map(e=>{
        const dominant = e.lines.reduce((best,l)=>{
          const g = groupById(ledgerById(l.ledgerId)?.groupId);
          if(!g) return best;
          if(g.nature==='Income' && Number(l.credit||0)>0) return 'Income';
          if(g.nature==='Expense' && Number(l.debit||0)>0) return best==='Income'?best:'Expense';
          return best;
        }, null);
        const dotColor = natureColor[dominant] || 'var(--slate-light)';
        return `<div class="activity-row">
          <span class="activity-dot" style="background:${dotColor};"></span>
          <span class="num muted" style="width:76px;flex-shrink:0;">${e.date}</span>
          <span class="a-narr">${esc(e.narration||'—')}</span>
          <span class="num">${fmt(e.lines.reduce((s,l)=>s+Number(l.debit||0),0))}</span>
        </div>`;
      }).join('')
        : `<div class="empty">No journal entries yet. Start by adding one.</div>`}
    </div>
    <div class="sheet">
      <div class="card-title">Quick Start</div>
      <ul class="checklist">
        <li><span class="cl-num">1</span><span>Review <b>Chart of Accounts</b> — adjust groups &amp; add your ledgers.</span></li>
        <li><span class="cl-num">2</span><span>Record transactions in <b>New Journal Entry</b>.</span></li>
        <li><span class="cl-num">3</span><span>Check postings anytime in <b>View Ledger</b> or <b>Trial Balance</b>.</span></li>
        <li><span class="cl-num">4</span><span>Statements — P&amp;L, Financial Position, Equity, Cash Flow — build automatically.</span></li>
        <li><span class="cl-num">5</span><span>Back up your data any time from <b>Settings</b>.</span></li>
      </ul>
    </div>
  </div>`;
}
