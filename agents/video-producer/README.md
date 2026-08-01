# Portable Video Producer Package

Use this directory when handing AI-Remotion video work to any Agent framework.

1. Give the Agent `AGENT.md` and a Video Job YAML/JSON file.
2. The Agent enables `FLAGS.VIDEO_AGENT_PLATFORM` for the route command.
3. It runs `npm run video:route -- --job <job-file>`.
4. It reads the route-selected profile using `SPECIALISTS.md`.
5. It stops at pending review gates and returns the result JSON.

No global installation, symlink, host-specific plugin, or cloud account is required for this package. The host only needs repository read access and permission to run the local npm command.

## Host adapters

A host adapter may expose this entry point through its own discovery mechanism, but must remain thin:

- point to `agents/video-producer/AGENT.md`;
- preserve `npm run video:route` as the routing authority;
- preserve the feature flag and approval rules;
- never duplicate all specialist profiles into an adapter format.

The existing `.devin/skills/video-producer/` directory is one such discovery adapter. It does not replace this package.
