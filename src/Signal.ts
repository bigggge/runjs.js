export enum SignalKind {
  BREAK,
  CONTINUE,
  RETURN,
}

export default class Signal {
  protected kind;
  public value;

  constructor(kind: SignalKind, value?: any) {
    this.kind = kind;
    this.value = value;
  }

  public static isContinue(v: any) {
    return Signal.is(v, SignalKind.CONTINUE);
  }

  public static isBreak(v: any) {
    return Signal.is(v, SignalKind.BREAK);
  }

  public static isReturn(v: any) {
    return Signal.is(v, SignalKind.RETURN);
  }

  public static isSignal(v: any) {
    return v instanceof Signal;
  }

  private static is(v: any, type: SignalKind) {
    return Signal.isSignal(v) && v.kind === type;
  }
}
