"use client";

import { Alert, Button, Space, Tag } from "antd";
import { useMmd } from "./provider";
import { MmdView, type MmdViewProps } from "./view-renderer";
import type { RelationResource } from "./relations/related-records";
import type { MmdRecord, OpenViewInput } from "./types";

export interface ResourceDescriptor extends RelationResource {
  /** 已按当前语言翻译的资源名称；省略时显示模型名。 */
  label?: string;
  /** 已按当前语言翻译的资源说明。 */
  description?: string;
  /** 可写能力仅用于展示，实际鉴权由服务端执行；省略时不显示能力标签。 */
  capabilities?: {
    /** 是否允许新增。 */
    create: boolean;
    /** 是否允许编辑。 */
    update: boolean;
    /** 是否允许删除。 */
    remove: boolean;
  };
}

export interface MmdResourcePageProps extends Omit<
  MmdViewProps,
  "model" | "relations" | "onOpenView"
> {
  /** 当前资源的公开描述，不包含宿主菜单或账号信息。 */
  resource: ResourceDescriptor;
  /** 可浏览的关联资源；省略时不显示关联数据区域。 */
  resources?: readonly RelationResource[];
  /** 路由适配：关联列表额外携带固定 where 条件。 */
  onOpenView?: (input: OpenViewInput & { where?: MmdRecord }) => void;
}

/** 单个资源的标准 CRUD 页面。Shell、品牌、账号与路由实现仍由宿主负责。 */
export function MmdResourcePage({
  resource,
  resources,
  onOpenView,
  onClose,
  ...viewProps
}: MmdResourcePageProps) {
  const { t, locale } = useMmd();
  const view =
    typeof viewProps.view === "string" ? viewProps.view : viewProps.view.name;
  const viewName = view.split(".").at(-1);
  const filterFields = Object.keys(viewProps.where ?? {});
  const capabilities = resource.capabilities;
  const mode =
    viewName === "newview"
      ? "new"
      : viewName === "editview"
        ? "edit"
        : viewName === "detailview"
          ? "detail"
          : undefined;
  return (
    <>
      <div className="mmd-resource-heading">
        <div>
          <span className="mmd-resource-eyebrow">
            {t("resource.management")}
          </span>
          <h1>
            {resource.label ?? resource.name}
            {mode && <small>{t(`resource.${mode}`)}</small>}
          </h1>
          {resource.description && <p>{resource.description}</p>}
          <Space size={4} wrap className="mmd-resource-capabilities">
            {capabilities?.create && (
              <Tag color="cyan">{t("resource.create")}</Tag>
            )}
            {capabilities?.update && (
              <Tag color="gold">{t("resource.edit")}</Tag>
            )}
            {capabilities?.remove && (
              <Tag color="magenta">{t("resource.delete")}</Tag>
            )}
            {capabilities && !Object.values(capabilities).some(Boolean) && (
              <Tag>{t("resource.readOnly")}</Tag>
            )}
            {!!resource.references.length && (
              <Tag>
                {t("resource.references", {
                  count: resource.references.length,
                })}
              </Tag>
            )}
            {!!resource.children.length && (
              <Tag>
                {t("resource.children", { count: resource.children.length })}
              </Tag>
            )}
          </Space>
        </div>
        {viewName !== "listview" && onClose && (
          <Button onClick={onClose}>{t("resource.back")}</Button>
        )}
      </div>
      <section className="mmd-resource-surface">
        {viewName === "listview" && !!filterFields.length && (
          <Alert
            className="mmd-resource-filter-notice"
            type="info"
            showIcon
            title={t("resource.filtered")}
            description={filterFields
              .map(
                (field) =>
                  resource.references.find(
                    (reference) => reference.field === field,
                  )?.label ?? field,
              )
              .join(locale === "en-US" ? ", " : "、")}
            action={
              (onClose || onOpenView) && (
                <Space>
                  {onClose && (
                    <Button size="small" onClick={onClose}>
                      {t("resource.back")}
                    </Button>
                  )}
                  {onOpenView && (
                    <Button
                      size="small"
                      onClick={() =>
                        onOpenView({ model: resource.name, view: "listview" })
                      }
                    >
                      {t("resource.clearFilter")}
                    </Button>
                  )}
                </Space>
              )
            }
          />
        )}
        <MmdView
          {...viewProps}
          model={resource.name}
          onOpenView={onOpenView}
          onClose={onClose}
          relations={
            resources
              ? {
                  resource,
                  resources,
                  className: "mmd-resource-relations",
                  onOpenList: onOpenView
                    ? ({ model, where, defaults }) =>
                        onOpenView({ model, view: "listview", where, defaults })
                    : undefined,
                }
              : undefined
          }
        />
      </section>
    </>
  );
}
