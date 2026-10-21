# How Codex cloud onboarding works

## Machine, configuration, and publication

The configuration may start with no repositories. The product creates a configuration, acquires its build environment, and attaches the task to that environment with `/workspace` as the working directory. Provisioning may still be in progress when the task starts. Inspect the actual checkouts and reported runtime state before deciding what is missing.

The running machine and its saved configuration are different things. Commands you execute prepare the machine. `install_script` stores the complete shell instructions for reproducing or refreshing that setup; `start_skill` stores instructions an agent can use to start the development workflow. Both fields are optional; save or change each only when the selected workflow needs it. Neither field is executed by the draft-saving tool. Saving instructions does not replace doing the work in the current machine.

The user publishes the prepared environment through the product after setup. Publication snapshots prepared filesystem state, creates an active configuration version, and restores/reconnects the onboarding environment. Later machines can restore the completed snapshot without repeating checkout and setup. Live processes, open connections, and runtime authentication must not be assumed to survive. When the workflow requires services to run, keep their startup and readiness instructions in `start_skill`; do not rely on a server you launched during installation remaining alive in a new machine.

The onboarding task remains associated with the configuration so the user can continue refining it. Updating a draft does not establish that a new snapshot was published, and publishing a version does not migrate unrelated running tasks. Do not invoke prototype-only `finalize_environment` or manufacture publication links or IDs.

## Existing credentials and environment variables

Before requesting new values, inspect available configuration metadata and existing secret/environment-variable binding names. In the actual cloud execution context, inspect environment variable names and whether required variables are set, without printing their values. In Bash, `compgen -e` lists exported variable names without their values. Do not use `env`, `printenv`, shell tracing, or credential-file dumps to discover configuration. A declared binding or present variable is evidence to investigate; verify that the operation which needs it works.

GitHub authentication is injected by the platform proxy into scoped HTTPS requests. A raw token need not exist in the process environment or a local GitHub CLI login. Test native Git access with a read-only command such as `git ls-remote origin HEAD` from the selected checkout, using its existing HTTPS remote and proxy configuration. Do not request a personal access token merely because `GH_TOKEN` or `GITHUB_TOKEN` is unset or `gh` requests login. Do not extract proxy-held credentials or replace platform authentication.

Access is scoped: a successful Git read does not establish GitHub API access, push permission, access to another repository, or private package-registry access. Test the specific destination and operation required by setup. Diagnose network policy, credential propagation, expiry, and authorization errors before deciding a new secret is needed. Recheck affected operations after configuration review; do not add duplicate requirements for credentials that already work.

Proxy-backed secret variables can contain placeholders that the proxy replaces only on configured HTTPS destinations. Use those bindings through their supported route; do not treat a placeholder as an invalid token or assume it is a raw credential available to a local process. Ask the user only for the remaining missing binding or access change, through the draft and review flow below.

## Network and VPN access

If the user configures a VPN, the platform manages it in an egress-proxy sidecar. Use the provided network configuration and runtime networking guidance to reach required services through supported proxy routes. Do not install or configure a separate VPN client in the agent container.

For connectivity checks, use non-destructive operations against the required service and protocol.

The agent cannot directly inspect live VPN status. Report service responses and proxy errors as observed results. Configured settings do not prove connectivity, and a failed request alone does not establish that the VPN is disconnected.

## Draft tool contract

`update_environment_config_draft` uses trusted task metadata to select and authorize the configuration. Do not supply environment IDs, credentials, or hidden metadata as tool arguments.

The tool does not expose a read of existing saved configuration. Supplying `install_script` or `start_skill` replaces that field's complete contents; omitting a field preserves it. Save necessary instructions without requiring an existing-value read, and report which fields were written.

Its `config` fields are:

| Field                     | Meaning                                                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `install_script`          | Complete installation/setup script. Omission or null preserves the current value; `""` clears it.                                                                                                                                                      |
| `start_skill`             | Complete agent startup instructions, including directories and checks. Omission or null preserves the current value; `""` clears it.                                                                                                                   |
| `network.allowed_domains` | Replacement list of allowed hostnames, optionally wildcarded. No URL schemes, paths, or ports. Preserve other destinations the workflow still needs; `[]` clears the explicit list. Omit `network` to preserve it.                                     |
| `environment_variables`   | List of objects with a required `name` and optional non-secret `suggested_value`, such as `{"name": "NODE_ENV", "suggested_value": "development"}`. Users review or edit suggestions and enter secret values securely. Existing bindings are preserved. |
| `secrets`                 | Add secret requirements by name, using `source: "environment"` and an `environment_variable` target. The proxy replaces placeholders on the specified HTTPS destinations; this is not a general way to put raw credentials in a local file or process. |

For a proxy secret, a declaration looks like:

```json
{
  "name": "PACKAGE_TOKEN",
  "source": "environment",
  "target": {
    "type": "environment_variable",
    "name": "PACKAGE_TOKEN",
    "allowed_domains": ["packages.example.com"]
  }
}
```

An empty destination list leaves a proxy secret declaration inert. Saving proxy-secret destinations automatically adds them to the saved allowed-domain list for restricted Internet access. Disabled access becomes restricted when destinations are present; unrestricted access remains unchanged. Respect reserved target names reported by the schema. Do not put secret values in scripts, tool arguments, files, logs, or chat. Do not dump the process environment to check whether a variable is present.

Secret declarations merge with existing bindings; omission, null, and `[]` add nothing. Conflicting targets or sources require user editing in the review UI. Do not guess secret IDs or remove existing requirements as a workaround. Use the current tool schema if supported fields change.

## Review and continue

Batch related configuration changes and save them when ready. Continue independent setup, service startup, and validation using the available configuration. If the existing configuration is sufficient and there are no pending changes, no draft save is needed. If missing configuration blocks all remaining useful work, save the requirements and finish the turn with the exact blocker.

A successful tool result contains `status: "saved"` and a `draft_id`. That confirms draft persistence. Agent draft saves do not execute scripts, apply changes to the running environment, or publish it. Saving configuration edits through the user-facing editor can request a runtime update; propagation can be asynchronous. Recheck the affected operation before claiming it works.

Review does not block the agent or chat. Do not call `request_user_input` or `request_user_input_async` to request configuration review or approval. Save related requirements, continue independent setup and validation, and finish the turn when the workflow is ready or further useful progress needs outside action.

The user reviews configuration and enters required values in environment settings. Refer to a specific action only when the product provides it. Review and saving are separate from publication. Do not wait for review to finish independent work or claim an untested operation now works.

If saving fails or has an uncertain outcome, report that persistence is unconfirmed. Diagnose the error before attempting another write; do not blindly retry a conflict or ask the user to inspect the panel to establish backend success. When the user continues after supplying a prerequisite, recheck the affected operation and resume unfinished installation, startup, and testing.

Finish the task with a clear account of what passed and what is ready for the user to publish. The product owns publication, operation polling, and reconnection; a successful setup command or saved draft is not proof those later steps succeeded.
