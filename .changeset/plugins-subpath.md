---
"rollipop": patch
---

Replace `BuiltinPlugins` namespace with the `rollipop/plugins` sub-path. Built-in plugins are now imported by name:

```ts
// Before
import { BuiltinPlugins } from 'rollipop';
plugins: [BuiltinPlugins.worklets()];

// After
import { worklets } from 'rollipop/plugins';
plugins: [worklets()];
```
