import { describe, test, expect } from '@jest/globals';
import { type Options, format } from 'prettier';
import createPlugin from '..';

describe('imported wrap', () => {
    const getOptions = (param: Partial<Options> = {}): Options => ({
        parser: 'typescript',
        plugins: [createPlugin()],
        printWidth: 64,
        singleQuote: true,
        ...param,
    });

    test('default imported', async () => {
        const origin = `// sample
import React, {useMemo, useRef} from 'react';
import type {ReactNode} from 'react';
// import type {ReactNode, useMemo, useRef} from 'react';
`;
        const target = `// sample
import React, { useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
// import type {ReactNode, useMemo, useRef} from 'react';
`;

        expect(await format(origin, getOptions())).toEqual(target);
    });

    test('empty imported', async () => {
        const origin = `// sample
import {} from 'react';

console.debug('');
`;
        const target = `// sample
import {} from 'react';
`;

        expect(await format(origin, getOptions({ printWidth: 24 }))).toEqual(target);
    });

    test('just single line imported', async () => {
        const origin = `// sample
import {useMemo, useRef} from 'react';
`;
        const target = `// sample
import { useMemo, useRef } from 'react';
`;

        expect(await format(origin, getOptions({ printWidth: 48 }))).toEqual(target);
    });

    test('long single line imported', async () => {
        const origin = `// sample
import {useMemo, useRef} from 'react';
`;
        const target = `// sample
import {
  useMemo, useRef,
} from 'react';
`;

        expect(await format(origin, getOptions({ printWidth: 24 }))).toEqual(target);
    });

    test('long multi lines imported', async () => {
        const origin = `// sample
import {useMemo, useRef, useCallback} from 'react';
`;
        const target = `// sample
import {
  useMemo, useRef,
  useCallback,
} from 'react';
`;

        expect(await format(origin, getOptions({ printWidth: 24 }))).toEqual(target);
    });

    test('reduce imported lines', async () => {
        const origin = `// sample
import {
    useMemo,
    useRef,
    useCallback,
} from 'react';
`;
        const target = `// sample
import {
  useMemo, useRef,
  useCallback,
} from 'react';
`;

        expect(await format(origin, getOptions({ printWidth: 24 }))).toEqual(target);
    });
});
