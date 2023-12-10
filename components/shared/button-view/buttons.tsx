import { HTMLDivExtended } from "@/utils/types";
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
  ...props
}: HTMLDivExtended<
  HTMLButtonElement,
  {
    value: string;
    sizeType: "xl";
    innerRef: RefObject<any>;
  }
> & { ref?: never }) => {
  return (
    <button
      {...props}
      className={`${props.className} bg-primary-500 text-white rounded-xl shadow-xl`}
      ref={innerRef}
    >
      {value}
    </button>
  );
};

export const Button = {
  Primary: ButtonPrimary,
  Secondary: ButtonSecondary,
};
