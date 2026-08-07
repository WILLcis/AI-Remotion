# AI-Remotion Video Job Intake

Internal helper for an Agent that receives a plain-language video request. It returns a reviewable Video Job draft or clarification questions. It does **not** select a specialist, call a provider, or render.

Humans should start at `agents/START_HERE.md`. The Video Producer Agent owns writing the Job after confirm, routing, and specialist dispatch — do not instruct the user to run these CLIs.

## Required procedure (Agent-internal)

1. Read `AGENTS.md` and this file when intake rules are unclear; otherwise follow `agents/video-producer/AGENT.md` plain-language entry.
2. Extract only facts the caller explicitly supplied: intent, known local refs, output defaults, and an approved digital-human provider when requested.
3. If duration, aspect ratio, language, local refs for media-backed requests, or provider are missing, return `needs_clarification`. Do not invent them.
4. Optionally construct an Intake Request JSON and run:

   ```bash
   npm run video:intake -- --request path/to/request.json
   ```

5. If the decision is `draft_ready`, summarize the draft for the user. All review gates remain `pending`.
6. After the user confirms the draft in the same conversation (one sentence is enough), the **Video Producer** path may write the Job and call `video:route` with the platform flag enabled. Intake itself still does not route or render.

## Safety rules

- A URL, product name, person, video, audio file, or provider name in a request is not proof of local availability, rights, credentials, or approval.
- Do not infer source refs, asset rights, provider credentials, product facts, factual claims, or final-render approval.
- Existing-video, music, deck, GitHub PR, and Remotion-project requests require caller-provided local/approved refs.
- Digital-human requests require an explicit provider; do not default to HeyGen or another provider.
- Do not call `video:route` with the platform flag disabled. Do not set review gates to approved.

## Result contract

```json
{
  "status": "draft_ready | needs_clarification | blocked",
  "draft_job": null,
  "missing_fields": [],
  "questions": [],
  "assumptions": [],
  "next_action": ""
}
```

`draft_ready` is not production approval. The draft must retain pending `script`, `storyboard`, and `final_render` gates.
