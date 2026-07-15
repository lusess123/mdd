import type {
  ActionExecutionContext,
  ActionExecutionResult,
  ActionHandler,
  RendererAction,
} from "./types";

function actionKeys(action: RendererAction): string[] {
  return [action.handler, action.extend, action.name, action.type]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
}

export class ActionRegistry {
  readonly #handlers = new Map<string, ActionHandler>();

  register(name: string, handler: ActionHandler): this {
    this.#handlers.set(name.toLowerCase(), handler);
    return this;
  }

  resolve(action: RendererAction): ActionHandler | undefined {
    for (const key of actionKeys(action)) {
      const handler = this.#handlers.get(key);
      if (handler) return handler;
    }
    return this.#handlers.get("custom");
  }

  async execute(
    action: RendererAction,
    context: ActionExecutionContext,
  ): Promise<ActionExecutionResult | void> {
    const handler = this.resolve(action);
    if (!handler) {
      throw new Error(
        `No action handler registered for ${action.extend ?? action.name ?? action.type ?? action.label}`,
      );
    }
    const result = await handler(context, action);
    if (result?.refresh) await context.refresh?.();
    if (result?.close) context.close?.();
    if (result?.navigate) context.navigate?.(result.navigate);
    return result;
  }

  clone(): ActionRegistry {
    const registry = new ActionRegistry();
    for (const [name, handler] of this.#handlers) registry.register(name, handler);
    return registry;
  }

  extend(source: ActionRegistry): this {
    for (const [name, handler] of source.#handlers) this.register(name, handler);
    return this;
  }
}

function openView(view: string): ActionHandler {
  return (context, action) => {
    const keyField = context.keyField ?? "id";
    const id = context.record?.[keyField];
    context.openView?.({
      model: context.model,
      view: action.viewName ?? view,
      id: id === undefined || id === null ? undefined : String(id),
    });
  };
}

const save: ActionHandler = async (context) => {
  const data = await context.submit?.();
  return data ? { data, refresh: true, close: true } : undefined;
};

const remove: ActionHandler = async (context) => {
  const keyField = context.keyField ?? "id";
  const recordId = context.record?.[keyField];
  const ids =
    context.selectedIds && context.selectedIds.length > 0
      ? context.selectedIds
      : recordId === undefined || recordId === null
        ? []
        : [String(recordId)];
  if (ids.length === 0) throw new Error("Delete requires at least one record id");

  const data = await context.client.remove({ model: context.model, ids });
  return { data, refresh: true };
};

const executeRemote: ActionHandler = async (context, action) => {
  const keyField = context.keyField ?? "id";
  const recordId = context.record?.[keyField];
  const ids =
    context.selectedIds ??
    (recordId === undefined || recordId === null ? [] : [String(recordId)]);
  const data = await context.client.executeAction({
    action: action.name ?? action.extend ?? action.type ?? action.label,
    model: context.model,
    ids,
    row: context.record,
    url: action.url,
    method:
      action.method ??
      (action.type === "get" || action.type === "post"
        ? action.type.toUpperCase()
        : undefined),
  });
  return { data, refresh: action.refresh ?? true };
};

export function createDefaultActionRegistry(): ActionRegistry {
  return new ActionRegistry()
    .register("new", openView("newview"))
    .register("edit", openView("editview"))
    .register("detail", openView("detailview"))
    .register("view", openView("detailview"))
    .register("save", save)
    .register("submit", save)
    .register("delete", remove)
    .register("del", remove)
    .register("refresh", () => ({ refresh: true }))
    .register("get", executeRemote)
    .register("post", executeRemote)
    .register("custom", executeRemote);
}
