# How OpenClaw Works, Step by Step

This article explains how OpenClaw works by starting from first principles.

Instead of beginning with framework names, internal modules, or product features, it starts with the smallest unit the whole system is built on: a single LLM call.

That matters because agent systems often look more complicated than they are when you look at them from the outside. Once you strip away the UI, background jobs, memory stores, tool wrappers, and transport adapters, the core mechanism is still fairly simple: the system assembles a request for a reasoning model, receives a result, and then decides what to do next.

OpenClaw builds a lot on top of that core, but it never stops being true.

The article follows that progression deliberately. It starts with the black-box model interface, then moves to the structured request envelope real systems use, then to the agent loop, then to the production concerns that appear in practice, and only after that introduces OpenClaw itself.

---

## 1. The black box

At the most abstract level, a large language model is a black box.

You give it an input, and it produces an output.

In the simplest case, that relationship can be described like this:

```text
input text -> model -> output text
```

That is the most basic first principle.

A model consumes a sequence of tokens and generates another sequence of tokens. In a multimodal setting, some of those tokens may represent images, audio, or other encoded inputs. But conceptually, the model is still doing the same kind of work: it maps input context to generated output.

This is why the primitive interaction is not agent orchestration, tool calling, or memory management. At the lowest level, it is simply this:

```text
prompt -> response
```

That is the right place to start, because everything else in an agent system is built around that primitive.

---

## 2. The contract around the black box

If the model itself is just a black box, why do modern APIs look more complicated than a single prompt string?

The short answer is that real applications need more structure than a raw string can safely and reliably express.

A plain prompt string quickly runs into practical problems. It mixes instructions, user input, and application state into one blob. It becomes hard to distinguish policy from data. It makes tool access implicit instead of explicit. It also makes logging, replay, and debugging much harder, because all of the important pieces have already been flattened into one piece of text.

For that reason, production systems wrap the raw model interaction in a structured request contract.

That structured contract is not the model itself. It is the application-layer envelope around the model.

A useful way to think about it is this: the model consumes tokens, the API accepts a structured request, and the runtime compiles that structured request into the effective model input.

In other words, the simple black-box interface still exists, but modern agent systems do not work directly at that layer. They work one layer above it.

---

## 3. From prompt string to structured invocation

Once you move from a toy example to a real application, “prompt” stops being a sufficient abstraction.

What you actually have is a structured invocation. Once the request needs to carry policy, state, capabilities, and runtime controls, it is no longer useful to think of it as just a string. In practical terms, that invocation usually includes five kinds of information:

```ts
type LLMInvocation = {
  model: Model
  instructions: Policy
  input: Transcript
  tools?: Capability[]
  execution?: ExecutionConfig
}
```

This is not meant as a vendor-specific API spec. It is a conceptual model.

It says that a real LLM call is made of several distinct parts: the model identifies which reasoning engine is being called, the instructions define the stable policy or behavioral contract, the input carries the current interaction state, the tools describe the capabilities exposed to the model, and the execution settings shape how output should be generated.

That framing matters because it corrects a common misunderstanding. In an agent system, the real unit of work is not a prompt string. It is a structured reasoning invocation.

That is the atomic unit OpenClaw keeps constructing over and over.

A tiny example makes the shift more concrete:

```ts
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

This structure matters because a conversation is not just a bag of text fragments. Order changes meaning, role changes meaning, and the surrounding state determines what counts as a coherent next step.

That is why a real application does not usually send only the latest user message. It sends a selected transcript slice, often with older parts summarized or compacted.

That transcript is not memory in the broadest sense. It is the immediate interaction state. That distinction becomes important later.

---

## 5. Why `instructions` is separate from `input`

If `input` is the transcript, what belongs in `instructions`?

`instructions` is the stable execution contract.

It defines how the model should behave regardless of the current user turn. In practice, that usually includes things like role definition, style constraints, guardrails, output expectations, domain boundaries, and policy rules.

A few simple examples make the distinction clearer: do not invent issue IDs, ask for clarification if data is missing, prefer short technical answers, and never perform destructive actions without confirmation.

This is different from transcript data. A user request changes from turn to turn. A tool result changes from turn to turn. A Jira board snapshot changes from turn to turn. The policy, by contrast, should usually remain stable across many calls.

That is why the clean mental split is simple: `instructions` is execution policy, and `input` is interaction state.

This separation improves clarity, and it also improves safety. If policy is mixed into the same blob as user text and external context, it becomes much harder to reason about which parts are trusted rules and which parts are merely data. Structurally separating policy from state gives the system a cleaner contract and makes debugging much easier.

A simple example shows the difference:

```ts
instructions: "Do not invent Jira issue IDs. If data is missing, say so clearly."
input: [
  { role: "user", content: "What is blocking AIR-142 right now?" },
  { role: "tool", content: "AIR-142 is blocked by missing API approval." }
]
```

The rule about inventing issue IDs belongs in policy because it should remain stable across calls. The question and the tool result belong in the input because they are part of the current interaction state.

---

## 6. Why tools are a first-class part of the request

The next major shift is that a reasoning system may need to do more than generate text.

It may need to query an API, inspect a repository, read a file, create a ticket, run a command, or fetch fresh data.

Those are not just additional context. They are capabilities.

That is why tools belong in their own part of the invocation.

Conceptually:

```ts
type Capability = {
  name: string
  description: string
  parameters: unknown
}
```

The important point is not the exact schema. It is the separation of concerns. The input tells the model what is happening, while the tools tell the model what it is allowed to do.

This is an important architectural boundary. A list of Jira issues belongs in input as contextual data. A `jira_get_issue` or `jira_search` function belongs in tools as a callable capability.

That distinction keeps the system understandable because it preserves a clean separation between data and actions.

Once tools exist, the interaction also stops being just “ask once, answer once.” A call may now produce a tool request instead of a final user-facing answer.

That is the beginning of agent behavior.

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

These fields do not belong in the transcript, because they are not part of the user conversation. They are runtime controls.

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

That is the point where it becomes useful to introduce the idea of an agent.

A practical definition is this:

> an agent is a state machine that repeatedly constructs the next LLM invocation

That definition is intentionally plain. It avoids the vague, overloaded use of the word “agent” and focuses on the mechanism that actually matters.

An agent looks at the current state, assembles an invocation, calls the model, interprets the result, and then either finishes or updates the state and continues.

In that sense, the difference between a simple chatbot and an agent is not that one is intelligent and the other is not. The difference is that the agent can continue the process when one reasoning step is not enough.

It does not merely answer. It can decide that another step is required before it can answer.

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

Even in this minimal form, two important ideas appear.

The first is that the model can return intent rather than just prose. The immediate output of a call may be “use this tool with these arguments” rather than “here is the final answer.”

The second is that tool results become part of the state. Once a tool runs, its result becomes new input for the next reasoning step.

That means the transcript is no longer just a record of user and assistant messages. It also becomes a record of observations gathered during the run.

This is the core mechanic behind practical agents. They are not just larger prompts; they are iterative reasoning systems.

A minimal example might look like this:

1. the user asks, “What are the top blockers in the current sprint?”
2. the model decides it first needs fresh Jira data
3. it requests `jira_search({ sprint: "current", status: "blocked" })`
4. the tool returns a list of blocked issues
5. that result is appended to the state
6. the model performs another reasoning step and produces the final summary

That is already enough to move from a single response to an actual agent loop.

---

## 10. Why production systems need invocation assembly

By this point, the core loop is conceptually simple. The next practical question is how each invocation gets assembled correctly.

That is where a production runtime needs a dedicated assembly step.

You can think of this as a request builder or, informally, a prompt compiler. But “invocation assembly” is the more precise name.

Its job is to gather and normalize all of the inputs required for the next reasoning step. In practice, that often includes the base policy, workspace-specific policy, the relevant transcript slice, durable memory snippets, tool definitions, channel metadata, user identity or permissions, and execution defaults.

This step is more than string concatenation. It is the place where the system decides what belongs in the next reasoning context and in what form.

A production agent needs this process to be deterministic enough to debug, inspectable enough to reason about, flexible enough to evolve, and explicit enough to test.

OpenClaw relies heavily on this layer because much of its behavior depends on assembling the right invocation at the right moment.

---

## 11. Memory is not one thing

Earlier, the transcript was introduced as the current interaction state. That is only one kind of memory.

Production agents usually need multiple memory layers, each serving a different purpose.

The first is transcript memory. This is the active turn-by-turn interaction history, and it provides the immediate continuity required for the next step.

The second is durable semantic memory. This is information worth carrying forward across many turns or even across sessions, such as user preferences, project facts, stable operating assumptions, or summaries of prior work.

The third is policy or identity files. This is not memory in the conversational sense, but it often plays a similar role because it provides persistent contextual grounding. Workspace instructions, role definitions, project conventions, and tooling boundaries all belong here.

Keeping these layers distinct matters because they age differently. Transcript grows quickly, durable memory can become stale, and policy should remain stable and versioned.

A production system therefore needs explicit rules for compaction, refresh, selection, and precedence. Without those rules, context becomes noisy, expensive, and hard to trust.

---

## 12. Reliability, orchestration, and the difference between a loop and a system

A local toy agent can get away with a simple while-loop. A production agent cannot.

Once the system runs in real environments, several new concerns appear: provider outages, rate limits, timeouts, malformed tool outputs, retries, partial failures, and the need for observability.

This is the point where it becomes useful to separate the core reasoning loop from the orchestration layer that supports it.

The core loop decides the next reasoning step. The orchestration layer makes sure that step can run reliably in the real world.

In practice, that means the runtime often needs request tracing, retries with policy-aware limits, provider fallback behavior, logging of invocation inputs and outputs, and step boundaries that can be inspected later.

This distinction matters for understanding OpenClaw. OpenClaw is not just an agent loop. It is an operational runtime around that loop.

---

## 13. Channels are adapters, not the core

Another production concern is delivery.

Users do not interact with a reasoning system directly. They interact through some surface: a chat app, a terminal, a web UI, a scheduled job, or a webhook-triggered workflow.

These are channels.

A common design mistake is to let the channel define the system. A cleaner architecture treats channels as adapters at the edge and keeps the core runtime independent of them.

That means a channel adapter should mainly receive an event, convert it into the runtime’s internal input model, invoke the core agent system, and then send the resulting output back through the channel.

The deeper reasoning machinery should not need to care whether the request came from a chat room, a CLI session, or a scheduled background task.

This is especially relevant for OpenClaw, because one of its strengths is that it can support both user-driven and system-driven threads while reusing the same internal reasoning architecture.

---

## 14. Only now: what OpenClaw is

With those building blocks in place, OpenClaw becomes much easier to describe.

OpenClaw is not best understood as “a chatbot with tools.” It is better understood as a production-grade, chat-native agent runtime that repeatedly assembles structured LLM invocations, executes an iterative reasoning loop, and wraps that loop in memory, policy, orchestration, and channel infrastructure.

That is the central idea.

Everything distinctive about OpenClaw sits on top of the first principles introduced earlier. It builds structured invocations, maintains layered context, exposes tools under explicit control, iterates when one step is not enough, runs through delivery adapters, and adds production safeguards around the whole process.

This is why it helps to delay introducing OpenClaw until this point. Once the reader already understands the underlying primitives, OpenClaw reads less like a special case and more like a concrete composition of the parts introduced earlier.

---

## 15. OpenClaw onboarding and workspace scaffolding

One thing that makes OpenClaw more practical than a bare agent loop is that it does not assume the system starts from nowhere.

A real agent benefits from a pre-shaped environment.

That means there is already a defined workspace, persistent policy files, initial conventions, a clear operating identity, and explicit boundaries for what the agent should and should not do.

This is what onboarding and scaffolding provide.

Instead of treating the agent as a blank, stateless caller, OpenClaw can initialize a workspace that gives future invocations a stable foundation.

That matters because it reduces ambiguity and makes the behavior easier to inspect, reproduce, debug, and evolve over time.

In practice, this means OpenClaw can rely on durable files, defaults, and conventions that shape invocation assembly before the model is called.

That is a major step beyond ad hoc prompting.

---

## 16. Tooling in OpenClaw: capabilities with policy gates

OpenClaw does not merely expose tools. It also governs them.

That distinction is crucial.

In a toy example, a tool list can be treated as a convenience feature. In a real system, tools are the system’s action surface.

Once a tool can read, modify, create, delete, or trigger something external, it becomes part of the trust boundary.

That is why a production agent runtime needs policy gates around capabilities. Typical examples include owner-only operations, channel-specific restrictions, read-only versus write-capable tools, sandboxed execution, explicit allow and deny rules, and confirmation requirements for destructive actions.

This is one of the clearest differences between a demo agent and a production one. A demo exposes tools. A production system exposes tools under policy.

A simple contrast makes this clearer:

- A read-only tool such as `jira_search` may be available in many contexts.
- A write-capable tool such as `jira_create_issue` may be restricted to specific users, channels, or confirmation flows.

Both are tools, but they do not belong behind the same policy boundary.

OpenClaw’s architecture becomes much easier to understand when you see tools this way: not as optional extras, but as governed capabilities in a controlled runtime.

---

## 17. Where the PI helper libraries fit

OpenClaw does not need to implement every concept from scratch inside one monolithic code path.

A cleaner architecture is to let shared helper libraries provide reusable building blocks, while OpenClaw composes them into the product-specific runtime.

That division of responsibility matters because it keeps reusable mechanics separate from product-specific behavior.

It also makes the architectural boundaries easier to explain. Some parts of the system are generic agent mechanics, while others are specific to how OpenClaw behaves as an application.

At a high level, the PI helper libraries can be understood as providing infrastructure for concerns such as model provider abstraction, request construction, agent step execution, tool registration and dispatch, shared runtime patterns, and common data structures for messages, steps, and results.

OpenClaw then adds the product-specific layer on top: channel integration, workspace conventions, onboarding flows, policy rules, routing decisions, feature composition, and application-specific orchestration.

This boundary is healthy because it makes the system easier to evolve. Shared agent mechanics can improve centrally, while OpenClaw-specific behavior can change without collapsing the abstraction boundaries.

In other words, the PI helper libraries provide core primitives and runtime support. OpenClaw turns those primitives into a concrete agent product.

---

## 18. One traced turn, end to end

With all the pieces introduced, it is useful to compress them back into one concrete end-to-end view.

A single OpenClaw turn typically begins when a message or event arrives through some channel. The channel adapter normalizes it into the runtime’s internal input model. From there, invocation assembly gathers policy, transcript, durable context, the tool surface, and execution defaults. The model is then called with the assembled invocation, and the result is inspected.

If the result requests a tool, the tool executes and its output is appended to the state. At that point, one or more additional reasoning steps may occur. Once the turn is complete, the final response is routed back through the channel, and transcript state plus any durable memory updates are persisted. Logs, traces, and step metadata remain available for inspection.

That is the full flow of a single turn.

The point is not that the implementation is simple. The point is that its complexity is layered, and each layer has a clear role.

The mental model stays stable: assemble the next invocation, run the next reasoning step, update the state, and continue until done.

Everything else in OpenClaw exists to make that loop reliable, inspectable, and useful in the real world.

---

## 19. The core idea to keep in mind

The most important shift in perspective is this:

OpenClaw is not fundamentally a prompt, a chat UI, or a pile of tool integrations.

At its core, it is a system that repeatedly constructs and executes structured reasoning invocations.

That single idea explains a large part of the architecture. It explains why policy is separate from state, why transcripts exist, why tools are first-class, why memory has layers, why orchestration matters, why channels can remain adapters, and why scaffolding and helper libraries matter so much.

Once that first principle is clear, the rest of the system becomes much easier to understand.

That is the foundation the rest of the explanation depends on.
