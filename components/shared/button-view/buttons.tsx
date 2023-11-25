import { HTMLExtended } from "@/utils/types";

export const ButtonPrimary = ({
  value,
  ...props
}: HTMLExtended<HTMLButtonElement> & { value: string }) => {
  return (
    <button
      {...props}
      className={`${props.className} bg-primary-500 text-white rounded-xl shadow-xl p-1 sticky bottom-0`}
    >
      {value}
    </button>
  );
};
