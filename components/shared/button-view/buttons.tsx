import { HTMLButtonExtended, HTMLDivExtended } from "@/utils/types";
import { RefObject } from "react";

const ButtonSecondary = ({
  value,
  sizeType,
  ...props
}: HTMLDivExtended<HTMLButtonElement, { value: string; sizeType: "ml" }>) => {
  return (
    <button {...props} className={`${props.className} ml-auto text-yellow-500`}>
      {value}
    </button>
  );
};

const ButtonPrimary = ({
  value,
  sizeType,
  innerRef,
  disabled,
  ...props
}: HTMLButtonExtended<{
  value: string;
  sizeType: "sm" | "base" | "md" | "lg" | "xl";
  innerRef?: RefObject<any>;
}> & { ref?: never }) => {
  const size =
    sizeType === "xl"
      ? "rounded-xl shadow-xl"
      : sizeType === "sm"
      ? "rounded-sm shadow-sm"
      : sizeType === "base"
      ? "rounded shadow"
      : sizeType === "md"
      ? "rounded-md shadow-md"
      : sizeType === "lg"
      ? "rounded-lg shadow-lg"
      : "";

  return (
    <button
      {...props}
      className={`${disabled ? "opacity-40" : ""} ${
        props.className
      } bg-primary-500 text-white ${size}`}
      ref={innerRef}
    >
      {value}
    </button>
  );
};

const ButtonTertiary = ({
  value,
  sizeType,
  innerRef,
  disabled,
  ...props
}: HTMLButtonExtended<{
  value: string;
  sizeType: "sm" | "base" | "md" | "lg" | "xl";
  innerRef?: RefObject<any>;
}> & { ref?: never }) => {
  const size =
    sizeType === "xl"
      ? "rounded-xl shadow-xl"
      : sizeType === "sm"
      ? "rounded-sm shadow-sm"
      : sizeType === "base"
      ? "rounded shadow"
      : sizeType === "md"
      ? "rounded-md shadow-md"
      : sizeType === "lg"
      ? "rounded-lg shadow-lg"
      : "";

  return (
    <button
      {...props}
      className={`${disabled ? "opacity-40" : ""} ${
        props.className
      } bg-white text-primary-500 border-2 border-primary-500 ${size}`}
      ref={innerRef}
    >
      {value}
    </button>
  );
};

export const Button = {
  Primary: ButtonPrimary,
  Secondary: ButtonSecondary,
  Tertiary: ButtonTertiary,
};
