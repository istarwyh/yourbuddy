/** Credential-free image parameter contract shared by Host and settings UI. */
export declare const IMAGE_MODELS: readonly ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare", "gpt-image-2"];
export declare const IMAGE_QUALITIES: readonly ["auto", "low", "medium", "high", "xhigh", "max"];
export type ImageQuality = (typeof IMAGE_QUALITIES)[number];
export declare const IMAGE_SIZES: readonly ["auto", "1024x1024", "1536x1024", "1024x1536"];
export type ImageSize = 'auto' | `${number}x${number}`;
export declare function isImageSize(value: unknown): value is ImageSize;
export declare function supportsImageSize(model: string, size: ImageSize): boolean;
export declare function supportsImage25Options(model: string): boolean;
export declare function supportsImageQuality(model: string, quality: ImageQuality): boolean;
//# sourceMappingURL=image-options.d.ts.map