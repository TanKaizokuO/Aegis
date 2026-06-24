import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdx from 'remark-mdx';
import rehypeParse from 'rehype-parse';

// MD/MDX Processor
const mdProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ['yaml', 'toml']);

const mdxProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ['yaml', 'toml'])
  .use(remarkMdx);

// HTML Processor
const htmlProcessor = unified()
  .use(rehypeParse, { fragment: true });

// Traverse Markdown/MDX AST
function extractMdProse(node, proseNodes = []) {
  if (!node) return proseNodes;

  if (
    node.type === 'code' ||
    node.type === 'inlineCode' ||
    node.type === 'yaml' ||
    node.type === 'toml' ||
    node.type === 'mdxjsEsm' ||
    node.type === 'mdxFlowExpression' ||
    node.type === 'mdxTextExpression'
  ) {
    return proseNodes;
  }

  // Parse HTML comments as directives
  if (node.type === 'html' && node.value && node.value.startsWith('<!--')) {
    const match = /<!--aegis\s+(ignore|disable|enable)(?:\s+(.+?))?\s*-->/.exec(node.value);
    if (match) {
      proseNodes.push({
        type: 'directive',
        action: match[1],
        rules: match[2] ? match[2].trim().split(/\s+/) : [],
        position: node.position
      });
    }
    return proseNodes;
  }

  if (node.type === 'text') {
    proseNodes.push(node);
    return proseNodes;
  }

  if (node.children) {
    const isBlock = ['paragraph', 'heading', 'listItem', 'tableCell', 'blockquote'].includes(node.type);
    for (const child of node.children) {
      extractMdProse(child, proseNodes);
    }
    if (isBlock) {
      proseNodes.push({ type: 'end-of-node' });
    }
  }

  return proseNodes;
}

// Traverse HTML AST
function extractHtmlProse(node, proseNodes = []) {
  if (!node) return proseNodes;

  if (node.type === 'comment' && node.value) {
    const match = /^\s*aegis\s+(ignore|disable|enable)(?:\s+(.+?))?\s*$/.exec(node.value);
    if (match) {
      proseNodes.push({
        type: 'directive',
        action: match[1],
        rules: match[2] ? match[2].trim().split(/\s+/) : [],
        position: node.position
      });
    }
    return proseNodes;
  }

  if (node.type === 'element') {
    if (node.tagName === 'script' || node.tagName === 'style') {
      return proseNodes;
    }
    const isBlock = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'blockquote', 'div'].includes(node.tagName);
    if (node.children) {
      for (const child of node.children) {
        extractHtmlProse(child, proseNodes);
      }
    }
    if (isBlock) {
      proseNodes.push({ type: 'end-of-node' });
    }
  } else if (node.type === 'text') {
    proseNodes.push(node);
  } else if (node.type === 'root') {
    if (node.children) {
      for (const child of node.children) {
        extractHtmlProse(child, proseNodes);
      }
    }
  }

  return proseNodes;
}

// Coordinate calculator helper
function calculatePosition(node, indexInNode, length, value) {
  const start = node.position?.start || { line: 1, column: 1, offset: 0 };
  const text = node.value;
  
  let line = start.line;
  let column = start.column;
  
  // Calculate start line/col
  const textBefore = text.slice(0, indexInNode);
  for (let k = 0; k < textBefore.length; k++) {
    if (textBefore[k] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  
  const startLine = line;
  const startColumn = column;
  const startOffset = start.offset + indexInNode;
  
  // Calculate end line/col
  for (let k = 0; k < length; k++) {
    if (value[k] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  
  return {
    line: startLine,
    column: startColumn,
    endLine: line,
    endColumn: column,
    offset: startOffset
  };
}

// Tokenize a text node
function tokenizeTextNode(node) {
  const text = node.value;
  const tokens = [];
  
  // Match word (alphanumeric), spaces, newlines, and punctuation
  const regex = /([a-zA-Z0-9]+)|([ \t\r]+)|(\n)|(.)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const indexInNode = match.index;
    const length = value.length;
    
    let type = 'punctuation';
    if (match[1]) type = 'word';
    else if (match[2]) type = 'space';
    else if (match[3]) type = 'newline';
    
    const pos = calculatePosition(node, indexInNode, length, value);
    
    tokens.push({
      type,
      value,
      position: pos,
      literalContext: false
    });
  }
  
  return tokens;
}

// Helper for literal context
const QUOTES = new Set(['"', "'", '“', '”', '‘', '’', '`']);
const EM_DASHES = new Set(['—', '--', '---']);
const SENTENCE_ENDERS = new Set(['.', '?', '!']);

function isQuoteToken(token) {
  return token && token.type === 'punctuation' && QUOTES.has(token.value);
}

function checkQuoted(tokens, idx) {
  let leftQuote = false;
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k];
    if (t.type === 'space') continue;
    if (isQuoteToken(t)) {
      leftQuote = true;
      break;
    }
    break;
  }
  if (!leftQuote) return false;

  let rightQuote = false;
  for (let k = idx + 1; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type === 'space') continue;
    if (isQuoteToken(t)) {
      rightQuote = true;
      break;
    }
    break;
  }
  return rightQuote;
}

function isStartOfSentence(tokens, idx) {
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k];
    if (t.type === 'space' || t.type === 'newline') continue;
    if (t.type === 'punctuation' && SENTENCE_ENDERS.has(t.value)) {
      return true;
    }
    return false;
  }
  return true;
}

function isFollowedByEmDash(tokens, idx) {
  for (let k = idx + 1; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type === 'space') continue;
    if (t.type === 'punctuation' && EM_DASHES.has(t.value)) {
      return true;
    }
    break;
  }
  return false;
}

function flagLiteralContexts(tokens) {
  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];
    if (token.type !== 'word') continue;
    
    if (checkQuoted(tokens, idx)) {
      token.literalContext = true;
    } else if (isStartOfSentence(tokens, idx) && isFollowedByEmDash(tokens, idx)) {
      token.literalContext = true;
    }
  }
}

export function parseAndBridge(content, format) {
  let proseNodes = [];
  
  if (format === 'markdown') {
    const ast = mdProcessor.parse(content);
    proseNodes = extractMdProse(ast);
  } else if (format === 'mdx') {
    const ast = mdxProcessor.parse(content);
    proseNodes = extractMdProse(ast);
  } else if (format === 'html') {
    const ast = htmlProcessor.parse(content);
    proseNodes = extractHtmlProse(ast);
  } else if (format === 'plaintext') {
    proseNodes = [{
      type: 'text',
      value: content,
      position: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: content.length }
      }
    }];
  } else {
    throw new Error(`Unknown format: ${format}`);
  }

  // Tokenize and build the sequence
  const tokens = [];
  for (const node of proseNodes) {
    if (node.type === 'directive' || node.type === 'end-of-node') {
      tokens.push(node);
    } else {
      tokens.push(...tokenizeTextNode(node));
    }
  }

  // Detect literal contexts
  flagLiteralContexts(tokens);

  return tokens;
}
