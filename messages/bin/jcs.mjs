// RFC 8785 canonical bytes for the static JSON discovery boundary; never imported by browser code.
function validUnicode(value) {
    for (const character of value) {
        const point = character.codePointAt(0);
        if (point >= 0xd800 && point <= 0xdfff) throw new Error('Lone Unicode surrogate in JSON');
    }
    return value;
}
export function canonicalize(value) {
    if (value === null || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'string') return JSON.stringify(validUnicode(value));
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw new Error('Unsafe JSON number');
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
    if (typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
        return '{' + Object.keys(value).sort().map(key => JSON.stringify(validUnicode(key)) + ':' + canonicalize(value[key])).join(',') + '}';
    }
    throw new Error('Catalog inputs must be JSON data');
}
/** Strict JSON admission retains duplicate/unsafe-integer information JSON.parse would erase. */
export function parseJson(text) {
    let position = 0;
    const whitespace = () => { while (position < text.length && /[ \t\n\r]/.test(text[position])) position++; };
    function string() {
        const start = position++;
        while (position < text.length) {
            const character = text[position++];
            if (character === '\\') position++;
            else if (character === '"') return validUnicode(JSON.parse(text.slice(start, position)));
        }
        throw new Error('Unterminated JSON string');
    }
    function value() {
        whitespace();
        if (text[position] === '"') return string();
        if (text[position] === '{') {
            position++; whitespace();
            const result = Object.create(null); const keys = new Set();
            if (text[position] === '}') { position++; return result; }
            while (true) {
                whitespace();
                if (text[position] !== '"') throw new Error('Expected JSON member');
                const key = string();
                if (keys.has(key)) throw new Error('Duplicate JSON member: ' + key);
                keys.add(key); whitespace();
                if (text[position++] !== ':') throw new Error('Expected JSON colon');
                result[key] = value(); whitespace();
                const token = text[position++];
                if (token === '}') return result;
                if (token !== ',') throw new Error('Expected JSON comma');
            }
        }
        if (text[position] === '[') {
            position++; whitespace();
            const result = [];
            if (text[position] === ']') { position++; return result; }
            while (true) {
                result.push(value()); whitespace();
                const token = text[position++];
                if (token === ']') return result;
                if (token !== ',') throw new Error('Expected JSON array comma');
            }
        }
        for (const [literal, decoded] of [['true', true], ['false', false], ['null', null]]) {
            if (text.startsWith(literal, position)) { position += literal.length; return decoded; }
        }
        const match = text.slice(position).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (match) {
            position += match[0].length;
            const number = Number(match[0]);
            if (!Number.isFinite(number) || /^-?\d+$/.test(match[0]) && !Number.isSafeInteger(number)) throw new Error('Unsafe JSON number');
            return number;
        }
        throw new Error('Invalid JSON value at ' + position);
    }
    const decoded = value(); whitespace();
    if (position !== text.length) throw new Error('Trailing JSON content');
    canonicalize(decoded);
    return decoded;
}
