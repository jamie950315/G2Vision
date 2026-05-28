type ScriptKind = 'sub' | 'sup'

const SIMPLE_COMMANDS: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ϵ',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'ϑ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  varpi: 'ϖ',
  rho: 'ρ',
  varrho: 'ϱ',
  sigma: 'σ',
  varsigma: 'ς',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'ϕ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',

  pm: '±',
  mp: '∓',
  times: '×',
  div: '÷',
  cdot: '·',
  cdots: '⋯',
  ldots: '…',
  dots: '…',
  vdots: '⋮',
  ddots: '⋱',
  ast: '*',
  star: '⋆',
  circ: '∘',
  bullet: '•',
  oplus: '⊕',
  otimes: '⊗',
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  hbar: 'ℏ',
  ell: 'ℓ',
  Re: 'ℜ',
  Im: 'ℑ',
  wp: '℘',
  aleph: 'ℵ',
  degree: '°',
  prime: '′',
  dagger: '†',
  ddagger: '‡',
  angle: '∠',
  measuredangle: '∡',
  triangle: '△',
  square: '□',
  Box: '□',
  checkmark: '✓',

  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  ne: '≠',
  neq: '≠',
  approx: '≈',
  sim: '∼',
  simeq: '≃',
  cong: '≅',
  equiv: '≡',
  propto: '∝',
  in: '∈',
  notin: '∉',
  ni: '∋',
  subset: '⊂',
  subseteq: '⊆',
  supset: '⊃',
  supseteq: '⊇',
  cup: '∪',
  cap: '∩',
  setminus: '∖',
  emptyset: '∅',
  varnothing: '∅',
  parallel: '∥',
  perp: '⊥',
  mid: '|',

  forall: '∀',
  exists: '∃',
  nexists: '∄',
  neg: '¬',
  not: '¬',
  land: '∧',
  lor: '∨',
  wedge: '∧',
  vee: '∨',
  top: '⊤',
  bot: '⊥',
  therefore: '∴',
  because: '∵',

  to: '→',
  gets: '←',
  rightarrow: '→',
  leftarrow: '←',
  leftrightarrow: '↔',
  Rightarrow: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  mapsto: '↦',
  longrightarrow: '⟶',
  longleftarrow: '⟵',
  longleftrightarrow: '⟷',
  Longrightarrow: '⟹',
  Longleftarrow: '⟸',
  Longleftrightarrow: '⟺',
  uparrow: '↑',
  downarrow: '↓',
  updownarrow: '↕',

  sum: '∑',
  prod: '∏',
  coprod: '∐',
  int: '∫',
  iint: '∬',
  iiint: '∭',
  oint: '∮',

  lbrace: '{',
  rbrace: '}',
  langle: '⟨',
  rangle: '⟩',
  lceil: '⌈',
  rceil: '⌉',
  lfloor: '⌊',
  rfloor: '⌋',
  vert: '|',
  Vert: '∥',
}

const FUNCTION_COMMANDS = new Set([
  'sin',
  'cos',
  'tan',
  'cot',
  'sec',
  'csc',
  'sinh',
  'cosh',
  'tanh',
  'log',
  'ln',
  'lg',
  'lim',
  'min',
  'max',
  'sup',
  'inf',
  'arg',
  'det',
  'dim',
  'exp',
  'gcd',
])

const TEXT_COMMANDS = new Set([
  'text',
  'textrm',
  'textit',
  'textbf',
  'textsf',
  'texttt',
  'mathrm',
  'mathit',
  'mathbf',
  'mathsf',
  'mathtt',
  'mathnormal',
  'boldsymbol',
  'pmb',
])

const BIG_OPERATORS = new Set(['∑', '∏', '∐', '⋃', '⋂'])
const INTEGRALS = new Set(['∫', '∬', '∭', '∮'])

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  a: 'ᵃ',
  b: 'ᵇ',
  c: 'ᶜ',
  d: 'ᵈ',
  e: 'ᵉ',
  f: 'ᶠ',
  g: 'ᵍ',
  h: 'ʰ',
  i: 'ⁱ',
  j: 'ʲ',
  k: 'ᵏ',
  l: 'ˡ',
  m: 'ᵐ',
  n: 'ⁿ',
  o: 'ᵒ',
  p: 'ᵖ',
  r: 'ʳ',
  s: 'ˢ',
  t: 'ᵗ',
  u: 'ᵘ',
  v: 'ᵛ',
  w: 'ʷ',
  x: 'ˣ',
  y: 'ʸ',
  z: 'ᶻ',
  A: 'ᴬ',
  B: 'ᴮ',
  D: 'ᴰ',
  E: 'ᴱ',
  G: 'ᴳ',
  H: 'ᴴ',
  I: 'ᴵ',
  J: 'ᴶ',
  K: 'ᴷ',
  L: 'ᴸ',
  M: 'ᴹ',
  N: 'ᴺ',
  O: 'ᴼ',
  P: 'ᴾ',
  R: 'ᴿ',
  T: 'ᵀ',
  U: 'ᵁ',
  V: 'ⱽ',
  W: 'ᵂ',
}

const SUBSCRIPT: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  a: 'ₐ',
  e: 'ₑ',
  h: 'ₕ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  l: 'ₗ',
  m: 'ₘ',
  n: 'ₙ',
  o: 'ₒ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
  x: 'ₓ',
}

const MATHBB: Record<string, string> = {
  C: 'C',
  H: 'H',
  N: 'N',
  P: 'P',
  Q: 'Q',
  R: 'R',
  Z: 'Z',
}

const ACCENTS: Record<string, string> = {
  hat: '\u0302',
  widehat: '\u0302',
  bar: '\u0304',
  overline: '\u0304',
  tilde: '\u0303',
  widetilde: '\u0303',
  dot: '\u0307',
  ddot: '\u0308',
  vec: '\u20d7',
  acute: '\u0301',
  grave: '\u0300',
  check: '\u030c',
  breve: '\u0306',
}

interface DelimitedMath {
  content: string
  endIndex: number
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) slashCount += 1
  return slashCount % 2 === 1
}

function collapseHorizontalWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, ' ')
}

function cleanMathText(text: string): string {
  return collapseHorizontalWhitespace(text)
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\s*([=<>≤≥≠≈≃≅≡∈∉⊂⊆⊃⊇∼∝→←↔⇒⇐⇔⟶⟵⟷⟹⟸⟺↦±∓×÷∧∨])\s*/g, ' $1 ')
    .replace(/\s*([+])\s*/g, ' $1 ')
    .replace(/\s+([,;:)\]}])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function compactScript(text: string): string {
  return cleanMathText(text).replace(/\s+/g, '')
}

function toScript(text: string, kind: ScriptKind): string | undefined {
  const compact = compactScript(text)
  if (!compact || compact.length > 8) return undefined
  if (!/^[0-9+\-=()]+$/.test(compact)) return undefined

  const table = kind === 'sub' ? SUBSCRIPT : SUPERSCRIPT
  let output = ''
  for (const char of Array.from(compact)) {
    const replacement = table[char]
    if (!replacement) return undefined
    output += replacement
  }
  return output
}

function hasLooseOperator(text: string): boolean {
  return /[+\-=<>≤≥≠≈∼∝→←↔⇒⇔±∓×÷∧∨]|\s/.test(text)
}

function wrapForLinearOperator(text: string): string {
  const clean = cleanMathText(text)
  if (!clean) return '?'
  return hasLooseOperator(clean) ? `(${clean})` : clean
}

function formatFraction(numerator: string, denominator: string): string {
  return `${wrapForLinearOperator(numerator)} / ${wrapForLinearOperator(denominator)}`
}

function formatSqrt(radicand: string, degree?: string): string {
  const cleanRadicand = cleanMathText(radicand) || '?'
  if (degree && cleanMathText(degree)) return `root_${cleanMathText(degree)}(${cleanRadicand})`
  return `sqrt(${cleanRadicand})`
}

function formatBinom(top: string, bottom: string): string {
  return `binom(${cleanMathText(top)}, ${cleanMathText(bottom)})`
}

function formatAccent(command: string, value: string): string {
  const clean = cleanMathText(value)
  const mark = ACCENTS[command]
  if (mark && Array.from(clean).length === 1) return `${clean}${mark}`
  return `${command}(${clean})`
}

function formatScripts(base: string, sub?: string, sup?: string): string {
  const cleanBase = cleanMathText(base)
  const cleanSub = sub === undefined ? undefined : cleanMathText(sub)
  const cleanSup = sup === undefined ? undefined : cleanMathText(sup)

  if (cleanBase === 'lim') {
    if (cleanSub && cleanSup) return `lim[${cleanSub}..${cleanSup}]`
    if (cleanSub) return `lim[${cleanSub}]`
    if (cleanSup) return `lim[..${cleanSup}]`
  }

  if (BIG_OPERATORS.has(cleanBase)) {
    if (cleanSub && cleanSup) return `${cleanBase}[${cleanSub}..${cleanSup}]`
    if (cleanSub) return `${cleanBase}[${cleanSub}]`
    if (cleanSup) return `${cleanBase}[..${cleanSup}]`
  }

  if (INTEGRALS.has(cleanBase)) {
    const subScript = cleanSub ? toScript(cleanSub, 'sub') : ''
    const supScript = cleanSup ? toScript(cleanSup, 'sup') : ''
    if ((!cleanSub || subScript) && (!cleanSup || supScript)) return `${cleanBase}${subScript}${supScript}`
    if (cleanSub && cleanSup) return `${cleanBase}[${cleanSub}..${cleanSup}]`
    if (cleanSub) return `${cleanBase}[${cleanSub}]`
    if (cleanSup) return `${cleanBase}[..${cleanSup}]`
  }

  const subScript = cleanSub ? toScript(cleanSub, 'sub') : ''
  const supScript = cleanSup ? toScript(cleanSup, 'sup') : ''
  let output = cleanBase
  if (cleanSub) output += subScript || `_(${cleanSub})`
  if (cleanSup) output += supScript || `^(${cleanSup})`
  return output
}

function splitLatexTopLevel(text: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '\\') {
      index += 1
      continue
    }
    if (char === '{') depth += 1
    else if (char === '}') depth = Math.max(0, depth - 1)
    else if (char === separator && depth === 0) {
      parts.push(text.slice(start, index))
      start = index + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

function splitLatexRows(text: string): string[] {
  const rows: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '{') depth += 1
    else if (char === '}') depth = Math.max(0, depth - 1)

    if (char === '\\' && depth === 0) {
      const next = text[index + 1]
      if (next === '\\') {
        rows.push(text.slice(start, index))
        index += 1
        if (text[index + 1] === '[') {
          const close = text.indexOf(']', index + 2)
          if (close >= 0) index = close
        }
        start = index + 1
        continue
      }

      if (text.startsWith('\\cr', index)) {
        rows.push(text.slice(start, index))
        index += 2
        start = index + 1
      }
    }
  }
  rows.push(text.slice(start))
  return rows.filter((row) => row.trim())
}

function formatMatrix(env: string, body: string): string {
  const rows = splitLatexRows(body).map((row) => splitLatexTopLevel(row, '&').map((cell) => convertLatexMath(cell)))
  if (rows.length === 0) return ''

  if (env.includes('case')) {
    return rows
      .map((cells) => {
        const [value, condition] = cells
        const cleanValue = cleanMathText(value || '').replace(/,$/, '')
        return condition ? `${cleanValue} if ${cleanMathText(condition)}` : cleanValue
      })
      .join('\n')
  }

  if (env.includes('align') || env.includes('gather') || env === 'equation' || env === 'equation*') {
    return rows.map((cells) => cleanMathText(cells.join(' '))).join('\n')
  }

  const bracket =
    env.startsWith('p') ? ['(', ')'] : env.startsWith('b') ? ['[', ']'] : env.startsWith('B') ? ['{', '}'] : ['[', ']']

  return rows.map((cells) => `${bracket[0]} ${cells.map(cleanMathText).join('  ')} ${bracket[1]}`).join('\n')
}

function findEnvironmentEnd(input: string, start: number, env: string): { body: string; endIndex: number } | undefined {
  const beginToken = `\\begin{${env}}`
  const endToken = `\\end{${env}}`
  let depth = 1
  let cursor = start

  while (cursor < input.length) {
    if (input.startsWith(beginToken, cursor) && !isEscaped(input, cursor)) {
      depth += 1
      cursor += beginToken.length
      continue
    }

    if (input.startsWith(endToken, cursor) && !isEscaped(input, cursor)) {
      depth -= 1
      if (depth === 0) return { body: input.slice(start, cursor), endIndex: cursor + endToken.length }
      cursor += endToken.length
      continue
    }

    cursor += 1
  }

  return undefined
}

class LatexParser {
  private index = 0

  constructor(private readonly input: string) {}

  parse(): string {
    return cleanMathText(this.parseExpression())
  }

  private parseExpression(stop?: () => boolean): string {
    let output = ''
    while (this.index < this.input.length && !stop?.()) {
      output += this.parseAtomWithScripts()
    }
    return output
  }

  private parseAtomWithScripts(): string {
    const base = this.parseAtom()
    if (!base) return ''

    let sub: string | undefined
    let sup: string | undefined

    while (true) {
      const beforeSpaces = this.index
      this.skipSpaces()
      const char = this.peek()
      if (char !== '_' && char !== '^') {
        this.index = beforeSpaces
        break
      }

      this.index += 1
      const value = this.parseScriptArgument()
      if (char === '_') sub = sub ? `${sub},${value}` : value
      else sup = sup ? `${sup},${value}` : value
    }

    return sub || sup ? formatScripts(base, sub, sup) : base
  }

  private parseScriptArgument(): string {
    this.skipSpaces()
    if (this.peek() === '{') {
      const raw = this.readRequiredGroupRaw()
      if (/^[A-Za-z]+(?:_[A-Za-z0-9]+)+$/.test(raw.trim())) return raw.trim()
      return convertLatexMath(raw)
    }
    return this.parseAtom()
  }

  private parseAtom(): string {
    const char = this.peek()
    if (!char) return ''

    if (/\s/.test(char)) {
      this.index += 1
      return ' '
    }

    if (char === '%') {
      while (this.index < this.input.length && this.input[this.index] !== '\n') this.index += 1
      return ''
    }

    if (char === '{') return this.readConvertedGroup()
    if (char === '}') return ''
    if (char === '&') {
      this.index += 1
      return ' '
    }
    if (char === '\\') return this.parseCommand()

    this.index += 1
    if (char === '~') return ' '
    if (char === "'") return '′'
    return char
  }

  private parseCommand(): string {
    this.index += 1
    const next = this.peek()
    if (!next) return '\\'

    if (next === '\\') {
      this.index += 1
      return '\n'
    }

    if (!/[A-Za-z]/.test(next)) {
      this.index += 1
      return this.parseSingleCharacterCommand(next)
    }

    const command = this.readCommandName()
    if (this.peek() === '*') this.index += 1

    if (SIMPLE_COMMANDS[command]) return SIMPLE_COMMANDS[command]
    if (FUNCTION_COMMANDS.has(command)) return command
    if (TEXT_COMMANDS.has(command)) return this.readConvertedGroupOrAtom()

    if (command === 'mathbb') return this.convertMathbb(this.readConvertedGroupOrAtom())
    if (command === 'mathcal' || command === 'mathscr' || command === 'mathfrak') return this.readConvertedGroupOrAtom()

    if (command === 'frac' || command === 'dfrac' || command === 'tfrac') {
      return formatFraction(this.readConvertedGroupOrAtom(), this.readConvertedGroupOrAtom())
    }

    if (command === 'sfrac') {
      return `${cleanMathText(this.readConvertedGroupOrAtom())}/${cleanMathText(this.readConvertedGroupOrAtom())}`
    }

    if (command === 'sqrt') {
      const degree = this.readOptionalBracketRaw()
      return formatSqrt(this.readConvertedGroupOrAtom(), degree ? convertLatexMath(degree) : undefined)
    }

    if (command === 'binom' || command === 'dbinom' || command === 'tbinom') {
      return formatBinom(this.readConvertedGroupOrAtom(), this.readConvertedGroupOrAtom())
    }

    if (command === 'left' || command === 'right' || command.startsWith('big')) return this.readDelimiter()

    if (command === 'begin') {
      const env = this.readRequiredGroupRaw()
      const found = findEnvironmentEnd(this.input, this.index, env)
      if (!found) return ''
      this.index = found.endIndex
      return formatMatrix(env, found.body)
    }

    if (command === 'operatorname') return cleanMathText(this.readRequiredGroupRaw())
    if (command === 'textcolor') {
      this.readRequiredGroupRaw()
      return this.readConvertedGroupOrAtom()
    }
    if (command === 'color') {
      this.readRequiredGroupRaw()
      return ''
    }
    if (command === 'colorbox') {
      this.readRequiredGroupRaw()
      return this.readConvertedGroupOrAtom()
    }
    if (command === 'fcolorbox') {
      this.readRequiredGroupRaw()
      this.readRequiredGroupRaw()
      return this.readConvertedGroupOrAtom()
    }
    if (command === 'href') {
      this.readRequiredGroupRaw()
      return this.readConvertedGroupOrAtom()
    }
    if (command === 'url') return this.readRequiredGroupRaw()
    if (command === 'tag') return `(${cleanMathText(this.readRequiredGroupRaw())})`
    if (command === 'label') {
      this.readRequiredGroupRaw()
      return ''
    }

    if (ACCENTS[command]) return formatAccent(command, this.readConvertedGroupOrAtom())

    if (command === 'quad') return '  '
    if (command === 'qquad') return '   '
    if (command === 'enspace' || command === 'thinspace' || command === 'hspace') return ' '

    const beforeUnknownArg = this.index
    this.skipSpaces()
    if (this.peek() === '{') return `${command}(${cleanMathText(this.readConvertedGroup())})`
    this.index = beforeUnknownArg
    return command
  }

  private parseSingleCharacterCommand(command: string): string {
    if (command === ',' || command === ';' || command === ':' || command === ' ') return ' '
    if (command === '!') return ''
    if (command === '%') return '%'
    if (command === '$') return '$'
    if (command === '#') return '#'
    if (command === '&') return '&'
    if (command === '_') return '_'
    if (command === '{') return '{'
    if (command === '}') return '}'
    if (command === '[') return '['
    if (command === ']') return ']'
    if (command === '(') return '('
    if (command === ')') return ')'
    return command
  }

  private readCommandName(): string {
    const start = this.index
    while (/[A-Za-z]/.test(this.peek())) this.index += 1
    return this.input.slice(start, this.index)
  }

  private readConvertedGroup(): string {
    if (this.peek() !== '{') return ''
    this.index += 1
    const value = this.parseExpression(() => this.peek() === '}')
    if (this.peek() === '}') this.index += 1
    return value
  }

  private readConvertedGroupOrAtom(): string {
    this.skipSpaces()
    if (this.peek() === '{') return this.readConvertedGroup()
    return this.parseAtomWithScripts()
  }

  private readRequiredGroupRaw(): string {
    this.skipSpaces()
    if (this.peek() !== '{') return ''
    this.index += 1
    const start = this.index
    let depth = 1
    while (this.index < this.input.length && depth > 0) {
      const char = this.input[this.index]
      if (char === '\\') {
        this.index += 2
        continue
      }
      if (char === '{') depth += 1
      else if (char === '}') depth -= 1
      this.index += 1
    }
    return this.input.slice(start, depth === 0 ? this.index - 1 : this.index)
  }

  private readOptionalBracketRaw(): string | undefined {
    this.skipSpaces()
    if (this.peek() !== '[') return undefined
    this.index += 1
    const start = this.index
    let depth = 1
    while (this.index < this.input.length && depth > 0) {
      const char = this.input[this.index]
      if (char === '\\') {
        this.index += 2
        continue
      }
      if (char === '[') depth += 1
      else if (char === ']') depth -= 1
      this.index += 1
    }
    return this.input.slice(start, depth === 0 ? this.index - 1 : this.index)
  }

  private readDelimiter(): string {
    this.skipSpaces()
    if (this.peek() === '\\') {
      this.index += 1
      const command = /[A-Za-z]/.test(this.peek()) ? this.readCommandName() : this.input[this.index++]
      if (command === '.') return ''
      return SIMPLE_COMMANDS[command] || this.parseSingleCharacterCommand(command)
    }

    const delimiter = this.peek()
    if (!delimiter) return ''
    this.index += 1
    return delimiter === '.' ? '' : delimiter
  }

  private convertMathbb(value: string): string {
    const clean = cleanMathText(value)
    return Array.from(clean)
      .map((char) => MATHBB[char] || char)
      .join('')
  }

  private skipSpaces(): void {
    while (/[ \t\r\n]/.test(this.peek())) this.index += 1
  }

  private peek(): string {
    return this.input[this.index] || ''
  }
}

export function convertLatexMath(input: string): string {
  return new LatexParser(input).parse()
}

function findClosingToken(text: string, start: number, token: string): number {
  let cursor = start
  while (cursor < text.length) {
    const found = text.indexOf(token, cursor)
    if (found < 0) return -1
    if (!isEscaped(text, found)) return found
    cursor = found + token.length
  }
  return -1
}

function findSingleDollarMath(text: string, start: number): DelimitedMath | undefined {
  if (isEscaped(text, start) || text[start + 1] === '$' || /\s/.test(text[start + 1] || '')) return undefined

  let cursor = start + 1
  while (cursor < text.length) {
    const close = text.indexOf('$', cursor)
    if (close < 0) return undefined
    const contentBeforeClose = text.slice(start + 1, close)
    if (/[\n`]/.test(contentBeforeClose)) return undefined
    if (!isEscaped(text, close) && text[close - 1] !== '$' && !/\s/.test(text[close - 1] || '')) {
      const content = contentBeforeClose
      if (shouldTreatSingleDollarAsMath(content)) return { content, endIndex: close + 1 }
      return undefined
    }
    cursor = close + 1
  }

  return undefined
}

function shouldTreatSingleDollarAsMath(content: string): boolean {
  const clean = content.trim()
  if (!clean) return false
  if (/^\d+(?:[.,]\d+)?$/.test(clean)) return false
  if (/\\|[_^=<>+\-*/]|\b(?:alpha|beta|gamma|theta|lambda|sum|int|frac|sqrt)\b/.test(clean)) return true
  return /^[A-Za-z][A-Za-z0-9]?('?|\d*)$/.test(clean)
}

function findDelimitedMathAt(text: string, index: number): DelimitedMath | undefined {
  if (text.startsWith('$$', index) && !isEscaped(text, index)) {
    const close = findClosingToken(text, index + 2, '$$')
    if (close >= 0) return { content: text.slice(index + 2, close), endIndex: close + 2 }
    return undefined
  }

  if (text.startsWith('\\[', index) && !isEscaped(text, index)) {
    const close = findClosingToken(text, index + 2, '\\]')
    if (close >= 0) return { content: text.slice(index + 2, close), endIndex: close + 2 }
    return undefined
  }

  if (text.startsWith('\\(', index) && !isEscaped(text, index)) {
    const close = findClosingToken(text, index + 2, '\\)')
    if (close >= 0) return { content: text.slice(index + 2, close), endIndex: close + 2 }
    return undefined
  }

  if (text.startsWith('\\begin{', index) && !isEscaped(text, index)) {
    const match = /^\\begin\{([^}]+)\}/.exec(text.slice(index))
    if (!match) return undefined
    const env = match[1]
    const bodyStart = index + match[0].length
    const found = findEnvironmentEnd(text, bodyStart, env)
    if (found) return { content: text.slice(index, found.endIndex), endIndex: found.endIndex }
  }

  if (text[index] === '$') return findSingleDollarMath(text, index)
  return undefined
}

function findInlineCodeEnd(text: string, start: number): number {
  const close = text.indexOf('`', start + 1)
  return close >= 0 ? close + 1 : text.length
}

function findFenceEnd(text: string, start: number): number {
  const close = text.indexOf('```', start + 3)
  return close >= 0 ? close + 3 : text.length
}

function lastVisibleChar(text: string): string {
  const match = /\S\s*$/.exec(text)
  return match ? match[0].trim() : ''
}

function needsMathBoundary(output: string, converted: string, previousWasMath: boolean): boolean {
  const left = lastVisibleChar(output)
  const right = converted.trim()[0] || ''
  if (!left || !right) return false
  if (/\s/.test(output[output.length - 1] || '')) return false
  if (/[([{=+\-*/<>≤≥,;:]/.test(left)) return false
  if (/[)\]},.;:]/.test(right)) return false
  return previousWasMath || /[\p{L}\p{N}¹²³⁰-⁹₀-₉)\]}]/u.test(left)
}

const LOOSE_MATH_COMMAND_PATTERN =
  /\\(?:begin|frac|dfrac|tfrac|sfrac|sqrt|sum|prod|int|iint|iiint|oint|lim|alpha|beta|gamma|delta|theta|lambda|mu|pi|rho|sigma|phi|omega|mathbb|mathrm|mathbf|operatorname)(?=[^A-Za-z]|$)/

function shouldConvertLooseMathLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (LOOSE_MATH_COMMAND_PATTERN.test(trimmed)) return true
  if (/\\[A-Za-z]+\s*\{/.test(trimmed)) return true
  if (/^[A-Za-z][A-Za-z0-9]*\s*[_^]\s*\{/.test(trimmed)) return true
  if (/^[A-Za-z]\s*[_^]\s*[A-Za-z0-9]$/.test(trimmed)) return true
  if (!/[=+\-*/<>≤≥]/.test(trimmed)) return false
  return /[A-Za-z0-9)}]\s*[_^]\s*(?:\{|[A-Za-z0-9\\])/.test(trimmed)
}

function convertLooseMathInPlainText(text: string): string {
  return text
    .split(/(\n)/)
    .map((part) => {
      if (part === '\n' || !shouldConvertLooseMathLine(part)) return part

      const leading = part.match(/^\s*/)?.[0] || ''
      const trailing = part.match(/\s*$/)?.[0] || ''
      return `${leading}${convertLatexMath(part)}${trailing}`
    })
    .join('')
}

export function normalizeMathForDisplay(text: string): string {
  let output = ''
  let plain = ''
  let index = 0
  let previousWasMath = false

  const flushPlain = () => {
    if (!plain) return
    output += convertLooseMathInPlainText(plain)
    plain = ''
    previousWasMath = false
  }

  while (index < text.length) {
    if (text.startsWith('```', index)) {
      flushPlain()
      const end = findFenceEnd(text, index)
      output += text.slice(index, end)
      index = end
      previousWasMath = false
      continue
    }

    if (text[index] === '`') {
      flushPlain()
      const end = findInlineCodeEnd(text, index)
      output += text.slice(index, end)
      index = end
      previousWasMath = false
      continue
    }

    const math = findDelimitedMathAt(text, index)
    if (math) {
      flushPlain()
      const converted = convertLatexMath(math.content)
      if (needsMathBoundary(output, converted, previousWasMath)) output += ' '
      output += converted
      index = math.endIndex
      previousWasMath = true
      continue
    }

    plain += text[index]
    previousWasMath = false
    index += 1
  }

  flushPlain()

  return output
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
