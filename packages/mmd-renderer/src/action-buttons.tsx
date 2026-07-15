"use client";

import { useState } from "react";
import { Button, Popconfirm, Space } from "antd";

import { isActionDisabled, isActionVisible } from "./action-policy";
import { useMmd } from "./provider";
import type {
  ActionExecutionContext,
  MmdRecord,
  RendererAction,
} from "./types";

export interface ActionButtonsProps {
  actions: RendererAction[];
  context: ActionExecutionContext;
  record?: MmdRecord;
  size?: "small" | "middle" | "large";
}

function actionKey(action: RendererAction, index: number): string {
  return action.extend ?? action.name ?? action.type ?? `${action.label}-${index}`;
}

function actionLabel(
  action: RendererAction,
  t: (key: string) => string,
): string {
  const key = `actions.${action.type ?? action.name ?? action.extend ?? "custom"}`;
  const translated = t(key);
  return translated === key ? action.label : translated;
}

function feedbackKey(action: RendererAction): string | undefined {
  const type = action.type ?? action.name;
  if (type === "save" || type === "submit") return "feedback.saved";
  if (type === "delete" || type === "del") return "feedback.deleted";
  if (["new", "edit", "detail", "view", "refresh"].includes(type ?? "")) {
    return undefined;
  }
  return "feedback.actionDone";
}

export function ActionButtons({
  actions,
  context,
  record,
  size = "small",
}: ActionButtonsProps) {
  const { actionRegistry, notifySuccess, reportError, t } = useMmd();
  const [loadingKey, setLoadingKey] = useState<string>();
  const visibleActions = actions.filter((action) => isActionVisible(action, record));

  const run = async (action: RendererAction, key: string) => {
    setLoadingKey(key);
    try {
      await actionRegistry.execute(action, { ...context, record });
      const messageKey = feedbackKey(action);
      if (messageKey) notifySuccess(t(messageKey));
    } catch (cause) {
      reportError(cause);
    } finally {
      setLoadingKey(undefined);
    }
  };

  return (
    <Space size="small" wrap>
      {visibleActions.map((action, index) => {
        const key = actionKey(action, index);
        const label = actionLabel(action, t);
        const disabled =
          isActionDisabled(action, record) ||
          (action.placement === "bulk" && !context.selectedIds?.length);
        const button = (
          <Button
            size={size}
            type={action.tone === "primary" ? "primary" : "default"}
            danger={action.tone === "danger" || action.type === "del" || action.type === "delete"}
            disabled={disabled}
            loading={loadingKey === key}
            onClick={action.confirm ? undefined : () => void run(action, key)}
          >
            {label}
          </Button>
        );
        return action.confirm ? (
          <Popconfirm
            key={key}
            title={typeof action.confirm === "string" ? action.confirm : `${label}?`}
            okText={t("common.confirm")}
            cancelText={t("common.cancel")}
            onConfirm={() => run(action, key)}
          >
            {button}
          </Popconfirm>
        ) : (
          <span key={key}>{button}</span>
        );
      })}
    </Space>
  );
}
