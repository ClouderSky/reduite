import type { Node, ImportDeclaration } from 'estree';
import type { Doc, ParserOptions } from 'prettier';
import { builders, printer } from 'prettier/doc';
import { flow, pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import type { MarkPathDocFn, MapDocFn } from './base';
import { isDocArray, isGroupDoc, isIndentDoc } from './base';
import { setDocType } from './metadata';

const typeImportDeclaration: ImportDeclaration['type'] = 'ImportDeclaration';

export const typeImportGroup = 'ImportGroup';

type Group = builders.Group;

const isImportedGroupDoc = (group: Group) =>
    Array.isArray(group.contents) && group.contents[0] === '{' && group.contents[group.contents.length - 1] === '}';

const findImportedGroup = flow(
    O.fromPredicate(isDocArray),
    O.chain(flow(A.filter(isDocArray), A.chain(A.filter(isGroupDoc)), A.findFirst(isImportedGroupDoc))),
    O.chain(x => pipe(x.contents, O.fromPredicate(isDocArray))),
    O.chain(flow(A.filter(isIndentDoc), A.head)),
    O.chain(x => pipe(x.contents, O.fromPredicate(isDocArray))),
    O.chain(flow(A.lookup(1), O.filter(isDocArray))),
);

export const markImportedGroup: MarkPathDocFn = (path, origin) => {
    if (path.node.type === typeImportDeclaration) {
        pipe(origin, findImportedGroup, O.map(setDocType(typeImportGroup)));
        return O.some(origin);
    }
    return O.zero<Doc>();
};

const splitImportedLine = (options: ParserOptions<Node>, maxWidth: number) => {
    const method = (origin: Doc[], count: number = 0, cache: Doc[] = [], result: Doc[] = []): Doc[] => {
        if (origin.length === 0) {
            return [...result, builders.group(cache)];
        }

        const length = printer.printDocToString(origin[0], options).formatted.length;

        if (count + length + 1 > maxWidth) {
            if (cache.length > 0) {
                const nextResult = [...result, builders.group(cache.slice(0, -1)), cache[cache.length - 1]];
                return method(origin.slice(2), length + 2, origin.slice(0, 2), nextResult);
            }
        }

        return method(origin.slice(2), count + length + 2, [...cache, origin.slice(0, 2)], result);
    };
    return method;
};

export const mapImportedGroupDoc: MapDocFn = (origin, metadata, options) => {
    if (metadata.type !== typeImportGroup || !isDocArray(origin)) {
        return O.zero<Doc>();
    }

    const maxWidth = options.printWidth - options.tabWidth * (metadata.indentLevel ?? 0);
    return pipe(origin, splitImportedLine(options, maxWidth), O.some<Doc>);
};
