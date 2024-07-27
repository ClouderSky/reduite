import type { Node } from 'estree';
import type { Plugin, Printer } from 'prettier';
import { utils } from 'prettier/doc';
import * as estree from 'prettier/plugins/estree';
import { parsers as tsParsers } from 'prettier/plugins/typescript';
import { markDocType, markDocIndentLevel, mapDoc } from './print';

type EstreePrinters = {
    estree: Printer<Node>;
    'estree-json': Printer<Node>;
};

const estreePrinters = (estree as any).printers as EstreePrinters;

const customPrint: Printer<Node>['print'] = (path, options, print, args) => {
    const origin = estreePrinters.estree.print(path, options, print, args);
    markDocType(path, origin);

    if (path.isRoot) {
        markDocIndentLevel(origin);
        return utils.mapDoc(origin, x => mapDoc(x, options));
    }

    return origin;
};

export default (): Plugin<Node> => {
    return {
        parsers: tsParsers,
        printers: {
            ...estreePrinters,
            estree: {
                ...estreePrinters.estree,
                print: customPrint,
            },
        },
    };
};
