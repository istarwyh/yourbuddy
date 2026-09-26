/** Read the live GPT Auth settings consumed by each operation. */
function read(ref) {
	return ref.get();
}

/** Resolve the live model-policy fields. */
function readLlmSettings(config) {
	return { longContextEnabled: read(config.longContextEnabled) };
}

/** Resolve the live standalone-search fields. */
function readSearchSettings(config) {
	return {
		enabled: read(config.enabled),
		mode: read(config.mode),
		contextSize: read(config.contextSize),
		fallbackModel: read(config.fallbackModel),
		maxOutputTokens: read(config.maxOutputTokens)
	};
}

/** Resolve the live image-creation fields. */
function readImageSettings(config) {
	return {
		enabled: read(config.enabled),
		model: read(config.model),
		n: read(config.n),
		size: read(config.size),
		quality: read(config.quality),
		background: read(config.background)
	};
}

export { readImageSettings, readLlmSettings, readSearchSettings };
