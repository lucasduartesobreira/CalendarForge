import { HTMLExtended } from "@/utils/types";
import { ReactNode } from "react";

type Customization<TitleSection extends ReactNode, Button extends ReactNode> = {
  titleSection: TitleSection | undefined;
  buttonSection: Button | undefined;
};

type RequiredPropsWithChildren<V> = V & { children: ReactNode };
export const ListContainer = <
  TitleSection extends ReactNode,
  Button extends ReactNode,
>({
  children,
  titleSection,
  buttonSection,
  ...args
}: RequiredPropsWithChildren<
  HTMLExtended<HTMLDivElement, Customization<TitleSection, Button>>
>) => {
  return (
    <div
      {...args}
      className={`${args.className} bg-white rounded-xl shadow-lg border-[1px] border-neutral-200 overflow-hidden`}
    >
      {titleSection}
      <ul className="text-sm bg-white p-2 flex flex-col">{children}</ul>
      {buttonSection}
    </div>
  );
};
