export class VirtualFile {
  constructor(options = {}) {
    if (typeof options === 'string' || Buffer.isBuffer(options)) {
      this.Value = options;
      this.Path = undefined;
      this.Cwd = process.cwd();
      this.History = [];
      this.Data = {};
    } else {
      this.Value = options.Value;
      this.Cwd = options.Cwd || process.cwd();
      this.History = Array.isArray(options.History) ? [...options.History] : [];
      
      this.Path = options.Path;
      if (!this.Path && this.History.length > 0) {
        this.Path = this.History[this.History.length - 1];
      }
      if (this.Path && this.History.length === 0) {
        this.History.push(this.Path);
      }
      
      this.Data = options.Data || {};
    }
    this.Messages = [];
  }
}

export function toVirtualFile(doc) {
  if (doc instanceof VirtualFile) {
    return doc;
  }
  if (typeof doc === 'string' || Buffer.isBuffer(doc)) {
    return new VirtualFile(doc);
  }
  if (doc && typeof doc === 'object' && doc.Value !== undefined) {
    const vf = new VirtualFile({
      Value: doc.Value,
      Path: doc.Path,
      Cwd: doc.Cwd,
      History: doc.History,
      Data: doc.Data
    });
    if (Array.isArray(doc.Messages)) {
      vf.Messages = [...doc.Messages];
    }
    return vf;
  }
  throw new Error("Invalid document parameter");
}
