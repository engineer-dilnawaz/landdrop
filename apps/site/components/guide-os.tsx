"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { DOWNLOADS, useRecommended, type Os } from "@/lib/platform";

interface Guide {
  os: Os;
  setOs: (os: Os) => void;
}

const GuideContext = createContext<Guide>({ os: "mac", setOs: () => {} });

/** Which computer the setup steps and help answers are for: the visitor's own until they pick the other. */
export function GuideProvider({ children }: { children: ReactNode }) {
  const detected = DOWNLOADS[useRecommended()].os;
  const [chosen, setOs] = useState<Os>();
  return <GuideContext.Provider value={{ os: chosen ?? detected, setOs }}>{children}</GuideContext.Provider>;
}

export const useGuide = () => useContext(GuideContext);
