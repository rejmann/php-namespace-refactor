.PHONY: tests
all: help
SHELL=bash

# Absolutely awesome: http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html
help: ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-24s\033[0m %s\n", $$1, $$2}'

setup: ## setup
	rm -rf .vscode-test dist node_modules out
	npm install
	npm run compile
	npm run compile-tests

test: ## run tests
	npm run test
