
/* ============================= CHART OF ACCOUNTS ============================= */
let editingGroupId = null, editingLedgerId = null;
let editingAssetCatId = null, editingAssetId = null, disposingAssetId = null, postingDisposalAssetId = null;
let editingStockItemId = null, editingStockTxnId = null, stockTxnFormType = null, selectedStockItemId = null;
function renderAccounts(){
  const groups = state.groups;
  const natures = ['Asset','Liability','Equity','Income','Expense'];
  return `
  <div class="pagehead"><div><div class="eyebrow">Setup</div><h1>Chart of Accounts</h1><p class="sub">Groups classify your ledgers for the statements. Ledgers are the individual accounts you post journal entries to.</p></div>
  <div class="no-print"><button class="btn secondary" onclick="openTBImportModal()">⬆ Import Trial Balance</button></div></div>

  <div class="sheet">
    <div class="card-title">Groups <span class="tag">${groups.length}</span></div>
    <table><thead><tr><th>Group</th><th>Nature</th><th>Sub-category</th><th>Cash-flow activity</th><th></th></tr></thead>
    <tbody>
    ${groups.map(g=> g.id===editingGroupId ? groupEditRow(g) : `
      <tr>
        <td>${g.isCash?'<span title="Cash & equivalents">💰</span> ':''}${esc(g.name)}${g.nonCash?' <span class="tag" title="Non-cash — added back in the Indirect method">non-cash</span>':''}</td>
        <td><span class="tag">${g.nature}</span></td>
        <td>${g.subCategory}</td>
        <td>${g.cf}</td>
        <td class="actions-cell">
          <button class="btn secondary small" onclick="editGroup('${g.id}')">Edit</button>
          <button class="btn danger small" onclick="deleteGroup('${g.id}')">Delete</button>
        </td>
      </tr>`).join('')}
    ${editingGroupId==='NEW' ? groupEditRow(null) : ''}
    </tbody></table>
    ${editingGroupId!=='NEW' ? `<div style="margin-top:14px;"><button class="btn secondary" onclick="editGroup('NEW')">+ Add Group</button></div>` : ''}
  </div>

  <div class="sheet">
    <div class="card-title">Ledgers <span class="tag">${state.ledgers.length}</span></div>
    <table><thead><tr><th>Ledger</th><th>Group</th><th class="num">Opening Balance</th><th></th></tr></thead>
    <tbody>
    ${state.ledgers.map(l=> l.id===editingLedgerId ? ledgerEditRow(l) : `
      <tr>
        <td>${esc(l.name)} ${l.currency && l.currency!==baseCurrency() ? `<span class="tag" title="Foreign currency ledger">🌐 ${esc(l.currency)}</span>`:''}</td>
        <td>${esc(groupById(l.groupId)?.name || '—')}</td>
        <td class="num">${fmt(l.openingBalance)} <span class="tag ${l.openingType==='Dr'?'dr':'cr'}">${l.openingType}</span></td>
        <td class="actions-cell">
          <button class="btn secondary small" onclick="editLedger('${l.id}')">Edit</button>
          <button class="btn danger small" onclick="deleteLedger('${l.id}')">Delete</button>
        </td>
      </tr>`).join('')}
    ${editingLedgerId==='NEW' ? ledgerEditRow(null) : ''}
    </tbody></table>
    ${state.ledgers.length===0 && editingLedgerId!=='NEW' ? '<div class="empty">No ledgers yet — add one under a group above.</div>':''}
    ${editingLedgerId!=='NEW' ? `<div style="margin-top:14px;"><button class="btn secondary" onclick="editLedger('NEW')">+ Add Ledger</button></div>` : ''}
  </div>`;
}
function groupEditRow(g){
  const isNew = !g;
  g = g || {id:'', name:'', nature:'Asset', subCategory:'Current', cf:'Operating', isCash:false, nonCash:false};
  const natures = ['Asset','Liability','Equity','Income','Expense'];
  return `<tr>
    <td><input type="text" id="ge-name" value="${esc(g.name)}" placeholder="Group name"></td>
    <td><select id="ge-nature" onchange="refreshGroupSubcats()">${natures.map(n=>`<option value="${n}" ${n===g.nature?'selected':''}>${n}</option>`).join('')}</select></td>
    <td><select id="ge-sub"></select></td>
    <td>
      <select id="ge-cf">${CF_OPTIONS.map(c=>`<option value="${c}" ${c===g.cf?'selected':''}>${c}</option>`).join('')}</select>
      <label style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-weight:400;"><input type="checkbox" id="ge-cash" ${g.isCash?'checked':''} style="width:auto;"> Is cash/bank</label>
      <label style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-weight:400;"><input type="checkbox" id="ge-noncash" ${g.nonCash?'checked':''} style="width:auto;"> Non-cash (add back in Indirect Cash Flow)</label>
      <p class="hint" style="margin-top:2px;">Check this for Income/Expense groups with no cash impact of their own — e.g. Depreciation &amp; Amortization, or Gain/Loss on Disposal of Assets — so the Indirect method removes them from Net Profit correctly.</p>
    </td>
    <td class="actions-cell">
      <button class="btn small" onclick="saveGroup('${isNew?'':g.id}')">Save</button>
      <button class="btn secondary small" onclick="cancelGroupEdit()">Cancel</button>
    </td>
  </tr>`;
}
function refreshGroupSubcats(preset){
  const nature = document.getElementById('ge-nature').value;
  const sel = document.getElementById('ge-sub');
  const opts = NATURE_SUBCATS[nature];
  sel.innerHTML = opts.map(o=>`<option value="${o}">${o}</option>`).join('');
  if(preset && opts.includes(preset)) sel.value = preset;
}
function editGroup(id){ editingGroupId = id; editingLedgerId = null; render(); }
function cancelGroupEdit(){ editingGroupId = null; render(); }
function saveGroup(id){
  const name = document.getElementById('ge-name').value.trim();
  if(!name){ toast('Group name is required'); return; }
  const nature = document.getElementById('ge-nature').value;
  const subCategory = document.getElementById('ge-sub').value;
  const cf = document.getElementById('ge-cf').value;
  const isCash = document.getElementById('ge-cash').checked;
  const nonCash = document.getElementById('ge-noncash').checked;
  if(id){
    const g = groupById(id);
    Object.assign(g,{name,nature,subCategory,cf,isCash,nonCash});
  } else {
    state.groups.push({id:uid('g'),name,nature,subCategory,cf,isCash,nonCash});
  }
  persist(); editingGroupId=null; render(); toast('Group saved');
}
function deleteGroup(id){
  if(ledgersInGroup(id).length){ toast('Cannot delete — ledgers still use this group'); return; }
  if(!confirm('Delete this group?')) return;
  state.groups = state.groups.filter(g=>g.id!==id);
  persist(); render(); toast('Group deleted');
}

function ledgerEditRow(l){
  const isNew = !l;
  l = l || {id:'', name:'', groupId: state.groups[0]?.id||'', openingBalance:0, openingType:'Dr', currency:''};
  return `<tr>
    <td>
      <input type="text" id="le-name" value="${esc(l.name)}" placeholder="Ledger name">
      <select id="le-currency" style="margin-top:6px;" title="Leave as base currency unless this ledger holds a foreign-currency balance (e.g. a USD bank account)">
        <option value="" ${!l.currency?'selected':''}>Base currency (${baseCurrency()})</option>
        ${CURRENCIES.filter(c=>c!==baseCurrency()).map(c=>`<option value="${c}" ${l.currency===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </td>
    <td><select id="le-group">${state.groups.map(g=>`<option value="${g.id}" ${g.id===l.groupId?'selected':''}>${esc(g.name)}</option>`).join('')}</select></td>
    <td>
      <div style="display:flex;gap:6px;">
        <input type="number" step="0.01" id="le-amt" value="${l.openingBalance}" style="width:110px;">
        <select id="le-type" style="width:70px;"><option value="Dr" ${l.openingType==='Dr'?'selected':''}>Dr</option><option value="Cr" ${l.openingType==='Cr'?'selected':''}>Cr</option></select>
      </div>
      <p class="hint" style="margin:6px 0 0;">Opening balance for a foreign-currency ledger should be entered in base currency (${baseCurrency()}).</p>
    </td>
    <td class="actions-cell">
      <button class="btn small" onclick="saveLedger('${isNew?'':l.id}')">Save</button>
      <button class="btn secondary small" onclick="cancelLedgerEdit()">Cancel</button>
    </td>
  </tr>`;
}
function editLedger(id){ editingLedgerId = id; editingGroupId = null; render(); }
function cancelLedgerEdit(){ editingLedgerId = null; render(); }
function saveLedger(id){
  const name = document.getElementById('le-name').value.trim();
  if(!name){ toast('Ledger name is required'); return; }
  const groupId = document.getElementById('le-group').value;
  const openingBalance = Number(document.getElementById('le-amt').value||0);
  const openingType = document.getElementById('le-type').value;
  const currency = document.getElementById('le-currency').value;
  if(id){
    const l = ledgerById(id);
    Object.assign(l,{name,groupId,openingBalance,openingType,currency});
  } else {
    state.ledgers.push({id:uid('l'),name,groupId,openingBalance,openingType,currency});
  }
  persist(); editingLedgerId=null; render(); toast('Ledger saved');
}
function deleteLedger(id){
  const used = state.entries.some(e=>e.lines.some(l=>l.ledgerId===id));
  if(used){ toast('Cannot delete — ledger is used in journal entries'); return; }
  if(!confirm('Delete this ledger?')) return;
  state.ledgers = state.ledgers.filter(l=>l.id!==id);
  persist(); render(); toast('Ledger deleted');
}
