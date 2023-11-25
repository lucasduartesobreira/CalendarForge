import { HTMLExtended } from "@/utils/types";

const ButtonPrimary = ({
  value,
  type,
  ...props
}: HTMLExtended<HTMLButtonElement> & { value: string; type: "xl" }) => {
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
};
