import {
  createMessages,
  type Locale,
  type MessageCatalog,
  type MessageOverrides,
} from "./i18n";

export type MmdRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export interface MmdApiConfig {
  baseUrl: string;
  timeoutMs: number;
  credentials: RequestCredentials;
  headers?: HeadersInit;
  request?: MmdRequest;
}

export interface MmdAuthConfig {
  mode: "anonymous" | "custom";
  getToken?: () => string | null | Promise<string | null>;
}

export interface MmdRouterConfig {
  mode: "hash" | "custom";
  navigate?: (path: string) => void;
}

export interface MmdConfig {
  api: MmdApiConfig;
  auth: MmdAuthConfig;
  router: MmdRouterConfig;
  locale: Locale;
  messages: MessageCatalog;
  onError: (error: Error) => void;
  onSuccess: (message: string) => void;
}

export interface MmdConfigOverrides {
  api?: Partial<MmdApiConfig>;
  auth?: MmdAuthConfig;
  router?: MmdRouterConfig;
  locale?: Locale;
  messages?: MessageOverrides;
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
}

export interface MmdEnvironmentConfig {
  apiBaseUrl?: string;
  locale?: Locale;
}

export interface MmdConfigSources {
  environment?: MmdEnvironmentConfig;
  provider?: MmdConfigOverrides;
  component?: MmdConfigOverrides;
}

const defaultOnError = () => undefined;
const defaultOnSuccess = () => undefined;

export function resolveMmdConfig(
  sources: MmdConfigSources = {},
): MmdConfig {
  const provider = sources.provider ?? {};
  const component = sources.component ?? {};
  const messages = createMessages({
    "zh-CN": {
      ...provider.messages?.["zh-CN"],
      ...component.messages?.["zh-CN"],
    },
    "en-US": {
      ...provider.messages?.["en-US"],
      ...component.messages?.["en-US"],
    },
  });

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
    messages,
    onError: component.onError ?? provider.onError ?? defaultOnError,
    onSuccess: component.onSuccess ?? provider.onSuccess ?? defaultOnSuccess,
  };
}
