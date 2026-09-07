{
  "ordinaryCheckedMembers": [
    "hfq-021",
    "hfq-034"
  ],
  "ordinaryListViewState": {
    "filters": {
      "status": "completed",
      "validity": "true"
    },
    "sort": "lowest-score"
  },
  "listFilterCreatedNoImplicitSelection": true,
  "membershipStableAfterFilterChange": true,
  "realHarborPluginReloadRecoveredSnapshotAndSelection": true,
  "modelContentEqualsDurableUserMessages": true
}

- banner:
  - navigation "Session hierarchy":
    - button "Second synthetic Harbor acceptance sessi" [disabled]
  - img
  - text: Standard mode
  - button "Session log":
    - text: Session log
    - img
  - tablist:
    - tab "Chat" [selected]
    - tab "Trajectory"
    - tab "Harbor"
- navigation "Turn navigation":
  - button "Jump to turn 1"
  - button "Jump to turn 2"
  - button "Jump to turn 3"
  - button "Jump to turn 4"
- button "System prompt":
  - img
  - img
  - text: System prompt
- text: Second synthetic Harbor acceptance session. {{clock}}
- button "Copy":
  - img
- button "Thought for a while":
  - text: Thought for a while
  - img
- paragraph: Synthetic transport response. No evaluation or external model was run.
- button "Copy":
  - img
- button "Good response":
  - img
- button "Bad response":
  - img
- button "Branch into a new conversation":
  - img
- button "Ran for {{duration}}":
  - img
  - text: Ran for {{duration}}
- text: {{clock}} Which Harbor page is active in this new session?
- group: Harbor · {{workspaceId}}
- text: {{clock}}
- button "Copy":
  - img
- paragraph: Synthetic transport response. No evaluation or external model was run.
- button "Copy":
  - img
- button "Good response":
  - img
- button "Bad response":
  - img
- button "Branch into a new conversation":
  - img
- button "Ran for {{duration}}":
  - img
  - text: Ran for {{duration}}
- text: {{clock}} Compare the two trials I checked.
- group: "Harbor · Selected 2 Workspace: {{workspaceId}} Evaluation jobs: {{syntheticJob}} Selected: 2 · hfq-021, hfq-034 Dataset order Observed at: {{timestamp}}"
- text: {{clock}}
- button "Copy":
  - img
- paragraph: Synthetic transport response. No evaluation or external model was run.
- button "Copy":
  - img
- button "Good response":
  - img
- button "Bad response":
  - img
- button "Branch into a new conversation":
  - img
- button "Ran for {{duration}}":
  - img
  - text: Ran for {{duration}}
- text: {{clock}} Explain this filtered and sorted trial list.
- group: "Harbor · {{syntheticJob}} Workspace: {{workspaceId}} Evaluation jobs: {{syntheticJob}} Status: completed Score Validity: Score valid Lowest score Observed at: {{timestamp}}"
- text: {{clock}}
- button "Copy":
  - img
- paragraph: Synthetic transport response. No evaluation or external model was run.
- button "Copy":
  - img
- button "Good response":
  - img
- button "Bad response":
  - img
- button "Branch into a new conversation":
  - img
- button "Ran for {{duration}}":
  - img
  - text: Ran for {{duration}}
- text: {{clock}}
- textbox "Message or run a task... / commands, @ files or sessions"
- button "Commands":
  - img
- 'button "Access mode, current: Workspace Write"': Workspace Write
- button "Select model, current synthetic-harbor-context/keyless":
  - text: synthetic-harbor-context/keyless
  - img
- button "Send message" [disabled]
- text: 4 turns · 4 steps LLM {{duration}}
