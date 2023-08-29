import { StorageContext } from "@/hooks/dataHook";
import { DetailedHTMLProps, useContext } from "react";

const SideBar = (
  args: DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
) => {
  const storageContext = useContext(StorageContext);

  if (storageContext.isSome()) {
    const { calendarsStorage: storage } = storageContext.unwrap();
    return (
      <div
        {...args}
        className={`${args.className} grid grid-rows-[auto_48px] grid-cols-[auto]`}
      >
        <div className="overflow-auto row-start-1">
          <ul className="">
            {storage.getCalendars().map((calendar, index) => (
              <li key={index}>{calendar.name}</li>
            ))}
          </ul>
        </div>
        <button className="row-start-2">New Calendar</button>
      </div>
    );
  }

  return null;
};

export default SideBar;
