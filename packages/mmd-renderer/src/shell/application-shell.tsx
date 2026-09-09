"use client";
import { useState, type ReactNode } from "react";
import { Button, Input, Menu, Space } from "antd";
import { useMmd } from "../provider";

export interface ApplicationMenuItem {
  /** 全局唯一导航键；与分组键分别编码。 */
  key: string;
  /** 可搜索的显示名称。 */
  label: string;
  /** 模型编码或其它搜索词。 */
  searchText?: string;
  /** 图标由宿主提供，避免捆绑图标库。 */
  icon?: ReactNode;
  /** 可选分组；同组使用相同键与标签。 */
  group?: { key: string; label: string; icon?: ReactNode };
}

export function applicationMenu({
  items,
  search,
}: {
  items: readonly ApplicationMenuItem[];
  search: string;
}) {
  const term = search.trim().toLowerCase();
  const visible = items.filter((item) =>
    `${item.label} ${item.key} ${item.searchText ?? ""} ${item.group?.label ?? ""}`
      .toLowerCase()
      .includes(term),
  );
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      icon?: ReactNode;
      children: Array<{ key: string; label: string; icon?: ReactNode }>;
    }
  >();
  const result: Array<{
    key: string;
    label: string;
    icon?: ReactNode;
    children?: Array<{ key: string; label: string; icon?: ReactNode }>;
  }> = [];
  for (const item of visible) {
    const leaf = {
      key: `item:${item.key}`,
      label: item.label,
      icon: item.icon,
    };
    if (!item.group) {
      result.push(leaf);
      continue;
    }
    let group = groups.get(item.group.key);
    if (!group) {
      group = {
        key: `group:${item.group.key}`,
        label: item.group.label,
        icon: item.group.icon,
        children: [],
      };
      groups.set(item.group.key, group);
      result.push(group);
    }
    group.children.push(leaf);
  }
  return result;
}

/** 可选应用外壳：只管理导航与窄屏展开，账号、品牌和业务提示通过插槽注入。 */
export function ApplicationShell({
  children,
  items,
  selectedKey,
  onNavigate,
  brand,
  caption,
  header,
  account,
  sidebarFooter,
  footer,
  className = "",
  classes = {},
  unstyled = false,
}: {
  children: ReactNode;
  items: readonly ApplicationMenuItem[];
  selectedKey?: string;
  onNavigate: (key: string) => void;
  brand?: ReactNode;
  caption?: ReactNode;
  header?: ReactNode;
  account?: ReactNode;
  sidebarFooter?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** 宿主已提供布局 CSS 时只复用行为。 */
  unstyled?: boolean;
  classes?: Partial<
    Record<
      | "sidebar"
      | "main"
      | "header"
      | "menuToggle"
      | "menuClose"
      | "search"
      | "caption"
      | "sidebarFooter"
      | "footer",
      string
    >
  >;
}) {
  const { locale } = useMmd();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const menu = applicationMenu({ items, search });
  const selected = items.find((item) => item.key === selectedKey);
  const openKeys = search
    ? menu.filter((item) => item.children).map((item) => item.key)
    : [
        ...new Set([
          ...expanded,
          ...(selected?.group ? [`group:${selected.group.key}`] : []),
        ]),
      ];
  return (
    <div
      data-mmd-layout={unstyled ? undefined : ""}
      className={`mmd-application-shell ${className}`}
    >
      <aside
        className={`mmd-shell-sidebar ${classes.sidebar ?? ""} ${open ? "is-open" : ""}`}
      >
        {brand}
        <Button
          type="text"
          className={`mmd-shell-close ${classes.menuClose ?? ""}`}
          onClick={() => setOpen(false)}
          aria-label={locale === "en-US" ? "Close menu" : "关闭菜单"}
        >
          {locale === "en-US" ? "Close" : "关闭"}
        </Button>
        <div className={classes.caption}>{caption}</div>
        <div className={classes.search}>
          <Input
            allowClear
            aria-label={locale === "en-US" ? "Search menu" : "搜索菜单"}
            placeholder={
              locale === "en-US" ? "Search names or tables" : "搜索名称或数据表"
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Menu
          mode="inline"
          items={menu}
          selectedKeys={selectedKey ? [`item:${selectedKey}`] : []}
          openKeys={openKeys}
          onOpenChange={setExpanded}
          onClick={({ key }) => {
            setOpen(false);
            onNavigate(key.slice(5));
          }}
        />
        <div className={classes.sidebarFooter}>{sidebarFooter}</div>
      </aside>
      <div className={`mmd-shell-main ${classes.main ?? ""}`}>
        <header className={`mmd-shell-header ${classes.header ?? ""}`}>
          <Space>
            <Button
              type="text"
              className={`mmd-shell-toggle ${classes.menuToggle ?? ""}`}
              onClick={() => setOpen((value) => !value)}
              aria-label={locale === "en-US" ? "Open menu" : "展开菜单"}
            >
              ☰
            </Button>
            {header}
          </Space>
          {account}
        </header>
        <main>{children}</main>
        {footer ? <footer className={classes.footer}>{footer}</footer> : null}
      </div>
    </div>
  );
}
