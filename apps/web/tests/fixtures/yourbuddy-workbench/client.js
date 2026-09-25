/* Synthetic Better Sidebar driver loaded through the assembled Client graph. */
window.__ModuleLoader__.load({
  id: 'dsh-test-yourbuddy-workbench',
  factory: require => {
    const React = require('react')
    function SyntheticTab() {
      return React.createElement('section', { 'aria-label': 'Synthetic Better Sidebar content' },
        React.createElement('h2', null, 'Synthetic Better Sidebar content'),
        React.createElement('p', null, 'No account, provider, or external API is used.'))
    }
    return {
      name: 'test-yourbuddy-workbench',
      inject: ['betterSidebar', 'yourBuddyWorkbench'],
      apply(ctx) {
        ctx.effect(() => {
          const sidebar = ctx.get('betterSidebar')
          const coordinator = ctx.get('yourBuddyWorkbench')
          if (sidebar === undefined || coordinator === undefined) {
            throw new Error('synthetic YourBuddy workbench services are unavailable')
          }
          const disposeTab = sidebar.registerTab({
            id: 'synthetic-workbench',
            title: 'Synthetic Workbench',
            component: SyntheticTab,
          })
          const bridge = Object.freeze({
            open(intent) {
              sidebar.openTab({
                type: 'synthetic-workbench',
                id: 'synthetic-workbench',
                title: 'Synthetic Workbench',
                intent,
              })
            },
          })
          window.__yourBuddyWorkbenchTest = bridge
          return () => {
            if (window.__yourBuddyWorkbenchTest === bridge) delete window.__yourBuddyWorkbenchTest
            disposeTab()
          }
        }, 'synthetic YourBuddy workbench driver')
      },
    }
  },
})
