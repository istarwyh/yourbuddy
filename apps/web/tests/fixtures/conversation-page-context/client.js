/* Synthetic public-API consumer, loaded by the real Web module graph. */
window.__ModuleLoader__.load({
  id: 'dsh-test-conversation-page-context',
  factory: require => {
    const React = require('react')
    const viewId = 'test-conversation-page-context'
    const states = new Map()
    const listeners = new Set()
    const stateFor = sessionId => {
      if (!states.has(sessionId)) states.set(sessionId, { selected: 'A', hold: false, fail: false })
      return states.get(sessionId)
    }
    const changed = () => { for (const listener of listeners) listener() }
    function View({ sessionId }) {
      const [, render] = React.useState(0)
      React.useEffect(() => {
        const listener = () => render(value => value + 1)
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      }, [])
      const state = stateFor(sessionId)
      return React.createElement('section', { 'aria-label': 'Synthetic page context' },
        React.createElement('h2', null, 'Synthetic page context acceptance'),
        React.createElement('p', null, 'Isolated fixture. No account, provider, or business data.'),
        React.createElement('p', null, `Selected trial: ${state.selected}`),
        ...['A', 'B'].map(trial => React.createElement('button', {
          key: trial,
          onClick: () => { state.selected = trial; changed() },
        }, `Open trial ${trial}`)),
        React.createElement('button', {
          onClick: () => { state.hold = true; changed() },
        }, 'Hold next preparation'),
        React.createElement('button', {
          onClick: () => { state.fail = true; changed() },
        }, 'Fail next preparation'),
        state.release && React.createElement('button', {
          onClick: () => { state.release() },
        }, `Release prepared trial ${state.pending}`),
        state.reject && React.createElement('button', {
          onClick: () => { state.reject() },
        }, `Reject prepared trial ${state.pending}`))
    }
    return {
      name: 'test-conversation-page-context',
      inject: ['slots', 'conversation'],
      apply(ctx) {
        ctx.effect(() => ctx.conversation.contexts.register({
          id: viewId,
          label: 'Synthetic page',
          viewId,
          timeoutMs: 10_000,
          prepare({ sessionId, signal }) {
            const state = stateFor(sessionId)
            const selected = state.selected
            if (state.fail) {
              state.fail = false
              throw new Error('Synthetic context preparation failed. Draft retained.')
            }
            const content = `Synthetic page context: trial ${selected}.`
            if (!state.hold) return content
            state.hold = false
            state.pending = selected
            return new Promise((resolve, reject) => {
              const clear = () => {
                signal.removeEventListener('abort', abort)
                delete state.release
                delete state.reject
                delete state.pending
                changed()
              }
              const abort = () => {
                clear()
                reject(new Error('Synthetic context preparation cancelled.'))
              }
              signal.addEventListener('abort', abort, { once: true })
              state.release = () => {
                clear()
                resolve(content)
              }
              state.reject = () => {
                clear()
                reject(new Error('Synthetic delayed context preparation failed.'))
              }
              changed()
            })
          },
        }), 'synthetic page-context consumer')
        ctx.slots.inject('conversation.view', () => ctx.slots.register({
          name: 'conversation.view', id: viewId, order: 40,
          label: () => 'Synthetic context',
        }, View))
      },
    }
  },
})
