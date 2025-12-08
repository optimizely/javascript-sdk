# Vitest Browser Testing with BrowserStack

This document describes how to run browser tests using Vitest and BrowserStack.

## Overview

The project uses Vitest browser mode to run tests in real browsers via BrowserStack. All `.spec.ts` test files in the `lib` directory are included, except for `*.react_native.spec.ts` tests.

## Prerequisites

### 1. Install Dependencies

First, install the required npm packages:

```bash
npm install --save-dev @vitest/browser webdriverio
```

### 2. BrowserStack Account

You need a BrowserStack account with access to their Automate product. Set the following environment variables:

```bash
export BROWSER_STACK_USERNAME="your_username"
export BROWSER_STACK_ACCESS_KEY="your_access_key"
```

You can find these credentials in your [BrowserStack Account Settings](https://www.browserstack.com/accounts/settings).

## Running Tests

### Run All Browsers (Chrome, Firefox, Edge on Windows 11)

To run tests on all configured browsers sequentially:

```bash
npm run test-vitest-browser
```

This will run tests on:
- Chrome (latest) on Windows 11
- Firefox (latest) on Windows 11
- Microsoft Edge (latest) on Windows 11

### Run Tests on a Specific Browser

Run tests on Chrome only:
```bash
npm run test-vitest-browser-chrome
```

Run tests on Firefox only:
```bash
npm run test-vitest-browser-firefox
```

Run tests on Edge only:
```bash
npm run test-vitest-browser-edge
```

### Custom Browser Configuration

You can run tests on any browser/OS combination by setting environment variables:

```bash
VITEST_BROWSER_NAME=safari \
VITEST_BROWSER_OS="OS X" \
VITEST_BROWSER_OS_VERSION=Ventura \
VITEST_BROWSER_VERSION=latest \
vitest run --config vitest.browser.config.mts
```

## Configuration Files

### vitest.browser.config.mts

This is the main configuration file for browser testing. It:
- Uses WebDriverIO as the provider
- Connects to BrowserStack
- Includes all `lib/**/*.spec.ts` files
- Excludes `**/*.react_native.spec.ts` files
- Uses the same path aliases as the regular Vitest config

### scripts/run-browser-tests.js

This script orchestrates running tests across multiple browsers. It:
- Validates BrowserStack credentials
- Runs tests sequentially on each configured browser
- Reports results for each browser
- Exits with an error code if any browser tests fail

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSER_STACK_USERNAME` | BrowserStack username | Required |
| `BROWSER_STACK_ACCESS_KEY` | BrowserStack access key | Required |
| `VITEST_BROWSER_NAME` | Browser name (chrome, firefox, MicrosoftEdge, safari) | chrome |
| `VITEST_BROWSER_OS` | Operating system (Windows, OS X) | Windows |
| `VITEST_BROWSER_OS_VERSION` | OS version (11, Ventura, etc.) | 11 |
| `VITEST_BROWSER_VERSION` | Browser version or "latest" | latest |
| `VITEST_SESSION_NAME` | BrowserStack session name | Browser Tests |
| `VITEST_BUILD_NAME` | BrowserStack build name | Vitest Browser Tests |

## Supported Browsers

BrowserStack supports many browser/OS combinations. Common options include:

### Windows
- Chrome (latest, or specific versions)
- Firefox (latest, or specific versions)
- Microsoft Edge (latest, or specific versions)
- Opera (latest, or specific versions)

### macOS
- Safari (various versions)
- Chrome (various versions)
- Firefox (various versions)
- Edge (various versions)

### Mobile Browsers
You can also test on mobile browsers by configuring appropriate device names and browser names.

See [BrowserStack's platform list](https://www.browserstack.com/list-of-browsers-and-platforms?product=automate) for all supported combinations.

## Troubleshooting

### Tests timing out
If tests timeout, you may need to increase timeout values in the Vitest configuration:

```typescript
test: {
  testTimeout: 60000, // 60 seconds
  hookTimeout: 60000,
}
```

### BrowserStack connection issues
- Verify your credentials are correct
- Check that your BrowserStack account has Automate access
- Ensure you haven't hit concurrent session limits

### Tests failing only in browser mode
Some tests may need browser-specific polyfills or may have different behavior in Node.js vs browser environments. Review the test output and consider:
- Adding browser-specific conditional logic
- Using browser APIs correctly
- Checking for global variables that may not exist in browsers

## Viewing Test Results

Test results will be displayed in your terminal. Additionally, you can view detailed logs and video recordings in the [BrowserStack Automate Dashboard](https://automate.browserstack.com/).

Each test session will appear with:
- Session name (e.g., "Chrome on Windows 11")
- Build name ("Vitest Browser Tests")
- Project name ("Optimizely JavaScript SDK")
- Video recording of the test run
- Network logs
- Console logs

## CI/CD Integration

To use in CI/CD pipelines, ensure the BrowserStack credentials are available as environment variables:

```yaml
# Example GitHub Actions
- name: Run Browser Tests
  env:
    BROWSER_STACK_USERNAME: ${{ secrets.BROWSER_STACK_USERNAME }}
    BROWSER_STACK_ACCESS_KEY: ${{ secrets.BROWSER_STACK_ACCESS_KEY }}
  run: npm run test-vitest-browser
```

## Differences from Karma Tests

This Vitest browser testing setup complements the existing Karma-based tests:

- **Karma tests** (`test-xbrowser`): Test the bundled SDK code
- **Vitest browser tests** (`test-vitest-browser`): Test individual modules in browser environments

Both are valuable for ensuring browser compatibility.
