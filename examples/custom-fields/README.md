# 自定义字段示例 / Custom field

Product 模型将 `inventory` 声明为 `type: "inventory-meter"`。渲染器在列表和详情中显示库存进度，在表单和搜索中显示数字输入框。

## 代码

- [库存字段.tsx](./库存字段.tsx)：字段组件及 Provider 注册方式。
- [模型声明](../../packages/mmd-contracts/src/demo.ts)：`inventory` 的元数据。
- [Playground 注册](../../apps/website/src/components/playground-content.tsx)：线上实际使用位置。

字段组件接收统一的 `FieldRendererProps`。`scene` 为 `list`、`detail`、`form` 或 `search`，同一字段可按场景提供不同组件。

## 验证

```bash
bun run dev
```

打开 <http://localhost:3000/playground>，新建或编辑 Product 即可看到库存输入框，列表中会同步显示库存进度。
