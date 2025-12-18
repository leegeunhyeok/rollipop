// oxlint-disable no-unused-vars

/**
 * For CJS modules without export statements, an error occurs when the HMR boundary references a non-existent module identifier (appears to be a rolldown bug).
 * I've added an empty module object as a temporary workaround for the reference issue.
 * 
 * @see https://github.com/rolldown/rolldown/pull/7544
 */
var module = { exports: {} };
