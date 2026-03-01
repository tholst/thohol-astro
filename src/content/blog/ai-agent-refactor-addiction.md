---
title: The Addictive Loop of AI-Agent Refactoring
description: When “just one more improvement” turns into 10 hours and 140 commits, it is worth asking what you are optimizing for.
pubDate: 2026-02-14
published: false
---

![A meme-style poster reading "Not now sweetie" and "Mommy is in a three-hour 'quick refactor' suggested by an AI agent".](/images/blog/ak5jq5.jpg)

I recently did a refactor where I spent about **10 hours** prompting an AI coding agent and ended up with roughly **140 commits**.

Some of that work was legitimately useful: simplifying modules, tightening types, deleting dead code, clarifying names, adding tests, making everything easier to change.

But at some point I caught myself thinking: was any of this _necessary_? Or did I just get stuck in the loop because the agent kept succeeding and I kept seeing another “small” improvement worth making?

## Why It Feels So Good

The addictive part is not the AI. It is the feedback loop.

1. You notice a tiny inconsistency.
1. You ask the agent to fix it.
1. It fixes it.
1. The diff looks clean.
1. New possibilities appear (“now we can also…”).
1. Repeat.

Refactoring used to have friction: figuring out where to start, keeping dozens of constraints in your head, making changes without breaking things, doing the boring renames, updating call sites, chasing edge cases.

With an agent, the friction drops. The “activation energy” is often just a prompt.

And when the agent is on a streak, it feels like discovering a slot machine that pays out in tidy diffs.

## The “140 Commits” Trap

Lots of commits can be good engineering hygiene. Small steps are safer, reviews are easier, bisects are possible.

But “many commits” can also be a smell:

- the work is being split into tiny dopamine hits
- the refactor has no clear finish line
- each improvement creates a new itch that demands scratching
- you are optimizing local cleanliness instead of global outcomes

The sneaky part is that every individual change can be defensible. It is the sum that becomes questionable.

## What You Might Be Trading Away

When I get into this loop, the costs tend to show up later:

- **Opportunity cost:** the best refactor is sometimes shipping the feature and learning what actually hurts.
- **Review fatigue:** even if each commit is small, the overall narrative gets hard to follow.
- **Architecture churn:** “improving” structure without a product-driven reason can make the codebase less stable.
- **False confidence:** the agent’s momentum can mask missing tests or shaky assumptions.
- **Personal skill atrophy:** if I never do the hard mental work, I stop practicing it.

None of these are inevitable, but they are common failure modes when the tool makes iteration feel unlimited.

## Guardrails That Actually Help

These are the guardrails I wish I had set _before_ starting the marathon:

### 1) Define a “Done” Condition Up Front

Pick something measurable:

- “Remove module A; everything compiles; tests pass.”
- “Extract parsing into a pure function; add 5 tests; no behavior change.”
- “Reduce bundle size by X; keep lighthouse above Y.”

If you cannot define “done”, you are not refactoring, you are gardening.

### 2) Timebox the Loop

If you feel the agent is “just working”, it is easy to keep going forever.

I now try:

- 45 minutes focused work
- 10 minutes stop-and-assess

Ask: “If I stop now, what have I improved for users or for future me?”

### 3) Batch by Intent, Not by Diff Size

If you end up with 140 commits, consider squashing by theme:

- “rename + move + delete” can be one coherent story
- “behavior changes” should stand alone
- “test additions” should be easy to review as a unit

Optimizing for a clean review narrative is a better target than optimizing for micro-commits.

### 4) Require Tests for Any Non-Trivial Refactor

Agents are great at transforming code. They are also great at accidentally transforming behavior.

My rule of thumb: if the refactor touches logic, I add a test or I do not do the refactor.

## When The Addiction Is Actually Fine

There is a version of this “addiction” that is healthy:

- you are learning the codebase faster
- you are deleting complexity that slows you down every day
- you are building good taste through repeated small improvements

The line is crossed when the loop becomes the goal.

If the reason you are continuing is “because it is working”, you might be optimizing for the feeling of progress instead of progress.

## A Question I Am Trying To Ask More Often

Before I type the next prompt, I try to ask:

> If I could only ship one outcome from this session, what would it be?

If I cannot answer that in a sentence, I probably need to stop refactoring and go back to the product problem.
