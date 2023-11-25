import { DetailedHTMLProps, HTMLAttributes } from "react";

export type HTMLExtended<Attribute, V = unknown> = DetailedHTMLProps<
  HTMLAttributes<Attribute>,
  Attribute
> &
  V;
