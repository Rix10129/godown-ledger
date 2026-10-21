---
name: setup
description: Set up, test, and troubleshoot the repositories during Codex cloud environment onboarding, and save reusable setup instructions and configuration for user review when needed.
---

# Cloud environment onboarding

Produce a working, reusable development environment. Own the work through repository inspection, installation, startup, useful validation, and any necessary configuration changes saved for user review. After each result, take the next useful action; do not wait for the user to tell you to continue.

Read [How onboarding works](references/onboarding.md) before changing configuration or checking network access. It explains the draft, review, runtime, networking, and publication contracts. Use the available tool schemas for field-level details.

## Establish what should work

Each cloud task already runs in an isolated environment. Use the existing checkouts where appropriate; do not propose or create a Git worktree unless the user explicitly requests one. Include this guidance in any `start_skill` you save for future tasks.

Inspect the selected repositories under `/workspace`: setup documentation, agent instructions, package manifests, lockfiles, version pins, existing scripts, and CI commands.

Use the user's stated goal when provided. Otherwise, infer the standard development workflow from the repositories and proceed. Set up the components needed to develop, run, and test that workflow. For a large monorepo, prepare shared prerequisites and a representative documented component rather than every unrelated service.

Briefly state the workflow and required versus optional checks, then continue installation, startup, and validation. Keep planning proportional to the repository. Do not wait for the user to choose or confirm a reasonable default.

Before costly builds, identify the required targets, feature flags, toolchain, runtime dependencies, platform compatibility, and available resources. Choose suitable parallelism, reuse valid outputs, and explain necessary rebuilds. If goals change, adjust the remaining work without silently dropping required checks.

Ask only for missing information that cannot be inferred and prevents useful progress. Use `request_user_input_async` when available and continue independent work, including installing and validating shared prerequisites. An unanswered or skipped preference does not block the default workflow. Required permissions and credentials remain prerequisites; silence does not supply them.

Apply replies when they arrive and continue without repeating answered questions. If asynchronous input is unavailable, finish independent work before using a blocking input tool or asking in chat. Finish with a pending question only when its answer is genuinely necessary and no useful independent work remains.

If the environment is still provisioning, use its wait tool when available, check the reported state, and continue when ready. An empty workspace before readiness does not establish that the repositories are missing.

Identify required services, network destinations, environment variables, and credentials early. Check what the environment already provides before requesting additional configuration.

## Use available configuration and verify changes

Use available configuration and runtime evidence to identify what setup needs. When available, `cloud_environment.environment_status` describes the running instance, not the latest editable draft. Unknown or stale observations do not establish readiness.

Follow [Save and review the reusable configuration](#save-and-review-the-reusable-configuration) for installation and startup instructions. Use supported additive updates for secret and variable requirements. If an existing network allowlist is unavailable, report the required domain additions for environment settings rather than replacing an unknown list.

After the user saves relevant changes, retry the affected operation and resume outstanding work. A failed request alone does not establish that another approval or duplicate secret is needed. Retry after a meaningful state change or new diagnosis.

## Check existing credentials before asking for secrets

Before asking the user for a secret or environment variable, or adding it to the draft, inspect the available environment configuration and the names and presence of variables in the actual cloud machine. Reuse existing bindings and injected authentication. Inspect names and status only; never print values, dump the process environment or credential files, or copy credentials into saved setup instructions.

The platform supplies GitHub authentication through the available HTTPS Git proxy. It need not appear as `GH_TOKEN` or `GITHUB_TOKEN`. Test the required read-only Git operation with the existing configuration before asking the user to connect GitHub or supply a token. An unset token variable or a CLI login prompt does not establish missing access. See [Existing credentials and environment variables](references/onboarding.md#existing-credentials-and-environment-variables) for checks and scope limits.

Request only requirements that remain missing or unusable after those checks. Explain the specific operation they unblock, save the missing requirements in the draft, and complete independent setup work. The user can supply values securely in environment settings. Never ask for secret values in chat or invent credentials.

## Protect repository files during setup

Keep tracked repository files, application logic, tests, dependency declarations, and lockfiles unchanged during onboarding. Local configuration, helper files, and generated outputs are permitted when needed for setup. Prefer repository-supported configuration paths, locations outside the checkout, or existing ignored paths. Follow the configuration tool's explicit instructions for whole-checkout operations.

Preserve existing user files and changes; do not overwrite them blindly or embed secret values in new files. Prefer frozen-lockfile or equivalent installation modes. Check tracked changes and untracked files before and after setup, distinguish expected local setup files and outputs from unintended repository changes, and undo only unintended changes caused by your commands.

These rules apply to commands run now and to saved `install_script` and `start_skill` instructions. If setup requires changing protected repository files, first investigate supported configuration or runtime overrides. Continue independent work and report any remaining required code change for a separate coding task.

## Execute and persist through failures

Run the repository's setup commands in the actual cloud machine. Prefer its pinned tools and existing scripts. Make setup noninteractive and repeatable while respecting the repository-file restrictions above.

Preserve package-signature, artifact-checksum, and TLS verification during installation and troubleshooting. Resolve failures using authoritative sources and supported trust configuration; do not disable verification or change expected checksums to make setup pass. If verification cannot be restored, report the blocker and continue independent work.

If setup bypassed verification, stop using the affected artifacts until they have been verified or replaced through a trusted source. Restore verification and revalidate dependent outputs whose integrity is uncertain.

Do not stop at a plan, a dependency list, a successful install, or the first failed command. When a step fails:

1. Read the relevant output and isolate the failing prerequisite or command.
2. Check the repository's instructions and the installed tool versions. Consult current official documentation when an unfamiliar external tool requires it and browsing is available.
3. Make a supported correction and rerun the affected step. Each retry should test a diagnosis or follow a meaningful state change; do not loop unchanged commands.
4. Continue the remaining setup and validation after the correction succeeds.

A missing package, failed initial build, or service that takes time to start is work to investigate. A confirmed access denial, unavailable credential, unsupported capability, or user decision can require outside action. In that case, finish useful independent work first, then request the precise action through the supported flow and resume the blocked step when the prerequisite is supplied. Writing an unresolved prerequisite into `start_skill` does not complete setup.

## Run tests that demonstrate readiness

Choose checks that can actually fail when the intended workflow is broken:

- For an application, start the required services, inspect startup failures, and make a representative functional request or run an existing smoke test. A PID or open port alone is insufficient.
- For a library or test workflow, run a relevant existing test suite or representative test that exercises the installed dependencies and required services.
- Run the build, type check, or code generation needed by that workflow. A formatter or syntax check alone is insufficient when the application must run.
- Exercise the saved setup and startup steps in their documented working directories. Check repeatability where the commands modify persistent state. Stop and restart only services you started when that is useful to verify startup instructions.

Do not create user-facing web previews or links for localhost or other loopback addresses; the onboarding UI does not support them. Use local requests for internal validation and report the results in text.

Use the runner's documented outcome and preserve the underlying command's exit status when capturing or piping output. When the runner writes result files, verify they belong to the current run and selected target.

Confirm the intended tests executed and completed. Keep passed, failed, expected-failure, skipped, disabled, and unrun outcomes distinct. A zero-test run does not validate the workflow. For functional checks without test counts, verify the expected behavior directly.

Investigate failed checks to distinguish setup problems from repository defects. Fix setup problems and rerun affected checks. A confirmed application bug does not by itself make the development environment unready: report the failing behavior and which development capabilities were verified, without changing repository code. Investigate unexplained failures in required checks. They prevent a readiness claim; continue useful diagnosis and independent setup.

Do not replace meaningful tests with trivial passing checks, disable assertions, or describe unexecuted commands as verified. Once environment validation is complete and remaining failures are diagnosed, stop expanding into unrelated suites.

## Save and review the reusable configuration

Before finishing, check for required tool activation, environment initialization, installation, and service startup steps. Capture the steps future tasks need and verify the affected operations.

Use `update_environment_config_draft` to save necessary `install_script` and `start_skill` contents, even when their existing saved values cannot be read. Do not ask whether those fields already contain instructions as a prerequisite to saving. Preserve known user requirements and omit fields unrelated to the change.

Supply complete, tested instructions with working directories and readiness checks. For workflows requiring running services, register their startup instructions in `start_skill`; helper files on disk alone do not complete this step. Separate retained files and dependencies from processes that must restart.

Save `install_script` only when commands are needed to reproduce or refresh setup. Do not create boilerplate scripts or startup instructions merely to populate fields. If no configuration changes are needed, omit the draft save and complete any remaining setup and validation.

Batch related changes and continue independent setup and validation. Configuration review is nonblocking: do not use input tools to request review or approval of the saved draft. Direct the user to environment settings for required edits or secure value entry. Report exactly what was saved and what remains outstanding. Saving persists configuration; it does not execute scripts, apply runtime changes, or publish.

## Finish with evidence

Finish when the environment supports the selected development workflow and necessary reusable configuration is saved. Otherwise, continue until useful independent work is exhausted and a concrete external blocker prevents progress.

Give a concise report: the workflow prepared, capabilities verified, checks that passed or failed, configuration fields saved, remaining limitations, and any action the user needs to take. Distinguish environment blockers from confirmed repository defects and optional checks.

Do not call an environment ready or fully configured while required setup remains unresolved or required startup instructions are unsaved. Do not claim application behavior works when its checks failed. Distinguish current-instance validation, saved configuration, publication, and validation in a new task; claim each only when supported by evidence.

Explain concrete outcomes and next steps in plain language. Keep any required explanation of an instruction or restriction brief.
