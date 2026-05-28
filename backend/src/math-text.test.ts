import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { convertLatexMath, normalizeMathForDisplay } from './math-text.js'

describe('LaTeX math to readable backend text', () => {
  it('converts common raw math expressions into readable Unicode text', () => {
    assert.equal(normalizeMathForDisplay(String.raw`E = mc^2`), 'E = mc²')
    assert.equal(normalizeMathForDisplay(String.raw`\alpha + \beta = \gamma`), 'α + β = γ')
    assert.equal(normalizeMathForDisplay(String.raw`\mathbb{R}`), 'R')
  })

  it('converts fractions, square roots, and nested expressions without dropping content', () => {
    assert.equal(
      normalizeMathForDisplay(String.raw`\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`),
      '(-b ± sqrt(b² - 4ac)) / 2a',
    )
    assert.equal(normalizeMathForDisplay(String.raw`\sqrt[3]{x^2 + y^2}`), 'root_3(x² + y²)')
  })

  it('handles multiple delimiter styles and adjacent expressions', () => {
    const input = String.raw`Inline $x_i$ and \(y^2\). Display: $$\sum_{i=1}^{n} i^2$$. Adjacent: \(a\)\(b\).`

    assert.equal(
      normalizeMathForDisplay(input),
      'Inline x_(i) and y². Display: ∑[i = 1..n] i². Adjacent: a b.',
    )
  })

  it('preserves text spacing between loose and delimited math expressions', () => {
    const input = String.raw`Formula: \frac{a}{b}. Adjacent: \(x_i\)\(y_i\). Sum: $$\sum_{i=1}^{n} i^2$$.`

    assert.equal(normalizeMathForDisplay(input), 'Formula: a / b. Adjacent: x_(i) y_(i). Sum: ∑[i = 1..n] i².')
  })

  it('converts loose operators with limits and stays stable across repeated normalization', () => {
    const input = String.raw`Integral: \int_a^b f(x)\,dx. Limit: \lim_{x\to0} \frac{\sin x}{x}. Adjacent: \(x_i\)\(y_i\).`
    const once = normalizeMathForDisplay(input)

    assert.equal(once, 'Integral: ∫[a..b] f(x) dx. Limit: lim[x → 0] (sin x) / x. Adjacent: x_(i) y_(i).')
    assert.equal(normalizeMathForDisplay(once), once)
  })

  it('does not treat ordinary money or code spans as math', () => {
    const input = [
      String.raw`The price is $20 and the range is $2.50 to $3.00.`,
      'Inline code: `x_i + y_i`.',
      '```',
      String.raw`\frac{a}{b}`,
      '```',
      String.raw`Math: $x_i + y_i$.`,
    ].join('\n')

    assert.equal(
      normalizeMathForDisplay(input),
      [
        String.raw`The price is $20 and the range is $2.50 to $3.00.`,
        'Inline code: `x_i + y_i`.',
        '```',
        String.raw`\frac{a}{b}`,
        '```',
        'Math: x_(i) + y_(i).',
      ].join('\n'),
    )
  })

  it('formats matrices, aligned equations, and cases as multiline text', () => {
    assert.equal(convertLatexMath(String.raw`\begin{matrix}a&b\\c&d\end{matrix}`), '[a b]\n[c d]')
    assert.equal(
      convertLatexMath(String.raw`\begin{cases}x^2,&x \ge 0\\-x,&x < 0\end{cases}`),
      'x² if x ≥ 0\n-x if x < 0',
    )
    assert.equal(
      convertLatexMath(String.raw`\begin{aligned}a&=b+c\\d&=e-f\end{aligned}`),
      'a = b + c\nd = e-f',
    )
  })

  it('uses readable fallbacks for scripts that Unicode cannot safely represent', () => {
    assert.equal(normalizeMathForDisplay(String.raw`T_{\rho}^{\mu\nu}`), 'T_(ρ)^(μν)')
    assert.equal(normalizeMathForDisplay(String.raw`x_{long_name}`), 'x_(long_name)')
  })

  it('preserves unknown commands by name instead of silently deleting them', () => {
    assert.equal(normalizeMathForDisplay(String.raw`\unknown{a+b}`), 'unknown(a + b)')
  })
})
