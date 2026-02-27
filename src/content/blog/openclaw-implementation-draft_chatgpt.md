# How OpenClaw Works, Step by Step

Like a lot of people, I've been genuinely amazed by the pace of LLM-based tools over the past couple of years — coding assistants, research tools, general chat. The emergence of dedicated coding agents like Claude Code in early 2025 felt like a real step change.

But the thing that really caught my attention at the start of this year was [OpenClaw](https://github.com/openclaw/openclaw). A general-purpose agent with full computer access, integrated with messaging apps like WhatsApp and Telegram — and it hit 145k GitHub stars in a single week. That's not a niche developer toy; something was clearly clicking for a much wider audience.

Reading through the repo and watching demos, I got genuinely curious — and then realised I had no real ground-level understanding of how it actually works. Not in a hand-wavy "LLMs predict tokens" sense — I knew that much. What I didn't have was a clear picture of *how these agent systems are actually put together*. How does the loop run? Why is memory structured the way it is? What separates a toy agent from a production one? And how does OpenClaw build on a small library called **Pi** — written by [Mario Zechner](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/) — to produce the thing now running on everyone's phone?

This article is my attempt to work through those questions from scratch. I started from the most basic abstraction I could find and built up from there, layer by layer, until OpenClaw made sense to me — not as magic, but as a concrete composition of understandable parts. Maybe it's useful to you too.

The article follows a deliberate progression: it starts with the black-box model interface, moves to the structured request envelope real systems use, then to the agent loop, then to the production concerns that appear in practice, and only after that introduces OpenClaw itself.

---

## 1. The black box

At the most abstract level, a large language model is a black box.

You give it an input, and it produces an output.

In the simplest case, that relationship looks like this:

```text
input text -> model -> output text
```

A model consumes a sequence of tokens and generates another sequence of tokens. In a multimodal setting, some of those tokens may represent images, audio, or other encoded inputs. But conceptually the model is still doing the same kind of work: mapping input context to generated output.

This is why the primitive interaction is not agent orchestration, tool calling, or memory management. At the lowest level, it is simply:

```text
prompt -> response
```

Worth starting there, because everything else in an agent system is built around that primitive.

---

## 2. The contract around the black box

If the model itself is just a black box, why do modern APIs look more complicated than a single prompt string?

The short answer is that real applications need more structure than a raw string can safely and reliably express.

A plain prompt string quickly runs into practical problems. It mixes instructions, user input, and application state into one blob. It becomes hard to distinguish policy from data. It makes tool access implicit instead of explicit. It also makes logging, replay, and debugging much harder, because all of the important pieces have already been flattened into one piece of text.

For that reason, production systems wrap the raw model interaction in a structured request contract.

That structured contract is not the model itself. It is the application-layer envelope around the model.

A useful way to think about it: the model consumes tokens, the API accepts a structured request, and the runtime compiles that structured request into the effective model input.

In other words, the simple black-box interface still exists — but modern agent systems don't work directly at that layer. They work one level above it.

---

## 3. From prompt string to structured invocation

Once you move from a toy example to a real application, "prompt" stops being a sufficient abstraction.

What you actually have is a structured invocation. Once the request needs to carry policy, state, capabilities, and runtime controls, it's no longer useful to think of it as just a string. In practical terms, that invocation usually includes five kinds of information:

```ts
type LLMInvocation = {
  model: Model
  instructions: Policy
  input: Transcript
  tools?: Capability[]
  execution?: ExecutionConfig
}
```

This is not meant as a vendor-specific API spec. It's a conceptual model.

The `model` field identifies which reasoning engine is being called, `instructions` defines the stable policy or behavioral contract, `input` carries the current interaction state, `tools` describes the capabilities exposed to the model, and `execution` shapes how output should be generated.

That framing corrects a common misunderstanding. In an agent system, the real unit of work is not a prompt string. It's a structured reasoning invocation.

That's the atomic unit OpenClaw keeps constructing over and over.

A small example makes the shift more concrete:

```ts
// "gpt-5" here is just a placeholder — this could equally be
// "claude-opus-4-5", "gemini-ultra", or any other supported model.
// Pi supports mid-session switching across 15+ providers.
const invocation: LLMInvocation = {
  model: "gpt-5",
  instructions: "You are a careful project assistant. Do not invent issue IDs.",
  input: [
    { role: "user", content: "Summarize the current sprint blockers." }
  ],
  tools: [jiraSearchTool],
  execution: { maxOutputTokens: 400 }
}
```

Even in this simplified form, the request is already more than a prompt string. It carries policy, state, capabilities, and runtime controls in one structured unit.

---

## 4. Why `input` is a transcript, not a string

The first major shift from a simple prompt string is that input becomes a transcript.

The reason is straightforward: most useful interactions are not single-turn.

As soon as there is continuity, the system needs to represent an ordered conversation state. It needs to preserve who said what, in what order, what the latest user request is, which prior answers still matter, and what tool results have already been observed.

A transcript is the smallest structure that preserves that meaning.

Conceptually:

```ts
type Message = {
  role: "user" | "assistant" | "tool"
  content: string
}

type Transcript = Message[]
```

Order changes meaning, role changes meaning, and the surrounding state determines what counts as a coherent next step. A conversation is not just a bag of text fragments.

That's why a real application doesn't usually send only the latest user message. It sends a selected transcript slice, often with older parts summarized or compacted.

That transcript is not memory in the broadest sense — it's the immediate interaction state. The distinction matters and becomes important later.

---

## 5. Why `instructions` is separate from `input`

If `input` is the transcript, what belongs in `instructions`?

`instructions` is the stable execution contract.

It defines how the model should behave regardless of the current user turn. In practice that usually includes things like role definition, style constraints, guardrails, output expectations, domain boundaries, and policy rules — things like: do not invent issue IDs, ask for clarification if data is missing, prefer short technical answers, never perform destructive actions without confirmation.

This is different from transcript data. A user request changes from turn to turn. A tool result changes from turn to turn. A Jira board snapshot changes from turn to turn. The policy, by contrast, should usually remain stable across many calls.

The clean mental split: `instructions` is execution policy, `input` is interaction state.

This separation also matters for safety. If policy is mixed into the same blob as user text and external context, it becomes much harder to reason about which parts are trusted rules and which parts are merely data. Structurally separating them gives the system a cleaner contract and makes debugging easier.

A simple example shows the difference:

```ts
instructions: "Do not invent Jira issue IDs. If data is missing, say so clearly."
input: [
  { role: "user", content: "What is blocking AIR-142 right now?" },
  { role: "tool", content: "AIR-142 is blocked by missing API approval." }
]
```

The rule about inventing issue IDs belongs in policy because it should remain stable across calls. The question and the tool result belong in input because they are part of the current interaction state.

---

## 6. Why tools are a first-class part of the request

The next major shift is that a reasoning system may need to do more than generate text.

It may need to query an API, inspect a repository, read a file, create a ticket, run a command, or fetch fresh data.

Those are not just additional context. They are capabilities.

That's why tools belong in their own part of the invocation.

Conceptually:

```ts
type Capability = {
  name: string
  description: string
  parameters: unknown
}
```

The important point is not the exact schema. It's the separation of concerns. The input tells the model what is happening, while the tools tell the model what it is allowed to do.

This is an important architectural boundary. A list of Jira issues belongs in input as contextual data. A `jira_get_issue` or `jira_search` function belongs in tools as a callable capability.

That distinction keeps the system understandable because it preserves a clean separation between data and actions.

Once tools exist, the interaction also stops being just "ask once, answer once." A call may now produce a tool request instead of a final user-facing answer.

That's the beginning of agent behavior.

---

## 7. Why execution settings exist at all

There is one more part of the invocation that is easy to overlook.

Even after you know the policy, the transcript, and the available tools, there are still choices about how the model should produce output.

Those choices live in the execution configuration.

Examples include output length limits, structured output constraints, tool choice policy, and the difference between more deterministic and more exploratory sampling.

Conceptually:

```ts
type ExecutionConfig = {
  maxOutputTokens?: number
  responseFormat?: unknown
  toolChoice?: "auto" | "required" | string
  temperature?: number
}
```

These fields don't belong in the transcript, because they're not part of the user conversation. They're runtime controls.

Taken together, that gives us a clean layered view of a single reasoning call:

```text
model        -> which engine
instructions -> stable policy
input        -> current interaction state
tools        -> callable capabilities
execution    -> runtime generation controls
```

At that point, we have the smallest useful mental model for a modern LLM-backed system.

---

## 8. What an agent actually is

Once tools enter the picture, a single model call may no longer produce the final answer.

Instead, it may produce the next action.

That's the point where it becomes useful to think about what an agent actually is. Here's a deliberately plain definition that I find helpful:

> an agent is a control loop that repeatedly constructs the next LLM invocation

It avoids the vague, overloaded use of the word "agent" and focuses on the mechanism that actually matters.

An agent looks at the current state, assembles an invocation, calls the model, interprets the result, and then either finishes or updates the state and continues.

The difference between a simple chatbot and an agent is not that one is intelligent and the other is not. The difference is that the agent can continue the process when one reasoning step is not enough. It doesn't merely answer — it can decide that another step is required before it can answer.

---

## 9. The minimal agent loop

The smallest useful agent loop looks like this:

```text
assemble invocation
-> call model
-> inspect result
-> if a tool is needed, execute tool
-> append tool result to state
-> assemble next invocation
-> repeat until done
```

Two important ideas appear even in this minimal form.

The first is that the model can return intent rather than just prose. The immediate output of a call may be "use this tool with these arguments" rather than "here is the final answer."

The second is that tool results become part of the state. Once a tool runs, its result becomes new input for the next reasoning step. The transcript is no longer just a record of user and assistant messages — it also becomes a record of observations gathered during the run.

This is the core mechanic behind practical agents. They are not just larger prompts; they are iterative reasoning systems.

A minimal example to make it concrete:

1. the user asks, "What are the top blockers in the current sprint?"
2. the model decides it first needs fresh Jira data
3. it requests `jira_search({ sprint: "current", status: "blocked" })`
4. the tool returns a list of blocked issues
5. that result is appended to the state
6. the model performs another reasoning step and produces the final summary

That's already enough to move from a single response to an actual agent loop.

---

## 10. Why production systems need invocation assembly

By this point, the core loop is conceptually simple. The next practical question is how each invocation gets assembled correctly.

In a toy example, you can do this inline — just concatenate a few strings and move on. In a production system, that quickly breaks down. And when it breaks, it breaks in a frustrating way: the error shows up in the *model's output*, not in the code that assembled the request. The model saw the wrong thing and responded accordingly, and now you're debugging a behavior problem when the real issue was an assembly problem.

That's why a production runtime needs a dedicated assembly step — sometimes called a request builder, or informally a prompt compiler. "Invocation assembly" is the more precise name.

Its job is to gather and normalize all of the inputs required for the next reasoning step. In practice that often includes the base policy, workspace-specific policy, the relevant transcript slice, durable memory snippets, tool definitions, channel metadata, user identity or permissions, and execution defaults.

In rough pseudocode, the shape of that process looks something like this:

```ts
function assembleInvocation(context: AgentContext): LLMInvocation {
  return {
    model: resolveModel(context),
    instructions: [
      context.basePolicy,
      context.workspacePolicy,
    ].join("\n\n"),
    input: [
      ...context.durableMemorySnippets,
      ...selectTranscriptSlice(context.transcript, context.tokenBudget),
    ],
    tools: filterToolsByPermissions(context.availableTools, context.user),
    execution: context.executionDefaults,
  }
}
```

This step is more than string concatenation. It's the place where the system decides what belongs in the next reasoning context and in what form. A production agent needs this process to be deterministic enough to debug, inspectable enough to reason about, flexible enough to evolve, and explicit enough to test.

OpenClaw relies heavily on this layer because much of its behavior depends on assembling the right invocation at the right moment.

---

## 11. Memory is not one thing

Earlier, the transcript was introduced as the current interaction state. That is only one kind of memory.

Production agents usually need multiple memory layers, each serving a different purpose — and each aging differently.

**Transcript memory** is the active turn-by-turn interaction history. It provides the immediate continuity required for the next step. It grows fast, and at some point it has to be pruned or compacted because it won't fit in the context window.

**Durable semantic memory** is information worth carrying forward across many turns or even across sessions: user preferences, project facts, stable operating assumptions, summaries of prior work. Unlike the transcript, it doesn't grow with every turn — but it can become stale and needs an explicit refresh policy.

**Policy and identity files** are not memory in the conversational sense, but they often play a similar role by providing persistent contextual grounding. Workspace instructions, role definitions, project conventions, and tooling boundaries all belong here. These should remain stable and versioned, not updated mid-session.

OpenClaw makes the session boundary concrete by storing one JSONL file per channel thread at `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`. Each conversation is independent and crash-safe — JSONL is append-only, so you lose at most one line on a crash.

When a context gets too large, compaction kicks in. OpenClaw doesn't just summarize blindly — it uses a multi-stage pipeline that preserves file operation history and tool failure data, because those are often the most valuable parts of a long session to carry forward. Throwing them away in a naive summary would degrade the agent's ability to reason about what it already tried.

Keeping these layers distinct matters because without explicit rules for compaction, refresh, selection, and precedence, context becomes noisy, expensive, and hard to trust.

---

## 12. Reliability, orchestration, and the difference between a loop and a system

A local toy agent can get away with a simple while-loop. A production agent cannot.

Consider what happens when a tool returns a 50,000-token JSON blob — say, a full GitHub diff or a database export. In a toy agent, you'd just append it to the transcript and carry on. In practice, this immediately blows the context window, stalls the loop, and leaves you with a confusing model error rather than a clear tool-output error. Someone has to decide: truncate it, summarize it, or reject it? And that decision has to happen automatically, before the model ever sees it.

That's just one example. Once the system runs in real environments, several new concerns appear: provider outages, rate limits, timeouts, malformed tool outputs, retries, partial failures, and the need for observability. A while-loop handles none of these gracefully.

This is the point where it becomes useful to separate the core reasoning loop from the orchestration layer that supports it.

The core loop decides the next reasoning step. The orchestration layer makes sure that step can run reliably in the real world. In practice that means the runtime often needs request tracing, retries with policy-aware limits, provider fallback behavior, logging of invocation inputs and outputs, and step boundaries that can be inspected later.

OpenClaw extends Pi's agent loop with exactly this kind of infrastructure: extension hooks for context pruning (silently trimming oversized tool results before they reach the model), compaction safeguards, and structured event emission so that every step can be observed or replayed.

This distinction matters for understanding OpenClaw. It is not just an agent loop — it's an operational runtime built around that loop.

---

## 13. Channels are adapters, not the core

Another production concern is delivery.

Users don't interact with a reasoning system directly. They interact through some surface: a chat app, a terminal, a web UI, a scheduled job, or a webhook-triggered workflow.

These are channels.

A common design mistake is to let the channel define the system. A cleaner architecture treats channels as adapters at the edge and keeps the core runtime independent of them.

A channel adapter should mainly receive an event, convert it into the runtime's internal input model, invoke the core agent system, and then send the resulting output back through the channel. The deeper reasoning machinery should not need to care whether the request came from a chat room, a CLI session, or a scheduled background task.

This is especially relevant for OpenClaw, because one of its strengths is that it can support both user-driven and system-driven threads — Slack, WhatsApp, Telegram, Discord, cron jobs — while reusing the same internal reasoning architecture.

---

## 14. Only now: what OpenClaw is

With those building blocks in place, OpenClaw becomes much easier to describe.

OpenClaw is not best understood as "a chatbot with tools." It's better understood as a production-grade, chat-native agent runtime that repeatedly assembles structured LLM invocations, executes an iterative reasoning loop, and wraps that loop in memory, policy, orchestration, and channel infrastructure.

Everything distinctive about OpenClaw sits on top of the first principles introduced earlier. It builds structured invocations, maintains layered context, exposes tools under explicit control, iterates when one step is not enough, runs through delivery adapters, and adds production safeguards around the whole process.

This is why it helps to delay introducing OpenClaw until this point. Once you already understand the underlying primitives, OpenClaw reads less like a special case and more like a concrete composition of familiar parts.

---

## 15. OpenClaw onboarding and workspace scaffolding

One thing that makes OpenClaw more practical than a bare agent loop is that it doesn't assume the system starts from nowhere.

A real agent benefits from a pre-shaped environment: a defined workspace, persistent policy files, initial conventions, a clear operating identity, and explicit boundaries for what the agent should and should not do.

This is what onboarding and scaffolding provide.

Instead of treating the agent as a blank, stateless caller, OpenClaw can initialize a workspace that gives future invocations a stable foundation. Practically, this means things like a `WORKSPACE.md` or `AGENTS.md` file that describes the project, its conventions, and the agent's operating boundaries — durable files that shape invocation assembly before the model is even called.

That matters because it reduces ambiguity and makes the behavior easier to inspect, reproduce, debug, and evolve over time. It's a major step beyond ad hoc prompting.

---

## 16. Tooling in OpenClaw: capabilities with policy gates

OpenClaw does not merely expose tools. It also governs them.

That distinction is crucial.

In a toy example, a tool list can be treated as a convenience feature. In a real system, tools are the system's action surface. Once a tool can read, modify, create, delete, or trigger something external, it becomes part of the trust boundary.

That's why a production agent runtime needs policy gates around capabilities. Typical examples include owner-only operations, channel-specific restrictions, read-only versus write-capable tools, sandboxed execution, explicit allow and deny rules, and confirmation requirements for destructive actions.

This is one of the clearest differences between a demo agent and a production one. A demo exposes tools. A production system exposes tools under policy.

A simple contrast:

- A read-only tool such as `jira_search` may be available in many contexts.
- A write-capable tool such as `jira_create_issue` may be restricted to specific users, channels, or confirmation flows.

Both are tools, but they don't belong behind the same policy boundary.

OpenClaw's architecture becomes much easier to understand when you see tools this way: not as optional extras, but as governed capabilities in a controlled runtime.

---

## 17. Where Pi fits in

OpenClaw does not implement every concept from scratch inside one monolithic code path. A large part of the agent infrastructure comes from a library called **Pi**.

Pi is a minimal coding agent created by Mario Zechner (of [libGDX](https://libgdx.com/) fame). He built it after growing frustrated with the growing complexity of tools like Claude Code — Pi's design philosophy goes in the opposite direction. By default, it gives the model exactly four tools: **read**, **write**, **edit**, and **bash**. That's the whole surface. The philosophy is deliberately minimal: if you want Pi to do something it doesn't do yet, you ask Pi to build it, or install an extension that does.

Mario's original writeup on how Pi works is worth reading: [What I learned building an opinionated and minimal coding agent](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/). And Armin Ronacher (the Flask/Jinja author, who uses Pi almost exclusively) wrote a companion piece explaining how Pi fits inside OpenClaw: [Pi: The Minimal Agent Within OpenClaw](https://lucumr.pocoo.org/2026/1/31/pi/).

Pi lives in a TypeScript monorepo called [pi-mono](https://github.com/badlogic/pi-mono), organized with a strict layered architecture: foundation packages have zero internal dependencies, core packages depend only on the foundation, and applications sit on top. The build enforces this — it's not just aspirational.

The key package for this article is **`pi-ai`**, which provides the agent loop. It handles the full orchestration: processing user messages, executing tool calls, feeding results back to the LLM, and repeating until the model produces a response without tool calls. It also supports partial JSON parsing during streaming — as the LLM streams tool call arguments, `pi-ai` progressively parses them so you can show partial results in the UI before the call even completes.

OpenClaw uses Pi in embedded mode. Instead of spawning Pi as a subprocess, OpenClaw directly imports Pi's `AgentSession` via `createAgentSession()` from the Pi SDK. This gives OpenClaw full control over session lifecycle, event handling, and custom tool injection. It starts with Pi's `codingTools` (read, bash, edit, write), but replaces bash with its own sandboxed exec/process and adds a large set of OpenClaw-specific tools: messaging, browser, canvas, sessions, cron, gateway, and channel-specific tools for Discord, Telegram, Slack, and WhatsApp.

So the division of responsibility is clean: Pi provides the generic agent mechanics — the loop, the model abstraction, the tool dispatch. OpenClaw adds the product-specific layer on top: channel integration, workspace conventions, onboarding flows, policy rules, routing decisions, and application-specific orchestration.

You can read OpenClaw's own documentation on this integration here: [openclaw/docs/pi.md](https://github.com/openclaw/openclaw/blob/main/docs/pi.md).

This boundary is healthy because it makes the system easier to evolve. Shared agent mechanics can improve centrally in `pi-mono`, while OpenClaw-specific behavior can change without collapsing the abstraction.

---

## 18. One traced turn, end to end

With all the pieces introduced, it's useful to compress them back into one concrete end-to-end view.

Here's what a single OpenClaw turn looks like, from incoming event to persisted state:

```
 incoming event (Slack / WhatsApp / Telegram / CLI / cron job)
         │
         ▼
 ┌───────────────────┐
 │  Channel Adapter  │  normalizes event → internal input model
 └────────┬──────────┘
          │
          ▼
 ┌──────────────────────────────────────────────────────────┐
 │                  Invocation Assembly                      │
 │  base policy + workspace policy + transcript slice        │
 │  + durable memory snippets + tools + execution config     │
 └────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │   Model call    │
                 └────────┬────────┘
                          │
              ┌───────────┴────────────┐
              │                        │
       tool request?             final answer?
              │                        │
              ▼                        ▼
    ┌──────────────────┐     ┌──────────────────────┐
    │  Tool execution  │     │  Route response back │
    │  (policy check,  │     │  through channel     │
    │   sandbox, logs) │     └──────────────────────┘
    └────────┬─────────┘
    append result to state
             │
             └──────────────────► back to Invocation Assembly
                                  (repeat until done)

 After the turn:
  ├─ transcript + memory updates persisted to session JSONL
  └─ logs, traces, step metadata available for inspection
```

A single turn begins when a message or event arrives through some channel. The channel adapter normalizes it into the runtime's internal input model. From there, invocation assembly gathers policy, transcript, durable context, the tool surface, and execution defaults. The model is called with the assembled invocation and the result is inspected.

If the result requests a tool, the tool executes — passing through policy gates and the sandbox — and its output is appended to the state. One or more additional reasoning steps may follow. Once the turn is complete, the final response is routed back through the channel, and transcript state plus any durable memory updates are persisted. Logs, traces, and step metadata remain available for inspection.

The point is not that the implementation is simple. The point is that its complexity is *layered*, and each layer has a clear role. The mental model stays stable throughout: assemble the next invocation, run the next reasoning step, update the state, and continue until done. Everything else in OpenClaw exists to make that loop reliable, inspectable, and useful in the real world.

---

## 19. The core idea to keep in mind

The most important shift in perspective is this:

OpenClaw is not fundamentally a prompt, a chat UI, or a pile of tool integrations.

At its core, it is a system that repeatedly constructs and executes structured reasoning invocations.

That single idea explains a large part of the architecture. It explains why policy is separate from state, why transcripts exist, why tools are first-class, why memory has layers, why orchestration matters, why channels can remain adapters, and why Pi's layered library structure matters so much.

Once that first principle is clear, the rest of the system becomes much easier to follow.

I'm still exploring parts of this — particularly how the compaction pipeline handles edge cases, and what happens when multiple concurrent sessions need to share context. But this mental model has already made the codebase a lot more readable to me, and I hope it does the same for you.
