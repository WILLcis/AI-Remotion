# Video Producer Specialist Map

This map is host-neutral. The profile paths are ordinary repository Markdown files; read the route-selected profile directly rather than relying on a host's automatic agent discovery.

The Video Job route JSON is authoritative. Do not choose a row from this table before running `npm run video:route` with `FLAGS.VIDEO_AGENT_PLATFORM` enabled.

| workflow | primary_agent | renderer | profile |
| --- | --- | --- | --- |
| product-promo | product-promo-producer | hyperframes | `.devin/agents/product-promo-producer.md` |
| digital-human | digital-human-producer | remotion | `.devin/agents/digital-human-producer.md` |
| faceless-explainer | faceless-explainer-producer | remotion | `.devin/agents/faceless-explainer-producer.md` |
| existing-video-recut | existing-video-recut-producer | hyperframes | `.devin/agents/existing-video-recut-producer.md` |
| shorts-repackage | shorts-repackage-producer | hyperframes | `.devin/agents/shorts-repackage-producer.md` |
| embedded-captions | embedded-captions-producer | hyperframes | `.devin/agents/embedded-captions-producer.md` |
| pr-video | pr-video-producer | hyperframes | `.devin/agents/pr-video-producer.md` |
| music-video | music-video-producer | hyperframes | `.devin/agents/music-video-producer.md` |
| video-translation | video-translation-producer | remotion | `.devin/agents/video-translation-producer.md` |
| motion-graphics | motion-graphics-producer | hyperframes | `.devin/agents/motion-graphics-producer.md` |
| slideshow | slideshow-producer | hyperframes | `.devin/agents/slideshow-producer.md` |
| remotion-port | remotion-port-producer | hyperframes | `.devin/agents/remotion-port-producer.md` |

## Compatibility rule

`.devin/` is the current storage location for profile Markdown, not a requirement to use the Devin host. A new host adapter must point to `agents/video-producer/AGENT.md` and this map; it must not copy specialist instructions or implement its own routing rules.
