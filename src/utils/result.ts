import { None, Option, Some } from "./option";

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
      return Ok(f(this.result.value));
    } else if (this.result.kind === "err") {
      return Err(this.result.value);
    } else {
      throw "unreachable";
    }
  }

  mapErr<B>(f: (value: E) => B): Result<O, B> {
    if (this.result.kind === "err") {
      return Err(f(this.result.value));
    } else if (this.result.kind === "ok") {
      return Ok(this.result.value);
    } else {
      throw "unreachable";
    }
  }

  unwrapOrElse(f: (err: E) => O): O {
    if (this.result.kind === "ok") {
      return this.result.value;
    } else {
      return f(this.result.value);
    }
  }

  option(): Option<O> {
    return this.mapOrElse(
      () => None(),
      (o) => Some(o),
    );
  }

  mapOrElse<U>(onErr: (err: E) => U, onOk: (ok: O) => U) {
    if (this.result.kind === "ok") {
      return onOk(this.result.value);
    } else {
      return onErr(this.result.value);
    }
  }

  flatten(this: Result<Result<O, E>, E>): Result<O, E> {
    if (this.result.kind === "ok") {
      return this.unwrap();
    } else {
      return Err(this.result.value);
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
