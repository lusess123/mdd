import type { FieldRendererProps } from "./types";
import { useMmd } from "./provider";

export function MmdField(props: FieldRendererProps) {
  const { fieldRegistry } = useMmd();
  const Renderer = fieldRegistry.resolveField(props.field, props.scene);
  return Renderer ? <Renderer {...props} /> : null;
}
