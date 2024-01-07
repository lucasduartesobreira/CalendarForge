type Modifiers = "ctrl" | "shift" | "alt" | "meta";
type ShortcutModifiers = { [Key in Modifiers as `${Key}Key`]?: boolean };

function Building<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  _context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Return
  >,
) {
  function replacementMethod(this: This, ...args: Args): This {
    target.call(this, ...args);

    return this;
  }

  return replacementMethod;
}

class ShortcutBuilder {
  modifiers: ShortcutModifiers = {};
  _key: string = "";

  @Building
  altKey(value = true) {
    this.modifiers.altKey = value;
  }

  @Building
  ctrlKey(value = true) {
    this.modifiers.ctrlKey = value;
  }

  @Building
  shiftKey(value = true) {
    this.modifiers.shiftKey = value;
  }

  @Building
  metaKey(value = true) {
    this.modifiers.metaKey = value;
  }

  @Building
  key(key: string) {
    this._key = key;
  }

  build(
    action: () => void,
  ): (this: Window, event: WindowEventMap["keypress"]) => void {
    return (event) => {
      if (event.key === this._key) {
        const isModifiersPressed =
          Object.entries(this.modifiers).find(
            ([key, value]) => event[key as keyof ShortcutModifiers] != value,
          ) != null;
        if (isModifiersPressed) {
          action();
        }
      }
    };
  }
}
