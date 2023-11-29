import OutsideClick from "@/components/utils/outsideClick";
import { HTMLExtended, RequiredPropsWithChildren } from "@/utils/types";
import { ChangeEvent, ChangeEventHandler, RefObject } from "react";
import { Option } from "@/utils/option";

export const PopupForm = ({
  setOpen,
  refs,
  children,
  onSubmit,
  backgroundDiv,
}: RequiredPropsWithChildren<{
  setOpen: (value: boolean) => void;
  refs: Option<RefObject<any>[]>;
  onSubmit: () => void;
  backgroundDiv?: HTMLExtended<HTMLDivElement>;
}>) => {
  return (
    <OutsideClick
      {...backgroundDiv}
      doSomething={() => {
        setOpen(false);
      }}
      refs={refs}
      className={`${backgroundDiv?.className} z-[10000] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}
    >
      <div className="flex">
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            onSubmit();
            setOpen(false);
          }}
          className="text-neutral-500 relative flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg justify-center overflow-hidden"
        >
          {children}
        </form>
      </div>
    </OutsideClick>
  );
};

export const InputText = ({
  ...props
}: React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>) => {
  return (
    <input
      {...props}
      className={`${props.className} text-black px-2 py-1 mt-2 bg-neutral-200 text-base rounded-md`}
    />
  );
};

const InputButton = ({
  ...props
}: React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>) => {
  return (
    <input
      {...props}
      className={`${props.className} text-white bg-primary-500 rounded-md`}
    />
  );
};

export const InputButtons = {
  Primary: InputButton,
};

