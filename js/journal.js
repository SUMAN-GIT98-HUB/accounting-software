/* ============================= JOURNAL ENTRY ============================= */
function renderJournal(){
  const total = {d:0,c:0};
  jLines.forEach(l=>{ total.d += Number(l.debit||0); total.c += Number(l.credit||0); });
  const diff = Math.round((total.d-total.c)*100)/100;
  const balanced = Math.abs(diff) < 0.005 && total.d>0;
  const validLines = jLines.filter(l=>l.ledgerId && (Number(l.debit||0)>0 || Number(l.credit||0)>0)).length >= 2;

  return `
  <div class="pagehead"><div><div class="eyebrow">${editingEntryId?'Editing entry':'Post a transaction'}</div><h1>${editingEntryId?'Edit Journal Entry':'New Journal Entry'}</h1><p class="sub">Every entry must balance — total debits must equal total credits.</p></div></div>
  <div class="sheet">
    <div class="row3">
      <div class="field"><label>Voucher Type</label><select id="j-vtype" onchange="jVoucherType=this.value;render();">${VOUCHER_TYPES.map(v=>`<option value="${v}" ${v===jVoucherType?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Date</label><input type="date" id="j-date" value="${jDate || todayISO()}"></div>
      <div class="field"><label>Narration</label><input type="text" id="j-narr" value="${esc(jNarr||'')}" placeholder="Brief description of the transaction"></div>
    </div>
    <div class="hint" style="margin:-6px 0 12px;">${VOUCHER_HINT[jVoucherType]||''} ${!editingEntryId?`Will be numbered <b class="num">${nextVoucherNo(jVoucherType)}</b>.`:''}</div>
    <div style="margin-top:16px;margin-bottom:6px;">
      <div class="jline" style="font-size:11px;color:var(--slate);text-transform:uppercase;letter-spacing:.05em;"><span>Ledger</span><span>Debit</span><span>Credit</span><span></span></div>
      ${jLines.map((l,i)=>{
        const foreign = isForeignLedger(l.ledgerId);
        const led = ledgerById(l.ledgerId);
        const fxComputed = Math.round(Number(l.fxAmount||0)*Number(l.fxRate||0)*100)/100;
        return `
        <div class="jline-wrap">
        <div class="jline">
          <select onchange="handleJLedgerSelect(${i}, this.value)">
            <option value="">— select ledger —</option>
            ${state.ledgers.map(led2=>`<option value="${led2.id}" ${led2.id===l.ledgerId?'selected':''}>${esc(led2.name)}${led2.currency&&led2.currency!==baseCurrency()?' ('+esc(led2.currency)+')':''}</option>`).join('')}
            <option value="__NEW__" style="font-weight:600;">+ Create new ledger…</option>
          </select>
          <input type="number" step="0.01" id="jd-${i}" placeholder="0.00" value="${l.debit}" ${foreign?'readonly':''} oninput="onDebitInput(${i}, this.value)">
          <input type="number" step="0.01" id="jc-${i}" placeholder="0.00" value="${l.credit}" ${foreign?'readonly':''} oninput="onCreditInput(${i}, this.value)">
          <button class="rm" onclick="removeJLine(${i})" title="Remove line">✕</button>
        </div>
        ${foreign ? `
        <div class="jline-fx">
          <span class="fx-badge">🌐 ${esc(led.currency)}</span>
          <select id="jfxs-${i}" onchange="onFxSideChange(${i}, this.value)">
            <option value="debit" ${l.fxSide!=='credit'?'selected':''}>Dr</option>
            <option value="credit" ${l.fxSide==='credit'?'selected':''}>Cr</option>
          </select>
          <input type="number" step="0.0001" id="jfxa-${i}" placeholder="Amount in ${esc(led.currency)}" value="${l.fxAmount}" oninput="onFxInput(${i})" style="width:140px;">
          <span class="fx-at">@ rate</span>
          <input type="number" step="0.0001" id="jfxr-${i}" placeholder="e.g. 133.50" value="${l.fxRate}" oninput="onFxInput(${i})" style="width:100px;">
          <span class="fx-eq" id="jfxeq-${i}">= ${baseCurrency()} ${fmt(fxComputed)}</span>
        </div>` : ''}
        </div>`;
      }).join('')}
      <button class="btn secondary small" style="margin-top:6px;" onclick="addJLine()">+ Add Line</button>
    </div>
    ${jNewLedgerLineIndex!==null ? `
    <div class="sheet tight" style="background:#FBF0DA;border-color:var(--brass);margin:4px 0 16px;">
      <div class="card-title" style="margin-bottom:10px;padding-bottom:8px;">New Ledger for Line ${jNewLedgerLineIndex+1}<button class="btn secondary small" onclick="cancelNewLedgerFromJournal()">Cancel</button></div>
      <div class="row3">
        <div class="field"><label>Ledger Name</label><input type="text" id="jnl-name" placeholder="e.g. Office Rent"></div>
        <div class="field"><label>Group</label><select id="jnl-group">${state.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Opening Balance</label>
          <div style="display:flex;gap:6px;">
            <input type="number" step="0.01" id="jnl-amt" value="0" style="width:100%;">
            <select id="jnl-type" style="width:78px;"><option value="Dr">Dr</option><option value="Cr">Cr</option></select>
          </div>
        </div>
      </div>
      <button class="btn brass small" onclick="saveNewLedgerFromJournal()">Save &amp; Use Ledger</button>
    </div>` : ''}
    <div class="jtotals">
      <div><span class="lbl">Total Debit</span><span class="num" id="jt-debit">${fmt(total.d)}</span></div>
      <div><span class="lbl">Total Credit</span><span class="num" id="jt-credit">${fmt(total.c)}</span></div>
      <div><span class="lbl">Difference</span><span class="num balance-flag ${Math.abs(diff)<0.005?'pos':'neg'}" id="jt-diff">${fmt(diff)}</span></div>
    </div>
    ${!editingEntryId ? `
    <div class="field no-print" style="margin-top:14px;">
      <label style="display:inline-flex;align-items:center;gap:6px;font-weight:400;">
        <input type="checkbox" id="j-save-template" style="width:auto;" onchange="document.getElementById('j-template-name-wrap').style.display=this.checked?'block':'none';">
        Also save as a reusable template
      </label>
      <div id="j-template-name-wrap" style="display:none;margin-top:8px;max-width:340px;">
        <input type="text" id="j-template-name" placeholder="Template name (e.g. Monthly Office Rent)">
      </div>
    </div>` : ''}
    <div style="margin-top:16px;display:flex;gap:10px;">
      <button class="btn brass" id="j-save-btn" ${(!balanced||!validLines)?'disabled':''} onclick="saveJournalEntry()">${editingEntryId?'Update Entry':'Save Entry'}</button>
      ${editingEntryId?'<button class="btn secondary" onclick="cancelJournalEdit()">Cancel</button>':''}
    </div>
    <div id="j-hint">${!validLines? '<div class="hint">Add at least two lines with a ledger and an amount.</div>' : (!balanced? '<div class="hint">Entry is not balanced yet.</div>':'')}</div>
  </div>`;
}
function onDebitInput(i, val){
  jLines[i].debit = val;
  if(val){ jLines[i].credit=''; const c=document.getElementById('jc-'+i); if(c) c.value=''; }
  updateJTotals();
}
function onCreditInput(i, val){
  jLines[i].credit = val;
  if(val){ jLines[i].debit=''; const d=document.getElementById('jd-'+i); if(d) d.value=''; }
  updateJTotals();
}
function updateJTotals(){
  let d=0,c=0;
  jLines.forEach(l=>{ d+=Number(l.debit||0); c+=Number(l.credit||0); });
  const diff = Math.round((d-c)*100)/100;
  const balanced = Math.abs(diff)<0.005 && d>0;
  const validLines = jLines.filter(l=>l.ledgerId && (Number(l.debit||0)>0||Number(l.credit||0)>0)).length>=2;
  const de=document.getElementById('jt-debit'); if(de) de.textContent=fmt(d);
  const ce=document.getElementById('jt-credit'); if(ce) ce.textContent=fmt(c);
  const df=document.getElementById('jt-diff'); if(df){ df.textContent=fmt(diff); df.className='num balance-flag '+(Math.abs(diff)<0.005?'pos':'neg'); }
  const btn=document.getElementById('j-save-btn'); if(btn) btn.disabled = !(balanced&&validLines);
  const hint=document.getElementById('j-hint');
  if(hint){
    if(!validLines) hint.innerHTML='<div class="hint">Add at least two lines with a ledger and an amount.</div>';
    else if(!balanced) hint.innerHTML='<div class="hint">Entry is not balanced yet.</div>';
    else hint.innerHTML='';
  }
}
let jDate = null, jNarr = '';
let jVoucherType = 'Journal';
let jNewLedgerLineIndex = null; // index of the journal line currently creating a new ledger inline
function addJLine(){ jLines.push({ledgerId:'',debit:'',credit:'',fxAmount:'',fxRate:'',fxSide:'debit'}); render(); }
function removeJLine(i){ jLines.splice(i,1); if(jLines.length<2){ jLines.push({ledgerId:'',debit:'',credit:'',fxAmount:'',fxRate:'',fxSide:'debit'}); } render(); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function handleJLedgerSelect(i, val){
  if(val==='__NEW__'){
    jNewLedgerLineIndex = i;
    render();
    setTimeout(()=>{ const el=document.getElementById('jnl-name'); if(el) el.focus(); }, 0);
  } else {
    jLines[i].ledgerId = val;
    if(isForeignLedger(val)){
      jLines[i].fxAmount = jLines[i].fxAmount || '';
      jLines[i].fxRate = jLines[i].fxRate || '';
      jLines[i].fxSide = jLines[i].fxSide || 'debit';
    }
    render();
    updateJTotals();
  }
}
function onFxSideChange(i, val){ jLines[i].fxSide = val; applyFxLine(i); render(); updateJTotals(); }
function onFxInput(i){
  const a = document.getElementById('jfxa-'+i), r = document.getElementById('jfxr-'+i);
  jLines[i].fxAmount = a ? a.value : jLines[i].fxAmount;
  jLines[i].fxRate = r ? r.value : jLines[i].fxRate;
  applyFxLine(i);
  const dEl = document.getElementById('jd-'+i), cEl = document.getElementById('jc-'+i), eqEl = document.getElementById('jfxeq-'+i);
  if(dEl) dEl.value = jLines[i].debit;
  if(cEl) cEl.value = jLines[i].credit;
  if(eqEl) eqEl.textContent = '= ' + baseCurrency() + ' ' + fmt(Number(jLines[i].debit||jLines[i].credit||0));
  updateJTotals();
}
function applyFxLine(i){
  const l = jLines[i];
  const base = Math.round(Number(l.fxAmount||0)*Number(l.fxRate||0)*100)/100;
  if(l.fxSide==='credit'){ l.debit=''; l.credit = base||''; }
  else { l.credit=''; l.debit = base||''; }
}
function cancelNewLedgerFromJournal(){ jNewLedgerLineIndex = null; render(); }
function saveNewLedgerFromJournal(){
  const name = document.getElementById('jnl-name').value.trim();
  if(!name){ toast('Ledger name is required'); return; }
  const groupId = document.getElementById('jnl-group').value;
  const openingBalance = Number(document.getElementById('jnl-amt').value||0);
  const openingType = document.getElementById('jnl-type').value;
  const newLedger = {id:uid('l'), name, groupId, openingBalance, openingType};
  state.ledgers.push(newLedger);
  persist();
  const idx = jNewLedgerLineIndex;
  jNewLedgerLineIndex = null;
  if(idx!==null && jLines[idx]) jLines[idx].ledgerId = newLedger.id;
  render();
  updateJTotals();
  toast('Ledger "'+name+'" created and selected');
}

function saveJournalEntry(){
  const date = document.getElementById('j-date').value || todayISO();
  const narration = document.getElementById('j-narr').value.trim();
  const voucherType = document.getElementById('j-vtype') ? document.getElementById('j-vtype').value : jVoucherType;
  const lines = jLines.filter(l=>l.ledgerId && (Number(l.debit||0)>0 || Number(l.credit||0)>0))
    .map(l=>{
      const base = {ledgerId:l.ledgerId, debit:Number(l.debit||0), credit:Number(l.credit||0)};
      if(isForeignLedger(l.ledgerId) && Number(l.fxAmount||0)>0){
        const led = ledgerById(l.ledgerId);
        base.fxCurrency = led.currency; base.fxAmount = Number(l.fxAmount||0); base.fxRate = Number(l.fxRate||0);
      }
      return base;
    });
  const td = lines.reduce((s,l)=>s+l.debit,0), tc = lines.reduce((s,l)=>s+l.credit,0);
  if(lines.length<2 || Math.abs(td-tc)>0.005){ toast('Entry must balance with at least 2 lines'); return; }
  if(editingEntryId){
    const e = state.entries.find(x=>x.id===editingEntryId);
    Object.assign(e,{date,narration,lines,voucherType});
    toast('Entry updated');
  } else {
    state.entries.push({id:uid('e'), date, narration, lines, voucherType, voucher: nextVoucherNo(voucherType)});
    const tplCheck = document.getElementById('j-save-template');
    if(tplCheck && tplCheck.checked){
      const tplName = (document.getElementById('j-template-name').value||'').trim();
      if(tplName){
        state.templates.push({id:uid('tpl'), name:tplName, voucherType, narration, lines: lines.map(l=>({...l}))});
        toast('Entry saved and template "'+tplName+'" created');
      } else {
        toast('Entry saved (template name was blank, so no template was created)');
      }
    } else {
      toast('Entry saved');
    }
  }
  persist();
  editingEntryId = null; jDate=null; jNarr=''; jVoucherType='Journal';
  jLines = [ {ledgerId:'', debit:'', credit:'', fxAmount:'', fxRate:'', fxSide:'debit'}, {ledgerId:'', debit:'', credit:'', fxAmount:'', fxRate:'', fxSide:'debit'} ];
  goTab('register');
}
function cancelJournalEdit(){
  editingEntryId=null; jDate=null; jNarr=''; jNewLedgerLineIndex=null; jVoucherType='Journal';
  jLines = [ {ledgerId:'', debit:'', credit:'', fxAmount:'', fxRate:'', fxSide:'debit'}, {ledgerId:'', debit:'', credit:'', fxAmount:'', fxRate:'', fxSide:'debit'} ];
  goTab('register');
}
