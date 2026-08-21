/* ============================= UTILITIES ============================= */

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(
    ()=>t.classList.remove('show'),
    2200
  );
}


function esc(s){
  return String(s==null?'':s).replace(
    /[&<>"']/g,
    c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c])
  );
}


function baseCurrency(){
  return state.meta.currency || 'NPR';
}


function isForeignLedger(ledgerId){
  const l = ledgerById(ledgerId);

  return !!(
    l &&
    l.currency &&
    l.currency !== baseCurrency()
  );
}
