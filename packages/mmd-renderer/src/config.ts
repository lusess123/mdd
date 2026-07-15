import type { MmdApiPaths, MmdRequest } from "./client";
import {
  createMessageCatalog,
  type MmdLocale,
  type MmdMessageCatalog,
  type MmdMessageOverrides,
} from "./i18n";

export interface MmdApiConfig {
  baseUrl: string;
  timeoutMs: number;
  credentials: RequestCredentials;
  headers?: HeadersInit;
  paths?: Partial<MmdApiPaths>;
  request?: MmdRequest;
}

export interface MmdAuthConfig {
  mode: "anonymous" | "custom";
  getToken?: () => string | null | Promise<string | null>;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
}

export interface MmdRouterConfig {
  mode: "hash" | "custom";
  navigate?: (path: string) => void;
}

export interface MmdRendererConfig {
  api: MmdApiConfig;
  auth: MmdAuthConfig;
  router: MmdRouterConfig;
  locale: MmdLocale;
  messages: MmdMessageCatalog;
  onError: (error: Error) => void;
  onSuccess: (message: string) => void;
}

export interface MmdConfigOverrides {
  api?: Partial<MmdApiConfig>;
  auth?: MmdAuthConfig;
  router?: MmdRouterConfig;
  locale?: MmdLocale;
  messages?: MmdMessageOverrides;
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
}

export interface MmdEnvironmentConfig {
  apiBaseUrl?: string;
  locale?: MmdLocale;
}

export interface MmdConfigSources {
  environment?: MmdEnvironmentConfig;
  provider?: MmdConfigOverrides;
  component?: MmdConfigOverrides;
}

const ignoreError = () => undefined;
const ignoreSuccess = () => undefined;

export function resolveMmdConfig(
  sources: MmdConfigSources = {},
): MmdRendererConfig {
  const provider = sources.provider ?? {};
  const component = sources.component ?? {};
  return {
    api: {
      baseUrl: sources.environment?.apiBaseUrl ?? "/api",
      timeoutMs: 10_000,
      credentials: "same-origin",
      ...provider.api,
      ...component.api,
    },
    auth: component.auth ?? provider.auth ?? { mode: "anonymous" },
    router: component.router ?? provider.router ?? { mode: "hash" },
    locale:
      component.locale ??
      provider.locale ??
      sources.environment?.locale ??
      "zh-CN",
    messages: createMessageCatalog({
      "zh-CN": {
        ...provider.messages?.["zh-CN"],
        ...component.messages?.["zh-CN"],
      },
      "en-US": {
        ...provider.messages?.["en-US"],
        ...component.messages?.["en-US"],
      },
    }),
    onError: component.onError ?? provider.onError ?? ignoreError,
    onSuccess: component.onSuccess ?? provider.onSuccess ?? ignoreSuccess,
  };
}
