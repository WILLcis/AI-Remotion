.PHONY: bootstrap check test-unit test-integration render-sample verify-harness

bootstrap:
	npm install

check:
	npm run typecheck
	npm run lint
	npm test
	npm audit --audit-level=low

test-unit:
	npm test

test-integration:
	npm run render:sample

render-sample:
	npm run render:sample

verify-harness:
	bash tools/verify.sh
