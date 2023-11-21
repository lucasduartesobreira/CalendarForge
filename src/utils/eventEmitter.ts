import { StorageActions } from "./storage";

export type EventArg<
  Event extends keyof Prototype,
  Prototype extends StorageActions<K, V>,
  K extends keyof V & string,
  V extends Record<string, any> & { id: string },
> = {
  args: Parameters<Prototype[Event]>;
  opsSpecific?: any;
  result: RemovePromise<ReturnType<Prototype[Event]>>;
};

type RemovePromise<Type> = Type extends Promise<infer V> ? V : Type;

type PossibleEvents = {
  [K in keyof StorageActions<
    string,
    Record<string, any> & { id: string }
  > as `${K}`]: StorageActions<string, Record<string, any> & { id: string }>[K];
};

type RecordWithId = Record<string, any> & { id: string };

interface MyClassDecoratedMethod<Event extends keyof This, This> {
  readonly name: Event;
}

export function emitEvent<
  K extends keyof V & string,
  V extends RecordWithId,
  TThis extends StorageActions<K, V> & BetterEventEmitter<K, V>,
  Event extends keyof PossibleEvents,
  TArgs extends Parameters<TThis[Event]>,
  TReturn,
>(
  method: (this: TThis, ...args: TArgs) => TReturn,
  context: MyClassDecoratedMethod<Event, TThis>,
) {
  return function (this: TThis, ...args: TArgs) {
    const result = method.apply(this, args);
    if (result instanceof Promise) {
      result.then((result) => {
        const fixThisLater = result as RemovePromise<ReturnType<TThis[Event]>>;
        this.emit(context.name, { args, result: fixThisLater });
      });
    } else {
      const fixThisLater = result as RemovePromise<ReturnType<TThis[Event]>>;
      this.emit(context.name, { args, result: fixThisLater });
    }
    return result;
  };
}

export interface BetterEventEmitter<
  K extends keyof V & string,
  V extends Record<string, any> & { id: string },
> {
  emit<This extends StorageActions<K, V>, Event extends keyof This & string>(
    event: Event,
    args: EventArg<Event, This, K, V>,
  ): void;
  on<This extends StorageActions<K, V>, Event extends keyof This & string>(
    event: Event,
    handler: (args: EventArg<Event, This, K, V>) => void,
  ): void;
}

export class MyEventEmitter {
  private handlers: Map<string, ((...args: any[]) => void)[]>;
  constructor() {
    this.handlers = new Map();
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.handlers.get(event);
    if (handlers != undefined) {
      for (const handler of handlers) {
        handler.apply(null, args);
      }
    }
  }

  on(event: string, handler: (...args: any[]) => void) {
    const handlers = this.handlers.get(event);
    if (handlers != undefined) {
      handlers.push(handler);
      this.handlers.set(event, handlers);

      return;
    }

    this.handlers.set(event, [handler]);
  }
}
