import { run as $runjs } from "../src";

describe("runjs:es6", () => {
  test("const 测试", () => {
    const code = `
    const a = 1;
    a = 2
    $runjs.value = a;
  `;
    try {
      $runjs(code);
    } catch (e) {
      expect(e.message).toMatch(/Assignment to constant variable/i);
    }

    expect(() => $runjs(code)).toThrow(TypeError);
  });

  test("for...of", () => {
    const code = `
    const arr = [{ a: 1 }, { b: 2 }]
    const b = []
    for (const value of arr) {
      b.push(value)
    }
    $runjs.b = b;
  `;
    expect($runjs(code).b).toStrictEqual([{ a: 1 }, { b: 2 }]);
  });

  test("template literals", () => {
    const code = `
    const v = "World";
    const x = \`Hello \${v} ! \${1 + 2}\`;
    $runjs.value = x;
  `;
    expect($runjs(code).value).toBe("Hello World ! 3");
  });

  test("spread element", () => {
    const code = `
      var a = [3, 4];
      var b = [1, 2, ...a];
      
      var c = { foo: 1 };
      var d = { bar: 2, ...c };
      $runjs.b = b;
      $runjs.d = d;
  `;

    expect($runjs(code).b).toStrictEqual([1, 2, 3, 4]);
    expect($runjs(code).d).toStrictEqual({ bar: 2, foo: 1 });
  });

  test("默认赋值", () => {
    const code = `
      function f(x, y = 5, z) {
        return [x, y, z];
      }
      let [x, y = 'b'] = ['a'];
      const value = f(2, undefined, 3);
      
      $runjs.value = value;
      $runjs.y = y;
  `;
    expect($runjs(code).value).toStrictEqual([2, 5, 3]);
    expect($runjs(code).y).toBe("b");
  });

  test("rest", () => {
    const code = `
      let [head, ...tail] = [1, 2, 3];
      
      $runjs.head = head;
      $runjs.tail = tail;
  `;
    expect($runjs(code).head).toBe(1);
    expect($runjs(code).tail).toStrictEqual([2, 3]);
  });

  test("rest function", () => {
    const code = `
      
      function add(...values) {
        let sum = 0;

        for (var val of values) {
          sum += val;
        }

        return sum;
      }

      $runjs.sum = add(1, 2, 3);
  `;
    expect($runjs(code).sum).toBe(6);
  });

  test("rest function 2", () => {
    const code = `
      
      function add(a, ...values) {
        let sum = 0;

        for (var val of values) {
          sum += val;
        }

        return sum;
      }

      $runjs.sum = add(1, 2, 3);
  `;
    expect($runjs(code).sum).toBe(5);
  });

  test("箭头函数", () => {
    const code = `
      var foo = () => 2 + 1;
      $runjs.foo = foo();    
  `;
    expect($runjs(code).foo).toBe(3);
  });

  test("箭头函数 2", () => {
    const code = `
      var foo = () => {
        return 2 + 1;
      };      
      $runjs.foo = foo();    
  `;
    expect($runjs(code).foo).toBe(3);
  });
});
