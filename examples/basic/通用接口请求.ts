const api = "http://localhost:8787/api";

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? `HTTP ${response.status}`);
  return result as T;
}

const metadata = await post("/mmd/meta", {
  models: ["Product"],
  views: ["Product.listview"],
});

const products = await post("/mmd/query-list", {
  model: "Product",
  page: 1,
  pageSize: 20,
  filters: [{ field: "status", operator: "eq", value: "draft" }],
});

console.log({ metadata, products });

export {};
