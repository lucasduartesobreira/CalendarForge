import { Err, Ok, Result } from "./result";

type OptionT<T> = { kind: "some"; value: T } | { kind: "none"; value: never };

let myNever: never;

class Option<T> {
  value: OptionT<T>;
  constructor(value: OptionT<T>) {
    this.value = value;
  }

  isSome(): this is Something<T> {
    return this.value.kind === "some";
  }

  unwrap(): T | never {
    if (this.value.kind === "some") {
      return this.value.value;
    }

    throw "Cannot unwrap a Something";
  }

  map<B>(f: (value: T) => B): Option<B> {
    if (this.value.kind === "some") {
      return Some(f(this.value.value));
    } else if (this.value.kind === "none") {
      return None();
    } else {
      throw "unreachable";
    }
  }

  mapOrElse<B>(onNothing: () => B, onSome: (value: T) => B): B {
    if (this.value.kind === "some") {
      return onSome(this.value.value);
    } else if (this.value.kind === "none") {
      return onNothing();
    } else {
      throw "unreachable";
    }
  }

  unwrapOrElse(onNone: () => T) {
    if (this.value.kind === "some") {
      return this.value.value;
    } else if (this.value.kind === "none") {
      return onNone();
    } else {
      throw "unreachable";
    }
  }

  ok<E>(err: E): Result<T, E> {
    if (this.value.kind === "some") {
      return Ok(this.value.value);
    } else {
      return Err(err);
    }
  }

  flatten<V>(this: Option<Option<V>>): Option<V> {
    if (this.value.kind === "some") {
      return this.value.value;
    } else {
      return None();
    }
  }
}

class Something<T> extends Option<T> {
  constructor(value: T) {
    super({ kind: "some", value });
  }
}

class Nothing extends Option<never> {
  constructor() {
    super({ kind: "none", value: myNever });
  }
}

const Some = <T>(some: T): Option<T> => new Something(some);
const None = (): Option<never> => new Nothing();

export { None, Some };

export type { Option };
