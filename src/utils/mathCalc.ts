// Safe recursive descent math evaluator without eval()
export function safeEvaluateMath(expr: string): number | null {
  const clean = expr.trim();
  if (!clean) return null;

  // Validate characters: only allow digits, decimal points, spaces, and math operators
  if (!/^[\d\s\+\-\*\/\(\)\^\%\.]+$/.test(clean)) {
    return null;
  }

  // Tokenizer
  const tokens: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const ch = clean[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/\d|\./.test(ch)) {
      let numStr = '';
      while (i < clean.length && /[\d\.]/.test(clean[i])) {
        numStr += clean[i];
        i++;
      }
      tokens.push(numStr);
      continue;
    }
    if ('+-*/()^%'.includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    return null; // Unknown character
  }

  if (tokens.length === 0) return null;

  let pos = 0;

  function parseExpression(): number {
    let result = parseTerm();
    while (pos < tokens.length) {
      const op = tokens[pos];
      if (op === '+' || op === '-') {
        pos++;
        const nextVal = parseTerm();
        result = op === '+' ? result + nextVal : result - nextVal;
      } else {
        break;
      }
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (pos < tokens.length) {
      const op = tokens[pos];
      if (op === '*' || op === '/' || op === '%') {
        pos++;
        const nextVal = parseFactor();
        if (op === '*') result *= nextVal;
        else if (op === '/') {
          if (nextVal === 0) throw new Error('Division by zero');
          result /= nextVal;
        } else if (op === '%') {
          result %= nextVal;
        }
      } else {
        break;
      }
    }
    return result;
  }

  function parseFactor(): number {
    let result = parsePrimary();
    while (pos < tokens.length && tokens[pos] === '^') {
      pos++;
      const nextVal = parsePrimary();
      result = Math.pow(result, nextVal);
    }
    return result;
  }

  function parsePrimary(): number {
    if (pos >= tokens.length) throw new Error('Unexpected end of expression');
    const token = tokens[pos];

    if (token === '+') {
      pos++;
      return parsePrimary();
    }
    if (token === '-') {
      pos++;
      return -parsePrimary();
    }
    if (token === '(') {
      pos++;
      const val = parseExpression();
      if (pos >= tokens.length || tokens[pos] !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      pos++; // Skip ')'
      return val;
    }

    const num = parseFloat(token);
    if (isNaN(num)) throw new Error(`Invalid number: ${token}`);
    pos++;
    return num;
  }

  try {
    const res = parseExpression();
    if (pos !== tokens.length) return null;
    if (!isFinite(res)) return null;
    // Format nicely: round float precision errors if integer
    return Math.abs(res - Math.round(res)) < 1e-9 ? Math.round(res) : parseFloat(res.toFixed(4));
  } catch {
    return null;
  }
}

// Regex to find math expression in brackets: [18*36+(12+26)] or [18*36+(12+26)] = 686
// Calculates the expression inside brackets and attaches '= result' without touching normal text/numbers
export function autoCalculateExpressions(text: string): { newText: string; replaced: boolean } {
  let replaced = false;

  // Matches [ ...math expression... ] optionally followed by '= result'
  const regex = /\[([0-9\s\+\-\*\/\(\)\^\%\.]+)\](?:\s*=\s*[\d\.\-]+)?/g;

  const newText = text.replace(regex, (match, expr) => {
    // Only evaluate if it contains at least one operator (+, -, *, /, ^, %)
    if (!/[\+\-\*\/\^\%]/.test(expr)) {
      return match;
    }

    const val = safeEvaluateMath(expr);
    if (val !== null) {
      const formatted = `[${expr.trim()}] = ${val}`;
      if (formatted !== match.trim()) {
        replaced = true;
      }
      return formatted;
    }
    return match;
  });

  return { newText, replaced };
}
