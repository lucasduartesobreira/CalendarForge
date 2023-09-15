import { StorageActions } from "./storage";

export type EventArg<
  Event extends keyof Prototype,
  Prototype extends StorageActions<any, any>,
> = {
  args: Parameters<Prototype[Event]>;
  opsSpecific?: any;
  result: ReturnType<Prototype[Event]>;
};

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
        this.emit(path, { args, result });
        return result;
      };
    }
    return target;
  };
};

export interface BetterEventEmitter<
  K,
  V extends Record<string, any> & { id: K },
> extends StorageActions<K, V> {
  emit<
    This extends StorageActions<K, V>,
    Event extends keyof StorageActions<K, V>,
  >(
    event: Event,
    args: EventArg<Event, This>,
  ): void;
  on<
    This extends StorageActions<K, V>,
    Event extends keyof StorageActions<K, V>,
  >(
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
        handler(args);
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
