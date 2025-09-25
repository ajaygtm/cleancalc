// Tiny safe expression parser + evaluator
// Supports + - * / % parentheses and decimals.
// Percent behavior: a%b => (a * b / 100) if b follows %, single operand percent (e.g. 50%) -> 0.5
// Implementation: tokenize -> shunting-yard -> RPN eval.

const MathEngine = (() => {
  class ParseError extends Error { constructor(msg){ super(msg); this.name="ParseError"; } }

  const isDigit = c => /[0-9]/.test(c);
  const isOp = c => /[+\-*/%]/.test(c);

  function tokenize(input) {
    const tokens = [];
    let i = 0;
    while (i < input.length) {
      let c = input[i];
      if (c === ' ') { i++; continue; }
      if (isDigit(c) || c === '.') {
        let num = c;
        i++;
        while (i < input.length && (isDigit(input[i]) || input[i] === '.')) {
          num += input[i++];
        }
        if (num.split('.').length > 2) throw new ParseError("Malformed number");
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
      throw new ParseError("Invalid character: " + c);
    }
    return tokens;
  }

  const precedence = { '+':1, '-':1, '*':2, '/':2, '%':2 };
  const rightAssoc = {};

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
        if (!found) throw new ParseError("Mismatched parentheses");
      }
    }
    while (stack.length) {
      const s = stack.pop();
      if (s.type === '(' || s.type === ')') throw new ParseError("Mismatched parentheses");
      out.push(s);
    }
    return out;
  }

  function evaluateRPN(rpn) {
    const st = [];
    for (let t of rpn) {
      if (t.type === 'number') st.push(t.value);
      else if (t.type === 'op') {
        if (st.length < 2) throw new ParseError("Not enough operands");
        const b = st.pop();
        const a = st.pop();
        let v;
        switch (t.value) {
          case '+': v = a + b; break;
          case '-': v = a - b; break;
          case '*': v = a * b; break;
          case '/': if (b === 0) throw new ParseError("Division by zero"); v = a / b; break;
          case '%': v = a % b; break;
          default: throw new ParseError("Unknown op");
        }
        st.push(v);
      }
    }
    if (st.length !== 1) throw new ParseError("Malformed expression");
    return st[0];
  }

  function preprocessPercent(expr) {
    // Convert patterns like number% to (number/100)
    // and a%b (explicit modulo) we leave as is since we interpret % as modulo here
    // Option: adapt to "percent of" semantics later.
    return expr.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
  }

  function evaluate(expr) {
    if (!expr.trim()) return 0;
    const prepared = preprocessPercent(expr);
    const tokens = tokenize(prepared);
    const rpn = toRPN(tokens);
    let val = evaluateRPN(rpn);
    if (!isFinite(val)) throw new ParseError("Math error");
    // Round to avoid floating point noise (up to 12 significant digits)
    return +parseFloat(val.toPrecision(12));
  }

  return { evaluate, ParseError };
})();