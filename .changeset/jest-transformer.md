---
"rollipop": minor
---

Add `rollipop/jest` transformer, a drop-in replacement for `babel-jest` backed by rollipop's own transform pipeline. Wire it into `jest.config.js` via `transform: { '^.+\\.(js|jsx|ts|tsx)$': require.resolve('rollipop/jest') }`. The transformer runs the same react-native-codegen-marker, Flow strip, babel and swc plugins the bundler uses, with jest-tailored swc preset overrides (`externalHelpers: false`, `module: { type: 'commonjs' }`, `jsxRuntime: 'automatic'`, compile-time `import.meta.env` → `process.env` / `import.meta.hot` → `undefined` rewrites). Flow syntax is stripped via `flow-remove-types` with a babel fallback for modern Flow declaration forms (e.g. `component Foo(...)`). `TransformerConfig.swc` gains a matching `preset` field (`externalHelpers`, `module`, `jsxRuntime`, `define`) so users can apply the same overrides from `rollipop.config.ts` when needed.
