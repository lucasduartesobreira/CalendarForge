import { HTMLDivExtended } from "@/utils/types";

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
  ...props
}: HTMLDivExtended<HTMLButtonElement> & { value: string; sizeType: "xl" }) => {
  return (
    <button
      {...props}
      className={`${props.className} bg-primary-500 text-white rounded-xl shadow-xl p-1 sticky bottom-0`}
    >
      {value}
    </button>
  );
};

export const Button = {
  Primary: ButtonPrimary,
  Secondary: ButtonSecondary,
};
