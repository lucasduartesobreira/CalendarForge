import { StorageContext } from "@/hooks/dataHook";
import { useContext } from "react";

const SideBar = () => {
  const storageContext = useContext(StorageContext);

  if (storageContext.isSome()) {
    const { calendarsStorage: storage } = storageContext.unwrap();
    return (
      <div>
        <button
          onClick={() => {
            const dateNow = Date.now();

            storage?.addCalendar({
              id: `${dateNow}`,
              timezone: 0,
              name: "Some calendar",
            });
          }}
        >
          Sla
        </button>
      </div>
    );
  }

  return null;
};

export default SideBar;
