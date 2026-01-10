title: OsmoGrep
subtitle: TUI based self-healing agent
author: Kaushal Choudhary
date: 2026-01-10
# OsmoGrep

![osmogrep](/images/osmogrep.png)

Osmogrep started from a very simple observation: modern coding agents and LLMs can write code, but they cannot verify it. Coding models can generate functions in many languages, yet real codebases require full compatibility, deterministic behavior and aligned execution. 

LLMs hallucinate, skip edge cases, forget invariants and often fail to integrate with the surrounding system. I experienced this while trying to use Codex on tinygrad PRs. After multiple prompt iterations and manual tweaks, the generated patches still broke behavior and were not testable.

This led to OsmoGrep. It is a deterministic, execution based system that validates code via real test execution rather than pattern matching or static heuristics. The entire philosophy is simple: if code changes cannot survive the test suite, they do not ship.

# Who is OsmoGrep for?

OsmoGrep is designed for developers who work with evolving codebases where correctness matters. This includes contributors to large Python or Rust projects, maintainers of ML frameworks, and engineers adopting AI-assisted coding workflows who want reproducibility and no silent regressions. If you use LLMs for code generation but do not fully trust the output, OsmoGrep gives you an execution-first guardrail.

# How OsmoGrep is Different

OsmoGrep uses the full implementation context and generates or updates tests based on actual behavior. It then executes the complete test suite to verify coherence. Traditional agent workflows tend to fail in familiar ways:

* diffs look correct but contain subtle behavioral shifts,
* linting passes but runtime behavior breaks due to hidden side effects,
* CI catches issues too late, after the merge or push,
* LLM reasoning is often incorrect because no code is executed.

OsmoGrep avoids these pitfalls by:

* analyzing diffs semantically using ASTs,
* constructing safe ephemeral sandboxes,
* running tests deterministically,
* capturing logs, timings and behavior traces,
* generating minimal safe patches that can be applied or reverted cleanly.

This makes it resilient and predictable, even when dealing with multi-file changes or complex, stateful code.

# OsmoGrep Architecture

![osmogrep-architecture](/images/osmo-arch.svg)

## Pipeline Breakdown

### 1. Diff Scoping

Osmogrep begins by extracting meaningful diffs using `git diff --cached`, focusing only on staged changes. It filters out whitespace, comments and formatting adjustments. Only behavior-relevant modifications are considered. For each changed function, OsmoGrep loads the full implementation and treats each one as an independent diff patch to analyze. This keeps the system focused and precise.

#### **Example** :

This first code shows the original python function `sparse_categorical_crossentropy` function.

```python
# first code with no changes
  def sparse_categorical_crossentropy(self, Y, ignore_index=-1) -> Tensor:
    # NOTE: self is a logits input
    loss_mask = (Y_int != ignore_index)
    y_counter = Tensor.arange(self.shape[-1], dtype=dtypes.int32, requires_grad=False, device=self.device).unsqueeze(0).expand(Y.numel(), self.shape[-1])
    y = ((y_counter == Y.flatten().reshape(-1, 1)).where(-1.0, 0) * loss_mask.reshape(-1, 1)).reshape(*Y.shape, self.shape[-1])
    return self.log_softmax().mul(y).sum() / loss_mask.sum()
```

This is the modified code, I added type casting. so, osmogrep will pick this up as a valid change.

```python
# second code with changes 
  def sparse_categorical_crossentropy(self, Y, ignore_index=-1) -> Tensor:
    # NOTE: self is a logits input
    Y_int = Y.cast(dtypes.int32)  # added this type casting
    loss_mask = (Y_int != ignore_index)
    y_counter = Tensor.arange(self.shape[-1], dtype=dtypes.int32, requires_grad=False, device=self.device).unsqueeze(0).expand(Y.numel(), self.shape[-1])
    y = ((y_counter == Y.flatten().reshape(-1, 1)).where(-1.0, 0) * loss_mask.reshape(-1, 1)).reshape(*Y.shape, self.shape[-1])
    return self.log_softmax().mul(y).sum() / loss_mask.sum()
```

This diff can be used for our TestCandidate wrapping, so it could be passed to LLM.

### 2. Test Candidate Generation

Each extracted diff becomes a `TestCandidate`. This object contains the changed file, symbol, risk level and whether it should trigger new or updated tests. The candidate formalizes the testing intent and ensures the agent receives exactly the necessary context.

### 3. Context Assimilation

Using `FullContextSnapshot`, OsmoGrep builds a complete semantic view of the codebase. It loads the relevant file, parses it using an AST, maps symbols and imports, identifies relationships and locates associated tests. When tests do not exist, it marks this and instructs the agent to generate them. This ensures consistent and aligned testing behavior.

### 4. Running the Agent

OsmoGrep supports three workflows:

1. Single test flow (`agent run <diff_number>`): for generating or repairing tests for a specific function or change. Useful for atomic commits or regression additions.
2. Full suite mode (`agent run -full` with optional `--reload`): runs all tests first, generates a report, then identifies and heals failing tests automatically using feedback loops and context-aware prompts.
3. Parallel mode (`agent run --all`): processes all diffs concurrently using isolated subagents and sandboxes. Tests are materialized only after they pass verification.

All operations occur on a dedicated agent branch. You can safely delete it without impacting the main branch, keeping workflows clean and reversible.

# OsmoGrep in Action

Here is Osmogrep running end-to-end.

![osmogrep-wrking](/images/osmogrep.gif)

[Osmogrep](https://github.com/kaushal07wick/OsmoGrep) is open to contributions, feel free to contribute and let me know your thoughts on this.


# Roadmap

Planned next steps:

* containerized execution backend,
* multi-language AST diffing,
* dependency-aware test graphs,
* automatic PR generation,
* direct implementation fixing beyond test healing.

# Conclusion

Osmogrep is still evolving, but it already proves something important. Reliable AI coding assistance does not come from generating more code. It comes from grounding every step in execution, verification and real behavior. 

This project helped me understand that the future of coding agents is not about larger models or clever prompting, but about tighter integration with the actual runtime and the developer workflow. 

Osmogrep will continue to grow toward that vision: a practical, reproducible system that validates code changes automatically and helps developers ship with confidence.
