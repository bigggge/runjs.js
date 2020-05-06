import { run as $runjs } from "../src";

describe("runjs:es5", () => {
  test("$runjs", () => {
    const code = '$runjs.testValue = "Hello World!"';
    expect($runjs(code).testValue).toBe("Hello World!");
  });

  test("全局函数", () => {
    const code = "$runjs.value = JSON.stringify({ a: 1 })";
    expect($runjs(code).value).toBe('{"a":1}');
  });

  test("$runjs 注入", () => {
    expect($runjs(``, { $runjs: { a: 1 } }).a).toBe(1);
  });
});
