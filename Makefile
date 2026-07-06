.PHONY: batch-sample bootstrap canonical-demo captions-sample check config-check new-sample qa-sample render-episode-sample test-unit test-integration render-sample validate-sample voice-sample verify-harness

bootstrap:
	npm install

canonical-demo:
	npm run demo:canonical

batch-sample:
	npm run episode:batch -- --episodes sample --steps validate,qa --dry-run

check:
	npm run typecheck
	npm run lint
	npm run validate:sample
	npm test
	npm audit --audit-level=low

config-check:
	npm run config:check

test-unit:
	npm test

test-integration:
	npm run render:sample

render-sample:
	npm run render:sample

captions-sample:
	npm run episode:captions -- --episode sample

new-sample:
	npm run episode:new -- --id sample-draft

qa-sample:
	npm run episode:qa -- --episode sample

render-episode-sample:
	npm run episode:render -- --episode sample

voice-sample:
	npm run episode:voice -- --episode sample --provider silent

validate-sample:
	npm run validate:sample

verify-harness:
	bash tools/verify.sh
