import {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  Dispatch,
  FormHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SetStateAction,
} from "react";

export type HTMLDivExtended<Attribute, V = unknown> = DetailedHTMLProps<
  HTMLAttributes<Attribute>,
  Attribute
> &
  V;

export type HTMLFormExtended<V = unknown> = DetailedHTMLProps<
  FormHTMLAttributes<HTMLFormElement>,
  HTMLFormElement
> &
  V;

export type HTMLInputExtended<Attribute, V = unknown> = DetailedHTMLProps<
  InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> &
  V;

export type HTMLButtonExtended<V = unknown> = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> &
  V;

export type RequiredPropsWithChildren<V> = V & { children: ReactNode };

export type UseStateReturn<V> = [V, Dispatch<SetStateAction<V>>];
