# Lightweight monorepo orchestration for agents and humans.
# Usage: make help

.PHONY: help web-install web-dev web-lint web-test web-build web-format web-format-check \
	android-test android-lint android-detekt android-assemble ci-web ci-android

help:
	@echo "Recall monorepo targets"
	@echo "  make web-install        Install web deps (npm ci)"
	@echo "  make web-dev            Start Next.js dev server"
	@echo "  make web-lint           ESLint web"
	@echo "  make web-test           Vitest (with coverage thresholds)"
	@echo "  make web-build          Production build"
	@echo "  make web-format         Prettier write web sources"
	@echo "  make web-format-check   Prettier check web sources"
	@echo "  make android-test       Android unit tests"
	@echo "  make android-lint       Android lintDebug"
	@echo "  make android-detekt     Detekt static analysis"
	@echo "  make android-assemble   Debug APK"
	@echo "  make ci-web             lint + test + build (web)"
	@echo "  make ci-android         test + detekt + lint (android)"

web-install:
	cd web && npm ci

web-dev:
	cd web && npm run dev

web-lint:
	cd web && npm run lint

web-test:
	cd web && npm test

web-build:
	cd web && npm run build

web-format:
	cd web && npm run format

web-format-check:
	cd web && npm run format:check

android-test:
	cd android && ./gradlew :app:testDebugUnitTest --no-daemon

android-lint:
	cd android && ./gradlew :app:lintDebug --no-daemon

android-detekt:
	cd android && ./gradlew detekt --no-daemon

android-assemble:
	cd android && ./gradlew :app:assembleDebug --no-daemon

ci-web: web-lint web-test web-build

ci-android: android-test android-detekt android-lint
