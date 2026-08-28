/* ============================= RECURRING TEMPLATES ============================= */
let tLines = [];
let tName = '', tVoucherType = 'Journal', tNarr = '';
let tShowForm = false;
let editingTemplateId = null;

function renderTemplates(){
  const list = state.templates || [];
  let html = `
  <div class="pagehead"><div><div class="eyebrow">Standing entries</div><h1>Recurring Entries</h1><p class="sub">Save common transactions as templates and post them again in one click — rent, EMIs, depreciation, anything you repeat.</p></div>
  <div class="export-bar no-print">${!tShowForm && !editingTemplateId ? `<button class="btn brass" onclick="showNewTemplateForm()">+ New Template</button>` : ''}</div></div>`;

  if(tShowForm && !editingTemplateId) html += templateFormHtml(null);

  if(list.length){
    html += list.map(t=> editingTemplateId===t.id ? templateFormHtml(t) : templateCardHtml(t)).join('');
  } else if(!tShowForm){
    html += `<div class="sheet"><div class="empty">No templates yet. Save one from an existing entry in the Journal Register (${icon('repeat','btn-icon')} icon), or create one here.</div></div>`;
  }
  return html;
}

function templateCardHtml(t){
  const total = t.lines.reduce((s,l)=>s+Number(l.debit||0),0);
  const vtype = t.voucherType||'Journal';
  return `<div class="entry-block">
    <div class="entry-head" style="cursor:default;">
      <div style="display:flex;gap:12px;align-items:center;min-width:0;">
        <span class="tag ${VOUCHER_CLASS[vtype]||'vt-journal'}">${vtype}</span>
        <b style="font-size:13px;white-space:nowrap;">${esc(t.name)}</b>
        <span class="muted" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.narration||'')}</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
        <span class="num">${fmt(total)}</span>
        <button class="btn brass small" onclick="useTemplate('${t.id}')">Use Now</button>
        <button class="btn secondary small no-print" onclick="editTemplate('${t.id}')">Edit</button>
        <button class="btn danger small no-print" onclick="deleteTemplate('${t.id}')">Delete</button>
      </div>
    </div>
    <div class="entry-body open" style="display:block;">
      <table><thead><tr><th>Ledger</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
      <tbody>${t.lines.map(l=>`<tr><td>${esc(ledgerById(l.ledgerId)?.name||'—')}</td><td class="num">${l.debit?fmt(l.debit):''}</td><td class="num">${l.credit?fmt(l.credit):''}</td></tr>`).join('')}</tbody></table>
    </div>
  </div>`;
}

function templateFormHtml(existing){
  const isNew = !existing;
  const total = {d:0,c:0};
  tLines.forEach(l=>{ total.d += Number(l.debit||0); total.c += Number(l.credit||0); });
  const diff = Math.round((total.d-total.c)*100)/100;
  const balanced = Math.abs(diff) < 0.005 && total.d>0;
  const validLines = tLines.filter(l=>l.ledgerId && (Number(l.debit||0)>0 || Number(l.credit||0)>0)).length >= 2;
  return `
  <div class="sheet spine-brass" style="margin-bottom:16px;">
    <div class="card-title">${isNew?'New Template':'Edit Template'}</div>
    <div class="row2">
      <div class="field"><label>Template Name</label><input type="text" id="t-name" value="${esc(tName)}" placeholder="e.g. Monthly Office Rent"></div>
      <div class="field"><label>Voucher Type</label><select id="t-vtype" onchange="tVoucherType=this.value;">${VOUCHER_TYPES.map(v=>`<option value="${v}" ${v===tVoucherType?'selected':''}>${v}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Narration</label><input type="text" id="t-narr" value="${esc(tNarr)}" placeholder="Default narration used when this template is posted"></div>
    <div style="margin:14px 0 6px;">
      <div class="jline" style="font-size:11px;color:var(--slate);text-transform:uppercase;letter-spacing:.05em;"><span>Ledger</span><span>Debit</span><span>Credit</span><span></span></div>
      ${tLines.map((l,i)=>`
        <div class="jline">
          <select onchange="tLines[${i}].ledgerId=this.value; updateTTotals();">
            <option value="">— select ledger —</option>
            ${state.ledgers.map(led=>`<option value="${led.id}" ${led.id===l.ledgerId?'selected':''}>${esc(led.name)}</option>`).join('')}
          </select>
          <input type="number" step="0.01" id="td-${i}" placeholder="0.00" value="${l.debit}" oninput="onTDebitInput(${i}, this.value)">
          <input type="number" step="0.01" id="tc-${i}" placeholder="0.00" value="${l.credit}" oninput="onTCreditInput(${i}, this.value)">
          <button class="rm" onclick="removeTLine(${i})" title="Remove line">✕</button>
        </div>`).join('')}
      <button class="btn secondary small" style="margin-top:6px;" onclick="addTLine()">+ Add Line</button>
    </div>
    <div class="jtotals">
      <div><span class="lbl">Total Debit</span><span class="num" id="tt-debit">${fmt(total.d)}</span></div>
      <div><span class="lbl">Total Credit</span><span class="num" id="tt-credit">${fmt(total.c)}</span></div>
      <div><span class="lbl">Difference</span><span class="num balance-flag ${Math.abs(diff)<0.005?'pos':'neg'}" id="tt-diff">${fmt(diff)}</span></div>
    </div>
    <div style="margin-top:16px;display:flex;gap:10px;">
      <button class="btn brass" id="t-save-btn" ${(!balanced||!validLines)?'disabled':''} onclick="saveTemplateForm('${isNew?'':existing.id}')">Save Template</button>
      <button class="btn secondary" onclick="cancelTemplateForm()">Cancel</button>
    </div>
  </div>`;
}

function showNewTemplateForm(){
  tShowForm = true; editingTemplateId = null;
  tName=''; tVoucherType='Journal'; tNarr='';
  tLines = [ {ledgerId:'', debit:'', credit:''}, {ledgerId:'', debit:'', credit:''} ];
  render();
}
function cancelTemplateForm(){ tShowForm=false; editingTemplateId=null; render(); }
function editTemplate(id){
  const t = state.templates.find(x=>x.id===id);
  if(!t) return;
  editingTemplateId = id; tShowForm = false;
  tName = t.name; tVoucherType = t.voucherType||'Journal'; tNarr = t.narration||'';
  tLines = t.lines.map(l=>({ledgerId:l.ledgerId, debit:l.debit||'', credit:l.credit||''}));
  render();
}
function deleteTemplate(id){
  if(!confirm('Delete this template?')) return;
  state.templates = (state.templates||[]).filter(t=>t.id!==id);
  persist(); render(); toast('Template deleted');
}
function addTLine(){ tLines.push({ledgerId:'',debit:'',credit:''}); render(); }
function removeTLine(i){ tLines.splice(i,1); if(tLines.length<2){ tLines.push({ledgerId:'',debit:'',credit:''}); } render(); }
function onTDebitInput(i, val){
  tLines[i].debit = val;
  if(val){ tLines[i].credit=''; const c=document.getElementById('tc-'+i); if(c) c.value=''; }
  updateTTotals();
}
function onTCreditInput(i, val){
  tLines[i].credit = val;
  if(val){ tLines[i].debit=''; const d=document.getElementById('td-'+i); if(d) d.value=''; }
  updateTTotals();
}
function updateTTotals(){
  let d=0,c=0;
  tLines.forEach(l=>{ d+=Number(l.debit||0); c+=Number(l.credit||0); });
  const diff = Math.round((d-c)*100)/100;
  const balanced = Math.abs(diff)<0.005 && d>0;
  const validLines = tLines.filter(l=>l.ledgerId && (Number(l.debit||0)>0||Number(l.credit||0)>0)).length>=2;
  const de=document.getElementById('tt-debit'); if(de) de.textContent=fmt(d);
  const ce=document.getElementById('tt-credit'); if(ce) ce.textContent=fmt(c);
  const df=document.getElementById('tt-diff'); if(df){ df.textContent=fmt(diff); df.className='num balance-flag '+(Math.abs(diff)<0.005?'pos':'neg'); }
  const btn=document.getElementById('t-save-btn'); if(btn) btn.disabled = !(balanced&&validLines);
}
function saveTemplateForm(id){
  const name = document.getElementById('t-name').value.trim();
  if(!name){ toast('Template name is required'); return; }
  const voucherType = document.getElementById('t-vtype').value;
  const narration = document.getElementById('t-narr').value.trim();
  const lines = tLines.filter(l=>l.ledgerId && (Number(l.debit||0)>0 || Number(l.credit||0)>0))
    .map(l=>({ledgerId:l.ledgerId, debit:Number(l.debit||0), credit:Number(l.credit||0)}));
  const td = lines.reduce((s,l)=>s+l.debit,0), tc = lines.reduce((s,l)=>s+l.credit,0);
  if(lines.length<2 || Math.abs(td-tc)>0.005){ toast('Template must balance with at least 2 lines'); return; }
  if(id){
    const t = state.templates.find(x=>x.id===id);
    Object.assign(t, {name, voucherType, narration, lines});
  } else {
    state.templates.push({id:uid('tpl'), name, voucherType, narration, lines});
  }
  persist();
  tShowForm=false; editingTemplateId=null; tLines=[]; tName=''; tVoucherType='Journal'; tNarr='';
  render();
  toast('Template saved');
}
function useTemplate(id){
  const t = state.templates.find(x=>x.id===id);
  if(!t) return;
  activeTab = 'journal';
  editingEntryId = null;
  jVoucherType = t.voucherType || 'Journal';
  jNarr = t.narration || '';
  jDate = todayISO();
  jNewLedgerLineIndex = null;
  jLines = t.lines.map(l=>({ledgerId:l.ledgerId, debit:l.debit||'', credit:l.credit||'', fxAmount:l.fxAmount||'', fxRate:l.fxRate||'', fxSide:l.credit?'credit':'debit'}));
  document.getElementById('sidebar').classList.remove('open');
  render();
  window.scrollTo(0,0);
  toast('Template loaded — review and save');
}
