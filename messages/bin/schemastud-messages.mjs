#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { collect } from './collect.mjs';

try {
    const args = process.argv.slice(2);
    if (args.shift() !== 'collect') throw new Error('Usage: schemastud-messages collect --out <path> [--write] [--host-catalog <path>] [--exclude <package-name>]...');
    let out; let hostCatalog; let write = false;
    const exclusions = [];
    while (args.length) {
        const flag = args.shift();
        if (flag === '--write' && !write) write = true;
        else if (flag === '--out' && out === undefined && args[0] && !args[0].startsWith('--')) out = args.shift();
        else if (flag === '--host-catalog' && hostCatalog === undefined && args[0] && !args[0].startsWith('--')) hostCatalog = args.shift();
        else if (flag === '--exclude' && args[0] && !args[0].startsWith('--')) exclusions.push(args.shift());
        else throw new Error('Unknown, repeated or missing CLI argument: ' + flag);
    }
    if (!out) throw new Error('--out is required');
    const bytes = collect(process.cwd(), hostCatalog, exclusions);
    const target = resolve(out);
    if (write) {
        mkdirSync(dirname(target), { recursive: true });
        const temporary = target + '.tmp-' + process.pid;
        writeFileSync(temporary, bytes, { flag: 'wx' });
        renameSync(temporary, target);
        console.log('wrote ' + out);
    } else {
        if (!existsSync(target) || readFileSync(target, 'utf8') !== bytes) throw new Error('Catalog missing or different; regenerate explicitly with --write');
        console.log('catalog unchanged');
    }
} catch (error) {
    console.error('messages: ' + error.message);
    process.exitCode = 1;
}
