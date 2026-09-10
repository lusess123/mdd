/** 返回路径属于宿主路由；不固定 Next、hash 路由或资源 URL 格式。 */
export function createNavigationTrail({
  read,
  push,
  isResource,
  notify,
  stateKey = "returnTrail",
  limit = 30,
}: {
  read: () => { path: string; state: Record<string, unknown> | null };
  push: (value: { path: string; state: Record<string, unknown> }) => void;
  isResource: (path: string) => boolean;
  notify: () => void;
  stateKey?: string;
  limit?: number;
}) {
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error("Navigation trail limit must be positive");
  function trail(state: Record<string, unknown> | null) {
    const raw = state?.[stateKey];
    return Array.isArray(raw)
      ? raw
          .filter(
            (path): path is string =>
              typeof path === "string" && isResource(path),
          )
          .slice(-limit)
      : [];
  }
  return {
    navigate(path: string) {
      const current = read();
      const previous = trail(current.state);
      if (current.path !== path && isResource(current.path))
        previous.push(current.path);
      push({
        path,
        state: { ...current.state, [stateKey]: previous.slice(-limit) },
      });
      notify();
    },
    back(fallback: string) {
      const current = read();
      const previous = trail(current.state);
      const path = previous.pop() ?? fallback;
      push({ path, state: { ...current.state, [stateKey]: previous } });
      notify();
    },
  };
}
