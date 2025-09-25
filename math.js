// MathEngine: safe expression parser/evaluator
// Supports: numbers, unary minus (before numbers or parentheses), + - * / %,
// parentheses, percent postfix (50% -> 0.5), modulo (% as binary op).
// Internal error codes: BadNumber, InvalidChar, ParenMismatch, Syntax, DivZero, UnknownOp, MathErr

const MathEngine = (() => {
  class ParseError extends Error {
    constructor(code) {
      super(code);
      this.name = "ParseError";
    }
  }

  const isDigit = c => /[0-9]/.test(c);
  const isOp = c => /[+\-*/%]/.test(c);

  function tokenize(input) {
    const tokens = [];
    let i = 0;

    function nextNonSpaceChar(idx) {
      let j = idx + 1;
      while (j < input.length && input[j] === ' ') j++;
      return input[j];
    }

    while (i < input.length) {
      let c = input[i];

      if (c === ' ') { i++; continue; }

      const prev = tokens[tokens.length - 1];

      // Unary minus:
      // Conditions: at start OR after an operator OR after '('
      // Followed by: number (digit or '.') OR '('
      if (
        c === '-' &&
        (i === 0 || (prev && (prev.type === 'op' || prev.type === '('))) 
      ) {
        const look = nextNonSpaceChar(i);
        if (isDigit(look) || look === '.') {
          // Negative number literal
          let num = '-';
            i++;
            while (i < input.length && (isDigit(input[i]) || input[i] === '.')) {
              num += input[i++];
            }
            if (num.split('.').length > 2) throw new ParseError("BadNumber");
            tokens.push({ type: 'number', value: parseFloat(num) });
            continue;
        } else if (look === '(') {
          // Pattern: -( ... )  => treat as (-1 * ( ... )
          tokens.push({ type: 'number', value: -1 });
          tokens.push({ type: 'op', value: '*' });
          i++; // consume only the '-' here; '(' will be tokenized in next iterations
          continue;
        }
        // If it wasn't followed by number or '(' treat '-' as normal operator below
      }

      if (isDigit(c) || c === '.') {
        let num = c; i++;
        while (i < input.length && (isDigit(input[i]) || input[i] === '.')) {
          num += input[i++];
        }
        if (num.split('.').length > 2) throw new ParseError("BadNumber");
        tokens.push({ type: 'number', value: parseFloat(num) });
        continue;
      }

      if (isOp(c)) {
        tokens.push({ type: 'op', value: c });
        i++;
        continue;
      }

      if (c === '(' || c === ')') {
        tokens.push({ type: c, value: c });
        i++;
        continue;
      }

      throw new ParseError("InvalidChar");
    }
    return tokens;
  }

  const precedence = { '+':1, '-':1, '*':2, '/':2, '%':2 };
  const rightAssoc = {}; // none

  function toRPN(tokens) {
    const out = [];
    const stack = [];
    for (let t of tokens) {
      if (t.type === 'number') out.push(t);
      else if (t.type === 'op') {
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.type === 'op' &&
              ((precedence[top.value] > precedence[t.value]) ||
               (precedence[top.value] === precedence[t.value] && !rightAssoc[t.value]))) {
            out.push(stack.pop());
          } else break;
        }
        stack.push(t);
      } else if (t.type === '(') {
        stack.push(t);
      } else if (t.type === ')') {
        let found = false;
        while (stack.length) {
          const s = stack.pop();
          if (s.type === '(') { found = true; break; }
          out.push(s);
        }
        if (!found) throw new ParseError("ParenMismatch");
      }
    }
    while (stack.length) {
      const s = stack.pop();
      if (s.type === '(' || s.type === ')') throw new ParseError("ParenMismatch");
      out.push(s);
    }
    return out;
  }

  function evaluateRPN(rpn) {
    const st = [];
    for (let t of rpn) {
      if (t.type === 'number') {
        st.push(t.value);
      } else if (t.type === 'op') {
        if (st.length < 2) throw new ParseError("Syntax");
        const b = st.pop();
        const a = st.pop();
        let v;
        switch (t.value) {
          case '+': v = a + b; break;
          case '-': v = a - b; break;
          case '*': v = a * b; break;
          case '/': if (b === 0) throw new ParseError("DivZero"); v = a / b; break;
          case '%': v = a % b; break;
          default: throw new ParseError("UnknownOp");
        }
        st.push(v);
      }
    }
    if (st.length !== 1) throw new ParseError("Syntax");
    return st[0];
  }

  function preprocessPercent(expr) {
    // number% (allow negative number) -> (number/100)
    return expr.replace(/(-?\d+(?:\.\d+)?)%/g, "($1/100)");
  }

  function evaluate(expr) {
    if (!expr.trim()) return 0;
    const prepared = preprocessPercent(expr);
    const tokens = tokenize(prepared);
    const rpn = toRPN(tokens);
    let val = evaluateRPN(rpn);
    if (!isFinite(val)) throw new ParseError("MathErr");
    return +parseFloat(val.toPrecision(12));
  }

  return { evaluate, ParseError };
})();