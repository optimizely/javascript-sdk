const idSuffixBase = 10_000;

export class IdGenerator {
  private idSuffixOffset: number = 0;

  // getId returns an Id that generally increases with each call.
  // only exceptions are when idSuffix rotates back to 0 within the same millisecond
  // or when the clock goes back
  getId(): string {
    const idSuffix = idSuffixBase + this.idSuffixOffset;
    this.idSuffixOffset = (this.idSuffixOffset + 1) % idSuffixBase;
    const timestamp = Date.now();
    return `${timestamp}${idSuffix}`;
  }
}
