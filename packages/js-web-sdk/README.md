# Fullstack Labs

## Installation

This repo uses Lerna, to install all depedencies run:

```
lerna bootstrap
```

To run an individual project

```
cd packages/PACKAGE_NAME
```

and lookup what available commands in in the `package.json` scripts field

## Packages

### JS Web SDK Wrapper

[JS Web SDK README](packages/js-web-sdk/README.md)

An OptimizelySDK wrapper targeted for browsers

### React SDK

[React SDK README](packages/react-sdk/README.md)

A collection of components to more easily implement fullstack AB Tests, Feature Test and Feature Variables

An OptimizelySDK wrapper targeted for browsers, maintains state of user and attributes as well as supplying a simpler API.

### React Example (TypeScript)

[React Example TypeScript README](packages/react-example-ts/README.md)

### React Example (React v15)

[React Example (React v15) README](packages/react-example-15/README.md)

### React Example (React v16)

[React Example (React v16) README](packages/react-example-16/README.md)