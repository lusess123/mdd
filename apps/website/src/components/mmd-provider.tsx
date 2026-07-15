"use client";

import { MmdRequestError } from "mmd-renderer";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  resolveMmdConfig,
  type MmdConfig,
  type MmdConfigOverrides,
  type MmdEnvironmentConfig,
  type MmdRequest,
} from "../lib/mmd-config";
import {
  detectLocale,
  translate,
  translateApiError,
  type Locale,
  type MessageKey,
} from "../lib/i18n";

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface MmdProviderProps
  extends PropsWithChildren,
    MmdConfigOverrides {
  environment?: MmdEnvironmentConfig;
}

interface MmdContextValue {
  config: MmdConfig;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
  request: MmdRequest;
  isLoading: boolean;
  navigate: (path: string) => void;
  notifySuccess: (message?: string) => void;
}

const MmdContext = createContext<MmdContextValue | null>(null);

function joinUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function parseResponse<T>(
  response: Response,
  resolveErrorMessage: (code: string | undefined, fallback: string) => string,
): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as
    | (T & ApiErrorBody)
    | undefined;

  if (!response.ok) {
    const fallback = body?.error?.message ?? `HTTP ${response.status}`;
    throw new MmdRequestError(
      resolveErrorMessage(body?.error?.code, fallback),
      response.status,
      body?.error?.code,
      body?.error?.details,
    );
  }

  return body as T;
}

export function MmdProvider({
  children,
  environment,
  api,
  auth,
  router,
  locale: localeOverride,
  messages,
  onError,
  onSuccess,
}: MmdProviderProps) {
  const provider = useMemo<MmdConfigOverrides>(
    () => ({
      api,
      auth,
      router,
      locale: localeOverride,
      messages,
      onError,
      onSuccess,
    }),
    [api, auth, localeOverride, messages, onError, onSuccess, router],
  );
  const config = useMemo(
    () => resolveMmdConfig({ environment, provider }),
    [environment, provider],
  );
  const [locale, updateLocale] = useState<Locale>(config.locale);
  const [activeRequests, setActiveRequests] = useState(0);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string }>();

  useEffect(() => {
    if (localeOverride) {
      updateLocale(localeOverride);
      return;
    }

    updateLocale(
      detectLocale(
        window.localStorage.getItem("mmd-locale"),
        window.navigator.language,
      ),
    );
  }, [localeOverride]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 2_600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setLocale = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
    window.localStorage.setItem("mmd-locale", nextLocale);
  }, []);

  const t = useCallback(
    (key: MessageKey) => translate(config.messages, locale, key),
    [config.messages, locale],
  );

  const notifySuccess = useCallback(
    (text = t("feedback.actionDone")) => {
      config.onSuccess(text);
      setToast({ kind: "success", text });
    },
    [config, t],
  );

  const request = useCallback<MmdRequest>(
    async <T,>(path: string, init: RequestInit = {}) => {
      setActiveRequests((count) => count + 1);

      try {
        if (config.api.request) {
          return await config.api.request<T>(path, init);
        }

        const controller = new AbortController();
        const timer = window.setTimeout(
          () => controller.abort(),
          config.api.timeoutMs,
        );
        const token =
          config.auth.mode === "custom"
            ? await config.auth.getToken?.()
            : undefined;
        const headers = new Headers(config.api.headers);

        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
        if (init.body && !headers.has("content-type")) {
          headers.set("content-type", "application/json");
        }
        if (token) headers.set("authorization", `Bearer ${token}`);

        try {
          const response = await fetch(joinUrl(config.api.baseUrl, path), {
            ...init,
            credentials: config.api.credentials,
            headers,
            signal: controller.signal,
          });
          return await parseResponse<T>(response, (code, fallback) =>
            translateApiError(config.messages, locale, code, fallback),
          );
        } finally {
          window.clearTimeout(timer);
        }
      } catch (cause) {
        const error =
          cause instanceof DOMException && cause.name === "AbortError"
            ? new MmdRequestError(t("errors.timeout"), undefined, "TIMEOUT")
            : cause instanceof TypeError
              ? new MmdRequestError(
                  t("errors.network"),
                  undefined,
                  "NETWORK_ERROR",
                )
              : cause instanceof Error
                ? cause
                : new MmdRequestError(t("errors.unknown"));
        config.onError(error);
        setToast({ kind: "error", text: error.message });
        throw error;
      } finally {
        setActiveRequests((count) => Math.max(0, count - 1));
      }
    },
    [config, locale, t],
  );

  const navigate = useCallback(
    (path: string) => {
      if (config.router.mode === "custom") {
        config.router.navigate?.(path);
        return;
      }
      window.location.hash = path.startsWith("#") ? path.slice(1) : path;
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
      isLoading: activeRequests > 0,
      navigate,
      notifySuccess,
    }),
    [
      activeRequests,
      config,
      locale,
      navigate,
      notifySuccess,
      request,
      setLocale,
      t,
    ],
  );

  return (
    <MmdContext.Provider value={value}>
      {children}
      {activeRequests > 0 ? (
        <div className="mmd-global-loading" aria-live="polite">
          <span /> {t("feedback.loading")}
        </div>
      ) : null}
      {toast ? (
        <div className={`mmd-toast mmd-toast-${toast.kind}`} role="status">
          {toast.text}
        </div>
      ) : null}
    </MmdContext.Provider>
  );
}

export function useMmd() {
  const context = useContext(MmdContext);
  if (!context) throw new Error("useMmd must be used inside MmdProvider");
  return context;
}
