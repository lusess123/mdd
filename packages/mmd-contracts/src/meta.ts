import type { Dict } from "./dict";
import type { ModelDefinition } from "./model";
import type { ViewDefinition } from "./view";

export interface MetaRequest {
  models?: string[];
  views?: string[];
  dicts?: string[];
  hasModels?: string[];
  hasViews?: string[];
  /** @deprecated 请使用 hasViews。 */
  hasCiews?: string[];
  hasDicts?: string[];
}

export interface MetaResponse {
  models: Record<string, ModelDefinition>;
  views: Record<string, ViewDefinition>;
  dicts: Record<string, Dict>;
}

export type IMetaRequest = MetaRequest;
export type IMetaResponse = MetaResponse;
