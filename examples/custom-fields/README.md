# 字段类型示例 / Field types

当前共享协议定义了 `text`、`image`、`money`、`tags`、`status`、`number` 和 `datetime`。Product Playground 已实际展示文本、图片、金额、标签、状态和数字字段。

## 运行

```bash
bun install
bun run dev
```

打开 <http://localhost:3000/playground>，可查看字段在表格和编辑表单中的真实表现。

## 对应实现

- [字段类型与 Product 元数据](../../packages/mmd-contracts/src/index.ts)
- [字段输入校验](../../apps/demo-api/src/schemas.ts)
- [字段列表与表单渲染](../../apps/website/src/components/playground-content.tsx)

例如，金额字段由 `productModel.fields` 中的 `type: "money"` 描述；当前 Playground 使用 `Intl.NumberFormat` 展示金额，并使用数字输入框编辑。这里记录的是现有实现，通用字段注册 API 仍属于后续能力。
