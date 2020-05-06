import Value from "./Value";

export type ScopeType = "block" | "function";

interface Content {
  [key: string]: Value;
}

export default class Scope {
  #type: ScopeType;
  readonly #parent: Scope | undefined;
  readonly #content: Content;

  constructor(type: ScopeType, parent?: Scope) {
    this.#type = type;
    this.#parent = parent;
    this.#content = {};
  }

  $var(name: string, value: any) {
    const $var = this.#content[name];
    let scope: Scope = this;
    // var 没有块级作用域
    while (scope.#parent !== undefined && scope.#type === "block") {
      scope = scope.#parent;
    }
    if (!$var) {
      scope.#content[name] = new Value(value, "var");
    }
  }

  $let(name: string, value: any) {
    const $var = this.#content[name];
    // 不允许重复定义
    if ($var) {
      throw new SyntaxError(
        `[runjs] Identifier '${name}' has already been declared`
      );
    }
    this.#content[name] = new Value(value, "let");
  }

  $const(name: string, value: any) {
    const $var = this.#content[name];
    // 不允许重复定义
    if ($var) {
      throw new SyntaxError(
        `[runjs] Identifier '${name}' has already been declared`
      );
    }
    this.#content[name] = new Value(value, "const");
  }

  $declare(type: "var" | "let" | "const", name: string, value: any) {
    return {
      var: this.$var.bind(this),
      let: this.$let.bind(this),
      const: this.$const.bind(this),
    }[type](name, value);
  }

  $get(name: string): Value | null {
    if (this.#content.hasOwnProperty(name)) {
      return this.#content[name];
    } else if (this.#parent) {
      return this.#parent.$get(name);
    } else {
      return null;
    }
  }

  $getValue(name: string): any {
    return this.$get(name) !== null ? (this.$get(name) as Value).$get() : null;
  }

  $set(name: string, value: any): any {
    if (this.#content.hasOwnProperty(name)) {
      this.#content[name].$set(value);
    } else if (this.#parent) {
      return this.#parent.$set(name, value);
    } else {
      throw new ReferenceError(`[runjs] ${name} is not defined`);
    }
  }
}
