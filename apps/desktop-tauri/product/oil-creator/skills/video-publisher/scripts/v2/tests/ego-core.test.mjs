import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CORE_SOURCE = fs.readFileSync(path.join(DIR, "..", "ego", "core.mjs"), "utf8");

class FakeEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles === true;
    this.cancelable = options.cancelable === true;
    this.defaultPrevented = false;
    this.target = null;
    this.submitter = options.submitter;
  }

  composedPath() {
    return this.target ? [this.target] : [];
  }

  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }

  stopImmediatePropagation() {}
}

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.parent = null;
    this.style = {};
    this.textContent = "";
    this.innerText = "";
    this.value = "";
    this.type = "";
  }

  matches(selector) {
    if (this.tagName === "BUTTON") return selector.includes("button");
    return this.tagName === "INPUT" && this.type === "submit" && selector.includes('input[type="submit"]');
  }

  getAttribute(name) {
    return name === "aria-label" ? null : null;
  }

  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter(child => child !== this);
    this.parent = null;
  }

  dispatchEvent(event) {
    return this.ownerDocument.dispatch(event, this);
  }
}

class FakeDocument {
  constructor({ ignoreRemovals = false } = {}) {
    this.ignoreRemovals = ignoreRemovals;
    this.listeners = new Map();
    this.documentElement = new FakeElement("html", this);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    if (!this.ignoreRemovals) this.listeners.get(type)?.delete(listener);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  dispatch(event, target) {
    event.target = target;
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    return !event.defaultPrevented;
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size || 0;
  }
}

function coreHarness({ phase = "verify", ignoreRemovals = false, failDetach = false } = {}) {
  const document = new FakeDocument({ ignoreRemovals });
  const browser = vm.createContext({
    window: {},
    document,
    Element: FakeElement,
    Event: FakeEvent,
    MouseEvent: FakeEvent,
    SubmitEvent: FakeEvent,
    Date,
    Object,
    RegExp,
    String,
  });
  const output = [];
  let detachFailures = failDetach ? 1 : 0;
  const context = vm.createContext({
    platform: "xiaohongshu",
    phase,
    requiredGateNames: ["authenticated", "finalButton", "safety"],
    taskName: "handoff-test",
    taskSpaceRef: "",
    receiptCheckpointPath: "",
    jobFingerprint: "",
    fs: {},
    path: {},
    cliLog: value => output.push(value),
    js: async source => {
      if (detachFailures > 0 && source.includes("detachable armed guard missing")) {
        detachFailures -= 1;
        throw new Error("Ego Lite channel disconnected");
      }
      return vm.runInContext(source, browser);
    },
  });
  vm.runInContext(`${CORE_SOURCE}\nglobalThis.__core = { armFinalPublishGuard, inspectFinalPublishGuard, detachFinalPublishGuard, emitObservation };`, context);
  return { core: context.__core, document, output };
}

function readyGates() {
  return {
    authenticated: { ok: true, evidence: {} },
    finalButton: { ok: true, evidence: { text: "发布", disabled: false } },
  };
}

test("successful READY evidence detaches and verifies the final-publish guard", async () => {
  const { core, document, output } = coreHarness();
  await core.armFinalPublishGuard();
  assert.equal(document.listenerCount("click"), 1);
  assert.equal(document.listenerCount("submit"), 1);

  const payload = await core.emitObservation({ gates: readyGates() });

  assert.equal(payload.gates.safety.ok, true);
  assert.equal(payload.gates.safety.evidence.guardArmed, true);
  assert.equal(payload.gates.safety.evidence.handoffCommitted, true);
  assert.equal(payload.gates.safety.evidence.guardDetached, true);
  assert.equal(payload.gates.safety.evidence.detachVerified, true);
  assert.equal(document.listenerCount("click"), 0);
  assert.equal(document.listenerCount("submit"), 0);
  assert.match(output.at(-1), /^VIDEO_PUBLISHER_V2_RESULT:/);
});

test("an already-ready inspection also commits the manual-publish handoff", async () => {
  const { core, document } = coreHarness({ phase: "inspect" });
  await core.armFinalPublishGuard();

  const payload = await core.emitObservation({ gates: readyGates() });

  assert.equal(payload.gates.safety.evidence.handoffCommitted, true);
  assert.equal(payload.gates.safety.evidence.detachVerified, true);
  assert.equal(document.listenerCount("click"), 0);
  assert.equal(document.listenerCount("submit"), 0);
});

test("the guard blocks scheduled-publish labels during automation", async () => {
  const { core, document } = coreHarness({ phase: "mutate" });
  await core.armFinalPublishGuard();

  for (const label of ["定时发布", "定时发表"]) {
    const button = document.createElement("button");
    button.textContent = label;
    const event = new FakeEvent("click", { bubbles: true, cancelable: true });
    assert.equal(button.dispatchEvent(event), false, label);
    assert.equal(event.defaultPrevented, true, label);
  }
  assert.equal((await core.inspectFinalPublishGuard()).blockedAttempts, 2);
});

test("partial verification leaves the final-publish guard armed", async () => {
  const { core, document } = coreHarness();
  await core.armFinalPublishGuard();

  const payload = await core.emitObservation({
    gates: { ...readyGates(), finalButton: { ok: false, evidence: { disabled: true } } },
  });

  assert.equal(payload.gates.safety.ok, true);
  assert.equal(payload.gates.safety.evidence.handoffCommitted, false);
  assert.equal(payload.gates.safety.evidence.guardDetached, false);
  assert.equal(document.listenerCount("click"), 1);
  assert.equal(document.listenerCount("submit"), 1);
});

test("user-control blockers never detach the final-publish guard", async () => {
  const { core, document } = coreHarness();
  await core.armFinalPublishGuard();

  const payload = await core.emitObservation({
    gates: readyGates(),
    blocker: { code: "USER_CONTROL", message: "user took control", retryable: false, requiresUser: true },
  });

  assert.equal(payload.blocker.code, "USER_CONTROL");
  assert.equal(payload.gates.safety.evidence.handoffCommitted, false);
  assert.equal(document.listenerCount("click"), 1);
  assert.equal(document.listenerCount("submit"), 1);
});

test("a handoff channel failure stays guarded and reports the circuit-breaker blocker", async () => {
  const { core, document } = coreHarness({ failDetach: true });
  await core.armFinalPublishGuard();

  const payload = await core.emitObservation({ gates: readyGates() });

  assert.equal(payload.blocker.code, "INPUT_CHANNEL_BROKEN");
  assert.equal(payload.gates.safety.ok, false);
  assert.equal(payload.gates.safety.evidence.rollback.ok, true);
  assert.equal(document.listenerCount("click"), 1);
  assert.equal(document.listenerCount("submit"), 1);
});

test("an unproven detach rolls back the guard and emits a structured blocker", async () => {
  const { core, document } = coreHarness({ ignoreRemovals: true });
  await core.armFinalPublishGuard();

  const payload = await core.emitObservation({ gates: readyGates() });

  assert.equal(payload.gates.safety.ok, false);
  assert.equal(payload.gates.safety.evidence.handoffCommitted, false);
  assert.equal(payload.gates.safety.evidence.rollback.ok, true);
  assert.equal(payload.blocker.code, "ACTION_FAILED");
  assert.equal(payload.blocker.retryable, true);
  assert.equal((await core.inspectFinalPublishGuard()).blockedAttempts, 0);
  assert.equal(document.listenerCount("click"), 1);
  assert.equal(document.listenerCount("submit"), 1);
});
