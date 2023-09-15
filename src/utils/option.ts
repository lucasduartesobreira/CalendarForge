type Option<T> = Something<T> | Nothing;

class Something<T> {
  private value: T;
  constructor(value: T) {
    this.value = value;
  }

  isSome(): this is Something<T> {
    return true;
  }

  unwrap(): T {
    return this.value;
  }
}

class Nothing {
  constructor() {}

  isSome<T>(): this is Something<T> {
    return false;
  }

  unwrap(): never {
    throw new Error("Trying to unwrap a None");
  }
}

const Some = <T>(some: T): Option<T> => new Something(some);
const None = (): Option<never> => new Nothing();

const map = <T, B>(option: Option<T>, f: (value: T) => B) => {
  if (option.isSome()) {
    return Some(f(option.unwrap()));
  }
  return option;
};

export { None, Some, map };

export type { Option };
