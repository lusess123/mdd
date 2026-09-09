"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Button, Tabs } from "antd";
import { useMmd } from "../provider";
import type { FieldReference } from "mmd-contracts";
import type { MmdRecord } from "../types";
import type { QueryState } from "../navigation/query-state";

export interface RelationResource {
  /** 公开模型名称。 */
  name: string;
  /** 该模型可见的外键和条件目标。 */
  references: Array<{
    field: string;
    target: string;
    when?: FieldReference["when"];
  }>;
  /** 服务端明确开放的子表。 */
  children: Array<{
    model: string;
    field: string;
    label: string;
    filter?: MmdRecord | undefined;
  }>;
}
export interface RelatedListContext {
  /** 子表模型。 */
  model: string;
  /** 独立查询状态键，包含关系字段，避免同表不同关系碰撞。 */
  queryKey: string;
  /** 不能被用户搜索清除的关系约束。 */
  where: MmdRecord;
  /** 新建默认值，固定关系字段不可被其它默认值覆盖。 */
  defaults: MmdRecord;
}

export function relatedListContext({
  relation,
  id,
  record,
  resource,
  target,
}: {
  relation: RelationResource["children"][number];
  id: string;
  record: MmdRecord | null;
  resource: RelationResource;
  target?: RelationResource;
}): RelatedListContext {
  const inherited = Object.fromEntries(
    (target?.references ?? [])
      .filter(
        (reference) =>
          !reference.when &&
          resource.references.some(
            (source) =>
              source.field === reference.field &&
              source.target === reference.target &&
              (!source.when ||
                record?.[source.when.field] === source.when.value),
          ) &&
          (typeof record?.[reference.field] === "string" ||
            typeof record?.[reference.field] === "number"),
      )
      .map((reference) => [reference.field, record?.[reference.field]]),
  );
  const where = { ...relation.filter, [relation.field]: id };
  return {
    model: relation.model,
    queryKey: `relatedQuery.${relation.model}.${relation.field}`,
    where,
    defaults: { ...inherited, ...where },
  };
}

/** 标签页只控制子表挂载，不重载父记录；父查询依赖实际关系字段和显式刷新版本。 */
export function RelatedRecords({
  resource,
  resources,
  id,
  revision = 0,
  tabState,
  renderList,
  onOpenList,
}: {
  resource: RelationResource;
  resources: readonly RelationResource[];
  id: string;
  revision?: number;
  tabState?: QueryState<string>;
  renderList: (context: RelatedListContext) => ReactNode;
  onOpenList?: (context: RelatedListContext) => void;
}) {
  const { client, locale } = useMmd();
  const [selected, setSelected] = useState(() => tabState?.read());
  const [record, setRecord] = useState<MmdRecord | null>(null);
  const [error, setError] = useState("");
  const fieldKey = JSON.stringify(
    [
      ...new Set(
        resource.references.flatMap((reference) => [
          reference.field,
          ...(reference.when ? [reference.when.field] : []),
        ]),
      ),
    ].sort(),
  );
  const fields: string[] = useMemo(() => JSON.parse(fieldKey), [fieldKey]);
  useEffect(
    () => tabState?.subscribe?.(() => setSelected(tabState.read())),
    [tabState],
  );
  useEffect(() => {
    let active = true;
    setRecord(null);
    setError("");
    if (fields.length)
      void client
        .get({ model: resource.name, id, fields: [...fields] })
        .then((value) => {
          if (active) setRecord(value);
        })
        .catch((cause) => {
          if (active)
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    return () => {
      active = false;
    };
  }, [client, resource.name, id, fields, revision]);
  const items = resource.children.map((relation) => {
    const context = relatedListContext({
      relation,
      id,
      record,
      resource,
      target: resources.find((item) => item.name === relation.model),
    });
    return {
      key: `${relation.model}:${relation.field}`,
      label: relation.label,
      children: (
        <>
          <div className="mmd-relation-toolbar">
            <span>
              {locale === "en-US"
                ? "Filtered by this record. New records inherit the related fields."
                : "按当前记录筛选；新增时自动带入关联字段。"}
            </span>
            {onOpenList ? (
              <Button onClick={() => onOpenList(context)}>
                {locale === "en-US" ? "Open full list" : "打开完整列表"}
              </Button>
            ) : null}
          </div>
          {renderList(context)}
        </>
      ),
    };
  });
  const activeKey = items.some((item) => item.key === selected)
    ? selected
    : items[0]?.key;
  return (
    <div className="mmd-related-records">
      <h2>{locale === "en-US" ? "Related records" : "关联数据"}</h2>
      {error ? <Alert type="warning" title={error} /> : null}
      <Tabs
        destroyOnHidden
        activeKey={activeKey}
        onChange={(key) => {
          setSelected(key);
          tabState?.write(key);
        }}
        items={items}
      />
    </div>
  );
}
