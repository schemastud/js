---
library: '@rjsf/validator-ajv8'
tier: primary
version-read: 6.6.2
docs: node_modules/@rjsf/validator-ajv8/README.md
date: 2026-11-12
arrives: declared
related: [rjsf.core.md]
---

## What it is here

Seam declares this peer and constructs validators with a customized AJV2020 class. Its validator and option types are in seam's public signatures.

## Concept index

### node_modules/@rjsf/validator-ajv8/

| Concept | Role | Read |
| --- | --- | --- |
| Package | Upstream overview | README.md |
| Customization | Localizer is the second argument | lib/customizeValidator.d.ts |
| Localizer | Mutates AJV ErrorObject messages | lib/types.d.ts |
| Validation lifecycle | Quotes property parameters before localizing, restores them afterwards | lib/validator.js |
| Error projection | Converts localized AJV errors to RJSF errors and schema titles | lib/processRawValidationErrors.js |

## House overlay

See [validator](../../../seam/src/validator.ts) and its existing [regression tests](../../../seam/tests/validator.test.ts). Preserve caller AJV options and both admitted schema dialects.

## Traps

The draft-07 default rejected generated draft-2020-12 documents, producing a caught root error and preventing submission. The measured incident and the AJV2020 plus additional-meta-schema repair are recorded in [validator](../../../seam/src/validator.ts) and [validator tests](../../../seam/tests/validator.test.ts).
