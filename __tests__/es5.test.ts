import { run as $runjs } from "../src";

describe("runjs:es5", () => {
  test("表达式", () => {
    const code =
      "$runjs.value = (1 + 2) * 3 / 3 - 1;"
      + "$runjs.value2 = 1 == '1';"
      + "$runjs.value3 = 1 != 2;"
      + "$runjs.value4 = 1 === 1;"
      + "$runjs.value5 = 1 !== '1';";
    expect($runjs(code).value).toBe(2);
    expect($runjs(code).value2).toBe(true);
    expect($runjs(code).value3).toBe(true);
    expect($runjs(code).value4).toBe(true);
    expect($runjs(code).value5).toBe(true);
  });

  test("循环", () => {
    const code = `
    $runjs.result = ""
    for (let i = 1; i <= 3; i++) {
      $runjs.result += i;
    }
  `;
    expect($runjs(code).result).toBe("123");
  });

  test("循环 continue", () => {
    const code = `
    const a = "LOG ";
    let c = "";
    for (let i = 0; i < 3; i++) {
      const b = "INNER "
      if (i === 1) continue;
      c += (a + b + i);
    }
    $runjs.value = c;
  `;
    expect($runjs(code).value).toBe("LOG INNER 0LOG INNER 2");
  });

  test("循环 break", () => {
    const code = `
    const a = "LOG ";
    let c = "";
    for (let i = 0; i < 3; i++) {
      const b = "INNER "
      if (i === 1) break;
      c += (a + b + i);
    }
    $runjs.value = c;
  `;
    expect($runjs(code).value).toBe("LOG INNER 0");
  });

  test("块级作用域", () => {
    const code = `
    let a = "a1"
    let b = "b1"
    
    {
      a = "a2";
      let b = "b2";
      let c = "c1";
      $runjs.value = (a + b + c)
    }
    $runjs.value2 = (a + b)
  `;
    expect($runjs(code).value).toBe("a2b2c1");
    expect($runjs(code).value2).toBe("a2b1");
  });

  test("块级作用域 var", () => {
    const code = `
    {
        var a = 1;
    }   
    $runjs.value = a;
  `;
    expect($runjs(code).value).toBe(1);
  });

  test("块级作用域 let", () => {
    const code = `
    {
        let b = 1;
    }
    $runjs.value = b;
  `;
    expect(() => $runjs(code)).toThrow(ReferenceError);
  });

  test("switch case", () => {
    const code = `
    var day;
    switch (new Date().getDay()) {
      case 0:
        day = "Sunday";
        break;
      case 1:
        day = "Monday";
        break;
      case 2:
        day = "Tuesday";
        break;
      default:
        day = "unknown"
    }
    $runjs.day = day;
`;

    function getDay() {
      switch (new Date().getDay()) {
        case 0:
          return "Sunday";
        case 1:
          return "Monday";
        case 2:
          return "Tuesday";
        default:
          return "unknown";
      }
    }

    expect($runjs(code).day).toBe(getDay());
  });

  test("while", () => {
    const code = `
      let a = 5;
      while (a > 2) {
        a--;
      }
      $runjs.a = a;;
  `;
    expect($runjs(code).a).toBe(2);
  });

  test("数组字面量", () => {
    const code = `
    const a = [1, 1, 3];
    a[1 + 1] = "2";
    $runjs.value = a;
  `;
    expect($runjs(code).value).toStrictEqual([1, 1, "2"]);
  });

  test("函数 function", () => {
    const code = `
    const sum = function (a, b) {
      $runjs.this = this;   
      $runjs.arguments = arguments;   
      return a + b;
    }  
    const obj = { sum }
    $runjs.value = obj.sum(1, 1);
  `;
    expect($runjs(code).value).toBe(2);
    expect($runjs(code).this).toHaveProperty("sum");
    expect([...$runjs(code).arguments]).toStrictEqual([1, 1]);
  });

  test("函数 function2", () => {
    const code = `
    function sum(a, b) {
      $runjs.this = this;   
      $runjs.arguments = arguments;   
      return a + b;
    }  
    const obj = { sum }
    $runjs.value = obj.sum(1, 1);
  `;
    expect($runjs(code).value).toBe(2);
    expect($runjs(code).this).toHaveProperty("sum");
    expect([...$runjs(code).arguments]).toStrictEqual([1, 1]);
  });

  test("条件运算符", () => {
    const code = `
    var a = true;
    var b = a ? 'consequent' : 'alternate';
    $runjs.value = b;
    $runjs.value2 = !a ? 'consequent' : 'alternate';
  `;
    expect($runjs(code).value).toBe("consequent");
    expect($runjs(code).value2).toBe("alternate");
  });

  test("逻辑运算符", () => {
    const code = `
    var a = 1 + 1 === 1;
    var b = a || 1 + 1 === 2;
    var c = a && b;

    $runjs.b = b;
    $runjs.c = c;
  `;
    expect($runjs(code).b).toBe(true);
    expect($runjs(code).c).toBe(false);
  });

  test("do...while", () => {
    const code = `
    var i = 0;
    do {
      i++;
    } while (i < 2);
    $runjs.i = i
  `;
    expect($runjs(code).i).toBe(2);
  });

  test("空语句", () => {
    const code = `
    if(true);
  `;
    expect(() => $runjs(code)).not.toThrow(Error);
  });

  test("for...in", () => {
    const code = `
    const arr = { a: 1, b: 2 };
    const a = [];
    for (const key in arr) {
      a.push(key);
    }
    $runjs.a = a;
  `;
    expect($runjs(code).a).toEqual(["a", "b"]);
  });

  test("try catch", () => {
    const code = `
    let b;
    try {
      throw new Error("test error");
    } catch (e) {
      $runjs.message = e.message;
    }
  `;
    expect($runjs(code).message).toBe("test error");
  });

  test("try catch finally", () => {
    const code = `
    let b;
    try {
      throw new Error("test error");
    } catch (e) {
      $runjs.message = e.message;
    } finally {
      $runjs.b = 1;
    }
  `;
    expect($runjs(code).message).toBe("test error");
    expect($runjs(code).b).toBe(1);
  });

  test("this 测试", () => {
    const code = `
      var o = {
        prop: 37,
        f: function() {
          return this.prop;
        }
      };
      
      function C(){
        this.a = 38;
      }
      
      var c = new C();
            
      $runjs.v = o.f();
      $runjs.a = c.a;
  `;
    expect($runjs(code).v).toBe(37);
    expect($runjs(code).a).toBe(38);
  });
});
