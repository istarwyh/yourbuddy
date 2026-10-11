import { describe, expect, it } from 'vitest'
import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId, SessionLogOffset, SessionSeq, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { snapshotSubagentDescriptor } from '@deepseek-ai/dsh-subagent'
import { buildSidechatInheritance } from '../product/dsh-better-sidebar/src/sidechat-core.ts'

function completedHistory(): SessionEvent[] {
  return [
    { type: 'turn/start', seq: SessionSeq(0), time: 1, data: { turn: 1 } },
    {
      type: 'user/message', seq: SessionSeq(1), time: 2,
      data: createUserMessage({ content: [{ type: 'text', text: 'original' }], source: { kind: 'user' } }),
      surfaceOp: 'append', ignorable: true,
    },
    {
      type: 'user/message', seq: SessionSeq(2), time: 3,
      data: createUserMessage({ content: [{ type: 'text', text: 'replacement' }], source: { kind: 'user' } }),
      surfaceOp: { op: 'replace', startSeq: SessionSeq(1), endSeq: SessionSeq(1) },
      sourceEventSeqs: [SessionSeq(1)],
    },
    { type: 'turn/end', seq: SessionSeq(3), time: 4, data: { turn: 1, reason: { kind: 'completed' } } },
  ]
}

function restoreSeed(seed: SessionEvent[]): Session {
  const id = SessionId('sidechat-child')
  return Session.create(id, seed, {
    version: SESSION_FORMAT_VERSION, id, createdAt: 5, isSeeded: true,
    parentSession: SessionId('sidechat-parent'), origin: 'subagent', delegationDepth: 1,
  }, SessionLogOffset(seed.length))
}

describe('Better Sidebar typed Side Chat inheritance', () => {
  it('preserves the complete event envelope and descriptor when the child adopts its inherited prefix', () => {
    const parent = completedHistory()
    const inherited = buildSidechatInheritance(parent)
    const descriptor = snapshotSubagentDescriptor({ mode: 'continuable', provider: 'sidechat', label: 'Side: notes' })
    const seed: SessionEvent[] = [...inherited.seed, {
      type: 'subagent/descriptor', seq: SessionSeq(inherited.seed.length), time: 5, data: { ...descriptor },
    }]
    const child = restoreSeed(seed)

    expect(inherited.snapshot).toBeNull()
    expect(inherited.seed).toEqual(parent)
    expect(inherited.seed[1]).not.toBe(parent[1])
    expect(child.snapshotEvents(SessionLogOffset(0), child.inheritedEventCount)).toEqual(seed)
    expect(child.inheritedEventCount).toBe(seed.length)
    expect(child.ownEvents()).toEqual([expect.objectContaining({ type: 'session/end-seed' })])
    expect(child.snapshotEvents()[2]).toMatchObject({
      surfaceOp: { op: 'replace', startSeq: 1, endSeq: 1 }, sourceEventSeqs: [1],
    })
    expect(child.snapshotEvents()[1]?.ignorable).toBe(true)
    expect(child.snapshotEvents()[4]?.data).toEqual(descriptor)
  })

  it('freezes an open step with contiguous step and interrupted turn endings without changing the parent', () => {
    const parent = completedHistory()
    parent.push(
      { type: 'turn/start', seq: SessionSeq(4), time: 6, data: { turn: 2 } },
      { type: 'step/start', seq: SessionSeq(5), time: 7, data: { turn: 2, step: 1 } },
    )
    const inherited = buildSidechatInheritance(parent)

    expect(inherited.seed.slice(0, parent.length)).toEqual(parent)
    expect(inherited.seed.slice(parent.length)).toEqual([
      { type: 'step/end', seq: 6, time: 7, data: { turn: 2, step: 1 } },
      { type: 'turn/end', seq: 7, time: 7, data: { turn: 2, reason: { kind: 'interrupted' } } },
    ])
    expect(inherited.snapshot).toBeNull()
    expect(parent).toHaveLength(6)
    expect(restoreSeed(inherited.seed).inheritedEventCount).toBe(8)
  })

  it('keeps the completed prefix and snapshots a dangling call instead of persisting the open turn', () => {
    const completed = completedHistory()
    const parent: SessionEvent[] = [...completed,
      { type: 'turn/start', seq: SessionSeq(4), time: 6, data: { turn: 2 } },
      { type: 'step/start', seq: SessionSeq(5), time: 7, data: { turn: 2, step: 1 } },
      { type: 'tool/call', seq: SessionSeq(6), time: 8, data: { turn: 2, step: 1, callId: ToolCallId('pending'), name: 'search', arguments: '{}' } },
    ]
    const inherited = buildSidechatInheritance(parent)

    expect(inherited.seed).toEqual(completed)
    expect(inherited.snapshot).toContain('`search` (executing) — arguments: `{}`')
    expect(restoreSeed(inherited.seed).inheritedEventCount).toBe(completed.length)
  })
})
