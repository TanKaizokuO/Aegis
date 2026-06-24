export default function defaultReporter(results, options = {}) {
  const { quiet, why } = options;
  let totalWarnings = 0;
  let output = '';

  for (const file of results) {
    const messages = file.Messages || [];
    totalWarnings += messages.length;

    if (messages.length === 0) {
      if (!quiet) {
        output += `${file.path}: no issues found\n`;
      }
      continue;
    }

    output += `\n${file.path}\n`;
    for (const msg of messages) {
      const pos = `  ${msg.Line}:${msg.Column}-${msg.EndLine}:${msg.EndColumn}`;
      const ruleInfo = why ? `${msg.RuleId}  (${msg.Source})` : msg.RuleId;
      output += `${pos}  warning  ${msg.Message}  ${ruleInfo}\n`;
    }
  }

  if (totalWarnings > 0) {
    output += `\n⚠ ${totalWarnings} warning(s)\n`;
  }

  // Print to stderr
  if (output.trim().length > 0) {
    process.stderr.write(output.trimStart());
  }
}
