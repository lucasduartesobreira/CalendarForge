import { useCallback, useEffect, useState } from "react";
import useLocalStorage from "./localStorageHook";

export type MapOrEntries<K, V> = Map<K, V> | [K, V][];

// Public interface
export interface Actions<K, V> {
  set: (key: K, value: V) => void;
  setAll: (entries: MapOrEntries<K, V>) => void;
  remove: (key: K) => void;
  reset: Map<K, V>["clear"];
}

// We hide some setters from the returned map to disable autocompletion
type Return<K, V> = [
  Omit<Map<K, V>, "set" | "clear" | "delete">,
  Actions<K, V>,
];

export function useMap<K, V>(
  key: string,
  initialState: MapOrEntries<K, V> = new Map(),
): Return<K, V> {
  const [map, setMap] = useState(new Map());

  useEffect(() => {
    const value = window.localStorage.getItem(key);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        setMap(new Map(parsed));
      } catch (e) {
        console.log(e);
        setMap(new Map(initialState));
      }
    } else {
      setMap(new Map(initialState));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(Array.from(map)));
  }, [map]);

  const actions: Actions<K, V> = {
    set: useCallback((key, value) => {
      setMap((prev) => {
        const copy = new Map(prev ?? []);
        copy.set(key, value);
        return copy;
      });
    }, []),

    setAll: useCallback((entries) => {
      setMap(() => new Map(entries));
    }, []),

    remove: useCallback((key) => {
      setMap((prev) => {
        const copy = new Map(prev);
        copy.delete(key);
        return copy;
      });
    }, []),

    reset: useCallback(() => {
      setMap(() => new Map());
    }, []),
  };

  return [map, actions];
}
