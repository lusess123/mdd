import type { FieldRendererProps } from "./types";
import { FilterField } from "./filter-field";
import { useMmd } from "./provider";

export function MmdField(props: FieldRendererProps) {
  const { fieldRegistry } = useMmd();
  if (props.scene === "search" && props.field.filter) return <FilterField {...props} />;
  const Renderer = fieldRegistry.resolveField(props.field, props.scene);
  return Renderer ? <Renderer {...props} /> : null;
}
