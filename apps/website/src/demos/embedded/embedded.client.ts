import { MmdEngine, MmdRegistry, type MmdDataAdapter } from "mmd-engine";
import {
  createHttpMmdClient,
  type MmdLocale,
  type MmdRequest,
} from "mmd-renderer";
import { demoDefinitions } from "./embedded.model";

/** 演示 transport 在同一页面运行 Engine；真实部署只需替换为 HTTP transport。 */
export function createDemoClient(adapter: MmdDataAdapter, locale: MmdLocale) {
  const { models, resources } = demoDefinitions(locale);
  const registry = new MmdRegistry();
  for (const model of models) registry.registerModel(model);
  const engine = new MmdEngine({ registry, adapter });
  // JSON 请求边界按 Engine 的公开参数类型解析，供示例 transport 使用。
  const request: MmdRequest = async <T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> => {
    const input = JSON.parse(String(init?.body ?? "{}"));
    let result: unknown;
    if (path.endsWith("/meta")) {
      const meta = engine.getMeta(input);
      for (const view of Object.values(meta.views))
        view.dataContainers = view.dataContainers.map((container) => {
          if (container.type === "list")
            return {
              ...container,
              showRowNumber: true,
              search: {
                layout: "compact",
                fields:
                  models
                    .find((model) => model.name === container.name)
                    ?.fields.filter((field) => field.filter)
                    .map((field) => ({
                      name: field.name,
                      filter: field.filter,
                    })) ?? [],
              },
            };
          if (container.type === "form" && view.type === "edit")
            return {
              ...container,
              fields: [{ name: "id", renderer: "key" }, ...container.fields],
            };
          return container;
        });
      result = meta;
    } else if (path.endsWith("/query-list"))
      result = await engine.queryList(input);
    else if (path.endsWith("/query-one")) result = await engine.queryOne(input);
    else if (path.endsWith("/save")) result = await engine.save(input);
    else if (path.endsWith("/remove")) {
      const removed = await Promise.all(
        (input.ids ?? []).map((id: string) =>
          engine.remove({ model: input.model, id }),
        ),
      );
      result = { affected: removed.filter(Boolean).length };
    } else throw new Error(`Unsupported demo endpoint: ${path}`);
    return result as T;
  };
  return { client: createHttpMmdClient(request), resources };
}
