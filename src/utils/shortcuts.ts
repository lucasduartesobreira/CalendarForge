type Modifiers = "ctrl" | "shift" | "alt" | "meta";
type ShortcutModifiers = { [Key in Modifiers as `${Key}Key`]: boolean };
export type Shortcut = {
  handler: (this: Window, event: WindowEventMap["keyup"]) => void;
};

export class ShortcutBuilder {
  private modifiers: ShortcutModifiers = {
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };

  altKey(value = true) {
    this.modifiers.altKey = value;
    return this;
  }

  ctrlKey(value = true) {
    this.modifiers.ctrlKey = value;
    return this;
  }

  shiftKey(value = true) {
    this.modifiers.shiftKey = value;
    return this;
  }

  metaKey(value = true) {
    this.modifiers.metaKey = value;
    return this;
  }

  private constructor() {}

  build(
    key: string,
    action: () => void,
    options?: { debugging: boolean },
  ): Shortcut {
    if (key.length === 0)
      throw Symbol("Cannot create a shortcut without a key");

    return {
      handler: (event) => {
        if (options?.debugging) {
          const { ctrlKey, altKey, metaKey, shiftKey } = event;
          console.log(
            "eventKey:",
            event.key,
            "key: ",
            key,
            "modifiers: ",
            this.modifiers,
            "event modifiers: ",
            { ctrlKey, shiftKey, altKey, metaKey },
          );
        }
        if (event.key === key) {
          const isModifiersPressed =
            Object.entries(this.modifiers).find(
              ([key, value]) => event[key as keyof ShortcutModifiers] != value,
            ) == null;
          if (isModifiersPressed) {
            action();
          }
        }
      },
    };
  }

  static new() {
    return new ShortcutBuilder();
  }
}
