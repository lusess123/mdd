import type {
  FieldRenderer,
  FieldRenderers,
  FieldScene,
  RendererField,
} from "./types";

export class FieldRegistry {
  readonly #renderers = new Map<string, FieldRenderers>();

  register(type: string, renderers: FieldRenderers): this {
    this.#renderers.set(type.toLowerCase(), renderers);
    return this;
  }

  resolve(type: string, scene: FieldScene): FieldRenderer<any> | undefined {
    const renderers = this.#renderers.get(type.toLowerCase());
    return renderers?.[scene] ?? renderers?.default;
  }

  resolveField(
    field: RendererField,
    scene: FieldScene,
  ): FieldRenderer<any> | undefined {
    for (const type of [field.renderer, field.type, field.renderType]) {
      const renderer = type ? this.resolve(type, scene) : undefined;
      if (renderer) return renderer;
    }

    const semantic = field.fieldType
      ? this.resolve(field.fieldType, scene)
      : undefined;
    return semantic ?? this.resolve("text", scene);
  }

  clone(): FieldRegistry {
    const registry = new FieldRegistry();
    for (const [type, renderers] of this.#renderers) {
      registry.register(type, renderers);
    }
    return registry;
  }

  extend(source: FieldRegistry): this {
    for (const [type, renderers] of source.#renderers) {
      this.register(type, renderers);
    }
    return this;
  }
}
