type Ok<O> = { ok: O };
type Err<E> = { err: E };

const Ok = <O>(ok: O): Ok<O> => ({ ok });
const Err = <E>(err: E): Err<E> => ({ err });

type Result<O, E> = Ok<O> | Err<E>;

type UnifyResultReturn<Fn extends (...args: any) => any> = Fn extends (
  ...args: any
) => Ok<infer O> | Err<infer E>
  ? (...args: Parameters<Fn>) => Result<O, E>
  : Fn;

export { Ok, Err };

export type { UnifyResultReturn, Result };
