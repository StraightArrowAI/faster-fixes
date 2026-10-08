# Faster Fixes

A widget that lets a website's end-users report bugs and feedback in-page; reports flow into a project inbox, can be mirrored to external trackers (GitHub Issues, Linear), and announced to notification channels (Slack).

## Language

### Reporting

**Feedback**:
A bug report or comment submitted via the widget on a customer's site. The atomic unit of the inbox.
_Avoid_: Issue (reserved for tracker-side artifacts), Ticket, Bug report.

**Reviewer**:
The end-user of the customer's site who submitted a Feedback through the widget.
_Avoid_: Reporter, Submitter, User.

**Project**:
A Faster Fixes container scoped to one website (one widget install). Holds Feedback, settings, and at most one tracker link per integration.
_Avoid_: Site, App, Workspace.

### Identity & access

**Project public ID**:
The public, unguessable identifier for a Project (`proj_` + 96-bit random), embedded in the widget so submissions route to the right Project inbox. Public by design — it carries no secret and is safe to ship in client code.
_Avoid_: API key (the widget surface has no secret key), Client secret.

**Allowed origins**:
The web origins a Project's widget may call the API from: the Project's **Domains** (each optionally including its subdomains) and localhost for local development. Matched against the browser-set `Origin`, the real security boundary for widget requests. A Project is one *product* and may span unrelated domains. See ADR-0013 (and ADR-0012, ADR-0005 for history).

**Domain**:
A host a Project's widget may run on, and a link target offered when inviting a **Reviewer**. Exactly one is the **primary**; the rest are alternatives. Each may include its subdomains and may carry an **Environment**. See ADR-0013.
_Avoid_: Main domain (the pre-ADR-0013 single field), Allowed host.

**Tag extractor**:
An ordered, per-Project host pattern (e.g. `{account}.rms.{env}.straightarrow.ai`) with optional fixed tags that adds **Tags** to an already-allowed request. Never grants access. `{name}` and `*` match within one label, never across a dot. Formerly "domain rule".
_Avoid_: Domain rule.

**Reviewer token**:
The per-Reviewer secret that authorizes reading and submitting Feedback. One per Reviewer, shared by every Domain link they are sent; stored encrypted with a hash lookup (ADR-0013). Created in the dashboard, delivered to a Reviewer via URL param or localStorage. This — not the Project public ID — is the gate on Feedback access.

**Agent token**:
The organization-scoped secret (`ff_agent_`) for the agent/MCP API. The only genuine secret credential in the system; stored hashed and revocable.

**Tag**:
A `key → value` string pair on a Feedback, set once at submission from, in increasing precedence, the widget's `tags` prop, the matched **Domain**'s Environment, and the first matching **Tag extractor**. Never rewritten when configuration changes.
_Avoid_: Label (reserved for tracker-side labels).

**Environment**:
The **Tag** with key `env` (e.g. `dev`, `prod`). The only Tag with dedicated UI: card badge, per-Project color, board filter.
_Avoid_: Stage, Deployment.

### Feedback lifecycle

**Status**:
The state of a Feedback. Canonical values: `new`, `in_progress`, `resolved`, `archived`. Integrations, the widget, and notifications read Status, never Column.

**Column**:
A per-Project kanban lane (e.g. "In Test"). Each Column belongs to exactly one non-archived Status, its **category**; a Feedback's Column always matches its Status. See ADR-0010.
_Avoid_: Stage, Lane (in code).

**Status actor**:
Who or what drove a Status change: a dashboard user, a Tracker sync, or the **Agent** (an Agent-token caller). Travels on the status-change event so a **Notification channel** can distinguish an agent-resolved Feedback from a human-resolved one.

**Archived**:
A Feedback the team has decided not to act on (won't fix, duplicate, out of scope). Stored in the database as `status = "closed"` for legacy reasons; the literal will be renamed in a future migration. UI label is **Archived** everywhere (status dropdown, kanban action, archive view).
_Avoid_: Closed, Dismissed, Rejected.

### Integrations

**Tracker**:
An external issue-tracking system Faster Fixes can mirror Feedback into. Currently GitHub Issues and Linear.
_Avoid_: Integration target, Sink.

**Notification channel**:
A category of external connection where Faster Fixes *announces* Feedback one-way, holding no mirror and creating no Issue. First instance: Slack. Distinct from a **Tracker** (two-way, mirrors Feedback as an Issue and converges its state). Not to be confused with a Slack *channel* (the specific room a Project posts into).
_Avoid_: Webhook (implementation detail), Sink.

**Installation**:
The org-level connection to an external system — a **Tracker** (`GitHubInstallation`, `LinearInstallation`) or a **Notification channel** (`SlackInstallation`). One per (Organization × external system).

**Jira site**:
The Jira Cloud instance an Organization connects to (e.g. `acme.atlassian.net`), identified by an Atlassian `cloudId`. The org-level scope of a Jira Installation — the analog of a Linear workspace or a GitHub account. One per Organization.
_Avoid_: Jira instance, Jira workspace.

**Jira project**:
A project inside a Jira site (e.g. `PAY`). The per-Project tracker scope a Faster Fixes Project links to — the analog of a GitHub repo or a Linear team. Always written "Jira project" in full; bare "project" means a Faster Fixes Project.

**Project link**:
The project-level binding from a Faster Fixes Project to an external scope — a Tracker scope (a GitHub repo, a Linear team) or a Notification channel destination (a Slack channel). One per (Project × external system).

**Issue link**:
The per-Feedback record connecting a single Feedback to its mirrored issue in a Tracker. A Feedback can have at most one issue link per Tracker, but may have one for GitHub *and* one for Linear simultaneously.

### Diagnostics

**Screen recording**:
A short screen capture of the sequence that produced a Feedback, attached to that Feedback alongside — never instead of — its **Screenshot**. Stored as a private Asset and served only through a short-lived presigned URL. Optional: most Feedback has none.
_Avoid_: Video, Session recording (nothing is captured continuously — a Reviewer starts and stops one deliberately), Screencast.

**Diagnostic Trail**:
The console and network history captured leading up to a Feedback submission, attached to that Feedback to aid reproduction.
_Avoid_: Session, Logs, Recording (the Trail is a bounded snapshot, not a continuous session recording).

**Console Entry**:
One captured `console.*` call: level (`log`/`info`/`warn`/`error`/`debug`), message, timestamp. All levels captured.

**Network Entry**:
One captured `fetch`/`XHR` call: method, URL, status, duration, timestamp. Metadata only — request/response bodies are not captured in v1.

**Ring Buffer**:
The fixed-size in-memory store the Widget fills from page load; oldest entries drop when full. A Diagnostic Trail is a snapshot of this buffer at submission time.

## Relationships

- A **Feedback** has zero or one **Diagnostic Trail**
- A **Diagnostic Trail** contains many **Console Entries** and many **Network Entries**
- The **Widget** maintains one **Ring Buffer** per page session; submitting Feedback snapshots it into a **Diagnostic Trail**
- A **Project** has zero or one **Project link** per **Tracker** (GitHub, Linear)
- A **Feedback** has zero or one **Issue link** per **Tracker**
- A **Reviewer** submits **Feedback** through the widget; Reviewers are not authenticated app users
- An **Installation** is owned by an Organization and shared across all Projects in that Organization
- The same **Feedback** may exist as a GitHub Issue and a Linear Issue at the same time; both are mirrors of the Feedback, not peers of each other
- A **Notification channel** (Slack) receives one-way announcements of a Feedback; unlike a **Tracker** it holds no mirror, has no **Issue link**, and never feeds state back to the Feedback

## Example dialogue

> **Dev:** "When a Reviewer submits a Feedback, do we create the GitHub Issue immediately?"
> **Domain expert:** "Only if the Project has an active GitHub Project link with auto-create enabled. Same for Linear, independently — a Project can mirror to neither, one, or both Trackers."
>
> **Dev:** "What if the team marks the Feedback as Archived?"
> **Domain expert:** "On the GitHub side it closes the Issue with `state_reason = not_planned`. On Linear it moves to a `canceled`-type state. The Feedback is the source of truth — Trackers are mirrors and must converge to it."

## Flagged ambiguities

- **"Closed" vs "Archived"** — historically used interchangeably. Resolved: the canonical user-facing term is **Archived**. The DB literal `"closed"` is retained for now to avoid a migration; rename is deferred.
- **"Issue"** — refers exclusively to a tracker-side artifact (GitHub Issue, Linear Issue). Internal app records are **Feedback**, never "issues".
- **"logs"** — used loosely for the captured browser data. Resolved: the canonical term is **Diagnostic Trail** (console + network), distinct from server-side logs.
- **"API key"** — the widget historically embedded an `apiKey` stored like a secret (SHA-256 hash, last-4 shown, "regenerate" flow). Resolved: the widget surface has **no secret**. It embeds the public **Project public ID**, secured by the **allowed origins** (the Project's Domains) + **Reviewer token**. Genuine secrets exist only on the agent surface (**Agent token**). The widget `apiKey` is being removed.
