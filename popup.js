/* CleanCalc – popup logic */

const exprEl          = document.getElementById('expression');
const resultEl        = document.getElementById('result');
const historyPanel    = document.getElementById('historyPanel');
const historyList     = document.getElementById('historyList');
const historyToggle   = document.getElementById('historyToggle');
const clearHistoryBtn = document.getElementById('clearHistory');
const clearAllBtn     = document.getElementById('clearAll');
const equalsBtn       = document.getElementById('equals');
const copyResultBtn   = document.getElementById('copyResult');

const STORAGE_KEY = 'cleancalc_state';

let state = {
  expression: '',
  lastResult: 0,
  history: []
};

function render() {
  exprEl.textContent = state.expression;
  resultEl.textContent = state.lastResult;
  renderHistory();
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
  }
  render();
}

function persist() {
  Storage.set({ [STORAGE_KEY]: state });
}

function appendValue(v) {
  state.expression += v;
  persist();
  render();
}

function clearAll() {
  state.expression = '';
  state.lastResult = 0;
  persist();
  render();
}

function addToHistory(expr, result) {
  if (!expr.trim()) return;
  state.history.push({ expr, result });
  if (state.history.length > 100) state.history.shift();
}

function evaluateExpression() {
  try {
    const val = MathEngine.evaluate(state.expression);
    state.lastResult = val;
    addToHistory(state.expression, val);
    persist();
    render();
  } catch (e) {
    resultEl.textContent = e.message;
  }
}

function handleKey(e) {
  const k = e.key;
  if (/[0-9+\-*/().]/.test(k)) {
    appendValue(k);
    e.preventDefault();
  } else if (k === 'Enter' || k === '=') {
    evaluateExpression();
    e.preventDefault();
  } else if (k === 'Backspace') {
    state.expression = state.expression.slice(0, -1);
    persist();
    render();
  } else if (k === 'Escape') {
    clearAll();
  }
}

function handleButtonClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;
  const val = btn.getAttribute('data-val');
  const act = btn.getAttribute('data-act');

  if (val) {
    appendValue(val);
    return;
  }
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

/* Event wiring */
historyToggle.addEventListener('click', () => {
  historyPanel.classList.toggle('hidden');
});

clearHistoryBtn.addEventListener('click', () => {
  state.history = [];
  persist();
  render();
});

clearAllBtn.addEventListener('click', clearAll);
equalsBtn.addEventListener('click', evaluateExpression);

copyResultBtn.addEventListener('click', () => {
  const text = state.lastResult.toString();
  navigator.clipboard.writeText(text).then(() => {
    const old = copyResultBtn.textContent;
    copyResultBtn.textContent = 'Copied';
    setTimeout(() => (copyResultBtn.textContent = old), 1200);
  }).catch(() => {
    // fallback visual (no permissions)
    copyResultBtn.textContent = 'Failed';
    setTimeout(() => (copyResultBtn.textContent = 'Copy'), 1500);
  });
});

document.querySelector('.keypad').addEventListener('click', handleButtonClick);
document.addEventListener('keydown', handleKey);

exprEl.addEventListener('click', () => exprEl.focus());
exprEl.addEventListener('keydown', e => e.preventDefault()); // keep expression controlled

/* Init */
load();