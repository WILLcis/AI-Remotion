.PHONY: bootstrap captions-sample check qa-sample test-unit test-integration render-sample validate-sample voice-sample verify-harness

bootstrap:
	npm install

check:
	npm run typecheck
	npm run lint
	npm run validate:sample
	npm test
	npm audit --audit-level=low

test-unit:
	npm test

test-integration:
	npm run render:sample

render-sample:
	npm run render:sample

captions-sample:
	npm run episode:captions -- --episode sample

qa-sample:
	npm run episode:qa -- --episode sample

voice-sample:
	npm run episode:voice -- --episode sample --provider silent

validate-sample:
	npm run validate:sample

verify-harness:
	bash tools/verify.sh
