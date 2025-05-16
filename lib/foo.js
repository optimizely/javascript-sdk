export class Foo {
  constructor() {
    this.name = 'foo';
  }

  getName() {
    return this.name?.length;
  }
}
