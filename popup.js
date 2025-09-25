/* CleanCalc – popup logic with dual themes (blue default, beige secondary) + history dedupe */

const exprEl          = document.getElementById('expression');
const resultEl        = document.getElementById('result');
const historyPanel    = document.getElementById('historyPanel');
const historyList     = document.getElementById('historyList');
const historyToggle   = document.getElementById('historyToggle');
const clearHistoryBtn = document.getElementById('clearHistory');
const clearAllBtn     = document.getElementById('clearAll');
const equalsBtn       = document.getElementById('equals');
const copyResultBtn   = document.getElementById('copyResult');
const themeToggleBtn  = document.getElementById('themeToggle');

const STORAGE_KEY = 'cleancalc_state';

let state = {
  expression: '',
  lastResult: 0,
  history: [],
  theme: 'blue',   // 'blue' | 'beige'
  error: false,
  lastErrorCode: null
};

// To prevent ultra-fast double evaluations (keydown + click) adding two entries.
let lastEvalSignature = null;

function shortErrorLabel(code) {
  const map = {
    BadNumber: 'Number',
    InvalidChar: 'Invalid',
    ParenMismatch: 'Mismatch ()',
    Syntax: 'Syntax',
    DivZero: '∞',
    UnknownOp: 'Op',
    MathErr: 'Math'
  };
  return map[code] || 'Err';
}

function applyTheme() {
  document.body.setAttribute('data-theme', state.theme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = state.theme === 'blue' ? 'Beige' : 'Blue';
  }
}

function render() {
  exprEl.textContent = state.expression;
  if (!state.error) {
    resultEl.classList.remove('error');
    resultEl.textContent = state.lastResult;
    resultEl.removeAttribute('title');
  }
  renderHistory();
  applyTheme();
}

function renderHistory() {
  historyList.innerHTML = '';
  state.history.slice().reverse().forEach(item => {
    const li = document.createElement('li');
    const exprSpan = document.createElement('span');
    exprSpan.className = 'expr';
    exprSpan.textContent = item.expr;
    const valSpan = document.createElement('span');
    valSpan.className = 'val';
    valSpan.textContent = item.result;
    li.appendChild(exprSpan);
    li.appendChild(valSpan);
    li.addEventListener('click', () => {
      state.expression = item.expr;
      state.lastResult = item.result;
      state.error = false;
      state.lastErrorCode = null;
      persist();
      render();
    });
    historyList.appendChild(li);
  });
}

async function load() {
  const data = await Storage.get([STORAGE_KEY]);
  if (data[STORAGE_KEY]) {
    const saved = data[STORAGE_KEY];
    if (typeof saved.expression === 'string') state.expression = saved.expression;
    if (typeof saved.lastResult !== 'undefined') state.lastResult = saved.lastResult;
    if (Array.isArray(saved.history)) state.history = saved.history;
    if (saved.theme === 'blue' || saved.theme === 'beige') state.theme = saved.theme;
  }
  render();
}

function persist() {
  Storage.set({ [STORAGE_KEY]: state });
}

function currentOperand() {
  const parts = state.expression.split(/([+\-*/()%])/).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (!/^[+\-*/()%]$/.test(p)) return p;
    if (p === ')') break;
  }
  return '';
}

function canAddDecimal() {
  return !currentOperand().includes('.');
}

function appendValue(v) {
  if (state.error) {
    if (/[\d.]/.test(v) || v === '(' || v === '-') {
      state.expression = '';
    } else {
      state.expression = String(state.lastResult);
    }
    state.error = false;
    state.lastErrorCode = null;
    resultEl.classList.remove('error');
  }

  if (v === '.') {
    if (!canAddDecimal()) return;
    const op = currentOperand();
    if (op === '' || /[+\-*/(]$/.test(state.expression)) state.expression += '0';
  }

  state.expression += v;
  persist();
  render();
}

function clearAll() {
  state.expression = '';
  state.lastResult = 0;
  state.error = false;
  state.lastErrorCode = null;
  persist();
  render();
}

function addToHistory(expr, result) {
  if (!expr.trim()) return;
  const last = state.history[state.history.length - 1];
  if (last && last.expr === expr && last.result === result) {
    return; // dedupe identical consecutive entry
  }
  state.history.push({ expr, result });
  if (state.history.length > 100) state.history.shift();
}

function showError(code) {
  state.error = true;
  state.lastErrorCode = code;
  resultEl.textContent = shortErrorLabel(code);
  resultEl.classList.add('error');
  const longMap = {
    BadNumber: 'Malformed number',
    InvalidChar: 'Invalid character',
    ParenMismatch: 'Mismatched parentheses',
    Syntax: 'Syntax error',
    DivZero: 'Division by zero',
    UnknownOp: 'Unknown operator',
    MathErr: 'Math error'
  };
  resultEl.title = longMap[code] || 'Error';
}

function evaluateExpression() {
  // Avoid duplicate immediate evaluation (same expr & lastResult signature)
  const signature = state.expression + '::' + state.lastResult;
  if (signature === lastEvalSignature) {
    // If expression unchanged and user hits equals again instantly, ignore
    // (Still lets them modify and re-evaluate later.)
    return;
  }

  let val;
  try {
    val = MathEngine.evaluate(state.expression);
  } catch (e) {
    const code = e.message; // parser gives canonical codes
    showError(code);
    lastEvalSignature = null; // allow reevaluation after fixing
    persist();
    return;
  }
  state.lastResult = val;
  addToHistory(state.expression, val);
  state.error = false;
  state.lastErrorCode = null;
  lastEvalSignature = signature;
  persist();
  render();
}

function handleKey(e) {
  const k = e.key;
  if (/[0-9]/.test(k)) { appendValue(k); e.preventDefault(); }
  else if (/[+\-*/()]/.test(k)) { appendValue(k); e.preventDefault(); }
  else if (k === '.') { appendValue('.'); e.preventDefault(); }
  else if (k === '%') { appendValue('%'); e.preventDefault(); }
  else if (k === 'Enter' || k === '=') { evaluateExpression(); e.preventDefault(); }
  else if (k === 'Backspace') {
    if (state.error) { clearAll(); return; }
    state.expression = state.expression.slice(0, -1);
    persist(); render(); e.preventDefault();
  } else if (k === 'Escape') {
    clearAll();
  }
}

function handleButtonClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;
  const val = btn.getAttribute('data-val');
  const act = btn.getAttribute('data-act');

  if (val) { appendValue(val); return; }
  if (!act) return;

  switch (act) {
    case 'clear':
      clearAll();
      break;
    case 'equals':
      evaluateExpression();
      break;
    case 'percent':
      appendValue('%');
      break;
  }
}

/* Events */
historyToggle.addEventListener('click', () => {
  historyPanel.classList.toggle('hidden');
});
clearHistoryBtn.addEventListener('click', () => {
  state.history = [];
  persist(); render();
});
clearAllBtn.addEventListener('click', clearAll);
equalsBtn.addEventListener('click', evaluateExpression);
copyResultBtn.addEventListener('click', () => {
  if (state.error) return;
  const text = state.lastResult.toString();
  navigator.clipboard.writeText(text).then(() => {
    const old = copyResultBtn.textContent;
    copyResultBtn.textContent = 'Copied';
    setTimeout(() => (copyResultBtn.textContent = old), 1200);
  });
});
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'blue' ? 'beige' : 'blue';
    persist();
    applyTheme();
  });
}

document.querySelector('.keypad').addEventListener('click', handleButtonClick);
document.addEventListener('keydown', handleKey);
exprEl.addEventListener('click', () => exprEl.focus());
exprEl.addEventListener('keydown', e => e.preventDefault());

/* Init */
load();