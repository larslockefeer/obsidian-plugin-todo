export class TextPatternParser {
  private readonly _regExps: RegExp | RegExp[] | null;
  private readonly _checkFunc: (source: string) => boolean;

  constructor(patternsToMatch: string | string[]) {
    // setup hide tags
    this._regExps = this.getRegExps(patternsToMatch);
    this._checkFunc = this.getCheckFunc(this._regExps);
  }

  public HasMatch(source: string): boolean {
    return this._checkFunc(source);
  }

  private getCheckFunc(regExprs: RegExp | RegExp[] | null) {
    if (regExprs == null) {
      return (source: string) => false;
    }

    if (Array.isArray(regExprs)) {
      return (source: string) => regExprs.some((regExpr) => regExpr.test(source));
    }

    return (source: string) => regExprs.test(source);
  }

  /**
   * Filters out bad values and converts strings to regExps
   * @param tagSource 
   * @returns 
   */  
  private getRegExps(tagSource: string | string[]): RegExp | RegExp[] | null {
    if (tagSource == null || tagSource == undefined || tagSource.length == 0) {
      return null;
    }

    const whiteSpaceOnly = /^\s*$/;

    if (Array.isArray(tagSource)) {
      // filter empty searches and values from the array
      tagSource = tagSource.filter(text => text.length > 0 && !whiteSpaceOnly.test(text));

      switch (true) {
        case tagSource.length == 0:
          return null;
        case tagSource.length == 1:
          return new RegExp(tagSource[0]);
        default:
          return tagSource.map((tag) => new RegExp(tag));
      }
    } 

    if (!whiteSpaceOnly.test(tagSource)) {
      return new RegExp(tagSource);
    }

    return null;
  }
}