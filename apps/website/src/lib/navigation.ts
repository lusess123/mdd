function withoutTrailingSlash(path: string): string {
  return path === "/" ? path : path.replace(/\/+$/, "");
}

export function isNavigationActive(pathname: string, href: string): boolean {
  const currentPath = withoutTrailingSlash(pathname);
  const targetPath = withoutTrailingSlash(href);

  if (targetPath === "/") return currentPath === "/";
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}
