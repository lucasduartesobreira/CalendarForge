import { DetailedHTMLProps, HTMLAttributes, ReactNode } from "react";

export type HTMLDivExtended<Attribute, V = unknown> = DetailedHTMLProps<
  HTMLAttributes<Attribute>,
  Attribute
> &
  V;

export type RequiredPropsWithChildren<V> = V & { children: ReactNode };
