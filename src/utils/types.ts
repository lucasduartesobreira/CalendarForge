import { DetailedHTMLProps, HTMLAttributes, ReactNode } from "react";

export type HTMLExtended<Attribute, V = unknown> = DetailedHTMLProps<
  HTMLAttributes<Attribute>,
  Attribute
> &
  V;

export type RequiredPropsWithChildren<V> = V & { children: ReactNode };
