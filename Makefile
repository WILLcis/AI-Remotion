.PHONY: bootstrap check test-unit test-integration render-sample validate-sample verify-harness

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

validate-sample:
	npm run validate:sample

verify-harness:
	bash tools/verify.sh
