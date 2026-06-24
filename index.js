import { toVirtualFile } from './src/virtual-file.js';
import { parseAndBridge } from './src/nlp-bridge.js';
import { runAnalysis } from './src/rules-engine.js';

function createAnalyzer(format) {
  return function(document, configuration) {
    const file = toVirtualFile(document);
    const content = typeof file.Value === 'string' ? file.Value : file.Value.toString('utf-8');
    
    const tokens = parseAndBridge(content, format);
    
    let configObj = {};
    if (Array.isArray(configuration)) {
      configObj = { AllowList: configuration };
    } else if (configuration && typeof configuration === 'object') {
      configObj = configuration;
    }
    
    if (configObj.AllowList !== undefined && configObj.DenyList !== undefined) {
      throw new Error("Do not provide both allow and deny configuration parameters");
    }
    
    const messages = runAnalysis(tokens, configObj);
    file.Messages = messages;
    
    return file;
  };
}

export const AnalyzeMarkdown = createAnalyzer('markdown');
export const AnalyzeMDX = createAnalyzer('mdx');
export const AnalyzeHTML = createAnalyzer('html');
export const AnalyzePlainText = createAnalyzer('plaintext');

export default AnalyzeMarkdown;
export { VirtualFile } from './src/virtual-file.js';
