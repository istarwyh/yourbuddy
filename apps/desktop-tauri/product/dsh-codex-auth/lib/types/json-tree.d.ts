/** Shared structural validation for detached JSON-shaped Host state. */
export interface PlainJsonTreeOptions {
    /** pi-ai leaves optional object properties undefined until JSON.stringify. */
    readonly allowUndefinedObjectProperties?: boolean;
}
/** Narrow one value to the plain string-keyed record shape used by JSON trees. */
export declare function isPlainRecord<Value>(value: Value): value is Value & Record<string, unknown>;
/** Measure UTF-8 bytes without relying on JavaScript code-unit length. */
export declare function utf8ByteLength(value: string): number;
/** Measure the UTF-8 bytes of the JSON wire representation. */
export declare function serializedJsonBytes(value: unknown): number;
/**
 * Whether a value is a cycle-free tree of plain data properties that JSON can
 * serialize without invoking accessors or rewriting numbers/array holes.
 */
export declare function isPlainJsonTree(value: unknown, options?: PlainJsonTreeOptions): boolean;
//# sourceMappingURL=json-tree.d.ts.map