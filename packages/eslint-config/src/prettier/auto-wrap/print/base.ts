import type { Node } from 'estree';
import type { AstPath, Doc, ParserOptions } from 'prettier';
import { builders } from 'prettier/doc';
import type { Option } from 'fp-ts/Option';
import type { Metadata } from './metadata';

export type Group = builders.Group;
export type Indent = builders.Indent;

export const isDocArray: (doc: Doc) => doc is Doc[] = Array.isArray;
export const isGroupDoc = (doc: Doc): doc is Group => (doc as Group).type === 'group';
export const isIndentDoc = (doc: Doc): doc is Indent => (doc as Indent).type === 'indent';

export type MarkPathDocFn = (path: AstPath<Node>, doc: Doc) => Option<Doc>;
export type MapDocFn = (origin: Doc, metadata: Metadata, options: ParserOptions<Node>) => Option<Doc>;
