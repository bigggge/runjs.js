import * as ESTree from "estree";
import ESVisitor from "./Visitor";
import Scope from "./Scope";
import GlobalAPI from "./GlobalAPI";

// 配置项
interface Options {
  $runjs?: any; // 与外部 JS 环境通信
}

export function run(code: string, options?: Options) {
  const globalScope = new Scope("block");
  // 注入全局 API
  for (const api in GlobalAPI) {
    globalScope.$let(api, GlobalAPI[api]);
  }
  // 注入 $runjs 常量
  globalScope.$const("$runjs", options?.$runjs || {});
  globalScope.$const("this", undefined);

  // 通过 acorn 获取 ast
  const ast = require("acorn").parse(code, options);
  // console.log(JSON.stringify(ast, null, 2));
  // 开始执行
  evaluate(ast, globalScope);
  // 通过 $runjs 变量与外部 js 环境通信
  return globalScope.$getValue("$runjs");
}

/**
 * 执行节点方法
 *
 * @param node AST 节点
 * @param scope 作用域对象
 * @param extra 额外的参数
 */
export function evaluate(node: ESTree.Node, scope: Scope, extra?: any) {
  const visitor = ESVisitor[node.type];
  // 不支持的 AST 类型
  if (!visitor) {
    throw new Error("[runjs] Unsupported node: " + node.type);
  }
  return visitor(node, scope, extra);
}
