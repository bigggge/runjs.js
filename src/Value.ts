// 包装对象
export default class Value {
  #value: any;
  readonly #kind: any;

  constructor(value: any, kind: "var" | "let" | "const") {
    this.#value = value;
    this.#kind = kind;
  }

  $set(value): boolean {
    if (this.#kind === "const") {
      throw new TypeError("[runjs] Assignment to constant variable");
    }
    this.#value = value;
    return true;
  }

  $get(): any {
    return this.#value;
  }
}
