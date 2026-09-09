"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Space, Spin } from "antd";

import { DetailContainer } from "./detail-container";
import { FormContainer } from "./form-container";
import {
  RelatedRecords,
  type RelationResource,
} from "./relations/related-records";
import {
  createBrowserTabState,
  type QueryState,
} from "./navigation/query-state";
import { ListContainer, type ListContainerProps } from "./list-container";
import { findModel, findView } from "./metadata";
import { useMmd } from "./provider";
import type {
  MmdPageSlots,
  MmdRecord,
  OpenViewInput,
  PageSlot,
  PageSlotProps,
  RendererModel,
  RendererView,
} from "./types";

function renderSlot(slot: PageSlot | undefined, props: PageSlotProps) {
  return typeof slot === "function" ? slot(props) : slot;
}

export interface ViewEngineProps {
  view: RendererView;
  model?: RendererModel;
  id?: string;
  where?: MmdRecord;
  /** 新建初始值，由表单自动裁剪只读与未知字段。 */
  defaults?: MmdRecord;
  /** 列表行为集中透传，宿主不必手动加载元数据或直接组装 Container。 */
  list?: Omit<
    ListContainerProps,
    "container" | "model" | "where" | "defaults" | "openView" | "onRowChange"
  >;
  slots?: MmdPageSlots;
  openView?: (input: OpenViewInput) => void;
  close?: () => void;
  refresh?: () => void;
  onRowChange?: (row: MmdRecord) => void;
}

export function ViewEngine({
  view,
  model,
  id,
  where,
  defaults,
  list,
  slots = {},
  openView,
  close,
  refresh,
  onRowChange,
}: ViewEngineProps) {
  const { t } = useMmd();
  const slotProps = { view, model, id };
  return (
    <Space
      className="mmd-view-stack"
      orientation="vertical"
      size="middle"
      style={{ display: "flex" }}
    >
      {renderSlot(slots.beforeView, slotProps)}
      {view.dataContainers.map((container) => {
        const key = container.key ?? `${container.type}-${container.name}`;
        let content;
        switch (container.type) {
          case "list":
            content = (
              <ListContainer
                {...list}
                defaults={defaults}
                container={container}
                model={model}
                where={where}
                openView={openView}
                onRowChange={onRowChange}
              />
            );
            break;
          case "detail":
            content = (
              <DetailContainer
                container={container}
                model={model}
                id={id}
                openView={openView}
                close={close}
                refresh={refresh}
              />
            );
            break;
          case "form":
          case "tableForm":
            content = (
              <FormContainer
                defaults={defaults}
                container={container}
                model={model}
                id={id}
                openView={openView}
                close={close}
                refresh={refresh}
              />
            );
            break;
          default:
            content = (
              <Alert
                type="warning"
                showIcon
                title={t("errors.containerNotFound", { type: container.type })}
              />
            );
        }
        return (
          <div
            className={`mmd-container mmd-container-${container.type}`}
            key={key}
          >
            {renderSlot(slots.beforeContainer, slotProps)}
            {content}
            {renderSlot(slots.afterContainer, slotProps)}
          </div>
        );
      })}
      {renderSlot(slots.afterView, slotProps)}
    </Space>
  );
}

export interface MmdViewProps {
  /** 路由由宿主决定；省略时使用内置弹窗。 */
  onOpenView?: (input: OpenViewInput) => void;
  /** 可选关联数据；标签、子表渲染、查询隔离与刷新由 MMD 接管。 */
  relations?: {
    resource: RelationResource;
    resources: readonly RelationResource[];
    tabState?: QueryState<string>;
    className?: string;
    onOpenList?: Parameters<typeof RelatedRecords>[0]["onOpenList"];
  };
  view: string | RendererView;
  model?: string | RendererModel;
  id?: string;
  where?: MmdRecord;
  /** 新建初始值，由表单自动裁剪只读与未知字段。 */
  defaults?: MmdRecord;
  /** 列表行为集中透传，宿主不必手动加载元数据或直接组装 Container。 */
  list?: Omit<
    ListContainerProps,
    "container" | "model" | "where" | "defaults" | "openView" | "onRowChange"
  >;
  slots?: MmdPageSlots;
  onClose?: () => void;
  onRefresh?: () => void;
  onRowChange?: (row: MmdRecord) => void;
}

export function MmdView(props: MmdViewProps) {
  const { locale } = useMmd();
  const model =
    typeof props.model === "string" ? props.model : props.model?.name;
  const view = typeof props.view === "string" ? props.view : props.view.name;
  return (
    <MmdViewInstance
      key={JSON.stringify([model, view, props.id, locale])}
      {...props}
    />
  );
}

function MmdViewInstance({
  view: viewInput,
  model: modelInput,
  id,
  where,
  defaults,
  list,
  slots = {},
  onClose,
  onRefresh,
  onRowChange,
  onOpenView,
  relations,
}: MmdViewProps) {
  const { loadMeta, meta, reportError, t } = useMmd();
  const [loading, setLoading] = useState(typeof viewInput === "string");
  const [error, setError] = useState<Error>();
  const [modal, setModal] = useState<OpenViewInput>();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const tabState = useMemo(
    () => relations?.tabState ?? createBrowserTabState(),
    [relations?.tabState],
  );
  const modelName =
    typeof modelInput === "string" ? modelInput : modelInput?.name;
  const model =
    typeof modelInput === "object"
      ? modelInput
      : modelName
        ? findModel(meta, modelName)
        : undefined;
  const view =
    typeof viewInput === "object"
      ? viewInput
      : findView(meta, viewInput, modelName);
  const qualifiedView =
    typeof viewInput === "string" && modelName
      ? viewInput.startsWith(`${modelName}.`)
        ? viewInput
        : `${modelName}.${viewInput}`
      : String(viewInput);

  useEffect(() => {
    if (typeof viewInput !== "string" || view) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    void loadMeta({
      models: modelName ? [modelName] : undefined,
      views: [qualifiedView],
    })
      .catch((cause) => {
        if (!cancelled) setError(reportError(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadMeta, modelName, qualifiedView, reportError, view, viewInput]);

  const slotProps = useMemo(() => ({ view, model, id }), [id, model, view]);
  if (loading) {
    return (
      <>
        {renderSlot(slots.loading, slotProps) ?? (
          <Spin description={t("common.loading")} />
        )}
      </>
    );
  }
  if (error) {
    return (
      <>
        {renderSlot(slots.error, slotProps) ?? (
          <Alert type="error" showIcon title={error.message} />
        )}
      </>
    );
  }
  if (!view) {
    const message = t("errors.viewNotFound", { view: qualifiedView });
    return (
      <>
        {renderSlot(slots.empty, slotProps) ?? (
          <Alert type="warning" showIcon title={message} />
        )}
      </>
    );
  }

  const refresh = () => {
    setRefreshVersion((version) => version + 1);
    onRefresh?.();
  };
  return (
    <>
      <div className="mmd-view-root">
        <ViewEngine
          key={refreshVersion}
          view={view}
          model={model}
          id={id}
          where={where}
          defaults={defaults}
          list={list}
          slots={slots}
          openView={onOpenView ?? setModal}
          close={onClose}
          refresh={refresh}
          onRowChange={onRowChange}
        />
      </div>
      {view.dataContainers.some((container) => container.type === "detail") &&
      id &&
      relations?.resource.children.length ? (
        <section className={relations.className}>
          <RelatedRecords
            resource={relations.resource}
            resources={relations.resources}
            id={id}
            revision={refreshVersion}
            tabState={tabState}
            onOpenList={relations.onOpenList}
            renderList={({ model, where, defaults, queryKey }) => (
              <MmdView
                model={model}
                view="listview"
                where={where}
                defaults={defaults}
                list={{ ...list, queryKey }}
                onOpenView={onOpenView}
              />
            )}
          />
        </section>
      ) : null}
      <Modal
        rootClassName="mmd-modal-root"
        open={Boolean(modal)}
        footer={null}
        width="min(1000px, 92vw)"
        title={modal?.view}
        destroyOnHidden
        onCancel={() => setModal(undefined)}
      >
        {modal ? (
          <MmdView
            model={modal.model}
            view={modal.view}
            id={modal.id}
            defaults={modal.defaults}
            list={list}
            onClose={() => setModal(undefined)}
            onRefresh={refresh}
          />
        ) : null}
      </Modal>
    </>
  );
}

export const MmdRenderer = MmdView;
