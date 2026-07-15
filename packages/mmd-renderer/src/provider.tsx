"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { App } from "antd";

import { ActionRegistry, createDefaultActionRegistry } from "./action-registry";
import { createHttpMmdClient, type MmdRequest } from "./client";
import {
  resolveMmdConfig,
  type MmdConfigOverrides,
  type MmdEnvironmentConfig,
  type MmdRendererConfig,
} from "./config";
import { createDefaultFieldRegistry } from "./default-fields";
import { FieldRegistry } from "./field-registry";
import { detectMmdLocale, translate, type MmdLocale } from "./i18n";
import { createFetchMmdRequest, MmdRequestError } from "./transport";
import type {
  ActionHandler,
  FieldRenderers,
  MetaQuery,
  MmdClient,
  RendererMeta,
} from "./types";

const emptyMeta: RendererMeta = { models: {}, views: {}, dicts: {} };

export interface MmdProviderProps
  extends PropsWithChildren,
    MmdConfigOverrides {
  environment?: MmdEnvironmentConfig;
  client?: MmdClient;
  initialMeta?: RendererMeta;
  fieldRegistry?: FieldRegistry;
  actionRegistry?: ActionRegistry;
  fields?: Record<string, FieldRenderers>;
  actions?: Record<string, ActionHandler>;
}

export interface MmdContextValue {
  config: MmdRendererConfig;
  locale: MmdLocale;
  setLocale: (locale: MmdLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  request: MmdRequest;
  client: MmdClient;
  meta: RendererMeta;
  loadMeta: (query: MetaQuery) => Promise<RendererMeta>;
  fieldRegistry: FieldRegistry;
  actionRegistry: ActionRegistry;
  isLoading: boolean;
  navigate: (path: string) => void;
  reportError: (cause: unknown) => Error;
  notifySuccess: (message?: string) => void;
}

const MmdContext = createContext<MmdContextValue | null>(null);

function mergeMeta(current: RendererMeta, incoming: RendererMeta): RendererMeta {
  return {
    models: { ...current.models, ...incoming.models },
    views: { ...current.views, ...incoming.views },
    dicts: { ...current.dicts, ...incoming.dicts },
  };
}

function MmdProviderRuntime({
  children,
  environment,
  client: clientOverride,
  initialMeta,
  fieldRegistry: fieldRegistryOverride,
  actionRegistry: actionRegistryOverride,
  fields,
  actions,
  api,
  auth,
  router,
  locale: localeOverride,
  messages,
  onError,
  onSuccess,
}: MmdProviderProps) {
  const { message } = App.useApp();
  const providerConfig = useMemo<MmdConfigOverrides>(
    () => ({ api, auth, router, locale: localeOverride, messages, onError, onSuccess }),
    [api, auth, router, localeOverride, messages, onError, onSuccess],
  );
  const config = useMemo(
    () => resolveMmdConfig({ environment, provider: providerConfig }),
    [environment, providerConfig],
  );
  const [locale, updateLocale] = useState<MmdLocale>(config.locale);
  const [meta, setMeta] = useState<RendererMeta>(initialMeta ?? emptyMeta);
  const [activeRequests, setActiveRequests] = useState(0);
  const reportedErrors = useRef(new WeakSet<Error>());

  useEffect(() => {
    if (localeOverride || environment?.locale || typeof window === "undefined") {
      updateLocale(config.locale);
      return;
    }
    updateLocale(
      detectMmdLocale(
        window.localStorage.getItem("mmd-locale"),
        window.navigator.language,
      ),
    );
  }, [config.locale, environment?.locale, localeOverride]);
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: MmdLocale) => {
    updateLocale(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mmd-locale", nextLocale);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(config.messages, locale, key, params),
    [config.messages, locale],
  );

  const reportError = useCallback(
    (cause: unknown): Error => {
      const error =
        cause instanceof DOMException && cause.name === "AbortError"
          ? new MmdRequestError(t("errors.timeout"), undefined, "TIMEOUT")
          : cause instanceof TypeError
            ? new MmdRequestError(t("errors.network"), undefined, "NETWORK_ERROR")
            : cause instanceof Error
              ? cause
              : new MmdRequestError(t("errors.unknown"));
      if (reportedErrors.current.has(error)) return error;
      reportedErrors.current.add(error);
      config.onError(error);
      void message.error(error.message);
      return error;
    },
    [config, message, t],
  );

  const notifySuccess = useCallback(
    (text = t("feedback.actionDone")) => {
      config.onSuccess(text);
      void message.success(text);
    },
    [config, message, t],
  );

  const baseRequest = useMemo(
    () =>
      config.api.request ??
      createFetchMmdRequest({ api: config.api, auth: config.auth }),
    [config.api, config.auth],
  );
  const request = useCallback<MmdRequest>(
    async <T,>(path: string, init?: RequestInit) => {
      setActiveRequests((count) => count + 1);
      try {
        return await baseRequest<T>(path, init);
      } catch (cause) {
        throw reportError(cause);
      } finally {
        setActiveRequests((count) => Math.max(0, count - 1));
      }
    },
    [baseRequest, reportError],
  );
  const client = useMemo(
    () => clientOverride ?? createHttpMmdClient(request, config.api.paths),
    [clientOverride, config.api.paths, request],
  );

  const fieldRegistry = useMemo(() => {
    const registry = createDefaultFieldRegistry();
    if (fieldRegistryOverride) registry.extend(fieldRegistryOverride);
    for (const [type, renderers] of Object.entries(fields ?? {})) {
      registry.register(type, renderers);
    }
    return registry;
  }, [fieldRegistryOverride, fields]);
  const actionRegistry = useMemo(() => {
    const registry = createDefaultActionRegistry();
    if (actionRegistryOverride) registry.extend(actionRegistryOverride);
    for (const [name, handler] of Object.entries(actions ?? {})) {
      registry.register(name, handler);
    }
    return registry;
  }, [actionRegistryOverride, actions]);

  const loadMeta = useCallback(
    async (query: MetaQuery) => {
      try {
        const incoming = await client.getMeta(query);
        setMeta((current) => mergeMeta(current, incoming));
        return incoming;
      } catch (cause) {
        throw reportError(cause);
      }
    },
    [client, reportError],
  );

  const navigate = useCallback(
    (path: string) => {
      if (config.router.mode === "custom") {
        config.router.navigate?.(path);
      } else if (typeof window !== "undefined") {
        window.location.hash = path.startsWith("#") ? path.slice(1) : path;
      }
    },
    [config.router],
  );

  const value = useMemo<MmdContextValue>(
    () => ({
      config,
      locale,
      setLocale,
      t,
      request,
      client,
      meta,
      loadMeta,
      fieldRegistry,
      actionRegistry,
      isLoading: activeRequests > 0,
      navigate,
      reportError,
      notifySuccess,
    }),
    [
      actionRegistry,
      activeRequests,
      client,
      config,
      fieldRegistry,
      loadMeta,
      locale,
      meta,
      navigate,
      notifySuccess,
      reportError,
      request,
      setLocale,
      t,
    ],
  );

  return <MmdContext.Provider value={value}>{children}</MmdContext.Provider>;
}

export function MmdProvider(props: MmdProviderProps) {
  return (
    <App>
      <MmdProviderRuntime {...props} />
    </App>
  );
}

export function useMmd(): MmdContextValue {
  const context = useContext(MmdContext);
  if (!context) throw new Error("useMmd must be used inside MmdProvider");
  return context;
}
