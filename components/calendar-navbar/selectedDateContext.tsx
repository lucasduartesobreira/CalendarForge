import { Dispatch, SetStateAction, createContext, useState } from "react";

export const SelectedDateContext = createContext<
  [Date, Dispatch<SetStateAction<Date>>]
>([new Date(), () => {}]);
