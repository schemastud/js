import assert from 'node:assert/strict';
import { defaultValidator } from '../dist/index.js';

// Import the shipped ESM directly: a bundler can hide invalid Node subpaths and JSON imports.
for (const $schema of [
    'https://json-schema.org/draft/2020-12/schema',
    'http://json-schema.org/draft-07/schema#',
]) {
    const schema = {
        $schema,
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
    };
    assert.deepEqual(defaultValidator.validateFormData({ name: 'valid' }, schema).errors, []);
    assert.ok(defaultValidator.validateFormData({}, schema).errors.some(error => error.name === 'required'));
}
console.log('Native ESM import and both schema dialects passed.');
