# mmd-contracts

MMD 的模型、字段、视图、操作和 API 协议定义，供前后端共享。

```bash
npm install mmd-contracts
```

```ts
import type { ModelDefinition } from "mmd-contracts";

const product: ModelDefinition = {
  name: "Product",
  primaryKey: "id",
  fields: [{ name: "name", type: "text", label: "名称" }],
};
```

[使用文档](https://mmd.zyking.xyz/docs/) · [源码](https://github.com/lusess123/mdd) · MIT
