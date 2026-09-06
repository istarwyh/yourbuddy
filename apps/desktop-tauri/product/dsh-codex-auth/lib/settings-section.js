const FIBER_DISPOSED = 4;
const FIBER_UNLOADING = 5;
function isUnloading(ctx) {
	return ctx.fiber.state === FIBER_UNLOADING || ctx.fiber.state === FIBER_DISPOSED;
}
function installSettingsSection(ctx, namespace, schema, entry, hooks) {
	ctx.inject(["settings"], (settingsCtx) => {
		const scope = settingsCtx.settings.register(namespace, schema, { base: entry });
		hooks.setSource(() => scope.get());
		settingsCtx.effect(() => () => {
			if (isUnloading(ctx)) return;
			hooks.setSource(() => entry);
			hooks.onChange();
		});
		hooks.onChange();
		scope.watch(() => {
			if (isUnloading(ctx)) return;
			hooks.onChange();
		});
	});
}
export { installSettingsSection };
