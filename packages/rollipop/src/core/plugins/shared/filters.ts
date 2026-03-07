import { exclude, or, id } from '@rollipop/rolldown-pluginutils';

export const ROLLDOWN_RUNTIME_EXCLUDE_FILTER = exclude(
  or(id(/rolldown\/runtime/), id(/@oxc-project\+runtime/)),
);
