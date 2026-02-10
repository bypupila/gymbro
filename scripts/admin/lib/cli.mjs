export function parseArgs(argv = process.argv.slice(2)) {
    const args = { _: [] };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];

        if (!token.startsWith('--')) {
            args._.push(token);
            continue;
        }

        const equalIndex = token.indexOf('=');
        let key;
        let value;

        if (equalIndex >= 0) {
            key = token.slice(2, equalIndex);
            value = token.slice(equalIndex + 1);
        } else {
            key = token.slice(2);
            const nextToken = argv[index + 1];

            if (nextToken && !nextToken.startsWith('--')) {
                value = nextToken;
                index += 1;
            } else {
                value = true;
            }
        }

        if (args[key] === undefined) {
            args[key] = value;
        } else if (Array.isArray(args[key])) {
            args[key].push(value);
        } else {
            args[key] = [args[key], value];
        }
    }

    return args;
}

export function hasFlag(args, key) {
    return Boolean(args[key]);
}

export function toStringArray(value) {
    if (value === undefined || value === null || value === false) return [];

    const raw = Array.isArray(value) ? value : [value];

    const expanded = [];
    for (const item of raw) {
        const asString = String(item).trim();
        if (!asString) continue;

        for (const part of asString.split(',')) {
            const cleaned = part.trim();
            if (cleaned) expanded.push(cleaned);
        }
    }

    return expanded;
}
