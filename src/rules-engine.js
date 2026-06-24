import { equalityRules, profanityRules } from './dictionaries.js';

function matchPhrase(tokens, idx, phraseWords) {
  let phraseIdx = 0;
  let currentIdx = idx;
  
  while (phraseIdx < phraseWords.length && currentIdx < tokens.length) {
    const token = tokens[currentIdx];
    
    if (token.type === 'space' || token.type === 'newline' || (token.type === 'punctuation' && token.value !== phraseWords[phraseIdx])) {
      currentIdx++;
      continue;
    }
    
    if (token.type === 'word') {
      if (token.value.toLowerCase() === phraseWords[phraseIdx].toLowerCase()) {
        phraseIdx++;
        currentIdx++;
        continue;
      } else {
        return 0;
      }
    }
    
    return 0;
  }
  
  if (phraseIdx === phraseWords.length) {
    return currentIdx - idx;
  }
  return 0;
}

function sortMessages(messages) {
  return messages.sort((a, b) => {
    if (a.Line !== b.Line) {
      return a.Line - b.Line;
    }
    return a.Column - b.Column;
  });
}

export function runAnalysis(tokens, config) {
  const allowList = new Set(config?.AllowList || []);
  let activeEqualityRules = equalityRules;
  let activeProfanityRules = profanityRules;

  // Pre-filter with DenyList
  if (config?.DenyList) {
    const denySet = new Set(config.DenyList);
    activeEqualityRules = activeEqualityRules.filter(r => denySet.has(r.ruleId));
    activeProfanityRules = activeProfanityRules.filter(r => denySet.has(r.ruleId));
  }
  
  // Pre-filter with AllowList
  if (allowList.size > 0) {
    activeEqualityRules = activeEqualityRules.filter(r => !allowList.has(r.ruleId));
    activeProfanityRules = activeProfanityRules.filter(r => !allowList.has(r.ruleId));
  }

  const threshold = config?.ProfanityThreshold !== undefined ? config.ProfanityThreshold : 0;
  const disableBinaryPairs = config?.DisableBinaryPairs === true;

  const messages = [];
  
  let allDisabled = false;
  const disabledRules = new Set();
  
  let ignoreAll = false;
  const ignoredRules = new Set();
  
  let pendingIgnoreAll = false;
  const pendingIgnoredRules = new Set();

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'directive') {
      const { action, rules } = token;
      if (action === 'disable') {
        if (rules.length === 0) allDisabled = true;
        else rules.forEach(r => disabledRules.add(r));
      } else if (action === 'enable') {
        if (rules.length === 0) {
          allDisabled = false;
          disabledRules.clear();
        } else {
          rules.forEach(r => disabledRules.delete(r));
        }
      } else if (action === 'ignore') {
        if (rules.length === 0) pendingIgnoreAll = true;
        else rules.forEach(r => pendingIgnoredRules.add(r));
      }
      i++;
      continue;
    }

    if (token.type === 'end-of-node') {
      ignoreAll = false;
      ignoredRules.clear();
      i++;
      continue;
    }

    if (token.type !== 'word') {
      i++;
      continue;
    }

    // Transfer pending ignores on first word
    if (pendingIgnoreAll) {
      ignoreAll = true;
      pendingIgnoreAll = false;
    }
    if (pendingIgnoredRules.size > 0) {
      pendingIgnoredRules.forEach(r => ignoredRules.add(r));
      pendingIgnoredRules.clear();
    }

    let bestMatch = null;
    let maxConsumed = 0;
    let isProfanity = false;

    // Check Equality Rules
    for (const rule of activeEqualityRules) {
      if (allDisabled || ignoreAll || disabledRules.has(rule.ruleId) || ignoredRules.has(rule.ruleId)) continue;
      
      const consumed = matchPhrase(tokens, i, rule.phrase);
      if (consumed > maxConsumed) {
        maxConsumed = consumed;
        bestMatch = rule;
        isProfanity = false;
      }
    }

    // Check Profanity Rules
    for (const rule of activeProfanityRules) {
      if (allDisabled || ignoreAll || disabledRules.has(rule.ruleId) || ignoredRules.has(rule.ruleId)) continue;
      if (rule.rating < threshold) continue;

      const consumed = matchPhrase(tokens, i, rule.phrase);
      if (consumed > maxConsumed) {
        maxConsumed = consumed;
        bestMatch = rule;
        isProfanity = true;
      }
    }

    if (bestMatch) {
      const matchedTokens = tokens.slice(i, i + maxConsumed);
      let shouldReport = true;
      
      if (!isProfanity) {
        const hasLiteral = matchedTokens.some(t => t.type === 'word' && t.literalContext);
        if (hasLiteral) shouldReport = false;
      }

      if (shouldReport) {
        const firstToken = matchedTokens[0];
        let lastWordToken = matchedTokens[matchedTokens.length - 1];
        for (let k = matchedTokens.length - 1; k >= 0; k--) {
          if (matchedTokens[k].type === 'word') {
            lastWordToken = matchedTokens[k];
            break;
          }
        }
        
        const actualText = matchedTokens
          .filter(t => t.type === 'word' || t.type === 'punctuation' || t.type === 'space')
          .map(t => t.value)
          .join('');

        if (isProfanity) {
          let messageText = bestMatch.rating === 0 
            ? `Be careful with \`${actualText}\`, it's profane in some cases`
            : `Don't use \`${actualText}\`, it's profane`;
            
          messages.push({
            Line: firstToken.position.line,
            Column: firstToken.position.column,
            EndLine: lastWordToken.position.endLine,
            EndColumn: lastWordToken.position.endColumn,
            Message: messageText,
            RuleId: bestMatch.ruleId,
            Source: 'ProfanityAnalyzer',
            Severity: 'WARNING',
            ActualText: actualText,
            SuggestedReplacements: []
          });
        } else {
          if (bestMatch.isBinaryPair) {
            if (disableBinaryPairs) {
              const alt = bestMatch.suggestions[0];
              const messageText = `\`${actualText}\` may be insensitive, use \`${alt}\` instead`;
              messages.push({
                Line: firstToken.position.line,
                Column: firstToken.position.column,
                EndLine: lastWordToken.position.endLine,
                EndColumn: lastWordToken.position.endColumn,
                Message: messageText,
                RuleId: bestMatch.ruleId,
                Source: 'EqualityAnalyzer',
                Severity: 'WARNING',
                ActualText: actualText,
                SuggestedReplacements: bestMatch.suggestions
              });
            }
          } else {
            const alts = bestMatch.suggestions.map(s => `\`${s}\``).join(', ');
            const messageText = bestMatch.referringToPerson
              ? `\`${actualText}\` may be insensitive, when referring to a person, use ${alts} instead`
              : `\`${actualText}\` may be insensitive, use ${alts} instead`;
              
            messages.push({
              Line: firstToken.position.line,
              Column: firstToken.position.column,
              EndLine: lastWordToken.position.endLine,
              EndColumn: lastWordToken.position.endColumn,
              Message: messageText,
              RuleId: bestMatch.ruleId,
              Source: 'EqualityAnalyzer',
              Severity: 'WARNING',
              ActualText: actualText,
              SuggestedReplacements: bestMatch.suggestions
            });
          }
        }
      }
      
      i += maxConsumed;
    } else {
      i++;
    }
  }

  return sortMessages(messages);
}
