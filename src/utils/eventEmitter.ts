import { StorageActions } from "./storage";

export type EventArg<
  Event extends keyof Prototype,
  Prototype extends StorageActions<unknown, any>,
> = {
  args: Parameters<Prototype[Event]>;
  opsSpecific?: any;
  result: RemovePromise<ReturnType<Prototype[Event]>>;
};

type RemovePromise<Type> = Type extends Promise<infer V> ? V : Type;

export const emitEvent = <
  Event extends keyof Prototype,
  Prototype extends StorageActions<any, any>,
>(
  path: Event,
) => {
  return function <
    This extends Prototype & {
      emit(event: Event, args: EventArg<Event, Prototype>): void;
    },
    Args extends Parameters<Prototype[Event]>,
    Method extends (this: This, ...args: Args) => Return,
    Return extends ReturnType<Prototype[Event]>,
  >(target: Method, context: ClassMethodDecoratorContext<This, Method>) {
    if (path === context.name) {
      return function (this: This, ...args: Args) {
        const result = target.apply(this, args);
        if (result instanceof Promise) {
          result.then((result) => {
            this.emit(path, { args, result });
          });
        } else {
          const resultWithoutPromise = result as RemovePromise<Return>;
          this.emit(path, { args, result: resultWithoutPromise });
        }
        return result;
      };
    }
    return target;
  };
};

export interface BetterEventEmitter<
  K,
  V extends Record<string, any> & { id: K },
> {
  emit<This extends StorageActions<K, V>, Event extends keyof This & string>(
    event: Event,
    args: EventArg<Event, This>,
  ): void;
  on<This extends StorageActions<K, V>, Event extends keyof This & string>(
    event: Event,
    handler: (args: EventArg<Event, This>) => void,
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
