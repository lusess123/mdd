# API 参考

本地基地址为 `http://localhost:8787`，线上基地址为 `https://mmd-api.zyking.xyz`。

- 可视化文档：`GET /docs`
- OpenAPI 3.1：`GET /openapi.json`
- 健康检查：`GET /health`

## 通用 MMD API

`mmd-renderer` 默认以 `/api` 为 API 前缀，并调用以下接口。

### 获取元数据

```http
POST /api/mmd/meta
Content-Type: application/json

{
  "models": ["Product"],
  "views": ["Product.listview"]
}
```

响应包含以名称索引的 `models`、`views` 和 `dicts`。

### 查询列表

```http
POST /api/mmd/query-list
Content-Type: application/json

{
  "model": "Product",
  "page": 1,
  "pageSize": 20,
  "search": { "name": "Keyboard" },
  "filters": [
    { "field": "status", "operator": "eq", "value": "draft" }
  ],
  "sort": [{ "field": "updatedAt", "direction": "desc" }]
}
```

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

过滤运算符为 `eq`、`contains`、`in`、`gte`、`lte`。模型未声明的字段和不适合字段类型的运算符会被拒绝。

### 查询单条

```http
POST /api/mmd/query-one
Content-Type: application/json

{ "model": "Product", "id": "PRODUCT_ID" }
```

响应为 `{ "data": { ... } }`；记录不存在时返回 `404`。

### 新建或更新

新建时不传 `id`：

```http
POST /api/mmd/save
Content-Type: application/json

{
  "model": "Product",
  "data": {
    "name": "Orbit Keyboard",
    "sku": "ORB-001",
    "cover": "https://example.com/keyboard.png",
    "price": 899,
    "tags": ["keyboard"],
    "status": "draft",
    "inventory": 20
  }
}
```

更新时增加 `id`，`data` 只传需要修改的字段。主键、只读字段和未知字段会被引擎拒绝。

### 删除

```http
POST /api/mmd/remove
Content-Type: application/json

{ "model": "Product", "ids": ["PRODUCT_ID"] }
```

成功响应包含 `success`、`affected` 和删除前的数据。

### 自定义操作

```http
POST /api/mmd/actions/duplicate
Content-Type: application/json

{
  "model": "Product",
  "ids": ["PRODUCT_ID"]
}
```

操作必须同时在模型中声明并在 `mmd-engine` 注册处理器。Demo 提供 `publish`、`archive` 和 `duplicate`。

## Product REST 别名

非 MMD 客户端可直接使用：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/meta` | Product 元数据 |
| `GET` | `/api/products` | 列表、搜索和分页 |
| `GET` | `/api/products/:id` | 详情 |
| `POST` | `/api/products` | 新建 |
| `PATCH` | `/api/products/:id` | 更新 |
| `DELETE` | `/api/products/:id` | 删除 |
| `POST` | `/api/actions/:action` | Product 操作 |

## 会话隔离

Cloudflare 生产环境使用来源 IP 的哈希摘要作为会话 ID，客户端不能通过 Header 或 Cookie 切换会话。原始 IP 不写入 Neon。

本地 Neon 模式按以下优先级识别会话：

1. 请求头 `X-MMD-Session`，格式为 8～64 位字母、数字、`_` 或 `-`。
2. HttpOnly Cookie `mmd_session`。
3. 自动生成新 Cookie。

所有 Product 查询和写入都限定在当前会话。公开 Demo 按来源 IP 统一限流为每分钟 120 次，并在数据库层将每个会话限制为 50 条 Product。浏览器跨域调用需要 `credentials: "include"`。

## 错误格式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

常见错误码：

| 状态 | 错误码 | 含义 |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | 请求结构无效 |
| `400` | `INVALID_FILTER` | 字段不支持该过滤方式 |
| `404` | `MODEL_NOT_FOUND` | 模型未注册 |
| `404` | `RECORD_NOT_FOUND` | 记录不存在 |
| `404` | `ACTION_NOT_FOUND` | 操作未声明或未注册 |
| `409` | `SKU_CONFLICT` | SKU 重复 |
| `409` | `SESSION_RECORD_LIMIT` | 当前 Demo 会话已达到 50 条记录 |
| `429` | `RATE_LIMITED` | 请求过于频繁 |
| `500` | `INTERNAL_ERROR` | 未处理的服务端错误 |
