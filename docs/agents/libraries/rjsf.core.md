---
library: '@rjsf/core'
tier: primary
version-read: 6.6.2
docs: node_modules/@rjsf/core/README.md
date: 2026-11-12
arrives: declared
related: [rjsf.validator-ajv8.md]
---

## What it is here

Seam declares this peer and extends its FormProps in SchemaForm, wrapping the theme and widget registry. Its types form part of seam's public form API.

## Concept index

### node_modules/@rjsf/core/

| Concept | Role | Read |
| --- | --- | --- |
| Form and themes | Library entry and upstream documentation router | README.md |
| Form props | Validator, translator, UI schema and caller overrides | lib/components/Form.d.ts |
| Submit button | Submit copy is a UI-schema option | lib/components/templates/ButtonTemplates/SubmitButton.js |

### node_modules/@rjsf/utils/src/

| Concept | Role | Read |
| --- | --- | --- |
| Translatable strings | Enum names and English/positional defaults | enums.ts |
| English translator | Existing fallback implementation | englishStringTranslator.ts |
| Parameters | RJSF's positional replacement contract | replaceStringParameters.ts |

## House overlay

See [seam](../../../seam/README.md), [SchemaForm](../../../seam/src/SchemaForm.tsx) and [theme overrides](../../../seam/src/theme-overrides.tsx). Caller theme, widgets and templates retain their existing precedence. Localization uses the one messages peer; a form creates no MessageProvider.
