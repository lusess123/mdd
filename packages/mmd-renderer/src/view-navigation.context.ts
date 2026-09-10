"use client";

import { createContext, useContext } from "react";
import type { OpenViewInput } from "./types";

/** 最近一层 MmdView 的内嵌视图入口，关联字段无需依赖宿主 URL。 */
export const ViewNavigationContext = createContext<((input: OpenViewInput) => void) | undefined>(undefined);
export function useViewNavigation() {
  return useContext(ViewNavigationContext);
}
