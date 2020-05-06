import * as ESTree from "estree";
import { evaluate } from "./index";
import Scope from "./Scope";
import Value from "./Value";
import Signal, { SignalKind } from "./Signal";

/**
 * ES5 节点处理器
 * https://github.com/estree/estree/blob/master/es5.md
 */
const ES5Visitor = {
  /**
   * 源代码树
   */
  Program: (program: ESTree.Program, scope: Scope) => {
    for (const node of program.body) {
      evaluate(node, scope);
    }
  },
  /**
   * 表达式
   */
  ExpressionStatement: (node: ESTree.ExpressionStatement, scope: Scope) => {
    return evaluate(node.expression, scope);
  },
  /**
   * 函数调用表达式
   */
  CallExpression: (node: ESTree.CallExpression, scope: Scope) => {
    const fn = evaluate(node.callee, scope);
    let value;
    if (node.callee.type === "MemberExpression") {
      value = evaluate((node.callee as ESTree.MemberExpression).object, scope);
    } else if (node.callee.type === "Identifier") {
      value = scope.$getValue(node.callee.name);
    }
    const args = node.arguments.map((args) => evaluate(args, scope));
    return fn.apply(value, args);
  },
  /**
   *  属性成员表达式
   *  console.log, x.y
   */
  MemberExpression: (node: ESTree.MemberExpression, scope: Scope) => {
    const object = evaluate(node.object, scope);
    const key = (node.property as ESTree.Identifier).name;
    return object[key];
  },
  /**
   * 标识符
   */
  Identifier: (node: ESTree.Identifier, scope: Scope): any => {
    const value = scope.$get(node.name);
    if (value) {
      return value.$get();
    }
    throw new ReferenceError(`[runjs] ${node.name} is not defined`);
  },
  /**
   * 字面量
   */
  Literal: (node: ESTree.Literal, scope: Scope) => {
    return node.value;
  },
  /**
   * 二元操作符表达式
   * "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" |
   * ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "**" | "|" | "^" | "&" | "in" |
   * "instanceof"
   */
  BinaryExpression: (node: ESTree.BinaryExpression, scope: Scope) => {
    return {
      "==": (a, b) => a == b,
      "!=": (a, b) => a != b,
      "===": (a, b) => a === b,
      "!==": (a, b) => a !== b,
      "<": (a, b) => a < b,
      "<=": (a, b) => a <= b,
      ">": (a, b) => a > b,
      ">=": (a, b) => a >= b,
      "<<": (a, b) => a << b,
      ">>": (a, b) => a >> b,
      ">>>": (a, b) => a >>> b,
      "+": (a, b) => a + b,
      "-": (a, b) => a - b,
      "*": (a, b) => a * b,
      "/": (a, b) => a / b,
      "%": (a, b) => a % b,
      "|": (a, b) => a | b,
      "^": (a, b) => a ^ b,
      "&": (a, b) => a & b,
      in: (a, b) => a in b,
      instanceof: (a, b) => a instanceof b,
    }[node.operator](evaluate(node.left, scope), evaluate(node.right, scope));
  },
  /**
   * 变量声明
   */
  VariableDeclaration: (node: ESTree.VariableDeclaration, scope: Scope) => {
    // var a = 1, b = 2;
    for (const declaration of node.declarations) {
      if (declaration.id.type === "Identifier") {
        const name = (declaration.id as ESTree.Identifier).name;
        const value = declaration.init
          ? evaluate(declaration.init, scope)
          : undefined;
        scope.$declare(node.kind, name, value);
      } else if (declaration.id.type === "ArrayPattern") {
        declaration.id.elements.forEach((el, i) => {
          if (el.type === "Identifier") {
            scope.$declare(
              node.kind,
              el.name,
              evaluate(declaration.init as ESTree.ArrayExpression, scope)[i]
            );
          } else {
            evaluate(el, scope, {
              kind: node.kind,
              args: evaluate(
                declaration.init as ESTree.ArrayExpression,
                scope
              ).splice(i),
            });
          }
        });
      } else {
        throw new Error(
          "[runjs] VariableDeclaration: Unsupported type " + declaration.id.type
        );
      }
    }
  },
  /**
   * For 语句
   */
  ForStatement: (node: ESTree.ForStatement, scope: Scope) => {
    const newScope = new Scope("block", scope);
    for (
      node.init && evaluate(node.init, newScope);
      node.test && evaluate(node.test, newScope);
      node.update && evaluate(node.update, newScope)
    ) {
      const result = evaluate(node.body, newScope);
      if (Signal.isContinue(result)) continue;
      else if (Signal.isBreak(result)) break;
      else if (Signal.isReturn(result)) return result;
    }
  },
  /**
   * 更新操作符表达式
   */
  UpdateExpression: (node: ESTree.UpdateExpression, scope: Scope) => {
    const operator = node.operator;
    const name = (node.argument as ESTree.Identifier).name;
    let value = scope.$getValue(name);
    if (operator === "++") {
      node.prefix ? ++value : value++;
    }
    if (operator === "--") {
      node.prefix ? --value : value--;
    }
    scope.$set(name, value);
  },
  BlockStatement: (node: ESTree.BlockStatement, scope: Scope) => {
    const newScope = new Scope("block", scope);
    for (const n of node.body) {
      const result = evaluate(n, newScope);
      if (Signal.isSignal(result)) {
        return result;
      }
    }
  },
  /**
   * 赋值表达式
   */
  AssignmentExpression: (node: ESTree.AssignmentExpression, scope: Scope) => {
    let $value: Value | { $set: Function; $get: Function } | null;
    let object;
    let key;
    // 标识符则取该标识符的值
    if (node.left.type === "Identifier") {
      $value = scope.$get(node.left.name);
    }
    // 属性成员表达式
    if (node.left.type === "MemberExpression") {
      // 取出属性成员的真实对象(非包装对象)
      object = evaluate(node.left.object, scope);
      // 取出属性成员的 property name (key)
      key = node.left.computed
        ? evaluate(node.left.property, scope)
        : (node.left.property as ESTree.Identifier).name;
      // 模拟 Value 类型 api，方便下面的处理
      $value = {
        $set: (value) => {
          object[key] = value;
        },
        $get: () => object[key],
      };
    }
    return {
      "=": (right) => $value?.$set(right),
      "+=": (right) => $value?.$set($value?.$get() + right),
      "-=": (right) => $value?.$set($value?.$get() - right),
      "*=": (right) => $value?.$set($value?.$get() * right),
      "/=": (right) => $value?.$set($value?.$get() / right),
      "%=": (right) => $value?.$set($value?.$get() % right),
    }[node.operator](evaluate(node.right, scope));
  },
  /**
   * 对象表达式
   */
  ObjectExpression: (node: ESTree.ObjectExpression, scope: Scope) => {
    let object = {};
    for (const property of node.properties) {
      let key;
      if (property.type === "SpreadElement") {
        object = { ...object, ...evaluate(property, scope) };
      } else if (property.type === "Property") {
        // 对象 key 是字面量
        if (property.key.type === "Literal") {
          key = evaluate(property.key, scope);
          // 对象 key 是标识符
        } else if (property.key.type === "Identifier") {
          key = property.key.name;
        }
        object[key] = evaluate(property.value, scope);
      }
    }
    return object;
  },
  /**
   * If 语句
   */
  IfStatement: (node: ESTree.IfStatement, scope: Scope) => {
    if (evaluate(node.test, scope)) {
      return evaluate(node.consequent, scope);
    } else if (node.alternate) {
      return evaluate(node.alternate, scope);
    }
  },
  ContinueStatement: (node: ESTree.ContinueStatement, scope: Scope) => {
    return new Signal(SignalKind.CONTINUE);
  },
  BreakStatement: (node: ESTree.BreakStatement) => {
    return new Signal(SignalKind.BREAK);
  },
  /**
   * Switch 语句
   */
  SwitchStatement: (node: ESTree.SwitchStatement, scope: Scope) => {
    const newScope = new Scope("block", scope);
    const discriminant = evaluate(node.discriminant, scope);
    for (const $case of node.cases) {
      if (!$case.test || discriminant === evaluate($case.test, newScope)) {
        const result = evaluate($case, newScope);
        if (Signal.isContinue(result)) continue;
        else if (Signal.isBreak(result)) return result;
        else if (Signal.isReturn(result)) return result;
      }
    }
  },
  /**
   * Switch Case
   */
  SwitchCase: (node: ESTree.SwitchCase, scope: Scope) => {
    for (const consequent of node.consequent) {
      const result = evaluate(consequent, scope);
      if (Signal.isSignal(result)) {
        return result;
      }
    }
  },
  /**
   * new 表达式
   */
  NewExpression: (node: ESTree.NewExpression, scope: Scope) => {
    const callee = evaluate(node.callee, scope);
    const args = node.arguments.map((arg) => evaluate(arg, scope));
    return new (callee.bind(null, ...args))();
  },
  /**
   * 数组表达式
   */
  ArrayExpression: (node: ESTree.ArrayExpression, scope: Scope): [] => {
    let arr = <any>[];
    node.elements.forEach((el) => {
      if (el.type === "SpreadElement") {
        arr = [].concat(arr, evaluate(el, scope));
      } else {
        arr.push(evaluate(el, scope));
      }
    });
    return arr;
  },
  /**
   * 函数表达式
   */
  FunctionExpression: (
    node: ESTree.FunctionExpression | ESTree.FunctionDeclaration,
    scope: Scope
  ) => {
    return function (...args) {
      const newScope = new Scope("function", scope);
      newScope.$const("this", this);
      newScope.$const("arguments", arguments);
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
      if (Signal.isReturn(result)) {
        return (result as Signal).value;
      }
    };
  },
  /**
   * 函数声明
   */
  FunctionDeclaration: (node: ESTree.FunctionDeclaration, scope: Scope) => {
    if (node.id) {
      scope.$const(node.id.name, ES5Visitor.FunctionExpression(node, scope));
    }
  },
  /**
   * return 语句
   */
  ReturnStatement: (node: ESTree.ReturnStatement, scope: Scope) => {
    return new Signal(
      SignalKind.RETURN,
      node.argument ? evaluate(node.argument, scope) : undefined
    );
  },
  /**
   * this 表达式
   */
  ThisExpression: (node: ESTree.ThisExpression, scope: Scope) => {
    return scope.$getValue("this");
  },
  /**
   * 条件运算符
   */
  ConditionalExpression: (node: ESTree.ConditionalExpression, scope: Scope) => {
    if (evaluate(node.test, scope)) {
      return evaluate(node.consequent, scope);
    }
    return evaluate(node.alternate, scope);
  },
  /**
   * 一元操作符表达式 todo
   * "-" | "+" | "!" | "~" | "typeof" | "void" | "delete"
   */
  UnaryExpression: (node: ESTree.UnaryExpression, scope: Scope) => {
    return {
      "-": (n) => -n,
      "+": (n) => +n,
      "!": (n) => !n,
      "~": (n) => ~n,
      // "typeof": (n) => typeof n,
      // "void": (n) => void n,
      // "delete": (n) => throw new Error("unsupported 'delete' operator"),
    }[node.operator](evaluate(node.argument, scope));
  },
  /**
   * 逻辑运算符表达式
   * "||" | "&&"
   */
  LogicalExpression: (node: ESTree.LogicalExpression, scope: Scope) => {
    return {
      "||": (l, r) => l || r,
      "&&": (l, r) => l && r,
    }[node.operator](evaluate(node.left, scope), evaluate(node.right, scope));
  },
  /**
   * do...while 语句
   */
  DoWhileStatement: (node: ESTree.DoWhileStatement, scope: Scope) => {
    do {
      const result = evaluate(node.body, scope);
      if (Signal.isContinue(result)) continue;
      else if (Signal.isBreak(result)) break;
      else if (Signal.isReturn(result)) return result;
    } while (evaluate(node.test, scope));
  },
  /**
   * 空语句
   */
  EmptyStatement: () => {},
  /**
   * for...in 语句
   */
  ForInStatement: (node: ESTree.ForInStatement, scope: Scope) => {
    const left = node.left;
    const right = node.right;
    const body = node.body;
    const declarations = (left as ESTree.VariableDeclaration).declarations;
    for (const v in evaluate(right, scope)) {
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
   * while 语句
   */
  WhileStatement: (node: ESTree.WhileStatement, scope: Scope) => {
    while (evaluate(node.test, scope)) {
      evaluate(node.body, scope);
    }
  },
  /**
   * try...catch 语句
   */
  TryStatement: (node: ESTree.TryStatement, scope: Scope) => {
    try {
      evaluate(node.block, scope);
    } catch (err) {
      if (node.handler) {
        const newScope = new Scope("block", scope);
        const param = node.handler.param;
        if (param) {
          newScope.$const((param as ESTree.Identifier).name, err);
        }
        evaluate(node.handler, newScope);
      } else {
        throw err;
      }
    } finally {
      if (node.finalizer) {
        evaluate(node.finalizer, scope);
      }
    }
  },
  /**
   * throw 语句
   */
  ThrowStatement: (node: ESTree.ThrowStatement, scope: Scope) => {
    throw evaluate(node.argument, scope);
  },
  /**
   * catch 子句
   */
  CatchClause: (node: ESTree.CatchClause, scope: Scope) => {
    evaluate(node.body, scope);
  },
};
export default ES5Visitor;
