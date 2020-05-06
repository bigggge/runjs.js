import * as ESTree from "estree";
import Scope from "./Scope";
import { evaluate } from "./index";
import * as types from "acorn";
import Signal from "./Signal";

/**
 * ES6 节点处理器
 * https://github.com/estree/estree/blob/master/es2015.md
 */

const ES6Visitor = {
  /**
   * for...of 语句
   */
  ForOfStatement: (node: ESTree.ForOfStatement, scope: Scope) => {
    const left = node.left;
    const right = node.right;
    const body = node.body;
    const declarations = (left as ESTree.VariableDeclaration).declarations;
    for (const v of evaluate(right, scope)) {
      const newScope = new Scope("block", scope);
      declarations.forEach((declaration) => {
        if (declaration.id.type === "Identifier") {
          newScope.$const(declaration.id.name, v);
        }
      });
      evaluate(body, newScope);
    }
  },
  /**
   * 模板字符串
   */
  TemplateLiteral: (node: ESTree.TemplateLiteral, scope: Scope) => {
    return ([] as ESTree.Node[])
      .concat(node.expressions, node.quasis)
      .sort((a, b) => (a as types.Node).start - (b as types.Node).start)
      .map((n) => evaluate(n, scope))
      .join("");
  },
  /**
   * 模板字符串
   */
  TemplateElement: (node: ESTree.TemplateElement, scope: Scope) => {
    return node.value.raw;
  },
  /**
   * 扩展运算符
   */
  SpreadElement: (node: ESTree.SpreadElement, scope: Scope) => {
    return evaluate(node.argument, scope);
  },
  /**
   * 默认赋值模式
   */
  AssignmentPattern: (node: ESTree.AssignmentPattern, scope: Scope) => {
    scope.$const(
      (node.left as ESTree.Identifier).name,
      evaluate(node.right, scope)
    );
  },
  /**
   * 剩余参数模式
   */
  RestElement: (
    node: ESTree.RestElement,
    scope: Scope,
    extra: { args: []; kind? }
  ) => {
    scope.$declare(
      extra.kind || "const",
      (node.argument as ESTree.Identifier).name,
      [...extra.args]
    );
  },
  // todo not complete
  ArrowFunctionExpression: (
    node: ESTree.ArrowFunctionExpression,
    scope: Scope
  ) => {
    return (...args) => {
      const newScope = new Scope("function", scope);
      newScope.$const("this", scope.$getValue("this"));
      newScope.$const("arguments", args);
      node.params.forEach((param, index) => {
        if (param.type === "Identifier") {
          newScope.$const(param.name, args[index]);
        } else {
          if (param.type === "RestElement") {
            args = args.splice(index);
          }
          evaluate(param, newScope, { args });
        }
      });
      const result = evaluate(node.body, newScope);
      if (node.body.type === "BlockStatement") {
        if (Signal.isReturn(result)) {
          return (result as Signal).value;
        }
      } else {
        return result;
      }
    };
  },
};

export default ES6Visitor;
