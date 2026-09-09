import type { MmdClient } from "../types";

/** 用户取消操作不属于请求错误；renderer 不显示失败提示。 */
export class MmdCancelledError extends Error {
  constructor() {
    super("Action cancelled");
    this.name = "MmdCancelledError";
  }
}
type Mutation = "save" | "remove" | "executeAction";
type BeforeHooks = {
  [K in Mutation]?: (
    input: Parameters<MmdClient[K]>[0],
  ) =>
    | Parameters<MmdClient[K]>[0]
    | null
    | Promise<Parameters<MmdClient[K]>[0] | null>;
};
/** 只在写入成功后通知失效；取消/校验失败不会发送请求或触发成功副作用。 */
export function withClientLifecycle({
  client,
  before = {},
  afterMutation,
}: {
  client: MmdClient;
  before?: BeforeHooks;
  afterMutation?: (event: { operation: Mutation; model: string }) => void;
}): MmdClient {
  return {
    ...client,
    async save(input) {
      const next = before.save ? await before.save(input) : input;
      if (next === null) throw new MmdCancelledError();
      const result = await client.save(next);
      afterMutation?.({ operation: "save", model: next.model });
      return result;
    },
    async remove(input) {
      const next = before.remove ? await before.remove(input) : input;
      if (next === null) throw new MmdCancelledError();
      const result = await client.remove(next);
      afterMutation?.({ operation: "remove", model: next.model });
      return result;
    },
    async executeAction(input) {
      const next = before.executeAction
        ? await before.executeAction(input)
        : input;
      if (next === null) throw new MmdCancelledError();
      const result = await client.executeAction(next);
      afterMutation?.({ operation: "executeAction", model: next.model });
      return result;
    },
  };
}

/** 每个登录会话独享版本缓存；协议头由宿主配置，只显式采集响应版本，不自动重试冲突写入。 */
export function createRecordVersionStore({
  header = "If-Match",
}: { header?: string } = {}) {
  const versions = new Map<string, string>();
  const key = ({ model, id }: { model: string; id: string }) =>
    JSON.stringify([model, id]);
  return {
    capture(input: { model: string; id: string; version: string | null }) {
      if (input.version !== null) versions.set(key(input), input.version);
    },
    headers(input: { model: string; id?: string }) {
      return {
        [header]: input.id
          ? (versions.get(key({ model: input.model, id: input.id })) ?? "")
          : "",
      };
    },
    clear() {
      versions.clear();
    },
  };
}
