import type { Node } from 'estree';
import type { AstPath, Doc, ParserOptions } from 'prettier';
import { utils } from 'prettier/doc';
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import type { MapDocFn, MarkPathDocFn } from './base';
import { isIndentDoc } from './base';
import { hasMetadata, getMetadata, setIndentLevel } from './metadata';
import { typeImportGroup, markImportedGroup, mapImportedGroupDoc } from './imported';

export type DocType = typeof typeImportGroup;

const arrMarkPathDoc: MarkPathDocFn[] = [markImportedGroup];

export const markDocType = (path: AstPath<Node>, origin: Doc) =>
    pipe(
        arrMarkPathDoc,
        A.findFirstMap(f => f(path, origin)),
    );

export const markDocIndentLevel = (origin: Doc) => {
    let level = 0;

    const onEnter = (doc: Doc) => {
        if (isIndentDoc(doc)) {
            level += 1;
        }
        pipe(doc, O.fromPredicate(hasMetadata), O.map(setIndentLevel(level)));
    };

    const onExit = (doc: Doc) => {
        if (isIndentDoc(doc)) {
            level -= 1;
        }
    };

    utils.traverseDoc(origin, onEnter, onExit, true);
};

const arrMapDoc: MapDocFn[] = [mapImportedGroupDoc];

export const mapDoc = (origin: Doc, options: ParserOptions<Node>) => {
    const metadata = getMetadata(origin);
    if (!metadata) {
        return origin;
    }

    return pipe(
        arrMapDoc,
        A.findFirstMap(f => f(origin, metadata, options)),
        O.getOrElse(() => origin),
    );
};
