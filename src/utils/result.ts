type Res<O, E> =
  | {
      kind: "ok";
      value: O;
    }
  | {
      kind: "err";
      value: E;
    };

class Result<O, E> {
  result: Res<O, E>;
  constructor(result: Res<O, E>) {
    this.result = result;
  }

  isOk(): this is Okay<O> {
    return this.result.kind === "ok";
  }

  unwrap(): O | never {
    if (this.result.kind === "ok") {
      return this.result.value;
    }

    throw Symbol("Cannot unwrap an Err");
  }

  unwrap_err(): E | never {
    if (this.result.kind === "err") {
      return this.result.value;
    }

    throw Symbol("Cannot unwrap_err a Ok");
  }

  map<B>(f: (value: O) => B): Result<B, E> {
    if (this.result.kind === "ok") {
      return new Okay(f(this.result.value));
    }

    return new Error(this.result.value);
  }

  unwrapOrElse(f: (err: E) => O): O {
    if (this.isOk()) {
      return this.unwrap();
    } else {
      return f(this.unwrap_err());
    }
  }

  mapOrElse<U>(onErr: (err: E) => U, onOk: (ok: O) => U) {
    if (this.result.kind === "ok") {
      return onOk(this.result.value);
    } else {
      return onErr(this.result.value);
    }
  }
}

class Okay<O> extends Result<O, never> {
  constructor(value: O) {
    super({ kind: "ok", value });
  }
}

class Error<E> extends Result<never, E> {
  constructor(value: E) {
    super({ kind: "err", value });
  }
}

const Ok = <O>(ok: O): Result<O, never> => new Okay(ok);
const Err = <E>(err: E): Result<never, E> => new Error(err);

export { Ok, Err };

export type { Result };
