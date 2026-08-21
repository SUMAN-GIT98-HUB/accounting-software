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
