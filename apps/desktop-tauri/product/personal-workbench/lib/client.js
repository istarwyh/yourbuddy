/* dsh-personal-workbench Web client — generated from src/client. */
window.__ModuleLoader__.load({
  id: "dsh-personal-workbench",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  SETTINGS_LOCALE_NAMESPACE: () => SETTINGS_LOCALE_NAMESPACE,
  apply: () => apply,
  inject: () => inject,
  installPersonalBrandOccupants: () => installPersonalBrandOccupants,
  normalizeLogoSource: () => normalizeLogoSource,
  normalizeWorkbenchName: () => normalizeWorkbenchName,
  resolveWorkbenchBrand: () => resolveWorkbenchBrand
});
module.exports = __toCommonJS(index_exports);

// src/constants.ts
var WORKBENCH_SETTINGS_NAMESPACE = "personal-workbench";

// src/client/brand.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function normalizeWorkbenchName(value) {
  if (typeof value !== "string") return void 0;
  const name = value.trim();
  return name.length > 0 ? name : void 0;
}
function normalizeLogoSource(value) {
  if (typeof value !== "string") return void 0;
  const logo = value.trim();
  return logo.length > 0 ? logo : void 0;
}
function resolveWorkbenchBrand(value) {
  if (typeof value !== "object" || value === null || !("enabled" in value) || value.enabled !== true) {
    return {};
  }
  const record = value;
  const name = normalizeWorkbenchName(record.name);
  const logo = normalizeLogoSource(record.logo);
  return {
    ...name === void 0 ? {} : { name },
    ...logo === void 0 ? {} : { logo }
  };
}
function createPersonalBrandMark(logo) {
  return function PersonalBrandMark({ size, className }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "img",
      {
        src: logo,
        alt: "",
        "aria-hidden": "true",
        className,
        width: size,
        height: size,
        style: { display: "block", objectFit: "contain", borderRadius: "24%" }
      }
    );
  };
}
function createPersonalBrandName(name) {
  return function PersonalBrandName() {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: name });
  };
}

// src/client/BrandSettingsRow.tsx
var import_react = require("react");

// src/client/desktop-external-links.ts
var DESKTOP_EXTERNAL_LINK_CHANNEL = "yourbuddy.desktop.external-link";
var DESKTOP_EXTERNAL_LINK_VERSION = 1;
var MAX_EXTERNAL_URL_LENGTH = 4096;
var RESPONSE_TIMEOUT_MS = 5e3;
var REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
function resolveDesktopExternalHttpUrl(value, currentOrigin) {
  if (value.length === 0 || value.length > MAX_EXTERNAL_URL_LENGTH) return void 0;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.hostname === "" || url.username !== "" || url.password !== "" || url.origin === currentOrigin || url.href.length > MAX_EXTERNAL_URL_LENGTH) return void 0;
    return url.href;
  } catch {
    return void 0;
  }
}
function readDesktopExternalLinkResponse(value, requestId) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
  const response = value;
  if (response.channel !== DESKTOP_EXTERNAL_LINK_CHANNEL || response.version !== DESKTOP_EXTERNAL_LINK_VERSION || response.type !== "open-response" || response.requestId !== requestId || typeof response.ok !== "boolean") return void 0;
  const expectedKeys = response.ok ? "channel,ok,requestId,type,version" : "channel,error,ok,requestId,type,version";
  if (Object.keys(response).sort().join(",") !== expectedKeys) return void 0;
  if (!response.ok && (typeof response.error !== "string" || response.error.length > 2048)) {
    return void 0;
  }
  return response;
}
function createRequestId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function requestDesktopExternalLinkOpen(url, options = {}) {
  const target = options.target ?? window;
  if (target.parent === target) return Promise.reject(new Error("desktop-shell-unavailable"));
  const requestId = options.requestId ?? createRequestId();
  if (!REQUEST_ID_PATTERN.test(requestId)) return Promise.reject(new Error("invalid-request-id"));
  return new Promise((resolve, reject) => {
    const parent = target.parent;
    const onMessage = (event) => {
      if (event.source !== parent) return;
      const response = readDesktopExternalLinkResponse(event.data, requestId);
      if (response === void 0) return;
      cleanup();
      if (response.ok) resolve();
      else reject(new Error(response.error));
    };
    const timeout = target.setTimeout(() => {
      cleanup();
      reject(new Error("desktop-shell-unavailable"));
    }, options.timeoutMs ?? RESPONSE_TIMEOUT_MS);
    const cleanup = () => {
      target.clearTimeout(timeout);
      target.removeEventListener("message", onMessage);
    };
    target.addEventListener("message", onMessage);
    parent.postMessage({
      channel: DESKTOP_EXTERNAL_LINK_CHANNEL,
      version: DESKTOP_EXTERNAL_LINK_VERSION,
      type: "open-request",
      requestId,
      url
    }, "*");
  });
}
function anchorFromEventTarget(target) {
  if (target instanceof Element) return target.closest("a[href]");
  if (target instanceof Node) return target.parentElement?.closest("a[href]") ?? null;
  return null;
}
function externalUrlFromAnchor(anchor) {
  if (anchor === null || anchor.target !== "_blank" || !anchor.relList.contains("noopener") || anchor.hasAttribute("download")) return void 0;
  const href = anchor.getAttribute("href");
  return href === null ? void 0 : resolveDesktopExternalHttpUrl(href, window.location.origin);
}
async function copyLinkAddress(value) {
  try {
    if (navigator.clipboard?.writeText !== void 0) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("clipboard-unavailable");
}
function installDesktopExternalLinks(ctx, t) {
  ctx.effect(() => {
    if (typeof window === "undefined" || window.parent === window) return () => {
    };
    const menu = document.createElement("div");
    menu.className = "dpw-link-menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "dpw-link-menu-item";
    openButton.setAttribute("role", "menuitem");
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "dpw-link-menu-item";
    copyButton.setAttribute("role", "menuitem");
    const status = document.createElement("div");
    status.className = "dpw-link-menu-status";
    status.hidden = true;
    menu.append(openButton, copyButton, status);
    document.body.append(menu);
    let selectedUrl;
    const markedAnchors = /* @__PURE__ */ new Set();
    let statusTimer;
    const clearStatusTimer = () => {
      if (statusTimer !== void 0) window.clearTimeout(statusTimer);
      statusTimer = void 0;
    };
    const hideMenu = () => {
      clearStatusTimer();
      selectedUrl = void 0;
      menu.hidden = true;
    };
    const positionMenu = (x, y) => {
      menu.style.left = `${Math.max(8, x)}px`;
      menu.style.top = `${Math.max(8, y)}px`;
      const bounds = menu.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8))}px`;
      menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8))}px`;
    };
    const showStatus = (message, x, y) => {
      selectedUrl = void 0;
      openButton.hidden = true;
      copyButton.hidden = true;
      status.hidden = false;
      status.textContent = message;
      menu.hidden = false;
      positionMenu(x, y);
      clearStatusTimer();
      statusTimer = window.setTimeout(hideMenu, 2500);
    };
    const openUrl = (url, x, y) => {
      void requestDesktopExternalLinkOpen(url).catch((error) => {
        const detail = error instanceof Error ? error.message : String(error);
        showStatus(`${t("link.error.open")} ${detail}`, x, y);
      });
    };
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const url = externalUrlFromAnchor(anchorFromEventTarget(event.target));
      if (url === void 0) return;
      event.preventDefault();
      hideMenu();
      openUrl(url, event.clientX, event.clientY);
    };
    const onContextMenu = (event) => {
      const url = externalUrlFromAnchor(anchorFromEventTarget(event.target));
      if (url === void 0) {
        hideMenu();
        return;
      }
      event.preventDefault();
      clearStatusTimer();
      selectedUrl = url;
      openButton.hidden = false;
      copyButton.hidden = false;
      status.hidden = true;
      openButton.textContent = t("link.menu.open");
      copyButton.textContent = t("link.menu.copy");
      menu.hidden = false;
      positionMenu(event.clientX, event.clientY);
      openButton.focus();
    };
    const onMouseOver = (event) => {
      const anchor = anchorFromEventTarget(event.target);
      const url = externalUrlFromAnchor(anchor);
      if (anchor === null || url === void 0) return;
      markedAnchors.add(anchor);
      anchor.classList.add("dpw-desktop-external-link");
      if (!anchor.hasAttribute("title")) {
        anchor.title = url;
        anchor.dataset.yourbuddyExternalLinkTitle = "true";
      }
    };
    const onDocumentPointer = (event) => {
      if (!menu.hidden && event.target instanceof Node && !menu.contains(event.target)) hideMenu();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") hideMenu();
    };
    const onOpen = () => {
      const url = selectedUrl;
      const bounds = menu.getBoundingClientRect();
      hideMenu();
      if (url !== void 0) openUrl(url, bounds.left, bounds.top);
    };
    const onCopy = () => {
      const url = selectedUrl;
      const bounds = menu.getBoundingClientRect();
      if (url === void 0) return;
      void copyLinkAddress(url).then(
        () => {
          showStatus(t("link.copy.done"), bounds.left, bounds.top);
        },
        () => {
          showStatus(t("link.error.copy"), bounds.left, bounds.top);
        }
      );
    };
    document.addEventListener("click", onClick);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("pointerdown", onDocumentPointer);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", hideMenu);
    window.addEventListener("resize", hideMenu);
    window.addEventListener("scroll", hideMenu, true);
    openButton.addEventListener("click", onOpen);
    copyButton.addEventListener("click", onCopy);
    return () => {
      hideMenu();
      document.removeEventListener("click", onClick);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("pointerdown", onDocumentPointer);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", hideMenu);
      window.removeEventListener("resize", hideMenu);
      window.removeEventListener("scroll", hideMenu, true);
      openButton.removeEventListener("click", onOpen);
      copyButton.removeEventListener("click", onCopy);
      markedAnchors.forEach((anchor) => {
        anchor.classList.remove("dpw-desktop-external-link");
        if (anchor.dataset.yourbuddyExternalLinkTitle === "true") {
          anchor.removeAttribute("title");
          delete anchor.dataset.yourbuddyExternalLinkTitle;
        }
      });
      menu.remove();
    };
  }, "personal-workbench: desktop external links");
}

// src/client/help-links.ts
var HELP_SITE_URL = "https://istarwyh.github.io/yourbuddy/";
var HELP_ROUTES = {
  start: "docs/start/",
  plugins: "plugins/",
  develop: "docs/develop/",
  troubleshooting: "docs/troubleshooting/",
  feedback: "https://github.com/istarwyh/yourbuddy/issues",
  settings: "docs/settings/"
};
function helpUrl(destination, locale) {
  const route = HELP_ROUTES[destination];
  const prefix = /^zh(?:-|$)/i.test(locale) ? "" : "en/";
  return new URL(route, `${HELP_SITE_URL}${prefix}`).href;
}
async function openHelpUrl(value) {
  const url = resolveDesktopExternalHttpUrl(value, window.location.origin);
  if (url === void 0) throw new Error("invalid-help-url");
  if (window.parent !== window) {
    await requestDesktopExternalLinkOpen(url);
    return;
  }
  const opened = window.open("about:blank", "_blank");
  if (opened === null) throw new Error("browser-popup-blocked");
  opened.opener = null;
  opened.location.replace(url);
}

// ../../app-icon.svg
var app_icon_default = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">%0A  <defs>%0A    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">%0A      <stop offset="0" stop-color="%23111827"/>%0A      <stop offset="1" stop-color="%232563eb"/>%0A    </linearGradient>%0A  </defs>%0A  <rect width="1024" height="1024" rx="220" fill="url(%23bg)"/>%0A  <path d="M164 286h116l88 160 88-160h116L420 548v190H316V548L164 286Z" fill="%23f8fafc"/>%0A  <path d="M712 286c98 0 154 45 154 115 0 43-23 76-62 96 48 21 74 59 74 110 0 82-60 131-166 131S546 689 546 607c0-51 26-89 74-110-39-20-62-53-62-96 0-70 56-115 154-115Z M712 365c-40 0-61 17-61 43s21 43 61 43 61-17 61-43-21-43-61-43Z M712 532c-45 0-70 21-70 59s25 59 70 59 70-21 70-59-25-59-70-59Z" fill="%23bfdbfe" fill-rule="evenodd"/>%0A</svg>%0A';

// src/client/BrandSettingsRow.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error("file-read-failed"));
    };
    reader.onload = () => {
      typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("file-read-failed"));
    };
    reader.readAsDataURL(file);
  });
}
function BrandSettingsRow({ scope, readLocale, t }) {
  const snapshot = (0, import_react.useSyncExternalStore)(
    (listener) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot()
  );
  const persisted = snapshot.value;
  const [name, setName] = (0, import_react.useState)("");
  const [logo, setLogo] = (0, import_react.useState)("");
  const [status, setStatus] = (0, import_react.useState)("idle");
  const [errorKey, setErrorKey] = (0, import_react.useState)();
  (0, import_react.useEffect)(() => {
    if (persisted === void 0) return;
    setName(persisted.enabled ? persisted.name : "");
    setLogo(persisted.enabled ? persisted.logo : "");
  }, [persisted]);
  const displayName = normalizeWorkbenchName(name) ?? "YourBuddy";
  const displayLogo = normalizeLogoSource(logo) ?? app_icon_default;
  const writable = snapshot.writable;
  const busy = status === "saving";
  const chooseLogo = async (file) => {
    if (file === void 0) return;
    try {
      const dataUrl = await readDataUrl(file);
      setLogo(dataUrl);
      setErrorKey(void 0);
      setStatus("idle");
    } catch {
      setErrorKey("error.read");
    }
  };
  const save = async () => {
    const normalizedName = normalizeWorkbenchName(name);
    if (normalizedName === void 0) {
      setErrorKey("error.name");
      return;
    }
    setStatus("saving");
    setErrorKey(void 0);
    try {
      await scope.set("name", normalizedName);
      await scope.set("logo", normalizeLogoSource(logo) ?? "");
      await scope.set("enabled", true);
      setStatus("saved");
    } catch {
      setStatus("error");
      setErrorKey("error.save");
    }
  };
  const reset = async () => {
    setStatus("saving");
    setErrorKey(void 0);
    try {
      await scope.set("enabled", false);
      await scope.unset("name");
      await scope.unset("logo");
      setName("");
      setLogo("");
      setStatus("reset");
    } catch {
      setStatus("error");
      setErrorKey("error.save");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "dpw-card", "aria-labelledby": "dpw-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dpw-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { id: "dpw-title", className: "dpw-title", children: t("title") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dpw-description", children: t("description") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dpw-preview", "aria-label": t("preview"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dpw-preview-mark", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("img", { src: displayLogo, alt: "" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dpw-preview-copy", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dpw-preview-label", children: t("preview") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dpw-preview-name", children: displayName })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dpw-fields", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "dpw-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dpw-label", children: t("name.label") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "input",
          {
            className: "dpw-input",
            value: name,
            placeholder: t("name.placeholder"),
            disabled: !writable || busy,
            onChange: (event) => {
              setName(event.currentTarget.value);
              setStatus("idle");
              setErrorKey(void 0);
            }
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dpw-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dpw-label", children: t("logo.label") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dpw-upload-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "dpw-button", children: [
            logo === "" ? t("logo.choose") : t("logo.replace"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                className: "dpw-file",
                type: "file",
                accept: "image/*",
                disabled: !writable || busy,
                onChange: (event) => {
                  void chooseLogo(event.currentTarget.files?.[0]);
                }
              }
            )
          ] }),
          logo !== "" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "dpw-button",
              disabled: !writable || busy,
              onClick: () => {
                setLogo("");
                setStatus("idle");
                setErrorKey(void 0);
              },
              children: t("logo.remove")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dpw-hint", children: t("logo.hint") })
      ] })
    ] }),
    errorKey !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dpw-error", role: "alert", children: t(errorKey) }),
    !writable && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dpw-status", children: t("status.readonly") }),
    (status === "saved" || status === "reset") && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dpw-status dpw-success", role: "status", children: t(status === "saved" ? "saved" : "reset.done") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dpw-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "dpw-button dpw-button-primary",
          disabled: !writable || busy,
          onClick: () => {
            void save();
          },
          children: t("save")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "dpw-button",
          disabled: !writable || busy,
          onClick: () => {
            void reset();
          },
          children: t("reset")
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { className: "dpw-hint", href: helpUrl("settings", readLocale()), target: "_blank", rel: "noopener noreferrer", children: t("help.settings") })
  ] });
}

// src/client/ApplicationLifecycleRow.tsx
var import_react2 = require("react");

// src/client/desktop-lifecycle.ts
var DESKTOP_LIFECYCLE_CHANNEL = "yourbuddy.desktop.lifecycle";
var DESKTOP_LIFECYCLE_VERSION = 1;
var REQUEST_ID_PATTERN2 = /^[A-Za-z0-9_-]{1,64}$/;
var DEFAULT_HANDSHAKE_TIMEOUT_MS = 5e3;
function createRequestId2() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function isDesktopLifecycleAvailable(target = typeof window === "undefined" ? void 0 : window) {
  return target !== void 0 && target.parent !== target;
}
function readDesktopLifecycleResponse(value, requestId, action) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
  const response = value;
  if (response.channel !== DESKTOP_LIFECYCLE_CHANNEL || response.version !== DESKTOP_LIFECYCLE_VERSION || response.requestId !== requestId) return void 0;
  if (response.type === `${action}-accepted`) {
    return Object.keys(response).sort().join(",") === "channel,requestId,type,version" ? response : void 0;
  }
  if (response.type !== `${action}-response` || typeof response.ok !== "boolean") return void 0;
  const expectedKeys = response.ok ? "channel,message,ok,requestId,type,version" : "channel,error,ok,requestId,type,version";
  if (Object.keys(response).sort().join(",") !== expectedKeys) return void 0;
  if (response.ok) {
    if (typeof response.message !== "string" || response.message.length > 2048) return void 0;
  } else if (typeof response.error !== "string" || response.error.length > 2048) {
    return void 0;
  }
  return response;
}
function requestDesktopLifecycle(action, options = {}) {
  const target = options.target ?? window;
  if (!isDesktopLifecycleAvailable(target)) {
    return Promise.reject(new Error("desktop-shell-unavailable"));
  }
  const requestId = options.requestId ?? createRequestId2();
  if (!REQUEST_ID_PATTERN2.test(requestId)) {
    return Promise.reject(new Error("desktop-lifecycle-request-id-invalid"));
  }
  return new Promise((resolve, reject) => {
    const parent = target.parent;
    let handshakeTimeout;
    const onMessage = (event) => {
      if (event.source !== parent) return;
      const response = readDesktopLifecycleResponse(event.data, requestId, action);
      if (response === void 0) return;
      if (response.type === `${action}-accepted`) {
        if (handshakeTimeout !== void 0) target.clearTimeout(handshakeTimeout);
        handshakeTimeout = void 0;
        return;
      }
      const result = response;
      cleanup();
      if (result.ok) resolve(result.message ?? "");
      else reject(new Error(result.error ?? `desktop-${action}-failed`));
    };
    handshakeTimeout = target.setTimeout(() => {
      cleanup();
      reject(new Error("desktop-shell-unavailable"));
    }, options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS);
    const cleanup = () => {
      if (handshakeTimeout !== void 0) target.clearTimeout(handshakeTimeout);
      handshakeTimeout = void 0;
      target.removeEventListener("message", onMessage);
    };
    target.addEventListener("message", onMessage);
    parent.postMessage({
      channel: DESKTOP_LIFECYCLE_CHANNEL,
      version: DESKTOP_LIFECYCLE_VERSION,
      type: `${action}-request`,
      requestId
    }, "*");
  });
}
function requestDesktopUpdate(options = {}) {
  return requestDesktopLifecycle("check-update", options);
}
function requestDesktopRestart(options = {}) {
  return requestDesktopLifecycle("restart", options);
}

// src/client/ApplicationLifecycleRow.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function ApplicationLifecycleRow({ t }) {
  const [available] = (0, import_react2.useState)(() => isDesktopLifecycleAvailable());
  const [status, setStatus] = (0, import_react2.useState)("idle");
  const [detail, setDetail] = (0, import_react2.useState)("");
  const check = async () => {
    setStatus("checking");
    setDetail("");
    try {
      setDetail(await requestDesktopUpdate());
      setStatus("update-result");
    } catch (error) {
      setDetail(error instanceof Error ? error.message : String(error));
      setStatus("update-error");
    }
  };
  const restart = async () => {
    setStatus("restarting");
    setDetail("");
    try {
      await requestDesktopRestart();
    } catch (error) {
      setDetail(error instanceof Error ? error.message : String(error));
      setStatus("restart-error");
    }
  };
  const busy = status === "checking" || status === "restarting";
  const shellUnavailable = detail === "desktop-shell-unavailable";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "dpw-card", "aria-labelledby": "dpw-lifecycle-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dpw-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { id: "dpw-lifecycle-title", className: "dpw-title", children: t("lifecycle.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dpw-description", children: t("lifecycle.description") })
    ] }),
    !available && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dpw-status", children: t("lifecycle.desktop-only") }),
    status === "checking" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dpw-status", role: "status", children: t("lifecycle.update.checking") }),
    status === "restarting" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dpw-status", role: "status", children: t("lifecycle.restart.restarting") }),
    status === "update-result" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dpw-status dpw-success", role: "status", children: detail }),
    (status === "update-error" || status === "restart-error") && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dpw-error", role: "alert", children: [
      t(shellUnavailable ? "lifecycle.shell-unavailable" : status === "update-error" ? "lifecycle.update.error" : "lifecycle.restart.error"),
      shellUnavailable ? "" : ` ${detail}`
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dpw-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          className: "dpw-button dpw-button-primary",
          disabled: !available || busy,
          onClick: () => {
            void check();
          },
          children: t(status === "checking" ? "lifecycle.update.checking-action" : "lifecycle.update.action")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          className: "dpw-button",
          disabled: !available || busy,
          onClick: () => {
            void restart();
          },
          children: t(status === "restarting" ? "lifecycle.restart.restarting-action" : "lifecycle.restart.action")
        }
      )
    ] })
  ] });
}

// src/client/NetworkProxyRow.tsx
var import_react3 = require("react");

// src/client/desktop-network-proxy.ts
var DESKTOP_NETWORK_PROXY_CHANNEL = "yourbuddy.desktop.network-proxy";
var DESKTOP_NETWORK_PROXY_VERSION = 3;
var REQUEST_ID_PATTERN3 = /^[A-Za-z0-9_-]{1,64}$/;
var DEFAULT_HANDSHAKE_TIMEOUT_MS2 = 5e3;
var MAX_PROXY_URL_LENGTH = 2048;
var MAX_NO_PROXY_LENGTH = 4096;
var MAX_CA_CERTIFICATE_PATH_LENGTH = 4096;
function createRequestId3() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function isDesktopNetworkProxyAvailable(target = typeof window === "undefined" ? void 0 : window) {
  return target !== void 0 && target.parent !== target;
}
function hasExactKeys(value, expected) {
  return Object.keys(value).sort().join(",") === expected;
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function readNetworkProxySettings(value) {
  if (!isRecord(value) || !hasExactKeys(value, "caCertificatePath,httpProxy,httpsProxy,mode,noProxy") || !["direct", "system", "custom"].includes(String(value.mode)) || typeof value.httpProxy !== "string" || value.httpProxy.length > MAX_PROXY_URL_LENGTH || typeof value.httpsProxy !== "string" || value.httpsProxy.length > MAX_PROXY_URL_LENGTH || typeof value.noProxy !== "string" || value.noProxy.length > MAX_NO_PROXY_LENGTH || typeof value.caCertificatePath !== "string" || value.caCertificatePath.length > MAX_CA_CERTIFICATE_PATH_LENGTH) return void 0;
  return value;
}
function readEffectiveProxy(value) {
  return readNetworkProxySettings(value);
}
function readSystemProxy(value) {
  if (!isRecord(value) || !hasExactKeys(
    value,
    "autoConfigUrl,configured,error,httpProxy,httpsProxy,noProxy,supported"
  ) || typeof value.supported !== "boolean" || typeof value.configured !== "boolean" || typeof value.httpProxy !== "string" || value.httpProxy.length > MAX_PROXY_URL_LENGTH || typeof value.httpsProxy !== "string" || value.httpsProxy.length > MAX_PROXY_URL_LENGTH || typeof value.noProxy !== "string" || value.noProxy.length > MAX_NO_PROXY_LENGTH || typeof value.autoConfigUrl !== "string" || value.autoConfigUrl.length > MAX_PROXY_URL_LENGTH || typeof value.error !== "string" || value.error.length > MAX_PROXY_URL_LENGTH) return void 0;
  return value;
}
function readSnapshot(value) {
  if (!isRecord(value)) return void 0;
  const keys = Object.keys(value).sort().join(",");
  if (keys !== "effective,effectiveError,settings,system" && keys !== "effectiveError,settings,system") return void 0;
  const settings = readNetworkProxySettings(value.settings);
  const system = readSystemProxy(value.system);
  if (settings === void 0 || system === void 0 || typeof value.effectiveError !== "string" || value.effectiveError.length > MAX_PROXY_URL_LENGTH) return void 0;
  const effective = value.effective === void 0 ? void 0 : readEffectiveProxy(value.effective);
  if (value.effective !== void 0 && effective === void 0) return void 0;
  return {
    settings,
    system,
    ...effective === void 0 ? {} : { effective },
    effectiveError: value.effectiveError
  };
}
function readTestResult(value) {
  if (!isRecord(value) || !hasExactKeys(value, "caSource,errorCode,ok,proxied,proxyMode,status") || typeof value.ok !== "boolean" || typeof value.proxied !== "boolean" || !Number.isSafeInteger(value.status) || Number(value.status) < 0 || Number(value.status) > 599 || typeof value.errorCode !== "string" || !/^[A-Z0-9_]{0,64}$/.test(value.errorCode) || !["direct", "system", "custom", "unknown"].includes(String(value.proxyMode)) || !["system", "custom", "unknown"].includes(String(value.caSource)) || value.ok && (Number(value.status) < 100 || value.errorCode !== "") || !value.ok && value.errorCode === "") return void 0;
  return value;
}
function readDesktopNetworkProxyResponse(value, requestId, action) {
  if (!isRecord(value) || value.channel !== DESKTOP_NETWORK_PROXY_CHANNEL || value.version !== DESKTOP_NETWORK_PROXY_VERSION || value.requestId !== requestId) return void 0;
  if (value.type === `${action}-accepted`) {
    return hasExactKeys(value, "channel,requestId,type,version") ? value : void 0;
  }
  if (value.type !== `${action}-response` || typeof value.ok !== "boolean") return void 0;
  if (value.ok) {
    if (!hasExactKeys(value, "channel,ok,requestId,type,value,version")) return void 0;
    if (action === "select-ca") {
      if (value.value !== null && (typeof value.value !== "string" || value.value.length === 0 || value.value.length > MAX_CA_CERTIFICATE_PATH_LENGTH)) return void 0;
    } else {
      const parsed = action === "test" ? readTestResult(value.value) : readSnapshot(value.value);
      if (parsed === void 0) return void 0;
    }
  } else if (!hasExactKeys(value, "channel,error,ok,requestId,type,version") || typeof value.error !== "string" || value.error.length > MAX_PROXY_URL_LENGTH) return void 0;
  return value;
}
function requestDesktopNetworkProxy(action, settings, options) {
  const target = options.target ?? window;
  if (!isDesktopNetworkProxyAvailable(target)) {
    return Promise.reject(new Error("desktop-shell-unavailable"));
  }
  const requestId = options.requestId ?? createRequestId3();
  if (!REQUEST_ID_PATTERN3.test(requestId)) {
    return Promise.reject(new Error("desktop-network-proxy-request-id-invalid"));
  }
  if (!["get", "select-ca"].includes(action) && readNetworkProxySettings(settings) === void 0) {
    return Promise.reject(new Error("desktop-network-proxy-settings-invalid"));
  }
  return new Promise((resolve, reject) => {
    const parent = target.parent;
    let handshakeTimeout;
    const cleanup = () => {
      if (handshakeTimeout !== void 0) target.clearTimeout(handshakeTimeout);
      handshakeTimeout = void 0;
      target.removeEventListener("message", onMessage);
    };
    const onMessage = (event) => {
      if (event.source !== parent) return;
      const response = readDesktopNetworkProxyResponse(event.data, requestId, action);
      if (response === void 0) return;
      if (response.type === `${action}-accepted`) {
        if (handshakeTimeout !== void 0) target.clearTimeout(handshakeTimeout);
        handshakeTimeout = void 0;
        return;
      }
      cleanup();
      const result = response;
      if (result.ok && result.value !== void 0) resolve(result.value);
      else reject(new Error(result.error ?? `desktop-network-proxy-${action}-failed`));
    };
    handshakeTimeout = target.setTimeout(() => {
      cleanup();
      reject(new Error("desktop-shell-unavailable"));
    }, options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS2);
    target.addEventListener("message", onMessage);
    parent.postMessage({
      channel: DESKTOP_NETWORK_PROXY_CHANNEL,
      version: DESKTOP_NETWORK_PROXY_VERSION,
      type: `${action}-request`,
      requestId,
      ...settings === void 0 ? {} : { settings }
    }, "*");
  });
}
async function requestDesktopNetworkProxySnapshot(options = {}) {
  return await requestDesktopNetworkProxy("get", void 0, options);
}
async function requestDesktopNetworkProxyTest(settings, options = {}) {
  return await requestDesktopNetworkProxy("test", settings, options);
}
async function requestDesktopNetworkProxySave(settings, options = {}) {
  return await requestDesktopNetworkProxy("save", settings, options);
}
async function requestDesktopCaCertificateSelection(options = {}) {
  const value = await requestDesktopNetworkProxy("select-ca", void 0, options);
  return value === null ? void 0 : value;
}

// src/client/host-network-proxy.ts
var HOST_NETWORK_PROXY_TEST_PATH = "/api/yourbuddy/network-proxy/test";
function hasExactKeys2(value, expected) {
  return Object.keys(value).sort().join(",") === expected;
}
function readResult(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return void 0;
  const result = value;
  if (!hasExactKeys2(result, "caSource,errorCode,ok,proxied,proxyMode,status") || typeof result.ok !== "boolean" || typeof result.status !== "number" || !Number.isInteger(result.status) || result.status < 0 || result.status > 599 || typeof result.proxied !== "boolean" || typeof result.errorCode !== "string" || !["direct", "system", "custom", "unknown"].includes(String(result.proxyMode)) || !["system", "custom", "unknown"].includes(String(result.caSource)) || result.errorCode.length > 64) return void 0;
  return result;
}
async function requestHostNetworkProxyTest(fetcher = globalThis.fetch) {
  const response = await fetcher(HOST_NETWORK_PROXY_TEST_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  const result = readResult(await response.json());
  if (result === void 0) throw new Error("host-network-proxy-response-invalid");
  return result;
}

// src/client/NetworkProxyRow.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var EMPTY_SETTINGS = {
  mode: "direct",
  httpProxy: "",
  httpsProxy: "",
  noProxy: "",
  caCertificatePath: ""
};
function NetworkProxyRow({ t }) {
  const [available] = (0, import_react3.useState)(() => isDesktopNetworkProxyAvailable());
  const [snapshot, setSnapshot] = (0, import_react3.useState)(null);
  const [draft, setDraft] = (0, import_react3.useState)(EMPTY_SETTINGS);
  const [status, setStatus] = (0, import_react3.useState)(available ? "loading" : "idle");
  const [detail, setDetail] = (0, import_react3.useState)("");
  (0, import_react3.useEffect)(() => {
    if (!available) return;
    let active = true;
    void requestDesktopNetworkProxySnapshot().then((value) => {
      if (!active) return;
      setSnapshot(value);
      setDraft(value.settings);
      setStatus("idle");
    }).catch((error) => {
      if (!active) return;
      setDetail(errorMessage(error));
      setStatus("error");
    });
    return () => {
      active = false;
    };
  }, [available]);
  const refresh = async () => {
    setStatus("refreshing");
    setDetail("");
    try {
      setSnapshot(await requestDesktopNetworkProxySnapshot());
      setStatus("idle");
    } catch (error) {
      setDetail(errorMessage(error));
      setStatus("error");
    }
  };
  const test = async () => {
    setStatus("testing");
    setDetail("");
    try {
      const [native, host] = await Promise.all([
        requestDesktopNetworkProxyTest(draft),
        requestHostNetworkProxyTest()
      ]);
      const pending = native.proxyMode === host.proxyMode && native.caSource === host.caSource ? "" : ` ${t("proxy.test.pending-restart")}`;
      const certificateHint = [native.errorCode, host.errorCode].some(isCertificateErrorCode) ? ` ${t("proxy.test.certificate-hint")}` : "";
      setDetail(t("proxy.test.result").replace("{native}", describeTestResult(native, t)).replace("{host}", describeTestResult(host, t)) + pending + certificateHint);
      setStatus(native.ok && host.ok ? "tested" : "test-failed");
    } catch (error) {
      setDetail(errorMessage(error));
      setStatus("error");
    }
  };
  const saveAndRestart = async () => {
    setStatus("saving");
    setDetail("");
    try {
      const saved = await requestDesktopNetworkProxySave(draft);
      setSnapshot(saved);
      setStatus("restarting");
      await requestDesktopRestart();
    } catch (error) {
      setDetail(errorMessage(error));
      setStatus("error");
    }
  };
  const selectCaCertificate = async () => {
    setStatus("selecting-ca");
    setDetail("");
    try {
      const path = await requestDesktopCaCertificateSelection();
      if (path !== void 0) setDraft((value) => ({ ...value, caCertificatePath: path }));
      setStatus("idle");
    } catch (error) {
      setDetail(errorMessage(error));
      setStatus("error");
    }
  };
  const busy = ["loading", "refreshing", "selecting-ca", "testing", "saving", "restarting"].includes(status);
  const systemBlocked = draft.mode === "system" && snapshot?.system.supported === false;
  const setField = (field) => (event) => {
    setDraft((value) => ({ ...value, [field]: event.target.value }));
    setStatus("idle");
    setDetail("");
  };
  const setMode = (event) => {
    setDraft((value) => ({ ...value, mode: event.target.value }));
    setStatus("idle");
    setDetail("");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "dpw-card", "aria-labelledby": "dpw-network-proxy-title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dpw-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { id: "dpw-network-proxy-title", className: "dpw-title", children: t("proxy.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-description", children: t("proxy.description") })
    ] }),
    !available && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-status", children: t("proxy.desktop-only") }),
    available && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dpw-fields", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dpw-field dpw-field-wide", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dpw-label", children: t("proxy.mode.label") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "select",
          {
            className: "dpw-input",
            value: draft.mode,
            disabled: busy,
            "aria-label": t("proxy.mode.label"),
            onChange: setMode,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "system", children: t("proxy.mode.system") }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "custom", children: t("proxy.mode.custom") }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: "direct", children: t("proxy.mode.direct") })
            ]
          }
        )
      ] }),
      draft.mode === "system" && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dpw-proxy-panel dpw-field-wide", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-label", children: t("proxy.system.detected") }),
        snapshot?.system.supported === true && snapshot.system.configured && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dpw-code", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            "HTTP_PROXY=",
            snapshot.system.httpProxy || t("proxy.value.direct")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            "HTTPS_PROXY=",
            snapshot.system.httpsProxy || t("proxy.value.direct")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            "NO_PROXY=",
            snapshot.system.noProxy
          ] })
        ] }),
        snapshot?.system.supported === true && !snapshot.system.configured && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-hint", children: t("proxy.system.none") }),
        snapshot?.system.supported === false && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-error", children: localizedProxyError(snapshot.system.error, t) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dpw-button", disabled: busy, onClick: () => {
          void refresh();
        }, children: status === "refreshing" ? t("proxy.system.refreshing") : t("proxy.system.refresh") })
      ] }),
      draft.mode === "custom" && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dpw-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dpw-label", children: t("proxy.http.label") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "input",
            {
              className: "dpw-input",
              value: draft.httpProxy,
              disabled: busy,
              placeholder: "http://127.0.0.1:7890",
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: false,
              onChange: setField("httpProxy")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dpw-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dpw-label", children: t("proxy.https.label") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "input",
            {
              className: "dpw-input",
              value: draft.httpsProxy,
              disabled: busy,
              placeholder: "http://127.0.0.1:7890",
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: false,
              onChange: setField("httpsProxy")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "dpw-field dpw-field-wide", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dpw-label", children: t("proxy.no-proxy.label") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "input",
            {
              className: "dpw-input",
              value: draft.noProxy,
              disabled: busy,
              placeholder: "localhost,127.0.0.1,*.local",
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: false,
              onChange: setField("noProxy")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dpw-hint", children: t("proxy.custom.hint") })
        ] })
      ] }),
      draft.mode === "direct" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-hint dpw-field-wide", children: t("proxy.direct.hint") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dpw-proxy-panel dpw-field-wide", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-label", children: t("proxy.ca.label") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-code dpw-ca-path", children: draft.caCertificatePath || t("proxy.ca.system-only") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-hint", children: t("proxy.ca.hint") }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dpw-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "button",
            {
              type: "button",
              className: "dpw-button",
              disabled: busy,
              onClick: () => {
                void selectCaCertificate();
              },
              children: status === "selecting-ca" ? t("proxy.ca.selecting") : t("proxy.ca.select")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "button",
            {
              type: "button",
              className: "dpw-button",
              disabled: busy || draft.caCertificatePath === "",
              onClick: () => {
                setDraft((value) => ({ ...value, caCertificatePath: "" }));
                setStatus("idle");
                setDetail("");
              },
              children: t("proxy.ca.remove")
            }
          )
        ] })
      ] })
    ] }),
    status === "loading" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-status", role: "status", children: t("proxy.loading") }),
    status === "testing" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-status", role: "status", children: t("proxy.test.testing") }),
    status === "tested" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-status dpw-success", role: "status", children: detail }),
    status === "test-failed" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-error", role: "alert", children: detail }),
    status === "saving" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-status", role: "status", children: t("proxy.save.saving") }),
    status === "restarting" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-status", role: "status", children: t("proxy.save.restarting") }),
    status === "error" && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dpw-error", role: "alert", children: localizedProxyError(detail, t) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dpw-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          className: "dpw-button",
          disabled: !available || busy || systemBlocked,
          onClick: () => {
            void test();
          },
          children: status === "testing" ? t("proxy.test.testing-action") : t("proxy.test.action")
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          className: "dpw-button dpw-button-primary",
          disabled: !available || busy || systemBlocked,
          onClick: () => {
            void saveAndRestart();
          },
          children: status === "saving" || status === "restarting" ? t("proxy.save.restarting-action") : t("proxy.save.action")
        }
      )
    ] })
  ] });
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function describeTestResult(result, t) {
  const outcome = result.ok ? t("proxy.test.outcome.http").replace("{status}", String(result.status)) : t("proxy.test.outcome.error").replace("{code}", result.errorCode);
  const routeKeys = {
    direct: "proxy.test.mode.direct",
    system: "proxy.test.mode.system",
    custom: "proxy.test.mode.custom",
    unknown: "proxy.test.mode.unknown"
  };
  const caKeys = {
    system: "proxy.test.ca.system",
    custom: "proxy.test.ca.custom",
    unknown: "proxy.test.ca.unknown"
  };
  const route = t(routeKeys[result.proxyMode]);
  const caSource = t(caKeys[result.caSource]);
  return t("proxy.test.outcome.routed").replace("{outcome}", outcome).replace("{route}", route).replace("{ca}", caSource);
}
function isCertificateErrorCode(code) {
  return code.includes("CERT") || code.includes("ISSUER") || code.includes("SIGNATURE") || code.includes("VERIFY");
}
function localizedProxyError(error, t) {
  if (error === "desktop-shell-unavailable") return t("proxy.shell-unavailable");
  if (error.includes("network-proxy-system-auto-config-unsupported")) return t("proxy.error.pac");
  if (error.includes("network-proxy-system-http-only-unsupported")) return t("proxy.error.http-only");
  if (error.includes("network-proxy-system-unsupported-platform")) return t("proxy.error.platform");
  if (error.includes("network-proxy-custom-http-and-https-required")) return t("proxy.error.required");
  if (error.includes("network-proxy-scheme-unsupported")) return t("proxy.error.scheme");
  if (error.includes("network-proxy-url-invalid")) return t("proxy.error.url");
  if (error.includes("network-proxy-no-proxy-invalid")) return t("proxy.error.no-proxy");
  if (error.includes("network-proxy-ca-path")) return t("proxy.error.ca-path");
  if (error.includes("network-proxy-ca-file-missing")) return t("proxy.error.ca-missing");
  if (error.includes("network-proxy-ca-extension")) return t("proxy.error.ca-extension");
  if (error.includes("network-proxy-ca-file-size") || error.includes("network-proxy-ca-file-not-regular")) return t("proxy.error.ca-size");
  if (error.includes("network-proxy-ca-pem") || error.includes("network-proxy-ca-file-unreadable")) return t("proxy.error.ca-pem");
  if (error.includes("host-network-proxy-response-invalid")) return t("proxy.error.host-response");
  if (error.includes("network-proxy-test")) return t("proxy.error.test");
  return `${t("proxy.error.generic")} ${error}`;
}

// src/client/HelpMenu.tsx
var import_react4 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
var DESTINATIONS = ["start", "plugins", "develop", "troubleshooting", "feedback"];
function HelpMenu({ wide, readLocale, t }) {
  const [position, setPosition] = (0, import_react4.useState)();
  const [failedUrl, setFailedUrl] = (0, import_react4.useState)("");
  const [busy, setBusy] = (0, import_react4.useState)(false);
  const [copyStatus, setCopyStatus] = (0, import_react4.useState)("idle");
  const root = (0, import_react4.useRef)(null);
  const trigger = (0, import_react4.useRef)(null);
  const firstItem = (0, import_react4.useRef)(null);
  const attempt = (0, import_react4.useRef)(0);
  const id = (0, import_react4.useId)();
  const open = position !== void 0;
  const close = (restoreFocus = true) => {
    attempt.current += 1;
    setPosition(void 0);
    setBusy(false);
    if (restoreFocus) trigger.current?.focus();
  };
  (0, import_react4.useEffect)(() => () => {
    attempt.current += 1;
  }, []);
  (0, import_react4.useEffect)(() => {
    if (!open) return;
    firstItem.current?.focus();
    const outside = (event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) close(false);
    };
    const resize = () => {
      close();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const rect = trigger.current.getBoundingClientRect();
    setFailedUrl("");
    setCopyStatus("idle");
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)), bottom: Math.max(8, window.innerHeight - rect.top + 8) });
  };
  const visit = async (destination) => {
    const current = ++attempt.current;
    const url = helpUrl(destination, readLocale());
    setBusy(true);
    setFailedUrl("");
    setCopyStatus("idle");
    try {
      await openHelpUrl(url);
      if (attempt.current === current) close();
    } catch {
      if (attempt.current === current) setFailedUrl(url);
    } finally {
      if (attempt.current === current) setBusy(false);
    }
  };
  const copy = async () => {
    const current = attempt.current;
    try {
      await copyLinkAddress(failedUrl);
      if (attempt.current === current) setCopyStatus("done");
    } catch {
      if (attempt.current === current) setCopyStatus("error");
    }
  };
  const navigate = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (!(event.target instanceof HTMLButtonElement) || event.target.role !== "menuitem") return;
    const items = Array.from(root.current.querySelectorAll('[role="menuitem"]:not(:disabled)'));
    const index = items.indexOf(event.target);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (index + 1) % items.length : event.key === "ArrowUp" ? (index + items.length - 1) % items.length : void 0;
    if (next !== void 0) {
      event.preventDefault();
      items[next]?.focus();
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { ref: root, className: "dpw-help", onKeyDown: navigate, onBlur: (event) => {
    if (open && event.relatedTarget instanceof Node && !root.current?.contains(event.relatedTarget)) close(false);
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      "button",
      {
        ref: trigger,
        type: "button",
        className: "dpw-help-trigger",
        "aria-label": t("help.title"),
        title: t("help.title"),
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? id : void 0,
        onClick: toggle,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dpw-help-icon", "aria-hidden": "true", children: "?" }),
          wide && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: t("help.title") })
        ]
      }
    ),
    position !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dpw-help-panel", style: position, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { id, role: "menu", "aria-label": t("help.title"), "aria-busy": busy, children: DESTINATIONS.map((destination, index) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "button",
        {
          ref: index === 0 ? firstItem : void 0,
          type: "button",
          role: "menuitem",
          className: "dpw-link-menu-item",
          disabled: busy,
          onClick: () => {
            void visit(destination);
          },
          children: t(`help.${destination}`)
        },
        destination
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "dpw-hint", children: t("help.external") }),
      failedUrl !== "" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dpw-help-recovery", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "dpw-error", role: "alert", children: t("help.error") }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { className: "dpw-input", "aria-label": t("help.address"), value: failedUrl, readOnly: true, onFocus: (event) => event.currentTarget.select() }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "dpw-button", onClick: () => {
          void copy();
        }, children: t("link.menu.copy") }),
        copyStatus !== "idle" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { role: "status", className: "dpw-hint", children: t(copyStatus === "done" ? "link.copy.done" : "link.error.copy") })
      ] })
    ] })
  ] });
}

// src/client/locales.ts
var zh = {
  "help.title": "\u5E2E\u52A9\u4E0E\u6307\u5357",
  "help.settings": "\u67E5\u770B\u4F7F\u7528\u8BF4\u660E",
  "help.start": "\u5FEB\u901F\u5F00\u59CB",
  "help.plugins": "\u9ED8\u8BA4\u63D2\u4EF6",
  "help.develop": "\u6269\u5C55 Y8",
  "help.troubleshooting": "\u6545\u969C\u6392\u67E5",
  "help.feedback": "\u53CD\u9988\u95EE\u9898",
  "help.external": "\u4F7F\u7528\u6307\u5357\u5728\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00\u3002",
  "help.error": "\u65E0\u6CD5\u6253\u5F00\u6D4F\u89C8\u5668\uFF0C\u8BF7\u590D\u5236\u5730\u5740\u540E\u624B\u52A8\u6253\u5F00\u3002",
  "help.address": "\u5E2E\u52A9\u9875\u9762\u5730\u5740",
  "title": "\u6211\u7684\u5DE5\u4F5C\u53F0",
  "description": "\u8BBE\u7F6E\u4FA7\u8FB9\u680F\u540D\u79F0\u548C Logo\uFF0C\u6253\u9020\u5C5E\u4E8E\u4F60\u7684 Agent \u5DE5\u4F5C\u53F0\u3002",
  "preview": "\u5B9E\u65F6\u9884\u89C8",
  "name.label": "\u5DE5\u4F5C\u53F0\u540D\u79F0",
  "name.placeholder": "\u4F8B\u5982\uFF1A\u6211\u7684\u7814\u7A76\u5BA4",
  "logo.label": "\u5DE5\u4F5C\u53F0 Logo",
  "logo.choose": "\u9009\u62E9\u56FE\u7247",
  "logo.replace": "\u66F4\u6362\u56FE\u7247",
  "logo.remove": "\u79FB\u9664 Logo",
  "logo.hint": "\u9009\u62E9\u4E00\u5F20\u4F60\u559C\u6B22\u7684\u56FE\u7247\u3002",
  "save": "\u5E94\u7528\u5230\u5DE5\u4F5C\u53F0",
  "reset": "\u6062\u590D YourBuddy \u9ED8\u8BA4",
  "saved": "\u5DF2\u5E94\u7528",
  "reset.done": "\u5DF2\u6062\u590D\u9ED8\u8BA4",
  "status.readonly": "\u5F53\u524D Profile \u7684\u8BBE\u7F6E\u6587\u4EF6\u4E0D\u53EF\u5199\u3002",
  "error.name": "\u8BF7\u8F93\u5165\u5DE5\u4F5C\u53F0\u540D\u79F0\u3002",
  "error.read": "\u56FE\u7247\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002",
  "error.save": "\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8BBE\u7F6E\u6587\u4EF6\u540E\u91CD\u8BD5\u3002",
  "link.menu.open": "\u6253\u5F00\u94FE\u63A5",
  "link.menu.copy": "\u590D\u5236\u94FE\u63A5\u5730\u5740",
  "link.copy.done": "\u94FE\u63A5\u5730\u5740\u5DF2\u590D\u5236",
  "link.error.open": "\u65E0\u6CD5\u6253\u5F00\u94FE\u63A5\uFF1A",
  "link.error.copy": "\u65E0\u6CD5\u590D\u5236\u94FE\u63A5\u5730\u5740\u3002",
  "proxy.title": "\u7F51\u7EDC\u4EE3\u7406",
  "proxy.description": "\u4E3A YourBuddy\u3001\u79C1\u6709 Host\u3001\u63D2\u4EF6\u548C\u5E94\u7528\u66F4\u65B0\u7EDF\u4E00\u8BBE\u7F6E\u7F51\u7EDC\u4EE3\u7406\u3002\u4FDD\u5B58\u540E\u4F1A\u91CD\u542F\u5E94\u7528\u3002",
  "proxy.desktop-only": "\u8BF7\u5728 YourBuddy \u684C\u9762\u5E94\u7528\u4E2D\u914D\u7F6E\u7F51\u7EDC\u4EE3\u7406\u3002",
  "proxy.shell-unavailable": "\u684C\u9762\u7F51\u7EDC\u4EE3\u7406\u670D\u52A1\u672A\u54CD\u5E94\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00 YourBuddy \u540E\u91CD\u8BD5\u3002",
  "proxy.mode.label": "\u8FDE\u63A5\u65B9\u5F0F",
  "proxy.mode.system": "\u8DDF\u968F macOS \u7CFB\u7EDF\u4EE3\u7406",
  "proxy.mode.custom": "\u81EA\u5B9A\u4E49\u4EE3\u7406",
  "proxy.mode.direct": "\u76F4\u63A5\u8FDE\u63A5",
  "proxy.system.detected": "\u5F53\u524D\u7CFB\u7EDF\u4EE3\u7406",
  "proxy.system.none": "macOS \u5F53\u524D\u672A\u542F\u7528\u56FA\u5B9A HTTP/HTTPS \u4EE3\u7406\u3002",
  "proxy.system.refresh": "\u91CD\u65B0\u8BFB\u53D6\u7CFB\u7EDF\u4EE3\u7406",
  "proxy.system.refreshing": "\u6B63\u5728\u8BFB\u53D6\u2026",
  "proxy.value.direct": "\u76F4\u8FDE",
  "proxy.http.label": "HTTP \u4EE3\u7406",
  "proxy.https.label": "HTTPS \u4EE3\u7406",
  "proxy.no-proxy.label": "\u4E0D\u4F7F\u7528\u4EE3\u7406\u7684\u5730\u5740",
  "proxy.custom.hint": "\u9700\u8981\u540C\u65F6\u586B\u5199 HTTP \u4E0E HTTPS \u4EE3\u7406\u3002\u4EC5\u652F\u6301\u65E0\u8D26\u53F7\u5BC6\u7801\u7684 http:// \u6216 https:// \u5730\u5740\uFF1B\u672C\u673A Host \u5730\u5740\u59CB\u7EC8\u76F4\u8FDE\u3002",
  "proxy.direct.hint": "\u5FFD\u7565\u542F\u52A8\u73AF\u5883\u4E2D\u7684\u4EE3\u7406\u53D8\u91CF\uFF0C\u7531 YourBuddy \u76F4\u63A5\u8FDE\u63A5\u5916\u90E8\u7F51\u7EDC\u3002",
  "proxy.ca.label": "\u989D\u5916 CA \u8BC1\u4E66",
  "proxy.ca.system-only": "\u672A\u9009\u62E9\uFF08\u4EC5\u4F7F\u7528 macOS \u94A5\u5319\u4E32\u4E0E Node \u7CFB\u7EDF CA\uFF09",
  "proxy.ca.hint": "\u53EF\u9009\u62E9 PEM \u683C\u5F0F\u7684 .pem \u6216 .crt \u4F01\u4E1A\u6839\u8BC1\u4E66\u3002\u5B83\u4F1A\u8865\u5145\u7CFB\u7EDF\u4FE1\u4EFB\uFF0C\u5E76\u5728\u91CD\u542F\u524D\u663E\u5F0F\u4F20\u7ED9\u684C\u9762\u5BA2\u6237\u7AEF\u3001Node Host\u3001\u63D2\u4EF6\u4E0E\u5E94\u7528\u66F4\u65B0\uFF1B\u8BC1\u4E66\u6821\u9A8C\u59CB\u7EC8\u4FDD\u6301\u5F00\u542F\u3002",
  "proxy.ca.select": "\u9009\u62E9 .pem / .crt",
  "proxy.ca.selecting": "\u6B63\u5728\u9009\u62E9\u2026",
  "proxy.ca.remove": "\u79FB\u9664\u989D\u5916 CA",
  "proxy.loading": "\u6B63\u5728\u8BFB\u53D6\u7F51\u7EDC\u4EE3\u7406\u8BBE\u7F6E\u2026",
  "proxy.test.action": "\u6D4B\u8BD5 ChatGPT \u8FDE\u63A5",
  "proxy.test.testing-action": "\u6B63\u5728\u6D4B\u8BD5\u2026",
  "proxy.test.testing": "\u6B63\u5728\u5206\u522B\u6D4B\u8BD5\u5F53\u524D\u8349\u7A3F\u7684\u684C\u9762\u94FE\u8DEF\u4E0E\u6B63\u5728\u8FD0\u884C\u7684 Node Host\u2026",
  "proxy.test.result": "\u684C\u9762\u8349\u7A3F\uFF1A{native}\uFF1B\u5F53\u524D Node Host\uFF1A{host}\u3002",
  "proxy.test.outcome.http": "HTTP {status}",
  "proxy.test.outcome.error": "\u5931\u8D25\uFF1A{code}",
  "proxy.test.outcome.routed": "{outcome}\uFF08{route}\uFF1B{ca}\uFF09",
  "proxy.test.mode.direct": "\u76F4\u8FDE",
  "proxy.test.mode.system": "macOS \u7CFB\u7EDF\u4EE3\u7406",
  "proxy.test.mode.custom": "\u81EA\u5B9A\u4E49\u4EE3\u7406",
  "proxy.test.mode.unknown": "\u975E YourBuddy \u7BA1\u7406\u7684\u4EE3\u7406\u6A21\u5F0F",
  "proxy.test.ca.system": "\u7CFB\u7EDF CA",
  "proxy.test.ca.custom": "\u7CFB\u7EDF CA + \u81EA\u5B9A\u4E49 CA",
  "proxy.test.ca.unknown": "CA \u6765\u6E90\u672A\u77E5",
  "proxy.test.pending-restart": "Node Host \u7684\u4EE3\u7406\u6A21\u5F0F\u6216 CA \u6765\u6E90\u4ECD\u662F\u4E0A\u6B21\u542F\u52A8\u65F6\u7684\u8BBE\u7F6E\uFF1B\u4FDD\u5B58\u5E76\u91CD\u542F\u540E\u8BF7\u518D\u6B21\u6D4B\u8BD5\u3002",
  "proxy.test.certificate-hint": "\u68C0\u6D4B\u5230 TLS \u8BC1\u4E66\u4FE1\u4EFB\u9519\u8BEF\u3002\u8BF7\u786E\u8BA4\u4F01\u4E1A\u6839\u8BC1\u4E66\u5DF2\u5728 macOS \u94A5\u5319\u4E32\u4E2D\u53D7\u4FE1\u4EFB\uFF0C\u6216\u9009\u62E9\u5BF9\u5E94\u7684 PEM CA\uFF1BYourBuddy \u4E0D\u4F1A\u5173\u95ED\u8BC1\u4E66\u6821\u9A8C\u3002",
  "proxy.save.action": "\u4FDD\u5B58\u5E76\u91CD\u542F YourBuddy",
  "proxy.save.saving": "\u6B63\u5728\u4FDD\u5B58\u7F51\u7EDC\u4EE3\u7406\u8BBE\u7F6E\u2026",
  "proxy.save.restarting-action": "\u6B63\u5728\u91CD\u542F\u2026",
  "proxy.save.restarting": "\u8BBE\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u6B63\u5728\u505C\u6B62\u79C1\u6709 Host \u5E76\u91CD\u542F YourBuddy\u2026",
  "proxy.error.pac": "\u68C0\u6D4B\u5230 PAC \u6216\u81EA\u52A8\u4EE3\u7406\u53D1\u73B0\u3002\u5F53\u524D\u7248\u672C\u65E0\u6CD5\u628A\u52A8\u6001\u4EE3\u7406\u89C4\u5219\u8F6C\u6362\u7ED9 Node\uFF0C\u8BF7\u6539\u7528\u81EA\u5B9A\u4E49\u4EE3\u7406\u3002",
  "proxy.error.http-only": "\u7CFB\u7EDF\u53EA\u542F\u7528\u4E86 HTTP \u4EE3\u7406\uFF0C\u65E0\u6CD5\u5FE0\u5B9E\u5E94\u7528\u5230\u6240\u6709 Node \u8BF7\u6C42\uFF1B\u8BF7\u540C\u65F6\u542F\u7528 HTTPS \u4EE3\u7406\u6216\u6539\u7528\u81EA\u5B9A\u4E49\u4EE3\u7406\u3002",
  "proxy.error.platform": "\u5F53\u524D\u5E73\u53F0\u4E0D\u652F\u6301\u81EA\u52A8\u8BFB\u53D6\u7CFB\u7EDF\u4EE3\u7406\uFF0C\u8BF7\u4F7F\u7528\u81EA\u5B9A\u4E49\u4EE3\u7406\u3002",
  "proxy.error.required": "\u81EA\u5B9A\u4E49\u6A21\u5F0F\u9700\u8981\u540C\u65F6\u586B\u5199 HTTP \u4E0E HTTPS \u4EE3\u7406\u3002",
  "proxy.error.scheme": "\u4EE3\u7406\u5730\u5740\u4EC5\u652F\u6301 http:// \u6216 https://\u3002",
  "proxy.error.url": "\u4EE3\u7406\u5730\u5740\u65E0\u6548\uFF0C\u4E14\u4E0D\u80FD\u5305\u542B\u8D26\u53F7\u3001\u5BC6\u7801\u3001\u8DEF\u5F84\u3001\u67E5\u8BE2\u53C2\u6570\u6216\u7247\u6BB5\u3002",
  "proxy.error.no-proxy": "\u4E0D\u4F7F\u7528\u4EE3\u7406\u7684\u5730\u5740\u5217\u8868\u65E0\u6548\u3002",
  "proxy.error.ca-path": "CA \u8BC1\u4E66\u8DEF\u5F84\u65E0\u6548\uFF1B\u8BF7\u901A\u8FC7\u9009\u62E9\u6309\u94AE\u91CD\u65B0\u9009\u62E9\u3002",
  "proxy.error.ca-missing": "\u627E\u4E0D\u5230\u5DF2\u9009\u62E9\u7684 CA \u8BC1\u4E66\uFF1B\u8BF7\u91CD\u65B0\u9009\u62E9\u3002",
  "proxy.error.ca-extension": "CA \u8BC1\u4E66\u4EC5\u652F\u6301 .pem \u6216 .crt \u6587\u4EF6\u3002",
  "proxy.error.ca-size": "CA \u8BC1\u4E66\u5FC5\u987B\u662F 1 MiB \u4EE5\u5185\u7684\u975E\u7A7A\u666E\u901A\u6587\u4EF6\u3002",
  "proxy.error.ca-pem": ".pem \u6216 .crt \u6587\u4EF6\u5FC5\u987B\u5305\u542B PEM \u683C\u5F0F\u7684 CERTIFICATE \u533A\u5757\u3002",
  "proxy.error.test": "\u684C\u9762\u8FDE\u901A\u6027\u6D4B\u8BD5\u672A\u5B8C\u6210\uFF0C\u8BF7\u68C0\u67E5\u663E\u793A\u7684\u9519\u8BEF\u4FE1\u606F\u540E\u91CD\u8BD5\u3002",
  "proxy.error.host-response": "Node Host \u8FD4\u56DE\u4E86\u65E0\u6548\u7684\u4EE3\u7406\u8BCA\u65AD\u7ED3\u679C\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00 YourBuddy \u540E\u91CD\u8BD5\u3002",
  "proxy.error.generic": "\u7F51\u7EDC\u4EE3\u7406\u64CD\u4F5C\u5931\u8D25\uFF1A",
  "lifecycle.title": "\u5E94\u7528\u751F\u547D\u5468\u671F",
  "lifecycle.description": "\u7BA1\u7406 YourBuddy \u7684\u66F4\u65B0\u4E0E\u91CD\u542F\u3002\u91CD\u542F\u4F1A\u505C\u6B62\u5F53\u524D\u79C1\u6709 Host\uFF0C\u5E76\u5728\u91CD\u65B0\u6253\u5F00\u65F6\u52A0\u8F7D\u65B0\u5B89\u88C5\u7684\u63D2\u4EF6\u3002",
  "lifecycle.desktop-only": "\u8BF7\u5728 YourBuddy \u684C\u9762\u5E94\u7528\u4E2D\u4F7F\u7528\u8FD9\u4E9B\u529F\u80FD\u3002",
  "lifecycle.shell-unavailable": "\u684C\u9762\u751F\u547D\u5468\u671F\u670D\u52A1\u672A\u54CD\u5E94\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00 YourBuddy \u540E\u91CD\u8BD5\u3002",
  "lifecycle.update.action": "\u68C0\u67E5\u5E76\u66F4\u65B0",
  "lifecycle.update.checking-action": "\u6B63\u5728\u68C0\u67E5\u2026",
  "lifecycle.update.checking": "\u6B63\u5728\u68C0\u67E5\u66F4\u65B0\uFF1B\u5982\u6709\u65B0\u7248\u672C\uFF0C\u5C06\u81EA\u52A8\u4E0B\u8F7D\u5E76\u5B89\u88C5\u3002",
  "lifecycle.update.error": "\u68C0\u67E5\u66F4\u65B0\u5931\u8D25\uFF1A",
  "lifecycle.restart.action": "\u91CD\u542F YourBuddy",
  "lifecycle.restart.restarting-action": "\u6B63\u5728\u91CD\u542F\u2026",
  "lifecycle.restart.restarting": "\u6B63\u5728\u505C\u6B62\u79C1\u6709 Host \u5E76\u91CD\u542F YourBuddy\u2026",
  "lifecycle.restart.error": "\u91CD\u542F\u5931\u8D25\uFF1A"
};
var en = {
  "help.title": "Help and guides",
  "help.settings": "View usage guide",
  "help.start": "Getting started",
  "help.plugins": "Default plugins",
  "help.develop": "Extend Y8",
  "help.troubleshooting": "Troubleshooting",
  "help.feedback": "Report a problem",
  "help.external": "Guides open in your browser.",
  "help.error": "Could not open the browser. Copy the address and open it manually.",
  "help.address": "Help page address",
  "title": "My Workbench",
  "description": "Choose a sidebar name and logo for your personal Agent workbench.",
  "preview": "Live preview",
  "name.label": "Workbench name",
  "name.placeholder": "For example: Avery's Workbench",
  "logo.label": "Workbench logo",
  "logo.choose": "Choose image",
  "logo.replace": "Replace image",
  "logo.remove": "Remove logo",
  "logo.hint": "Choose an image you like.",
  "save": "Apply to workbench",
  "reset": "Restore YourBuddy default",
  "saved": "Applied",
  "reset.done": "Default restored",
  "status.readonly": "This Profile settings document is read-only.",
  "error.name": "Enter a workbench name.",
  "error.read": "The image could not be read. Try again.",
  "error.save": "Could not save. Check the settings document and try again.",
  "link.menu.open": "Open link",
  "link.menu.copy": "Copy link address",
  "link.copy.done": "Link address copied",
  "link.error.open": "Could not open link:",
  "link.error.copy": "Could not copy the link address.",
  "proxy.title": "Network proxy",
  "proxy.description": "Configure one network proxy for YourBuddy, its private Host, plugins, and application updates. Saving restarts the app.",
  "proxy.desktop-only": "Configure the network proxy in the YourBuddy desktop application.",
  "proxy.shell-unavailable": "The desktop network proxy service did not respond. Reopen YourBuddy and try again.",
  "proxy.mode.label": "Connection mode",
  "proxy.mode.system": "Follow macOS system proxy",
  "proxy.mode.custom": "Custom proxy",
  "proxy.mode.direct": "Direct connection",
  "proxy.system.detected": "Current system proxy",
  "proxy.system.none": "macOS has no fixed HTTP/HTTPS proxy enabled.",
  "proxy.system.refresh": "Read system proxy again",
  "proxy.system.refreshing": "Reading\u2026",
  "proxy.value.direct": "direct",
  "proxy.http.label": "HTTP proxy",
  "proxy.https.label": "HTTPS proxy",
  "proxy.no-proxy.label": "Addresses that bypass the proxy",
  "proxy.custom.hint": "Both HTTP and HTTPS proxies are required. Only credential-free http:// or https:// URLs are accepted; the local Host always connects directly.",
  "proxy.direct.hint": "Ignore proxy variables from the launch environment and connect to external networks directly.",
  "proxy.ca.label": "Additional CA certificate",
  "proxy.ca.system-only": "None selected (macOS Keychain and Node system CAs only)",
  "proxy.ca.hint": "Select a PEM-encoded .pem or .crt enterprise root certificate. It supplements system trust and is explicitly applied to desktop clients, the Node Host, plugins, and application updates before restart; certificate verification remains enabled.",
  "proxy.ca.select": "Choose .pem / .crt",
  "proxy.ca.selecting": "Choosing\u2026",
  "proxy.ca.remove": "Remove additional CA",
  "proxy.loading": "Loading network proxy settings\u2026",
  "proxy.test.action": "Test ChatGPT connection",
  "proxy.test.testing-action": "Testing\u2026",
  "proxy.test.testing": "Testing the desktop draft route and the running Node Host separately\u2026",
  "proxy.test.result": "Desktop draft: {native}; current Node Host: {host}.",
  "proxy.test.outcome.http": "HTTP {status}",
  "proxy.test.outcome.error": "failed: {code}",
  "proxy.test.outcome.routed": "{outcome} ({route}; {ca})",
  "proxy.test.mode.direct": "direct",
  "proxy.test.mode.system": "macOS system proxy",
  "proxy.test.mode.custom": "custom proxy",
  "proxy.test.mode.unknown": "proxy mode not managed by YourBuddy",
  "proxy.test.ca.system": "system CAs",
  "proxy.test.ca.custom": "system CAs + custom CA",
  "proxy.test.ca.unknown": "unknown CA source",
  "proxy.test.pending-restart": "The Node Host proxy mode or CA source still reflects the previous launch. Save, restart, and test again.",
  "proxy.test.certificate-hint": "A TLS certificate trust error was detected. Trust the enterprise root in the macOS Keychain or select its PEM CA; YourBuddy does not disable certificate verification.",
  "proxy.save.action": "Save and restart YourBuddy",
  "proxy.save.saving": "Saving network proxy settings\u2026",
  "proxy.save.restarting-action": "Restarting\u2026",
  "proxy.save.restarting": "Settings saved. Stopping the private Host and restarting YourBuddy\u2026",
  "proxy.error.pac": "A PAC URL or automatic proxy discovery is enabled. This version cannot translate dynamic rules for Node; use a custom proxy.",
  "proxy.error.http-only": "Only the system HTTP proxy is enabled, so it cannot be applied faithfully to every Node request. Enable HTTPS proxy too or use a custom proxy.",
  "proxy.error.platform": "Automatic system proxy detection is unavailable on this platform. Use a custom proxy.",
  "proxy.error.required": "Custom mode requires both HTTP and HTTPS proxy URLs.",
  "proxy.error.scheme": "Proxy URLs support only http:// or https://.",
  "proxy.error.url": "The proxy URL is invalid and cannot contain a username, password, path, query, or fragment.",
  "proxy.error.no-proxy": "The proxy bypass list is invalid.",
  "proxy.error.ca-path": "The CA certificate path is invalid. Choose the file again.",
  "proxy.error.ca-missing": "The selected CA certificate is missing. Choose it again.",
  "proxy.error.ca-extension": "The CA certificate must be a .pem or .crt file.",
  "proxy.error.ca-size": "The CA certificate must be a non-empty regular file no larger than 1 MiB.",
  "proxy.error.ca-pem": "The .pem or .crt file must contain PEM CERTIFICATE blocks.",
  "proxy.error.test": "The desktop connectivity test did not complete. Check the reported error and try again.",
  "proxy.error.host-response": "The Node Host returned an invalid proxy diagnostic result. Reopen YourBuddy and try again.",
  "proxy.error.generic": "Network proxy operation failed:",
  "lifecycle.title": "Application lifecycle",
  "lifecycle.description": "Manage YourBuddy updates and restarts. Restart stops the private Host and loads newly installed plugins when the app opens again.",
  "lifecycle.desktop-only": "Use these actions in the YourBuddy desktop application.",
  "lifecycle.shell-unavailable": "The desktop lifecycle service did not respond. Reopen YourBuddy and try again.",
  "lifecycle.update.action": "Check and update",
  "lifecycle.update.checking-action": "Checking\u2026",
  "lifecycle.update.checking": "Checking for updates. A new release will download and install automatically.",
  "lifecycle.update.error": "Update check failed:",
  "lifecycle.restart.action": "Restart YourBuddy",
  "lifecycle.restart.restarting-action": "Restarting\u2026",
  "lifecycle.restart.restarting": "Stopping the private Host and restarting YourBuddy\u2026",
  "lifecycle.restart.error": "Restart failed:"
};

// src/client/styles.ts
var STYLE_ID = "dsh-personal-workbench/settings";
var PERSONAL_WORKBENCH_CSS = `
.dpw-card{display:grid;gap:16px;padding:18px;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background:var(--dsw-alias-bg-layer-1)}
.dpw-heading{display:grid;gap:4px}.dpw-title{font-size:16px;font-weight:650;color:var(--dsw-alias-label-primary)}
.dpw-description,.dpw-hint,.dpw-status{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-secondary)}
.dpw-preview{display:flex;align-items:center;gap:12px;min-height:72px;padding:14px;border-radius:14px;background:var(--dsw-alias-bg-layer-2)}
.dpw-preview-mark{display:grid;place-items:center;width:44px;height:44px;overflow:hidden;border-radius:12px;background:var(--dsw-alias-bg-base);font-size:25px}
.dpw-preview-mark img{width:100%;height:100%;object-fit:contain}.dpw-preview-copy{display:grid;gap:2px;min-width:0}
.dpw-preview-label{font-size:12px;color:var(--dsw-alias-label-secondary)}.dpw-preview-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18px;font-weight:650;color:var(--dsw-alias-label-primary)}
.dpw-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.dpw-field{display:grid;align-content:start;gap:8px}
.dpw-field-wide{grid-column:1/-1}.dpw-proxy-panel{display:grid;gap:10px;padding:12px;border-radius:12px;background:var(--dsw-alias-bg-layer-2)}
.dpw-code{display:grid;gap:4px;overflow-wrap:anywhere;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:var(--dsw-alias-label-secondary)}
.dpw-label{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}.dpw-input{box-sizing:border-box;width:100%;height:38px;padding:0 11px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}
.dpw-upload-row,.dpw-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dpw-file{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.dpw-button{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 13px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}
.dpw-button-primary{border-color:var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}.dpw-button-primary:hover:not(:disabled){border-color:var(--dsw-alias-button-primary-hover);background:var(--dsw-alias-button-primary-hover)}.dpw-button:disabled{cursor:not-allowed;opacity:.5}
.dpw-error{font-size:13px;color:var(--dsw-alias-state-error-primary)}.dpw-success{color:var(--dsw-alias-state-success-primary)}
.dpw-desktop-external-link{cursor:pointer}
.dpw-link-menu{position:fixed;z-index:2147483647;display:grid;min-width:180px;padding:6px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 10px 30px rgb(0 0 0 / .24)}
.dpw-link-menu[hidden]{display:none}.dpw-link-menu-item{padding:8px 10px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}
.dpw-link-menu-item:hover,.dpw-link-menu-item:focus-visible{outline:0;background:var(--dsw-alias-bg-layer-2)}.dpw-link-menu-status{max-width:320px;padding:8px 10px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.45;overflow-wrap:anywhere}
.dpw-help{width:100%}.dpw-help-trigger{display:flex;align-items:center;gap:10px;min-height:36px;width:100%;padding:8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}
.dpw-help-trigger:hover,.dpw-help-trigger:focus-visible{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dpw-help-trigger:focus-visible,.dpw-help-panel button:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}
.dpw-help-icon{display:grid;place-items:center;flex:none;width:18px;height:18px;border:1.5px solid currentColor;border-radius:50%;font-size:12px;font-weight:650}
.dpw-help-panel{position:fixed;z-index:1100;box-sizing:border-box;width:288px;max-width:calc(100vw - 16px);max-height:calc(100vh - 100px);overflow:auto;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 8px 24px rgb(0 0 0 / .16)}
.dpw-help-panel [role=menu]{display:grid}.dpw-help-panel p{margin:8px}.dpw-help-panel .dpw-hint{font-size:12px}.dpw-help-recovery{display:grid;gap:8px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px}.dpw-help-recovery .dpw-input{font-size:12px}
@media (max-width:720px){.dpw-fields{grid-template-columns:1fr}}
`;
function installPersonalWorkbenchStyles(ctx) {
  ctx.effect(() => {
    if (typeof document === "undefined") return () => {
    };
    const existing = document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`);
    if (existing !== null) return () => {
    };
    const style = document.createElement("style");
    style.dataset.plugin = "dsh-personal-workbench";
    style.dataset.pluginCss = STYLE_ID;
    style.textContent = PERSONAL_WORKBENCH_CSS;
    document.head.append(style);
    return () => {
      style.remove();
    };
  }, "personal-workbench: settings styles");
}

// src/client/index.tsx
var SETTINGS_LOCALE_NAMESPACE = "settings.personal-workbench";
var inject = ["slots", "locale", "connection", "remote", "settingsScope"];
function installBrandSlot(ctx, scope, slot, pick) {
  ctx.slots.inject(slot, () => {
    let dispose;
    let selected;
    const sync = () => {
      const next = pick(scope.getSnapshot().value);
      if (next === selected) return;
      dispose?.();
      selected = next;
      dispose = next === void 0 ? void 0 : ctx.slots.register({ name: slot, priority: -10 }, next);
    };
    const unsubscribe = scope.subscribe(sync);
    sync();
    return () => {
      unsubscribe();
      dispose?.();
    };
  });
}
function installPersonalBrandOccupants(ctx, scope) {
  let markLogo;
  let mark;
  const pickMark = (value) => {
    const logo = resolveWorkbenchBrand(value).logo ?? app_icon_default;
    if (logo !== markLogo) {
      markLogo = logo;
      mark = createPersonalBrandMark(logo);
    }
    return mark;
  };
  let selectedName;
  let nameComponent;
  const pickName = (value) => {
    const name = resolveWorkbenchBrand(value).name ?? "YourBuddy";
    if (name !== selectedName) {
      selectedName = name;
      nameComponent = createPersonalBrandName(name);
    }
    return nameComponent;
  };
  installBrandSlot(ctx, scope, "sidebar.brand.mark", pickMark);
  installBrandSlot(ctx, scope, "conversation.hero.brand.mark", pickMark);
  installBrandSlot(ctx, scope, "sidebar.brand.name", pickName);
}
function apply(ctx) {
  installPersonalWorkbenchStyles(ctx);
  const scope = ctx.settingsScope.bind({
    namespace: WORKBENCH_SETTINGS_NAMESPACE
  });
  ctx.effect(
    () => ctx.locale.register(SETTINGS_LOCALE_NAMESPACE, { zh, en }),
    "personal-workbench: settings dictionaries"
  );
  installDesktopExternalLinks(ctx, ctx.locale.bind(SETTINGS_LOCALE_NAMESPACE));
  installPersonalBrandOccupants(ctx, scope);
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: "yourbuddy-help",
    order: 20,
    locale: SETTINGS_LOCALE_NAMESPACE,
    inject: () => ({ readLocale: () => ctx.locale.getLocale().active })
  }, HelpMenu));
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({
    name: "settings.general.item",
    id: "personal-workbench",
    order: 20,
    locale: SETTINGS_LOCALE_NAMESPACE,
    inject: () => ({ scope, readLocale: () => ctx.locale.getLocale().active })
  }, BrandSettingsRow));
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({
    name: "settings.general.item",
    id: "network-proxy",
    order: 30,
    locale: SETTINGS_LOCALE_NAMESPACE
  }, NetworkProxyRow));
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({
    name: "settings.general.item",
    id: "application-lifecycle",
    order: 40,
    locale: SETTINGS_LOCALE_NAMESPACE
  }, ApplicationLifecycleRow));
}
    return module.exports;
  },
});
