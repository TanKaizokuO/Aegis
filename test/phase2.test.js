import test from 'node:test';
import assert from 'node:assert';
import { AnalyzeMarkdown, AnalyzePlainText } from '../index.js';

test('Configuration Validation', async (t) => {
  await t.test('Throws error if AllowList and DenyList are both provided', () => {
    assert.throws(
      () => AnalyzeMarkdown("hello", { AllowList: ['he-she'], DenyList: ['he-she'] }),
      /Do not provide both allow and deny configuration parameters/
    );
  });

  await t.test('Normalizes array of strings to AllowList', () => {
    // 'he' should trigger a warning unless suppressed
    const doc = "Is he going to the store?";
    
    // Normal case without config
    const file1 = AnalyzeMarkdown(doc);
    assert.strictEqual(file1.Messages.length, 1);
    
    // With shorthand config
    const file2 = AnalyzeMarkdown(doc, ['he-she']);
    assert.strictEqual(file2.Messages.length, 0);
  });
});

test('Filtering Logic', async (t) => {
  await t.test('AllowList suppresses listed rules', () => {
    const doc = "Is he going to the store? She is waiting.";
    const file = AnalyzeMarkdown(doc, { AllowList: ['he-she'] });
    assert.strictEqual(file.Messages.length, 0);
  });

  await t.test('DenyList only fires listed rules', () => {
    // 'he' triggers he-she, 'master' triggers master-slave
    const doc = "Is he going to the master branch?";
    const file = AnalyzeMarkdown(doc, { DenyList: ['master-slave'] });
    assert.strictEqual(file.Messages.length, 1);
    assert.strictEqual(file.Messages[0].RuleId, 'master-slave');
  });

  await t.test('DenyList with an empty array fires absolutely NO rules', () => {
    const doc = "Is he going to the master branch? What a bitch.";
    const file = AnalyzeMarkdown(doc, { DenyList: [] });
    assert.strictEqual(file.Messages.length, 0);
  });
});

test('In-Document Directives', async (t) => {
  await t.test('disable and enable for all rules indefinitely', () => {
    const doc = `
He is going.
<!--aegis disable-->
She is going.
Master branch.
<!--aegis enable-->
He is going again.
    `;
    const file = AnalyzeMarkdown(doc);
    assert.strictEqual(file.Messages.length, 2);
    assert.strictEqual(file.Messages[0].ActualText, 'He');
    assert.strictEqual(file.Messages[1].ActualText, 'He'); // The second one
  });

  await t.test('disable and enable specific rules', () => {
    const doc = `
<!--aegis disable master-slave-->
Is he going to the master branch?
<!--aegis enable master-slave-->
Master branch again.
    `;
    const file = AnalyzeMarkdown(doc);
    assert.strictEqual(file.Messages.length, 2);
    assert.strictEqual(file.Messages[0].ActualText, 'he'); // Not disabled
    assert.strictEqual(file.Messages[1].ActualText, 'Master'); // Re-enabled
  });

  await t.test('ignore specific rules for next content node only', () => {
    const doc = `
<!--aegis ignore master-slave-->
This paragraph uses the master branch. He is here.

This paragraph also uses the master branch.
    `;
    const file = AnalyzeMarkdown(doc);
    assert.strictEqual(file.Messages.length, 2);
    // Paragraph 1: 'He' is caught, 'master' is ignored.
    assert.strictEqual(file.Messages[0].ActualText, 'He');
    assert.strictEqual(file.Messages[0].RuleId, 'he-she');
    
    // Paragraph 2: 'master' is caught (ignore expired).
    assert.strictEqual(file.Messages[1].ActualText, 'master');
    assert.strictEqual(file.Messages[1].RuleId, 'master-slave');
  });

  await t.test('ignore all rules for next content node only', () => {
    const doc = `
<!--aegis ignore-->
This paragraph uses the master branch and he is here.

This paragraph also uses the master branch.
    `;
    const file = AnalyzeMarkdown(doc);
    assert.strictEqual(file.Messages.length, 1);
    // Paragraph 2: 'master' is caught (ignore expired).
    assert.strictEqual(file.Messages[0].ActualText, 'master');
  });
});

test('Directive Edge Cases', async (t) => {
  await t.test('Ordering: disable -> ignore -> enable', () => {
    const doc = `
<!--aegis disable he-she-->
<!--aegis ignore master-slave-->
<!--aegis enable he-she-->
He uses the master branch.

He uses the master branch again.
    `;
    const file = AnalyzeMarkdown(doc);
    assert.strictEqual(file.Messages.length, 3);
    // P1: 'He' caught, 'master' ignored.
    assert.strictEqual(file.Messages[0].ActualText, 'He');
    // P2: 'He' caught, 'master' caught.
    assert.strictEqual(file.Messages[1].ActualText, 'He');
    assert.strictEqual(file.Messages[2].ActualText, 'master');
  });

  await t.test('Nested structures: ignore before a blockquote', () => {
    const doc = `
<!--aegis ignore he-she-->
> He is writing code.

He is writing code.
    `;
    const file = AnalyzeMarkdown(doc);
    // Blockquote contains a paragraph. The ignore should apply to the paragraph inside the blockquote,
    // and then expire. The second paragraph should flag 'He'.
    assert.strictEqual(file.Messages.length, 1);
    assert.strictEqual(file.Messages[0].Line, 5); // Second 'He'
  });

  await t.test('ignore at end of document acts as safe no-op', () => {
    const doc = `
He is writing code.
<!--aegis ignore-->
    `;
    const file = AnalyzeMarkdown(doc);
    assert.strictEqual(file.Messages.length, 1);
  });
});

test('Format Specific Support', async (t) => {
  await t.test('Plain text does not support directives', () => {
    const doc = `
<!--aegis ignore he-she-->
He is writing code.
    `;
    const file = AnalyzePlainText(doc);
    // The comment itself is just text, so 'he' and 'she' in 'he-she' will trigger warnings,
    // plus the 'He' on the next line.
    assert.strictEqual(file.Messages.length, 3);
    assert.strictEqual(file.Messages[0].ActualText, 'he');
    assert.strictEqual(file.Messages[1].ActualText, 'she');
    assert.strictEqual(file.Messages[2].ActualText, 'He');
  });
});

test('Stateless Invocations', async (t) => {
  await t.test('State is fully reset between calls', () => {
    const doc1 = `
<!--aegis disable-->
He is writing code.
    `;
    const file1 = AnalyzeMarkdown(doc1);
    assert.strictEqual(file1.Messages.length, 0);

    const doc2 = `
He is writing code.
    `;
    const file2 = AnalyzeMarkdown(doc2);
    // If state bled over, this would be 0
    assert.strictEqual(file2.Messages.length, 1);
  });
});
