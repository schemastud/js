# Captured request-schema specimen

`beam-schema-input.json` is the actual `schemas` edit-schema response captured from
`rushing/stephenrushing` on 2026-09-22 after the `BeamSchemaInputData` MapValues/widget
repair and required-artifact declaration. It reproduces the mounted SaveBar validation failure; it is not a golden
snapshot of every future Beam schema. The JS test reads it and never regenerates it.

The capture used the booted host's controller and configured generator, with no
hand-authored shape substitution:

```php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo json_encode($app->make(Schemastud\Frame\Http\Controllers\FrameResourceController::class)
    ->schema(Illuminate\Http\Request::create('/frame/resources/schemas/schema'), 'schemas'),
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
```

Executed as `XDEBUG_MODE=off herd php /tmp/herd-frame-export-schema.php` from the host,
with output reviewed before copying into this fixture. The real endpoint's object
shape is independently asserted in Beam's `ResourceEditShapeTest`; root's browser
replays the current served schema and Save control after this regression passes.
