import OutsideClick from "@/components/utils/outsideClick";
import {
  HTMLButtonExtended,
  HTMLDivExtended,
  HTMLFormExtended,
  RequiredPropsWithChildren,
} from "@/utils/types";
import { RefObject } from "react";
import { Option } from "@/utils/option";

export const PopupForm = ({
  setOpen,
  refs,
  children,
  onSubmit,
  backgroundDiv,
  ...props
}: RequiredPropsWithChildren<
  HTMLFormExtended<{
    setOpen: (value: boolean) => void;
    refs: Option<RefObject<any>[]>;
    onSubmit: () => void;
    backgroundDiv?: HTMLDivExtended<HTMLDivElement>;
  }>
>) => {
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
          {...props}
          onSubmit={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            onSubmit();
            setOpen(false);
          }}
          className={`text-neutral-500 bg-white rounded-xl shadow-lg overflow-hidden relative flex flex-col gap-2 p-4 justify-center ${props.className} `}
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
      className={`${props.className} text-black px-2 py-1 bg-neutral-200 rounded-md`}
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

export const FormHeader = ({
  onDelete,
  setOpen,
}: {
  onDelete?: () => void;
  setOpen: (value: boolean) => void;
}) => {
  return (
    <div className="w-full absolute top-0 h-[16px] text-xs left-0 bg-neutral-300 flex items-center">
      {onDelete != null && (
        <button
          className="ml-auto mr-2 text-red-500"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </button>
      )}
      <button
        className={`${
          onDelete == null ? "ml-auto" : ""
        } mr-3 text-neutral-500 text-xs`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }}
      >
        X
      </button>
    </div>
  );
};

const DeleteButton = ({
  setOpen,
  className,
  onDelete,
  ...props
}: HTMLButtonExtended<{
  setOpen: (value: boolean) => void;
  onDelete: () => void;
}>) => {
  return (
    <button
      {...props}
      className={`${className} bg-red-500 font-semibold text-sm text-text-inverse rounded-xl px-2 py-1`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete();
        setOpen(false);
      }}
    >
      Delete
    </button>
  );
};

const WarningButton = ({
  setOpen,
  className,
  onWarning: onWarning,
  ...props
}: HTMLButtonExtended<{
  setOpen: (value: boolean) => void;
  onWarning: () => void;
}>) => {
  return (
    <button
      {...props}
      className={`${className} bg-amber-500 font-semibold rounded-xl text-text-inverse px-2 py-1 text-sm`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onWarning();
        setOpen(false);
      }}
    >
      Delete
    </button>
  );
};

export const InputButtons = {
  Primary: InputButton,
  Delete: DeleteButton,
  Warning: WarningButton,
};
