# Phase 2: Filtering, Configuration & Control Directives Implementation Prompt

**Context:**
You are extending the Inclusive Language Linter built in Phase 1. You will now add configuration handling, filtering rules, and in-document directives to give users control over what violations are reported.

**Objective:**
Implement the `Configuration` object handling, logic for mutually exclusive Allow/Deny lists, and support for in-document control directives (for Markdown/MDX).

**Requirements from Functional Specification:**

1. **Configuration Object:**
   - Extend the common input parameters to accept an optional `Configuration` argument.
   - Handle Form 1: Array of Strings (interpreted as an Allow List to suppress listed rules).
   - Handle Form 2: Object with `AllowList`, `DenyList`, `DisableBinaryPairs`, and `ProfanityThreshold` (0, 1, or 2).
   - Handle Form 3: Undefined (all rules active, binary pairs allowed, profanity threshold 0).

2. **Filtering Logic:**
   - Apply configuration to filter the `Messages` array generated in Phase 1.
   - Enforce Mutual Exclusivity: If both `AllowList` and `DenyList` are provided, synchronously throw the error "Do not provide both allow and deny configuration parameters".

3. **In-Document Control Directives:**
   - Implement logic to process HTML comments in Markdown and MDX documents as control nodes.
   - `<!--aegis ignore [rules]-->`: Suppress specified rules (or all if omitted) for the **next** content node.
   - `<!--aegis disable [rules]-->`: Suppress specified rules (or all if omitted) from this point forward.
   - `<!--aegis enable [rules]-->`: Re-enable specified rules (or all if omitted).

4. **Profanity Sureness & Binary Pairs Logic:**
   - Ensure `ProfanityThreshold` correctly filters profanity warnings (e.g., a threshold of 1 hides 0-rated profanities).
   - Use `DisableBinaryPairs` config to toggle whether compensating gendered phrases ("he or she") are flagged or accepted.

**Task:**
Please write the code to parse configuration inputs, handle in-document HTML comment directives, and filter the diagnostic messages before they are returned on the `VirtualFile`.
