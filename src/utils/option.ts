type Option<T> = Something<T> | Nothing;

class Something<T> {
  private value: T;
  constructor(value: T) {
    this.value = value;
  }

  isSome(): this is Something<T> {
    return true;
  }

  unwrap() {
    return this.value;
  }
}

class Nothing {
  constructor() {}

  isSome<T>(): this is Something<T> {
    return false;
  }

  unwrap() {
    throw new Error("Trying to unwrap a None");
  }
}

const Some = <T>(some: T): Something<T> => new Something(some);
const None = (): Nothing => new Nothing();

export { None, Some, Something };

export type { Option };

