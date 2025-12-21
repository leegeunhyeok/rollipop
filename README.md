<div align="center">

<img alt="logo" width="300" src="logo.svg">

# Rollipop

Modern build toolkit for React Native. Powered by [Rolldown](https://rolldown.rs)

</div>

> [!WARNING]
> This project is under development (early alpha stage)

A modern build tool developed to replace Metro bundler, providing enhanced performance, scalability, and a foundation for easy integration with the Rollup/Rolldown ecosystem.

It offers Yarn PnP compatibility by default and follows ecosystem-standard module resolution instead of Haste, aiming for seamless integration in large-scale monorepo environments.

## Documentation

Documentation is currently in progress. please refer to the following:

### Installation

```bash
# npm
npm install rollipop

# pnpm
pnpm install rollipop

# yarn
yarn add rollipop
```

### Usage

Use the `rollipop` command instead of the `react-native` command. Compatibility is guaranteed, so you only need to change the command.

```bash
# AS-IS
react-native start
react-native build

# TO-BE
rollipop start
rollipop build
```

<details>

<summary>Native Integration</summary>

**Android**

Open `android/app/build.gradle` and add configuration.

```
react {
  cliFile = file("../../node_modules/rollipop/bin/index.js")
}
```

**iOS**

Open XCode, go to `Build Target > Build Phases > Bundle React Native code and images` and add `CLI_PATH` environment variable.

```bash
set -e
 
export CLI_PATH="$PROJECT_DIR/node_modules/rollipop/bin/index.js"

WITH_ENVIRONMENT="../node_modules/react-native/scripts/xcode/with-environment.sh"
REACT_NATIVE_XCODE="../node_modules/react-native/scripts/react-native-xcode.sh"
 
/bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"
```

</details>

### Configuration

You can define configuration by creating a `rollipop.config.ts` file in the project root.

```ts
import { defineConfig } from 'rollipop';

export default defineConfig({
  entry: 'index.js',
});
```

### Advanced Usage

```ts
import { Rollipop } from 'rollipop';

const config = await Rollipop.loadConfig();

// Build mode
await Rollipop.runBuild(config, buildOptions);

// Serve mode
await Rollipop.runServer(config, devServerOptions);
```

## License

[MIT](./LICENSE)
