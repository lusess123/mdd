"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Space, Spin } from "antd";

import { DetailContainer } from "./detail-container";
import { FormContainer } from "./form-container";
import { ListContainer } from "./list-container";
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
  slots = {},
  openView,
  close,
  refresh,
  onRowChange,
}: ViewEngineProps) {
  const { t } = useMmd();
  const slotProps = { view, model, id };
  return (
    <Space orientation="vertical" size="middle" style={{ display: "flex" }}>
      {renderSlot(slots.beforeView, slotProps)}
      {view.dataContainers.map((container) => {
        const key = container.key ?? `${container.type}-${container.name}`;
        let content;
        switch (container.type) {
          case "list":
            content = (
              <ListContainer
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
              />
            );
            break;
          case "form":
          case "tableForm":
            content = (
              <FormContainer
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
          <div className={`mmd-container mmd-container-${container.type}`} key={key}>
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
  view: string | RendererView;
  model?: string | RendererModel;
  id?: string;
  where?: MmdRecord;
  slots?: MmdPageSlots;
  onClose?: () => void;
  onRefresh?: () => void;
  onRowChange?: (row: MmdRecord) => void;
}

export function MmdView({
  view: viewInput,
  model: modelInput,
  id,
  where,
  slots = {},
  onClose,
  onRefresh,
  onRowChange,
}: MmdViewProps) {
  const { loadMeta, meta, reportError, t } = useMmd();
  const [loading, setLoading] = useState(typeof viewInput === "string");
  const [error, setError] = useState<Error>();
  const [modal, setModal] = useState<OpenViewInput>();
  const [refreshVersion, setRefreshVersion] = useState(0);
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
      ? `${modelName}.${viewInput}`
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
      <ViewEngine
        key={refreshVersion}
        view={view}
        model={model}
        id={id}
        where={where}
        slots={slots}
        openView={setModal}
        close={onClose}
        refresh={refresh}
        onRowChange={onRowChange}
      />
      <Modal
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
            onClose={() => setModal(undefined)}
            onRefresh={refresh}
          />
        ) : null}
      </Modal>
    </>
  );
}

export const MmdRenderer = MmdView;
