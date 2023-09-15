import { TypeOfTag } from "typescript";
import * as R from "./result";

export type ValidatorType<A> = {
  [Key in keyof A]: A[Key] extends undefined
    ? { optional: true; type: TypeOfTag; validator?: (a: A[Key]) => boolean }
    : {
        optional: false;
        type: TypeOfTag;
        validator?: (a: A[Key]) => boolean;
      };
};

export const validateTypes = <A extends Record<string, any>>(
  a: A,
  b: ValidatorType<A>,
): R.Result<A, symbol> => {
  const isValid = Object.entries(b).filter(([key, value]) => {
    const newK = key as keyof typeof b;
    const { optional, type, validator } = value;

    if (!optional) {
      return a[newK] !== undefined && typeof a[newK] === type && validator
        ? validator(a[newK])
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
