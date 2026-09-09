"use client";
import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import type { createReferenceData } from "./reference-data";

export interface ReferenceProviderProps extends PropsWithChildren {
  /** 仅当前账号/会话共享的关联查询服务，写入后调用 invalidate。 */
  data: ReturnType<typeof createReferenceData>;
  /** 主机路由生成器，MMD 不假设 URL 结构。 */
  href?: (input: { model: string; id: string }) => string;
  /** 可选客户端导航；修饰键点击保留浏览器原生行为。 */
  navigate?: (path: string) => void;
}
const ReferenceContext = createContext<Omit<ReferenceProviderProps, "children"> | null>(null);
export function ReferenceProvider({ children, data, href, navigate }: ReferenceProviderProps) {
  const value = useMemo(() => ({ data, href, navigate }), [data, href, navigate]);
  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>;
}
export function useReferenceData() { return useContext(ReferenceContext); }
