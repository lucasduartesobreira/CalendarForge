import * as R from "./result";

export type ValidatorType<A> = {
  [Key in keyof A]: A[Key] extends undefined
    ? {
        optional: true;
        type: ReverseMapping<A[Key]>;
        validator?(this: A, a: A[Key]): boolean;
      }
    : {
        optional: false;
        type: ReverseMapping<A[Key]>;
        validator?(this: A, a: A[Key]): boolean;
      };
};

type ReverseMapping<T> = T extends string
  ? "string"
  : T extends number
  ? "number"
  : T extends bigint
  ? "bigint"
  : T extends boolean
  ? "boolean"
  : T extends symbol
  ? "symbol"
  : T extends undefined
  ? "undefined"
  : T extends object
  ? "object"
  : T extends Function
  ? "function"
  : never;

export const validateTypes = <A extends Record<string, any>>(
  a: A,
  b: ValidatorType<A>,
): R.Result<A, symbol> => {
  const isValid = Object.entries(b).filter(([key, value]) => {
    const newK = key as keyof typeof b;
    const { optional, type, validator } = value;

    if (!optional) {
      return a[newK] !== undefined && typeof a[newK] === type && validator
        ? validator.call(a, a[newK])
        : true;
    }

    return (
      a[newK] === undefined ||
      (typeof a[newK] === type && validator ? validator(a[newK]) : true)
    );
  });

  return isValid
    ? R.Ok(a)
    : R.Err(Symbol("Missing properties or property with wrong type"));
};
