type Operations = { isOk: () => boolean };

type Ok<O> = { ok: O } & Operations;
type Err<E> = { err: E } & Operations;

const Ok = <O>(ok: O): Ok<O> => ({ ok, isOk: () => true });
const Err = <E>(err: E): Err<E> => ({ err, isOk: () => false });

type Result<O, E> = Ok<O> | Err<E>;

type UnifyResultReturn<Fn extends (...args: any) => any> = Fn extends (
  ...args: any
) => Ok<infer O> | Err<infer E>
  ? (...args: Parameters<Fn>) => Result<O, E>
  : Fn;

export { Ok, Err };

export type { UnifyResultReturn, Result };
