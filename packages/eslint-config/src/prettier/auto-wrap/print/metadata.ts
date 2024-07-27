const metadataKey = Symbol('doc metadata');

export type Metadata<Type extends string = string> = {
    type: Type;
    indentLevel?: number;
};

export const hasMetadata = (data: any) => typeof data === 'object' && data !== null && metadataKey in data;
export const getMetadata = (data: any) => data[metadataKey] as Metadata | undefined;

export const setMetadata = (data: any, metadata: Partial<Metadata>) => {
    const origin = getMetadata(data);
    if (!origin && Array.isArray(data)) {
        data.map = function map(this: any, ...args) {
            const result = Array.prototype.map.call(data, ...args);
            result[metadataKey as never] = (this as any)[metadataKey];
            return result;
        } as typeof data.map;
    }

    data[metadataKey] = { ...origin, ...metadata };
};

export const setDocType =
    <K extends string>(type: K) =>
    (data: any) =>
        setMetadata(data, { type });

export const setIndentLevel = (indentLevel: number) => (data: any) => setMetadata(data, { indentLevel });
