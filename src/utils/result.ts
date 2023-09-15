class Okay<O> {
  private value: O;
  private constructor(value: O) {
    this.value = value;
  }

  static Ok<V>(value: V) {
    return new Okay(value);
  }

  isOk(): this is Okay<O> {
    return true;
  }

  unwrap(): O {
    return this.value;
  }

  unwrap_err(): never {
    throw "Trying to unwrap_err an Ok";
  }
}

class Error<E> {
  private value: E;
  private constructor(value: E) {
    this.value = value;
  }

  static Err<V>(value: V) {
    return new Error(value);
  }

  isOk<O>(): this is Okay<O> {
    return false;
  }

  unwrap(): never {
    throw "Trying to unwrap an Error";
  }

  unwrap_err(): E {
    return this.value;
  }
}

const Ok = <O>(ok: O): Result<O, never> => Okay.Ok(ok);
const Err = <E>(err: E): Result<never, E> => Error.Err(err);

const map = <O, E, B>(result: Result<O, E>, f: (value: O) => B) => {
  if (result.isOk()) {
    return Ok(f(result.unwrap()));
  }
  return result;
};

type Result<O, E> = Okay<O> | Error<E>;

type UnifyResultReturn<Fn extends (...args: any) => any> = Fn extends (
  ...args: any
) => Okay<infer O> | Error<infer E>
  ? (...args: Parameters<Fn>) => Result<O, E>
  : Fn;

export { Ok, Err, map };

export type { UnifyResultReturn, Result };
