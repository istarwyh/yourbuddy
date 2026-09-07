# Agent Note: Page context on ordinary submit

Status: implemented

English | [中文](2026-09-07-page-context-on-submit.zh.md)

## Problem

A user looking at a plugin object could ask about “this” in the resident composer, but ordinary submission did not carry the visible object. Explicit reference chips worked, yet requiring one for every question disconnected the page from the conversation. Capturing after asynchronous reference or image preparation could bind a different page.

## Decision

The existing conversation service owns a generic selected-View context registry. A contribution declares its View id, label, preparation deadline, and callback. The input facade invokes the callback synchronously at the submit lock; consumers copy page state before resolving it asynchronously. The host selects the current Session's authoritative View, not any mounted component. Slash commands bypass implicit context.

Context is an additional text block in the same Session prompt. A generic source/label envelope records model text and optional frozen description in the same durable user message. A provider can return plain text or `{ text, label, description? }`; Chat and Queue show the description instead of protocol text when present. There is no new event type, loop injection, or second prompt. The first text block remains user-authored, including an empty block for image-only contextual submissions; display projection recognizes only later complete envelopes. Copy excludes automatic markup; queue editing preserves its original frozen attachment.

Cancellation, deadline expiry, preparation failure, and contribution disposal prevent admission and retain the draft. Queue/Steer choice, image ownership, and submission request identity remain with the original attempt. Consumers own explicit-reference precedence, bounded/redacted context, and opt-out behavior. The host neither reads plugin DOM nor understands Harbor identities.

Each failed send owns its original text, reference chips, and images. An empty composer can recover it immediately; an occupied composer exposes a compact recovery entry without changing the next draft. Explicit restoration requires an empty, idle composer and never sends. Retrying captures the currently selected page. Discard and Session disposal release the failed entry's images, and independent failures never merge into one message.

## Alternatives considered

**Another composer or context panel.** It would duplicate the primary input and make ordinary questions require another interaction. The existing page and message attachment carry the relevant controls and evidence.

**Late context lookup or separate injection.** A late lookup can capture a newer selection; a separate injection can reach the wrong queued turn or diverge from the durable user message. One frozen contribution follows the original admission instead.

**Harbor-specific host code.** Other plugin Views need the same submit boundary. The host therefore exposes one registration contract without importing a feature package or interpreting its object schema.

## Consequences

Host and consumer must both support the contract; older hosts retain explicit-reference behavior. Persisted context text is replayable, but consumer tokens can still expire or become stale. The host never substitutes current context for expired evidence. A failed preparation blocks that send until retry or consumer opt-out, preventing an apparently contextual question from silently becoming context-free.

## Testing

Package tests cover synchronous capture, async reference races, Session isolation, deadlines, unload, cancellation, retry, image ownership, occupied-draft recovery, discard/disposal, Queue/Steer, safe display metadata, and original-text editing. The keyless assembled `conversation-page-context` browser test loads a real public consumer through Loader and compares controlled-model content with durable user-message content. The separate Harbor integration lane uses an explicit external plugin checkout; it does not replace the bundled product or claim a real-provider evaluation.
