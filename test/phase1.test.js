import test from 'node:test';
import assert from 'node:assert';
import {
  AnalyzeMarkdown,
  AnalyzeMDX,
  AnalyzeHTML,
  AnalyzePlainText,
  VirtualFile
} from '../index.js';

test('Aegis Linter - Core Analysis Engine', async (t) => {

  await t.test('VirtualFile Input & Output Formats', () => {
    // String input automatically wrapped
    const resString = AnalyzePlainText('This is clean.');
    assert.ok(resString instanceof VirtualFile);
    assert.strictEqual(resString.Value, 'This is clean.');
    assert.deepEqual(resString.Messages, []);

    // Custom VirtualFile input
    const vf = new VirtualFile({
      Value: 'He is a cripple.',
      Path: 'docs/guide.txt',
      Data: { author: 'Aegis Team' }
    });
    const resVf = AnalyzePlainText(vf);
    assert.strictEqual(resVf.Path, 'docs/guide.txt');
    assert.strictEqual(resVf.Data.author, 'Aegis Team');
    assert.ok(resVf.Messages.length > 0);
  });

  await t.test('Equality Analyzer - Insensitive Terms and Alternatives', () => {
    const res = AnalyzePlainText('He is a cripple.');
    // Should flag 'he' (gender bias) and 'cripple' (gimp rule)
    assert.strictEqual(res.Messages.length, 2);

    const msgHe = res.Messages[0];
    assert.strictEqual(msgHe.RuleId, 'he-she');
    assert.strictEqual(msgHe.Source, 'EqualityAnalyzer');
    assert.strictEqual(msgHe.Severity, 'WARNING');
    assert.strictEqual(msgHe.ActualText, 'He');
    assert.deepEqual(msgHe.SuggestedReplacements, ['they', 'person']);
    assert.strictEqual(msgHe.Message, '`He` may be insensitive, use `they`, `person` instead');

    const msgCripple = res.Messages[1];
    assert.strictEqual(msgCripple.RuleId, 'gimp');
    assert.strictEqual(msgCripple.Source, 'EqualityAnalyzer');
    assert.strictEqual(msgCripple.ActualText, 'cripple');
    assert.deepEqual(msgCripple.SuggestedReplacements, ['disabled', 'person with a disability']);
    assert.strictEqual(msgCripple.Message, '`cripple` may be insensitive, when referring to a person, use `disabled`, `person with a disability` instead');
  });

  await t.test('Profanity Analyzer - Ratings and Message Patterns', () => {
    // Rating 0 profanity: "beaver" or "butt"
    const resRating0 = AnalyzePlainText('Watch out for that beaver!');
    assert.strictEqual(resRating0.Messages.length, 1);
    assert.strictEqual(resRating0.Messages[0].RuleId, 'beaver');
    assert.strictEqual(resRating0.Messages[0].Source, 'ProfanityAnalyzer');
    assert.strictEqual(resRating0.Messages[0].Message, 'Be careful with `beaver`, it\'s profane in some cases');

    // Rating 2 profanity: "asshat"
    const resRating2 = AnalyzePlainText('He is an asshat.');
    // Should flag 'He' (equality) and 'asshat' (profanity rating 2)
    assert.strictEqual(resRating2.Messages.length, 2);
    const msgAsshat = resRating2.Messages.find(m => m.RuleId === 'asshat');
    assert.ok(msgAsshat);
    assert.strictEqual(msgAsshat.Message, 'Don\'t use `asshat`, it\'s profane');
  });

  await t.test('Profanity Analyzer - ProfanityThreshold', () => {
    // default threshold is 0
    const resDefault = AnalyzePlainText('Watch out for that beaver! He is an asshat.');
    const ruleIdsDefault = resDefault.Messages.map(m => m.RuleId);
    assert.ok(ruleIdsDefault.includes('beaver'));
    assert.ok(ruleIdsDefault.includes('asshat'));

    // threshold 1: skips rating 0 ("beaver"), includes rating 1/2 ("asshat")
    const resThreshold1 = AnalyzePlainText('Watch out for that beaver! He is an asshat.', { ProfanityThreshold: 1 });
    const ruleIdsT1 = resThreshold1.Messages.map(m => m.RuleId);
    assert.ok(!ruleIdsT1.includes('beaver'));
    assert.ok(ruleIdsT1.includes('asshat'));

    // threshold 2: skips rating 0 and 1, includes rating 2 ("asshat")
    const resThreshold2 = AnalyzePlainText('Watch out for that beaver! He is an asshat.', { ProfanityThreshold: 2 });
    const ruleIdsT2 = resThreshold2.Messages.map(m => m.RuleId);
    assert.ok(!ruleIdsT2.includes('beaver'));
    assert.ok(ruleIdsT2.includes('asshat'));
  });

  await t.test('Greedy Matching & Match Precedence', () => {
    // "master server" is in the dictionary (longest match)
    // "master" is also in the dictionary
    // "master server" should produce a single violation, not two
    const res = AnalyzePlainText('This is the master server.');
    assert.strictEqual(res.Messages.length, 1);
    assert.strictEqual(res.Messages[0].ActualText, 'master server');
    assert.strictEqual(res.Messages[0].RuleId, 'master-slave');
  });

  await t.test('Binary Pairs Config Modes', () => {
    const text = 'He or she should write code.';

    // DisableBinaryPairs: false (default) -> recognized as inclusive, not flagged
    const resDefault = AnalyzePlainText(text);
    // Should NOT contain a warning for "He or she" (individual he/she also shouldn't be flagged)
    const hasHeShe = resDefault.Messages.some(m => m.RuleId === 'he-she');
    assert.strictEqual(hasHeShe, false);

    // DisableBinaryPairs: true -> flagged with single suggestion "they"
    const resDisabled = AnalyzePlainText(text, { DisableBinaryPairs: true });
    const msgBinary = resDisabled.Messages.find(m => m.ActualText.toLowerCase() === 'he or she');
    assert.ok(msgBinary);
    assert.strictEqual(msgBinary.RuleId, 'he-she');
    assert.deepEqual(msgBinary.SuggestedReplacements, ['they']);
    assert.strictEqual(msgBinary.Message, '`He or she` may be insensitive, use `they` instead');
  });

  await t.test('Literal Context Detection & Skipping', () => {
    // Quoted text should be skipped for Equality analyzer
    const resQuotes = AnalyzePlainText('He said "she" is a developer.');
    // Should flag 'He' but NOT 'she' since it is in quotes
    assert.strictEqual(resQuotes.Messages.length, 1);
    assert.strictEqual(resQuotes.Messages[0].ActualText, 'He');

    // Sentence starter followed by em-dash: "He — ..."
    const resEmDash = AnalyzePlainText('He — this is a literal start. She is fine.');
    // Should skip 'He' (due to em-dash), but flag 'She'
    assert.strictEqual(resEmDash.Messages.length, 1);
    assert.strictEqual(resEmDash.Messages[0].ActualText, 'She');
  });

  await t.test('Markdown AST & Syntax Stripping', () => {
    const mdContent = `
# Title containing no issue

Here is some prose with he.

\`\`\`javascript
// Code block should be ignored
const she = 'ignored';
const master = 'ignored';
\`\`\`

Here is an inline \`cripple\` code span that is ignored.

<!-- Comment should be ignored -->

And some standard prose with a slave.
    `;

    const res = AnalyzeMarkdown(mdContent);
    // Should flag 'he' and 'slave', but not code block, inline code, or comment contents.
    const ruleIds = res.Messages.map(m => m.RuleId);
    assert.ok(ruleIds.includes('he-she'));
    assert.ok(ruleIds.includes('master-slave'));
    assert.strictEqual(res.Messages.length, 2);
  });

  await t.test('MDX AST & Syntax Stripping', () => {
    const mdxContent = `
# MDX Document

Plain text with he before component.

<MyComponent prop="ignored-he">
  Text inside component with she is analyzed.
</MyComponent>

{/* MDX comments or expressions with cripple are ignored */}
{() => { const master = 'ignored'; }}
    `;

    const res = AnalyzeMDX(mdxContent);
    // Should flag 'he' (line 4) and 'she' (line 7), but ignore jsx attributes, expressions, comments
    assert.strictEqual(res.Messages.length, 2);
    assert.strictEqual(res.Messages[0].ActualText, 'he');
    assert.strictEqual(res.Messages[1].ActualText, 'she');
  });

  await t.test('HTML AST & Syntax Stripping', () => {
    const htmlContent = `
<div>
  <p>Visible prose with he.</p>
  <script>
    const she = 'ignored';
  </script>
  <style>
    body { content: 'cripple ignored'; }
  </style>
  <!-- Comment with master is ignored -->
  <span attr="ignored-she">Visible slave.</span>
</div>
    `;

    const res = AnalyzeHTML(htmlContent);
    // Should flag 'he' and 'slave', ignoring scripts, styles, attributes, comments
    assert.strictEqual(res.Messages.length, 2);
    assert.strictEqual(res.Messages[0].ActualText, 'he');
    assert.strictEqual(res.Messages[1].ActualText, 'slave');
  });

  await t.test('Line & Column Position Calculations', () => {
    const content = `Line 1 clean.
Line 2 has he.
Line 3 has master server.
Line 4 is clean.`;

    const res = AnalyzePlainText(content);
    assert.strictEqual(res.Messages.length, 2);

    // "he" is on Line 2
    const msgHe = res.Messages[0];
    assert.strictEqual(msgHe.Line, 2);
    assert.strictEqual(msgHe.Column, 12);
    assert.strictEqual(msgHe.EndLine, 2);
    assert.strictEqual(msgHe.EndColumn, 14);

    // "master server" is on Line 3
    const msgMaster = res.Messages[1];
    assert.strictEqual(msgMaster.Line, 3);
    assert.strictEqual(msgMaster.Column, 12);
    assert.strictEqual(msgMaster.EndLine, 3);
    assert.strictEqual(msgMaster.EndColumn, 25);
  });

  await t.test('Position Calculations Near Stripped Boundaries', () => {
    const content = `Paragraph 1.

\`\`\`javascript
const codeBlock = true;
\`\`\`

Paragraph 2 with he.`;

    const res = AnalyzeMarkdown(content);
    assert.strictEqual(res.Messages.length, 1);
    
    // "he" is on line 7 ("Paragraph 2 with he.")
    const msg = res.Messages[0];
    assert.strictEqual(msg.Line, 7);
    assert.strictEqual(msg.Column, 18);
    assert.strictEqual(msg.EndLine, 7);
    assert.strictEqual(msg.EndColumn, 20);
  });

  await t.test('Empty Input handling', () => {
    const res = AnalyzePlainText('');
    assert.deepEqual(res.Messages, []);
  });

});
