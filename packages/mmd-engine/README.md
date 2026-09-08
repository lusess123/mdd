# mmd-engine

MMD 服务端引擎：元数据、查询、分页、过滤、增删改和自定义操作。通过数据适配器连接数据库。

```bash
npm install mmd-contracts mmd-engine
```

[接入与 Hono 示例](https://mmd.zyking.xyz/docs/) · [API 文档](https://mmd-api.zyking.xyz/docs) · [源码](https://github.com/lusess123/mdd) · MIT

### Explicit action lists (0.1.1)

Set `defaultActions: false` to suppress generated CRUD buttons and use only explicit `actions` and `dataActions`. Existing models retain their default actions. Row placements in `actions` are still appended to row actions. Action visibility is presentation only: enforce authorization in your API/data adapter.
