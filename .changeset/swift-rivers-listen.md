---
"rollipop": minor
---

Add `envFile` configuration option for customizing the basename used to resolve environment files. Defaults to `.env`; the loader still looks for `${envFile}`, `${envFile}.local`, `${envFile}.[mode]`, and `${envFile}.[mode].local`. Set it to a custom basename such as `.rollipop-env` to opt out of the default `.env` naming.
