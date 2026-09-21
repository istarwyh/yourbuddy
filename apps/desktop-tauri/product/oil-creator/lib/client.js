window.__ModuleLoader__.load({
	id: "dsh-oil-creator",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
		var _a$1;
		function $constructor(name, initializer, params) {
			function init(inst, def) {
				if (!inst._zod) Object.defineProperty(inst, "_zod", {
					value: {
						def,
						constr: _,
						traits: /* @__PURE__ */ new Set()
					},
					enumerable: false
				});
				if (inst._zod.traits.has(name)) return;
				inst._zod.traits.add(name);
				initializer(inst, def);
				const proto = _.prototype;
				const keys = Object.keys(proto);
				for (let i = 0; i < keys.length; i++) {
					const k = keys[i];
					if (!(k in inst)) inst[k] = proto[k].bind(inst);
				}
			}
			const Parent = params?.Parent ?? Object;
			class Definition extends Parent {}
			Object.defineProperty(Definition, "name", { value: name });
			function _(def) {
				var _a;
				const inst = params?.Parent ? new Definition() : this;
				init(inst, def);
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				for (const fn of inst._zod.deferred) fn();
				return inst;
			}
			Object.defineProperty(_, "init", { value: init });
			Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
				if (params?.Parent && inst instanceof params.Parent) return true;
				return inst?._zod?.traits?.has(name);
			} });
			Object.defineProperty(_, "name", { value: name });
			return _;
		}
		var $ZodAsyncError = class extends Error {
			constructor() {
				super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
			}
		};
		var $ZodEncodeError = class extends Error {
			constructor(name) {
				super(`Encountered unidirectional transform during encode: ${name}`);
				this.name = "ZodEncodeError";
			}
		};
		(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
		const globalConfig = globalThis.__zod_globalConfig;
		function config(newConfig) {
			if (newConfig) Object.assign(globalConfig, newConfig);
			return globalConfig;
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		function jsonStringifyReplacer(_, value) {
			if (typeof value === "bigint") return value.toString();
			return value;
		}
		function cached(getter) {
			return { get value() {
				{
					const value = getter();
					Object.defineProperty(this, "value", { value });
					return value;
				}
			} };
		}
		function nullish(input) {
			return input === null || input === void 0;
		}
		function cleanRegex(source) {
			const start = source.startsWith("^") ? 1 : 0;
			const end = source.endsWith("$") ? source.length - 1 : source.length;
			return source.slice(start, end);
		}
		function floatSafeRemainder(val, step) {
			const ratio = val / step;
			const roundedRatio = Math.round(ratio);
			const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
			if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
			return ratio - roundedRatio;
		}
		const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
		function defineLazy(object, key, getter) {
			let value = void 0;
			Object.defineProperty(object, key, {
				get() {
					if (value === EVALUATING) return;
					if (value === void 0) {
						value = EVALUATING;
						value = getter();
					}
					return value;
				},
				set(v) {
					Object.defineProperty(object, key, { value: v });
				},
				configurable: true
			});
		}
		function assignProp(target, prop, value) {
			Object.defineProperty(target, prop, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		function mergeDefs(...defs) {
			const mergedDescriptors = {};
			for (const def of defs) {
				const descriptors = Object.getOwnPropertyDescriptors(def);
				Object.assign(mergedDescriptors, descriptors);
			}
			return Object.defineProperties({}, mergedDescriptors);
		}
		function esc(str) {
			return JSON.stringify(str);
		}
		function slugify(input) {
			return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
		}
		const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
		function isObject(data) {
			return typeof data === "object" && data !== null && !Array.isArray(data);
		}
		const allowsEval = /* @__PURE__*/ cached(() => {
			if (globalConfig.jitless) return false;
			if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
			try {
				new Function("");
				return true;
			} catch (_) {
				return false;
			}
		});
		function isPlainObject(o) {
			if (isObject(o) === false) return false;
			const ctor = o.constructor;
			if (ctor === void 0) return true;
			if (typeof ctor !== "function") return true;
			const prot = ctor.prototype;
			if (isObject(prot) === false) return false;
			if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
			return true;
		}
		function shallowClone(o) {
			if (isPlainObject(o)) return { ...o };
			if (Array.isArray(o)) return [...o];
			if (o instanceof Map) return new Map(o);
			if (o instanceof Set) return new Set(o);
			return o;
		}
		const propertyKeyTypes = /* @__PURE__*/ new Set([
			"string",
			"number",
			"symbol"
		]);
		function escapeRegex(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		function clone(inst, def, params) {
			const cl = new inst._zod.constr(def ?? inst._zod.def);
			if (!def || params?.parent) cl._zod.parent = inst;
			return cl;
		}
		function normalizeParams(_params) {
			const params = _params;
			if (!params) return {};
			if (typeof params === "string") return { error: () => params };
			if (params?.message !== void 0) {
				if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
				params.error = params.message;
			}
			delete params.message;
			if (typeof params.error === "string") return {
				...params,
				error: () => params.error
			};
			return params;
		}
		function optionalKeys(shape) {
			return Object.keys(shape).filter((k) => {
				return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
			});
		}
		const NUMBER_FORMAT_RANGES = {
			safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			int32: [-2147483648, 2147483647],
			uint32: [0, 4294967295],
			float32: [-34028234663852886e22, 34028234663852886e22],
			float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
		};
		function pick(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = {};
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						newShape[key] = currDef.shape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function omit(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = { ...schema._zod.def.shape };
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						delete newShape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function extend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) {
				const existingShape = schema._zod.def.shape;
				for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
			}
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function safeExtend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function merge(a, b) {
			if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
			return clone(a, mergeDefs(a._zod.def, {
				get shape() {
					const _shape = {
						...a._zod.def.shape,
						...b._zod.def.shape
					};
					assignProp(this, "shape", _shape);
					return _shape;
				},
				get catchall() {
					return b._zod.def.catchall;
				},
				checks: b._zod.def.checks ?? []
			}));
		}
		function partial(Class, schema, mask) {
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const oldShape = schema._zod.def.shape;
					const shape = { ...oldShape };
					if (mask) for (const key in mask) {
						if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						shape[key] = Class ? new Class({
							type: "optional",
							innerType: oldShape[key]
						}) : oldShape[key];
					}
					else for (const key in oldShape) shape[key] = Class ? new Class({
						type: "optional",
						innerType: oldShape[key]
					}) : oldShape[key];
					assignProp(this, "shape", shape);
					return shape;
				},
				checks: []
			}));
		}
		function required(Class, schema, mask) {
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const oldShape = schema._zod.def.shape;
				const shape = { ...oldShape };
				if (mask) for (const key in mask) {
					if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
					if (!mask[key]) continue;
					shape[key] = new Class({
						type: "nonoptional",
						innerType: oldShape[key]
					});
				}
				else for (const key in oldShape) shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
				assignProp(this, "shape", shape);
				return shape;
			} }));
		}
		function aborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
			return false;
		}
		function explicitlyAborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
			return false;
		}
		function prefixIssues(path, issues) {
			return issues.map((iss) => {
				var _a;
				(_a = iss).path ?? (_a.path = []);
				iss.path.unshift(path);
				return iss;
			});
		}
		function unwrapMessage(message) {
			return typeof message === "string" ? message : message?.message;
		}
		function finalizeIssue(iss, ctx, config) {
			const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
			const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
			rest.path ?? (rest.path = []);
			rest.message = message;
			if (ctx?.reportInput) rest.input = _input;
			return rest;
		}
		function getLengthableOrigin(input) {
			if (Array.isArray(input)) return "array";
			if (typeof input === "string") return "string";
			return "unknown";
		}
		function issue(...args) {
			const [iss, input, inst] = args;
			if (typeof iss === "string") return {
				message: iss,
				code: "custom",
				input,
				inst
			};
			return { ...iss };
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/errors.js
		const initializer$1 = (inst, def) => {
			inst.name = "$ZodError";
			Object.defineProperty(inst, "_zod", {
				value: inst._zod,
				enumerable: false
			});
			Object.defineProperty(inst, "issues", {
				value: def,
				enumerable: false
			});
			inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
			Object.defineProperty(inst, "toString", {
				value: () => inst.message,
				enumerable: false
			});
		};
		const $ZodError = $constructor("$ZodError", initializer$1);
		const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
		function flattenError(error, mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of error.issues) if (sub.path.length > 0) {
				fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
				fieldErrors[sub.path[0]].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		function formatError(error, mapper = (issue) => issue.message) {
			const fieldErrors = { _errors: [] };
			const processError = (error, path = []) => {
				for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
				else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else {
					const fullpath = [...path, ...issue.path];
					if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < fullpath.length) {
							const el = fullpath[i];
							if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
							else {
								curr[el] = curr[el] || { _errors: [] };
								curr[el]._errors.push(mapper(issue));
							}
							curr = curr[el];
							i++;
						}
					}
				}
			};
			processError(error);
			return fieldErrors;
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
		const _parse = (_Err) => (schema, value, _ctx, _params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			if (result.issues.length) {
				const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, _params?.callee);
				throw e;
			}
			return result.value;
		};
		const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			if (result.issues.length) {
				const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, params?.callee);
				throw e;
			}
			return result.value;
		};
		const _safeParse = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			return result.issues.length ? {
				success: false,
				error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
		const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			return result.issues.length ? {
				success: false,
				error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
		const _encode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parse(_Err)(schema, value, ctx);
		};
		const _decode = (_Err) => (schema, value, _ctx) => {
			return _parse(_Err)(schema, value, _ctx);
		};
		const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parseAsync(_Err)(schema, value, ctx);
		};
		const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _parseAsync(_Err)(schema, value, _ctx);
		};
		const _safeEncode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParse(_Err)(schema, value, ctx);
		};
		const _safeDecode = (_Err) => (schema, value, _ctx) => {
			return _safeParse(_Err)(schema, value, _ctx);
		};
		const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParseAsync(_Err)(schema, value, ctx);
		};
		const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _safeParseAsync(_Err)(schema, value, _ctx);
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/regexes.js
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const cuid = /^[cC][0-9a-z]{6,}$/;
		const cuid2 = /^[0-9a-z]+$/;
		const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
		const xid = /^[0-9a-vA-V]{20}$/;
		const ksuid = /^[A-Za-z0-9]{27}$/;
		const nanoid = /^[a-zA-Z0-9_-]{21}$/;
		/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
		const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
		/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
		const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
		/** Returns a regex for validating an RFC 9562/4122 UUID.
		*
		* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
		const uuid = (version) => {
			if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
			return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		};
		/** Practical email validation */
		const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
		const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
		function emoji() {
			return new RegExp(_emoji$1, "u");
		}
		const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
		const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
		const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
		const base64url = /^[A-Za-z0-9_-]*$/;
		const httpProtocol = /^https?$/;
		const e164 = /^\+[1-9]\d{6,14}$/;
		const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
		const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
		function timeSource(args) {
			const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
			return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
		}
		function time$1(args) {
			return new RegExp(`^${timeSource(args)}$`);
		}
		function datetime$1(args) {
			const time = timeSource({ precision: args.precision });
			const opts = ["Z"];
			if (args.local) opts.push("");
			if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
			const timeRegex = `${time}(?:${opts.join("|")})`;
			return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
		}
		const string$1 = (params) => {
			const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
			return new RegExp(`^${regex}$`);
		};
		const integer = /^-?\d+$/;
		const number$1 = /^-?\d+(?:\.\d+)?$/;
		const boolean$1 = /^(?:true|false)$/i;
		const lowercase = /^[^A-Z]*$/;
		const uppercase = /^[^a-z]*$/;
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/checks.js
		const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
			var _a;
			inst._zod ?? (inst._zod = {});
			inst._zod.def = def;
			(_a = inst._zod).onattach ?? (_a.onattach = []);
		});
		const numericOriginMap = {
			number: "number",
			bigint: "bigint",
			object: "date"
		};
		const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
				if (def.value < curr) {
					if (def.inclusive) bag.maximum = def.value;
					else bag.exclusiveMaximum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
				if (def.value > curr) {
					if (def.inclusive) bag.minimum = def.value;
					else bag.exclusiveMinimum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				var _a;
				(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
			});
			inst._zod.check = (payload) => {
				if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
				if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
				payload.issues.push({
					origin: typeof payload.value,
					code: "not_multiple_of",
					divisor: def.value,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
			$ZodCheck.init(inst, def);
			def.format = def.format || "float64";
			const isInt = def.format?.includes("int");
			const origin = isInt ? "int" : "number";
			const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				bag.minimum = minimum;
				bag.maximum = maximum;
				if (isInt) bag.pattern = integer;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (isInt) {
					if (!Number.isInteger(input)) {
						payload.issues.push({
							expected: origin,
							format: def.format,
							code: "invalid_type",
							continue: false,
							input,
							inst
						});
						return;
					}
					if (!Number.isSafeInteger(input)) {
						if (input > 0) payload.issues.push({
							input,
							code: "too_big",
							maximum: Number.MAX_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						else payload.issues.push({
							input,
							code: "too_small",
							minimum: Number.MIN_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						return;
					}
				}
				if (input < minimum) payload.issues.push({
					origin: "number",
					input,
					code: "too_small",
					minimum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
				if (input > maximum) payload.issues.push({
					origin: "number",
					input,
					code: "too_big",
					maximum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
				if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length <= def.maximum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: def.maximum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
				if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length >= def.minimum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: def.minimum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.minimum = def.length;
				bag.maximum = def.length;
				bag.length = def.length;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const length = input.length;
				if (length === def.length) return;
				const origin = getLengthableOrigin(input);
				const tooBig = length > def.length;
				payload.issues.push({
					origin,
					...tooBig ? {
						code: "too_big",
						maximum: def.length
					} : {
						code: "too_small",
						minimum: def.length
					},
					inclusive: true,
					exact: true,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
			var _a, _b;
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				if (def.pattern) {
					bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
					bag.patterns.add(def.pattern);
				}
			});
			if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: def.format,
					input: payload.value,
					...def.pattern ? { pattern: def.pattern.toString() } : {},
					inst,
					continue: !def.abort
				});
			});
			else (_b = inst._zod).check ?? (_b.check = () => {});
		});
		const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "regex",
					input: payload.value,
					pattern: def.pattern.toString(),
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
			def.pattern ?? (def.pattern = lowercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
			def.pattern ?? (def.pattern = uppercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
			$ZodCheck.init(inst, def);
			const escapedRegex = escapeRegex(def.includes);
			const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
			def.pattern = pattern;
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.includes(def.includes, def.position)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "includes",
					includes: def.includes,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.startsWith(def.prefix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "starts_with",
					prefix: def.prefix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.endsWith(def.suffix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "ends_with",
					suffix: def.suffix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.check = (payload) => {
				payload.value = def.tx(payload.value);
			};
		});
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/doc.js
		var Doc = class {
			constructor(args = []) {
				this.content = [];
				this.indent = 0;
				if (this) this.args = args;
			}
			indented(fn) {
				this.indent += 1;
				fn(this);
				this.indent -= 1;
			}
			write(arg) {
				if (typeof arg === "function") {
					arg(this, { execution: "sync" });
					arg(this, { execution: "async" });
					return;
				}
				const lines = arg.split("\n").filter((x) => x);
				const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
				const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
				for (const line of dedented) this.content.push(line);
			}
			compile() {
				const F = Function;
				const args = this?.args;
				const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
				return new F(...args, lines.join("\n"));
			}
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/versions.js
		const version = {
			major: 4,
			minor: 4,
			patch: 3
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js
		const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
			var _a;
			inst ?? (inst = {});
			inst._zod.def = def;
			inst._zod.bag = inst._zod.bag || {};
			inst._zod.version = version;
			const checks = [...inst._zod.def.checks ?? []];
			if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
			for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
			if (checks.length === 0) {
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred?.push(() => {
					inst._zod.run = inst._zod.parse;
				});
			} else {
				const runChecks = (payload, checks, ctx) => {
					let isAborted = aborted(payload);
					let asyncResult;
					for (const ch of checks) {
						if (ch._zod.def.when) {
							if (explicitlyAborted(payload)) continue;
							if (!ch._zod.def.when(payload)) continue;
						} else if (isAborted) continue;
						const currLen = payload.issues.length;
						const _ = ch._zod.check(payload);
						if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
						if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
							await _;
							if (payload.issues.length === currLen) return;
							if (!isAborted) isAborted = aborted(payload, currLen);
						});
						else {
							if (payload.issues.length === currLen) continue;
							if (!isAborted) isAborted = aborted(payload, currLen);
						}
					}
					if (asyncResult) return asyncResult.then(() => {
						return payload;
					});
					return payload;
				};
				const handleCanaryResult = (canary, payload, ctx) => {
					if (aborted(canary)) {
						canary.aborted = true;
						return canary;
					}
					const checkResult = runChecks(payload, checks, ctx);
					if (checkResult instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
					}
					return inst._zod.parse(checkResult, ctx);
				};
				inst._zod.run = (payload, ctx) => {
					if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
					if (ctx.direction === "backward") {
						const canary = inst._zod.parse({
							value: payload.value,
							issues: []
						}, {
							...ctx,
							skipChecks: true
						});
						if (canary instanceof Promise) return canary.then((canary) => {
							return handleCanaryResult(canary, payload, ctx);
						});
						return handleCanaryResult(canary, payload, ctx);
					}
					const result = inst._zod.parse(payload, ctx);
					if (result instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return result.then((result) => runChecks(result, checks, ctx));
					}
					return runChecks(result, checks, ctx);
				};
			}
			defineLazy(inst, "~standard", () => ({
				validate: (value) => {
					try {
						const r = safeParse$1(inst, value);
						return r.success ? { value: r.data } : { issues: r.error?.issues };
					} catch (_) {
						return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
					}
				},
				vendor: "zod",
				version: 1
			}));
		});
		const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
			inst._zod.parse = (payload, _) => {
				if (def.coerce) try {
					payload.value = String(payload.value);
				} catch (_) {}
				if (typeof payload.value === "string") return payload;
				payload.issues.push({
					expected: "string",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			$ZodString.init(inst, def);
		});
		const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
			def.pattern ?? (def.pattern = guid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
			if (def.version) {
				const v = {
					v1: 1,
					v2: 2,
					v3: 3,
					v4: 4,
					v5: 5,
					v6: 6,
					v7: 7,
					v8: 8
				}[def.version];
				if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
				def.pattern ?? (def.pattern = uuid(v));
			} else def.pattern ?? (def.pattern = uuid());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
			def.pattern ?? (def.pattern = email);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				try {
					const trimmed = payload.value.trim();
					if (!def.normalize && def.protocol?.source === httpProtocol.source) {
						if (!/^https?:\/\//i.test(trimmed)) {
							payload.issues.push({
								code: "invalid_format",
								format: "url",
								note: "Invalid URL format",
								input: payload.value,
								inst,
								continue: !def.abort
							});
							return;
						}
					}
					const url = new URL(trimmed);
					if (def.hostname) {
						def.hostname.lastIndex = 0;
						if (!def.hostname.test(url.hostname)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid hostname",
							pattern: def.hostname.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.protocol) {
						def.protocol.lastIndex = 0;
						if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid protocol",
							pattern: def.protocol.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.normalize) payload.value = url.href;
					else payload.value = trimmed;
					return;
				} catch (_) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
			def.pattern ?? (def.pattern = emoji());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
			def.pattern ?? (def.pattern = nanoid);
			$ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
			def.pattern ?? (def.pattern = cuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
			def.pattern ?? (def.pattern = cuid2);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
			def.pattern ?? (def.pattern = ulid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
			def.pattern ?? (def.pattern = xid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
			def.pattern ?? (def.pattern = ksuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
			def.pattern ?? (def.pattern = datetime$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
			def.pattern ?? (def.pattern = date$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
			def.pattern ?? (def.pattern = time$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
			def.pattern ?? (def.pattern = duration$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
			def.pattern ?? (def.pattern = ipv4);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv4`;
		});
		const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
			def.pattern ?? (def.pattern = ipv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv6`;
			inst._zod.check = (payload) => {
				try {
					new URL(`http://[${payload.value}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "ipv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv4);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				const parts = payload.value.split("/");
				try {
					if (parts.length !== 2) throw new Error();
					const [address, prefix] = parts;
					if (!prefix) throw new Error();
					const prefixNum = Number(prefix);
					if (`${prefixNum}` !== prefix) throw new Error();
					if (prefixNum < 0 || prefixNum > 128) throw new Error();
					new URL(`http://[${address}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "cidrv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		function isValidBase64(data) {
			if (data === "") return true;
			if (/\s/.test(data)) return false;
			if (data.length % 4 !== 0) return false;
			try {
				atob(data);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
			def.pattern ?? (def.pattern = base64);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64";
			inst._zod.check = (payload) => {
				if (isValidBase64(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64URL(data) {
			if (!base64url.test(data)) return false;
			const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
			return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		}
		const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
			def.pattern ?? (def.pattern = base64url);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64url";
			inst._zod.check = (payload) => {
				if (isValidBase64URL(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
			def.pattern ?? (def.pattern = e164);
			$ZodStringFormat.init(inst, def);
		});
		function isValidJWT(token, algorithm = null) {
			try {
				const tokensParts = token.split(".");
				if (tokensParts.length !== 3) return false;
				const [header] = tokensParts;
				if (!header) return false;
				const parsedHeader = JSON.parse(atob(header));
				if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
				if (!parsedHeader.alg) return false;
				if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
				return true;
			} catch {
				return false;
			}
		}
		const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (isValidJWT(payload.value, def.alg)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "jwt",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Number(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
				const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
				payload.issues.push({
					expected: "number",
					code: "invalid_type",
					input,
					inst,
					...received ? { received } : {}
				});
				return payload;
			};
		});
		const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
			$ZodCheckNumberFormat.init(inst, def);
			$ZodNumber.init(inst, def);
		});
		const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = boolean$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Boolean(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "boolean") return payload;
				payload.issues.push({
					expected: "boolean",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _ctx) => {
				payload.issues.push({
					expected: "never",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		function handleArrayResult(result, final, index) {
			if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
			final.value[index] = result.value;
		}
		const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!Array.isArray(input)) {
					payload.issues.push({
						expected: "array",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = Array(input.length);
				const proms = [];
				for (let i = 0; i < input.length; i++) {
					const item = input[i];
					const result = def.element._zod.run({
						value: item,
						issues: []
					}, ctx);
					if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
					else handleArrayResult(result, payload, i);
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
			const isPresent = key in input;
			if (result.issues.length) {
				if (isOptionalIn && isOptionalOut && !isPresent) return;
				final.issues.push(...prefixIssues(key, result.issues));
			}
			if (!isPresent && !isOptionalIn) {
				if (!result.issues.length) final.issues.push({
					code: "invalid_type",
					expected: "nonoptional",
					input: void 0,
					path: [key]
				});
				return;
			}
			if (result.value === void 0) {
				if (isPresent) final.value[key] = void 0;
			} else final.value[key] = result.value;
		}
		function normalizeDef(def) {
			const keys = Object.keys(def.shape);
			for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
			const okeys = optionalKeys(def.shape);
			return {
				...def,
				keys,
				keySet: new Set(keys),
				numKeys: keys.length,
				optionalKeys: new Set(okeys)
			};
		}
		function handleCatchall(proms, input, payload, ctx, def, inst) {
			const unrecognized = [];
			const keySet = def.keySet;
			const _catchall = def.catchall._zod;
			const t = _catchall.def.type;
			const isOptionalIn = _catchall.optin === "optional";
			const isOptionalOut = _catchall.optout === "optional";
			for (const key in input) {
				if (key === "__proto__") continue;
				if (keySet.has(key)) continue;
				if (t === "never") {
					unrecognized.push(key);
					continue;
				}
				const r = _catchall.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
				else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
			}
			if (unrecognized.length) payload.issues.push({
				code: "unrecognized_keys",
				keys: unrecognized,
				input,
				inst
			});
			if (!proms.length) return payload;
			return Promise.all(proms).then(() => {
				return payload;
			});
		}
		const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
			$ZodType.init(inst, def);
			if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
				const sh = def.shape;
				Object.defineProperty(def, "shape", { get: () => {
					const newSh = { ...sh };
					Object.defineProperty(def, "shape", { value: newSh });
					return newSh;
				} });
			}
			const _normalized = cached(() => normalizeDef(def));
			defineLazy(inst._zod, "propValues", () => {
				const shape = def.shape;
				const propValues = {};
				for (const key in shape) {
					const field = shape[key]._zod;
					if (field.values) {
						propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
						for (const v of field.values) propValues[key].add(v);
					}
				}
				return propValues;
			});
			const isObject$1 = isObject;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$1(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = {};
				const proms = [];
				const shape = value.shape;
				for (const key of value.keys) {
					const el = shape[key];
					const isOptionalIn = el._zod.optin === "optional";
					const isOptionalOut = el._zod.optout === "optional";
					const r = el._zod.run({
						value: input[key],
						issues: []
					}, ctx);
					if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
					else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
				}
				if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
				return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
			};
		});
		const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
			$ZodObject.init(inst, def);
			const superParse = inst._zod.parse;
			const _normalized = cached(() => normalizeDef(def));
			const generateFastpass = (shape) => {
				const doc = new Doc([
					"shape",
					"payload",
					"ctx"
				]);
				const normalized = _normalized.value;
				const parseStr = (key) => {
					const k = esc(key);
					return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
				};
				doc.write(`const input = payload.value;`);
				const ids = Object.create(null);
				let counter = 0;
				for (const key of normalized.keys) ids[key] = `key_${counter++}`;
				doc.write(`const newResult = {};`);
				for (const key of normalized.keys) {
					const id = ids[key];
					const k = esc(key);
					const schema = shape[key];
					const isOptionalIn = schema?._zod?.optin === "optional";
					const isOptionalOut = schema?._zod?.optout === "optional";
					doc.write(`const ${id} = ${parseStr(key)};`);
					if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
					else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
					else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
				}
				doc.write(`payload.value = newResult;`);
				doc.write(`return payload;`);
				const fn = doc.compile();
				return (payload, ctx) => fn(shape, payload, ctx);
			};
			let fastpass;
			const isObject$2 = isObject;
			const jit = !globalConfig.jitless;
			const fastEnabled = jit && allowsEval.value;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$2(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
					if (!fastpass) fastpass = generateFastpass(def.shape);
					payload = fastpass(payload, ctx);
					if (!catchall) return payload;
					return handleCatchall([], input, payload, ctx, value, inst);
				}
				return superParse(payload, ctx);
			};
		});
		function handleUnionResults(results, final, inst, ctx) {
			for (const result of results) if (result.issues.length === 0) {
				final.value = result.value;
				return final;
			}
			const nonaborted = results.filter((r) => !aborted(r));
			if (nonaborted.length === 1) {
				final.value = nonaborted[0].value;
				return nonaborted[0];
			}
			final.issues.push({
				code: "invalid_union",
				input: final.value,
				inst,
				errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			});
			return final;
		}
		const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "values", () => {
				if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
			});
			defineLazy(inst._zod, "pattern", () => {
				if (def.options.every((o) => o._zod.pattern)) {
					const patterns = def.options.map((o) => o._zod.pattern);
					return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
				}
			});
			const first = def.options.length === 1 ? def.options[0]._zod.run : null;
			inst._zod.parse = (payload, ctx) => {
				if (first) return first(payload, ctx);
				let async = false;
				const results = [];
				for (const option of def.options) {
					const result = option._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) {
						results.push(result);
						async = true;
					} else {
						if (result.issues.length === 0) return result;
						results.push(result);
					}
				}
				if (!async) return handleUnionResults(results, payload, inst, ctx);
				return Promise.all(results).then((results) => {
					return handleUnionResults(results, payload, inst, ctx);
				});
			};
		});
		const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				const left = def.left._zod.run({
					value: input,
					issues: []
				}, ctx);
				const right = def.right._zod.run({
					value: input,
					issues: []
				}, ctx);
				if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
					return handleIntersectionResults(payload, left, right);
				});
				return handleIntersectionResults(payload, left, right);
			};
		});
		function mergeValues(a, b) {
			if (a === b) return {
				valid: true,
				data: a
			};
			if (a instanceof Date && b instanceof Date && +a === +b) return {
				valid: true,
				data: a
			};
			if (isPlainObject(a) && isPlainObject(b)) {
				const bKeys = Object.keys(b);
				const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
				const newObj = {
					...a,
					...b
				};
				for (const key of sharedKeys) {
					const sharedValue = mergeValues(a[key], b[key]);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
					};
					newObj[key] = sharedValue.data;
				}
				return {
					valid: true,
					data: newObj
				};
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return {
					valid: false,
					mergeErrorPath: []
				};
				const newArray = [];
				for (let index = 0; index < a.length; index++) {
					const itemA = a[index];
					const itemB = b[index];
					const sharedValue = mergeValues(itemA, itemB);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
					};
					newArray.push(sharedValue.data);
				}
				return {
					valid: true,
					data: newArray
				};
			}
			return {
				valid: false,
				mergeErrorPath: []
			};
		}
		function handleIntersectionResults(result, left, right) {
			const unrecKeys = /* @__PURE__ */ new Map();
			let unrecIssue;
			for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
				unrecIssue ?? (unrecIssue = iss);
				for (const k of iss.keys) {
					if (!unrecKeys.has(k)) unrecKeys.set(k, {});
					unrecKeys.get(k).l = true;
				}
			} else result.issues.push(iss);
			for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
				if (!unrecKeys.has(k)) unrecKeys.set(k, {});
				unrecKeys.get(k).r = true;
			}
			else result.issues.push(iss);
			const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
			if (bothKeys.length && unrecIssue) result.issues.push({
				...unrecIssue,
				keys: bothKeys
			});
			if (aborted(result)) return result;
			const merged = mergeValues(left.value, right.value);
			if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
			result.value = merged.data;
			return result;
		}
		const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
			$ZodType.init(inst, def);
			const values = getEnumValues(def.entries);
			const valuesSet = new Set(values);
			inst._zod.values = valuesSet;
			inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (valuesSet.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
			$ZodType.init(inst, def);
			if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
			const values = new Set(def.values);
			inst._zod.values = values;
			inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (values.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values: def.values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				const _out = def.transform(payload.value, payload);
				if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				if (_out instanceof Promise) throw new $ZodAsyncError();
				payload.value = _out;
				payload.fallback = true;
				return payload;
			};
		});
		function handleOptionalResult(result, input) {
			if (input === void 0 && (result.issues.length || result.fallback)) return {
				issues: [],
				value: void 0
			};
			return result;
		}
		const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.optout = "optional";
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
			});
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (def.innerType._zod.optin === "optional") {
					const input = payload.value;
					const result = def.innerType._zod.run(payload, ctx);
					if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
					return handleOptionalResult(result, input);
				}
				if (payload.value === void 0) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
			inst._zod.parse = (payload, ctx) => {
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
			});
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === null) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) {
					payload.value = def.defaultValue;
					/**
					* $ZodDefault returns the default value immediately in forward direction.
					* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
					return payload;
				}
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
				return handleDefaultResult(result, def);
			};
		});
		function handleDefaultResult(payload, def) {
			if (payload.value === void 0) payload.value = def.defaultValue;
			return payload;
		}
		const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) payload.value = def.defaultValue;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => {
				const v = def.innerType._zod.values;
				return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
				return handleNonOptionalResult(result, inst);
			};
		});
		function handleNonOptionalResult(payload, inst) {
			if (!payload.issues.length && payload.value === void 0) payload.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: payload.value,
				inst
			});
			return payload;
		}
		const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => {
					payload.value = result.value;
					if (result.issues.length) {
						payload.value = def.catchValue({
							...payload,
							error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
							input: payload.value
						});
						payload.issues = [];
						payload.fallback = true;
					}
					return payload;
				});
				payload.value = result.value;
				if (result.issues.length) {
					payload.value = def.catchValue({
						...payload,
						error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
						input: payload.value
					});
					payload.issues = [];
					payload.fallback = true;
				}
				return payload;
			};
		});
		const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => def.in._zod.values);
			defineLazy(inst._zod, "optin", () => def.in._zod.optin);
			defineLazy(inst._zod, "optout", () => def.out._zod.optout);
			defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") {
					const right = def.out._zod.run(payload, ctx);
					if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
					return handlePipeResult(right, def.in, ctx);
				}
				const left = def.in._zod.run(payload, ctx);
				if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
				return handlePipeResult(left, def.out, ctx);
			};
		});
		function handlePipeResult(left, next, ctx) {
			if (left.issues.length) {
				left.aborted = true;
				return left;
			}
			return next._zod.run({
				value: left.value,
				issues: left.issues,
				fallback: left.fallback
			}, ctx);
		}
		const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
			defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then(handleReadonlyResult);
				return handleReadonlyResult(result);
			};
		});
		function handleReadonlyResult(payload) {
			payload.value = Object.freeze(payload.value);
			return payload;
		}
		const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
			$ZodCheck.init(inst, def);
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _) => {
				return payload;
			};
			inst._zod.check = (payload) => {
				const input = payload.value;
				const r = def.fn(input);
				if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
				handleRefineResult(r, payload, input, inst);
			};
		});
		function handleRefineResult(result, payload, input, inst) {
			if (!result) {
				const _iss = {
					code: "custom",
					input,
					inst,
					path: [...inst._zod.def.path ?? []],
					continue: !inst._zod.def.abort
				};
				if (inst._zod.def.params) _iss.params = inst._zod.def.params;
				payload.issues.push(issue(_iss));
			}
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/api.js
		// @__NO_SIDE_EFFECTS__
		function _string(Class, params) {
			return new Class({
				type: "string",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _email(Class, params) {
			return new Class({
				type: "string",
				format: "email",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _guid(Class, params) {
			return new Class({
				type: "string",
				format: "guid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuid(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv4(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v4",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv6(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v6",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv7(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v7",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _url(Class, params) {
			return new Class({
				type: "string",
				format: "url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _emoji(Class, params) {
			return new Class({
				type: "string",
				format: "emoji",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _nanoid(Class, params) {
			return new Class({
				type: "string",
				format: "nanoid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link _cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		// @__NO_SIDE_EFFECTS__
		function _cuid(Class, params) {
			return new Class({
				type: "string",
				format: "cuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cuid2(Class, params) {
			return new Class({
				type: "string",
				format: "cuid2",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ulid(Class, params) {
			return new Class({
				type: "string",
				format: "ulid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _xid(Class, params) {
			return new Class({
				type: "string",
				format: "xid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ksuid(Class, params) {
			return new Class({
				type: "string",
				format: "ksuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv4(Class, params) {
			return new Class({
				type: "string",
				format: "ipv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv6(Class, params) {
			return new Class({
				type: "string",
				format: "ipv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv4(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv6(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64(Class, params) {
			return new Class({
				type: "string",
				format: "base64",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64url(Class, params) {
			return new Class({
				type: "string",
				format: "base64url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _e164(Class, params) {
			return new Class({
				type: "string",
				format: "e164",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _jwt(Class, params) {
			return new Class({
				type: "string",
				format: "jwt",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDateTime(Class, params) {
			return new Class({
				type: "string",
				format: "datetime",
				check: "string_format",
				offset: false,
				local: false,
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDate(Class, params) {
			return new Class({
				type: "string",
				format: "date",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoTime(Class, params) {
			return new Class({
				type: "string",
				format: "time",
				check: "string_format",
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDuration(Class, params) {
			return new Class({
				type: "string",
				format: "duration",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _number(Class, params) {
			return new Class({
				type: "number",
				checks: [],
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _int(Class, params) {
			return new Class({
				type: "number",
				check: "number_format",
				abort: false,
				format: "safeint",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _boolean(Class, params) {
			return new Class({
				type: "boolean",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _unknown(Class) {
			return new Class({ type: "unknown" });
		}
		// @__NO_SIDE_EFFECTS__
		function _never(Class, params) {
			return new Class({
				type: "never",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lt(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lte(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gt(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gte(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _multipleOf(value, params) {
			return new $ZodCheckMultipleOf({
				check: "multiple_of",
				...normalizeParams(params),
				value
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _maxLength(maximum, params) {
			return new $ZodCheckMaxLength({
				check: "max_length",
				...normalizeParams(params),
				maximum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _minLength(minimum, params) {
			return new $ZodCheckMinLength({
				check: "min_length",
				...normalizeParams(params),
				minimum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _length(length, params) {
			return new $ZodCheckLengthEquals({
				check: "length_equals",
				...normalizeParams(params),
				length
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _regex(pattern, params) {
			return new $ZodCheckRegex({
				check: "string_format",
				format: "regex",
				...normalizeParams(params),
				pattern
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lowercase(params) {
			return new $ZodCheckLowerCase({
				check: "string_format",
				format: "lowercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uppercase(params) {
			return new $ZodCheckUpperCase({
				check: "string_format",
				format: "uppercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _includes(includes, params) {
			return new $ZodCheckIncludes({
				check: "string_format",
				format: "includes",
				...normalizeParams(params),
				includes
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _startsWith(prefix, params) {
			return new $ZodCheckStartsWith({
				check: "string_format",
				format: "starts_with",
				...normalizeParams(params),
				prefix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _endsWith(suffix, params) {
			return new $ZodCheckEndsWith({
				check: "string_format",
				format: "ends_with",
				...normalizeParams(params),
				suffix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _overwrite(tx) {
			return new $ZodCheckOverwrite({
				check: "overwrite",
				tx
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _normalize(form) {
			return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
		}
		// @__NO_SIDE_EFFECTS__
		function _trim() {
			return /* @__PURE__ */ _overwrite((input) => input.trim());
		}
		// @__NO_SIDE_EFFECTS__
		function _toLowerCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _toUpperCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _slugify() {
			return /* @__PURE__ */ _overwrite((input) => slugify(input));
		}
		// @__NO_SIDE_EFFECTS__
		function _array(Class, element, params) {
			return new Class({
				type: "array",
				element,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _refine(Class, fn, _params) {
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...normalizeParams(_params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _superRefine(fn, params) {
			const ch = /* @__PURE__ */ _check((payload) => {
				payload.addIssue = (issue$2) => {
					if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
					else {
						const _issue = issue$2;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = ch);
						_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
						payload.issues.push(issue(_issue));
					}
				};
				return fn(payload.value, payload);
			}, params);
			return ch;
		}
		// @__NO_SIDE_EFFECTS__
		function _check(fn, params) {
			const ch = new $ZodCheck({
				check: "custom",
				...normalizeParams(params)
			});
			ch._zod.check = fn;
			return ch;
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				external: params?.external ?? void 0
			};
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) Object.assign(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
					};
				}
				if (entry[1] === root) return { ref: "#" };
				const defUriPrefix = `#/${defsSegment}/`;
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + defId
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else Object.assign(schema, refSchema);
					Object.assign(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			Object.assign(result, root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					defs[seen.defId] = seen.def;
				}
			}
			if (ctx.external) {} else if (Object.keys(defs).length > 0) {
				if (ctx.target === "draft-2020-12") result.$defs = defs;
				else result.definitions = defs;
			}
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		/**
		* Creates a toJSONSchema method for a schema instance.
		* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
		*/
		const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
			const ctx = initializeContext({
				...params,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time") delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const regexes = [...patterns];
				if (regexes.length === 1) json.pattern = regexes[0].source;
				else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) {
				if (legacy) {
					json.minimum = exclusiveMinimum;
					json.exclusiveMinimum = true;
				} else json.exclusiveMinimum = exclusiveMinimum;
			} else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) {
				if (legacy) {
					json.maximum = exclusiveMaximum;
					json.exclusiveMaximum = true;
				} else json.exclusiveMaximum = exclusiveMaximum;
			} else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") json.multipleOf = multipleOf;
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, _params) => {
			const def = schema._zod.def;
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
			} else if (typeof val === "bigint") {
				if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
				else vals.push(Number(val));
			} else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const customProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
		};
		const transformProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			json.properties = {};
			const shape = def.shape;
			for (const key in shape) json.properties[key] = process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			});
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const v = def.shape[key]._zod;
				if (ctx.io === "input") return v.optin === void 0;
				else return v.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.default = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				throw new Error("Dynamic catch values are not supported in JSON Schema");
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/iso.js
		const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
			$ZodISODateTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function datetime(params) {
			return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
		}
		const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
			$ZodISODate.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function date(params) {
			return /* @__PURE__ */ _isoDate(ZodISODate, params);
		}
		const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
			$ZodISOTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function time(params) {
			return /* @__PURE__ */ _isoTime(ZodISOTime, params);
		}
		const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
			$ZodISODuration.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function duration(params) {
			return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js
		const initializer = (inst, issues) => {
			$ZodError.init(inst, issues);
			inst.name = "ZodError";
			Object.defineProperties(inst, {
				format: { value: (mapper) => formatError(inst, mapper) },
				flatten: { value: (mapper) => flattenError(inst, mapper) },
				addIssue: { value: (issue) => {
					inst.issues.push(issue);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				addIssues: { value: (issues) => {
					inst.issues.push(...issues);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				isEmpty: { get() {
					return inst.issues.length === 0;
				} }
			});
		};
		const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/parse.js
		const parse = /* @__PURE__ */ _parse(ZodRealError);
		const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
		const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
		const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
		const encode = /* @__PURE__ */ _encode(ZodRealError);
		const decode = /* @__PURE__ */ _decode(ZodRealError);
		const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
		const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
		const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
		const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
		const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
		const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js
		const _installedGroups = /* @__PURE__ */ new WeakMap();
		function _installLazyMethods(inst, group, methods) {
			const proto = Object.getPrototypeOf(inst);
			let installed = _installedGroups.get(proto);
			if (!installed) {
				installed = /* @__PURE__ */ new Set();
				_installedGroups.set(proto, installed);
			}
			if (installed.has(group)) return;
			installed.add(group);
			for (const key in methods) {
				const fn = methods[key];
				Object.defineProperty(proto, key, {
					configurable: true,
					enumerable: false,
					get() {
						const bound = fn.bind(this);
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: bound
						});
						return bound;
					},
					set(v) {
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: v
						});
					}
				});
			}
		}
		const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
			$ZodType.init(inst, def);
			Object.assign(inst["~standard"], { jsonSchema: {
				input: createStandardJSONSchemaMethod(inst, "input"),
				output: createStandardJSONSchemaMethod(inst, "output")
			} });
			inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
			inst.def = def;
			inst.type = def.type;
			Object.defineProperty(inst, "_def", { value: def });
			inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
			inst.safeParse = (data, params) => safeParse(inst, data, params);
			inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
			inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
			inst.spa = inst.safeParseAsync;
			inst.encode = (data, params) => encode(inst, data, params);
			inst.decode = (data, params) => decode(inst, data, params);
			inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
			inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
			inst.safeEncode = (data, params) => safeEncode(inst, data, params);
			inst.safeDecode = (data, params) => safeDecode(inst, data, params);
			inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
			inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
			_installLazyMethods(inst, "ZodType", {
				check(...chks) {
					const def = this.def;
					return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
						check: ch,
						def: { check: "custom" },
						onattach: []
					} } : ch)] }), { parent: true });
				},
				with(...chks) {
					return this.check(...chks);
				},
				clone(def, params) {
					return clone(this, def, params);
				},
				brand() {
					return this;
				},
				register(reg, meta) {
					reg.add(this, meta);
					return this;
				},
				refine(check, params) {
					return this.check(refine(check, params));
				},
				superRefine(refinement, params) {
					return this.check(superRefine(refinement, params));
				},
				overwrite(fn) {
					return this.check(/* @__PURE__ */ _overwrite(fn));
				},
				optional() {
					return optional(this);
				},
				exactOptional() {
					return exactOptional(this);
				},
				nullable() {
					return nullable(this);
				},
				nullish() {
					return optional(nullable(this));
				},
				nonoptional(params) {
					return nonoptional(this, params);
				},
				array() {
					return array(this);
				},
				or(arg) {
					return union([this, arg]);
				},
				and(arg) {
					return intersection(this, arg);
				},
				transform(tx) {
					return pipe(this, transform(tx));
				},
				default(d) {
					return _default(this, d);
				},
				prefault(d) {
					return prefault(this, d);
				},
				catch(params) {
					return _catch(this, params);
				},
				pipe(target) {
					return pipe(this, target);
				},
				readonly() {
					return readonly(this);
				},
				describe(description) {
					const cl = this.clone();
					globalRegistry.add(cl, { description });
					return cl;
				},
				meta(...args) {
					if (args.length === 0) return globalRegistry.get(this);
					const cl = this.clone();
					globalRegistry.add(cl, args[0]);
					return cl;
				},
				isOptional() {
					return this.safeParse(void 0).success;
				},
				isNullable() {
					return this.safeParse(null).success;
				},
				apply(fn) {
					return fn(this);
				}
			});
			Object.defineProperty(inst, "description", {
				get() {
					return globalRegistry.get(inst)?.description;
				},
				configurable: true
			});
			return inst;
		});
		/** @internal */
		const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.format = bag.format ?? null;
			inst.minLength = bag.minimum ?? null;
			inst.maxLength = bag.maximum ?? null;
			_installLazyMethods(inst, "_ZodString", {
				regex(...args) {
					return this.check(/* @__PURE__ */ _regex(...args));
				},
				includes(...args) {
					return this.check(/* @__PURE__ */ _includes(...args));
				},
				startsWith(...args) {
					return this.check(/* @__PURE__ */ _startsWith(...args));
				},
				endsWith(...args) {
					return this.check(/* @__PURE__ */ _endsWith(...args));
				},
				min(...args) {
					return this.check(/* @__PURE__ */ _minLength(...args));
				},
				max(...args) {
					return this.check(/* @__PURE__ */ _maxLength(...args));
				},
				length(...args) {
					return this.check(/* @__PURE__ */ _length(...args));
				},
				nonempty(...args) {
					return this.check(/* @__PURE__ */ _minLength(1, ...args));
				},
				lowercase(params) {
					return this.check(/* @__PURE__ */ _lowercase(params));
				},
				uppercase(params) {
					return this.check(/* @__PURE__ */ _uppercase(params));
				},
				trim() {
					return this.check(/* @__PURE__ */ _trim());
				},
				normalize(...args) {
					return this.check(/* @__PURE__ */ _normalize(...args));
				},
				toLowerCase() {
					return this.check(/* @__PURE__ */ _toLowerCase());
				},
				toUpperCase() {
					return this.check(/* @__PURE__ */ _toUpperCase());
				},
				slugify() {
					return this.check(/* @__PURE__ */ _slugify());
				}
			});
		});
		const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			_ZodString.init(inst, def);
			inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
			inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
			inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
			inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
			inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
			inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
			inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
			inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
			inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
			inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
			inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
			inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
			inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
			inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
			inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
			inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
			inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
			inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
			inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
			inst.datetime = (params) => inst.check(datetime(params));
			inst.date = (params) => inst.check(date(params));
			inst.time = (params) => inst.check(time(params));
			inst.duration = (params) => inst.check(duration(params));
		});
		function string(params) {
			return /* @__PURE__ */ _string(ZodString, params);
		}
		const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			_ZodString.init(inst, def);
		});
		const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
			$ZodEmail.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
			$ZodGUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
			$ZodUUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
			$ZodURL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
			$ZodEmoji.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
			$ZodNanoID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
			$ZodCUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
			$ZodCUID2.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
			$ZodULID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
			$ZodXID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
			$ZodKSUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
			$ZodIPv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
			$ZodIPv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
			$ZodCIDRv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
			$ZodCIDRv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
			$ZodBase64.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
			$ZodBase64URL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
			$ZodE164.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
			$ZodJWT.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
			$ZodNumber.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
			_installLazyMethods(inst, "ZodNumber", {
				gt(value, params) {
					return this.check(/* @__PURE__ */ _gt(value, params));
				},
				gte(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				min(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				lt(value, params) {
					return this.check(/* @__PURE__ */ _lt(value, params));
				},
				lte(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				max(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				int(params) {
					return this.check(int(params));
				},
				safe(params) {
					return this.check(int(params));
				},
				positive(params) {
					return this.check(/* @__PURE__ */ _gt(0, params));
				},
				nonnegative(params) {
					return this.check(/* @__PURE__ */ _gte(0, params));
				},
				negative(params) {
					return this.check(/* @__PURE__ */ _lt(0, params));
				},
				nonpositive(params) {
					return this.check(/* @__PURE__ */ _lte(0, params));
				},
				multipleOf(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				step(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				finite() {
					return this;
				}
			});
			const bag = inst._zod.bag;
			inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
			inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
			inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
			inst.isFinite = true;
			inst.format = bag.format ?? null;
		});
		function number(params) {
			return /* @__PURE__ */ _number(ZodNumber, params);
		}
		const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
			$ZodNumberFormat.init(inst, def);
			ZodNumber.init(inst, def);
		});
		function int(params) {
			return /* @__PURE__ */ _int(ZodNumberFormat, params);
		}
		const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
			$ZodBoolean.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
		});
		function boolean(params) {
			return /* @__PURE__ */ _boolean(ZodBoolean, params);
		}
		const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
			$ZodUnknown.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function unknown() {
			return /* @__PURE__ */ _unknown(ZodUnknown);
		}
		const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
			$ZodNever.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
		});
		function never(params) {
			return /* @__PURE__ */ _never(ZodNever, params);
		}
		const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
			$ZodArray.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
			inst.element = def.element;
			_installLazyMethods(inst, "ZodArray", {
				min(n, params) {
					return this.check(/* @__PURE__ */ _minLength(n, params));
				},
				nonempty(params) {
					return this.check(/* @__PURE__ */ _minLength(1, params));
				},
				max(n, params) {
					return this.check(/* @__PURE__ */ _maxLength(n, params));
				},
				length(n, params) {
					return this.check(/* @__PURE__ */ _length(n, params));
				},
				unwrap() {
					return this.element;
				}
			});
		});
		function array(element, params) {
			return /* @__PURE__ */ _array(ZodArray, element, params);
		}
		const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
			$ZodObjectJIT.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
			defineLazy(inst, "shape", () => {
				return def.shape;
			});
			_installLazyMethods(inst, "ZodObject", {
				keyof() {
					return _enum(Object.keys(this._zod.def.shape));
				},
				catchall(catchall) {
					return this.clone({
						...this._zod.def,
						catchall
					});
				},
				passthrough() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				loose() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				strict() {
					return this.clone({
						...this._zod.def,
						catchall: never()
					});
				},
				strip() {
					return this.clone({
						...this._zod.def,
						catchall: void 0
					});
				},
				extend(incoming) {
					return extend(this, incoming);
				},
				safeExtend(incoming) {
					return safeExtend(this, incoming);
				},
				merge(other) {
					return merge(this, other);
				},
				pick(mask) {
					return pick(this, mask);
				},
				omit(mask) {
					return omit(this, mask);
				},
				partial(...args) {
					return partial(ZodOptional, this, args[0]);
				},
				required(...args) {
					return required(ZodNonOptional, this, args[0]);
				}
			});
		});
		function object(shape, params) {
			const def = {
				type: "object",
				shape: shape ?? {},
				...normalizeParams(params)
			};
			return new ZodObject(def);
		}
		const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
			$ZodUnion.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
			inst.options = def.options;
		});
		function union(options, params) {
			return new ZodUnion({
				type: "union",
				options,
				...normalizeParams(params)
			});
		}
		const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
			$ZodIntersection.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
		});
		function intersection(left, right) {
			return new ZodIntersection({
				type: "intersection",
				left,
				right
			});
		}
		const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
			$ZodEnum.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
			inst.enum = def.entries;
			inst.options = Object.values(def.entries);
			const keys = new Set(Object.keys(def.entries));
			inst.extract = (values, params) => {
				const newEntries = {};
				for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
			inst.exclude = (values, params) => {
				const newEntries = { ...def.entries };
				for (const value of values) if (keys.has(value)) delete newEntries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
		});
		function _enum(values, params) {
			const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
			return new ZodEnum({
				type: "enum",
				entries,
				...normalizeParams(params)
			});
		}
		const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
			$ZodLiteral.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
			inst.values = new Set(def.values);
			Object.defineProperty(inst, "value", { get() {
				if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
				return def.values[0];
			} });
		});
		function literal(value, params) {
			return new ZodLiteral({
				type: "literal",
				values: Array.isArray(value) ? value : [value],
				...normalizeParams(params)
			});
		}
		const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
			$ZodTransform.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
			inst._zod.parse = (payload, _ctx) => {
				if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				payload.addIssue = (issue$1) => {
					if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
					else {
						const _issue = issue$1;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = inst);
						payload.issues.push(issue(_issue));
					}
				};
				const output = def.transform(payload.value, payload);
				if (output instanceof Promise) return output.then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				payload.value = output;
				payload.fallback = true;
				return payload;
			};
		});
		function transform(fn) {
			return new ZodTransform({
				type: "transform",
				transform: fn
			});
		}
		const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function optional(innerType) {
			return new ZodOptional({
				type: "optional",
				innerType
			});
		}
		const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
			$ZodExactOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function exactOptional(innerType) {
			return new ZodExactOptional({
				type: "optional",
				innerType
			});
		}
		const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
			$ZodNullable.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nullable(innerType) {
			return new ZodNullable({
				type: "nullable",
				innerType
			});
		}
		const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
			$ZodDefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeDefault = inst.unwrap;
		});
		function _default(innerType, defaultValue) {
			return new ZodDefault({
				type: "default",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
			$ZodPrefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function prefault(innerType, defaultValue) {
			return new ZodPrefault({
				type: "prefault",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
			$ZodNonOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nonoptional(innerType, params) {
			return new ZodNonOptional({
				type: "nonoptional",
				innerType,
				...normalizeParams(params)
			});
		}
		const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
			$ZodCatch.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeCatch = inst.unwrap;
		});
		function _catch(innerType, catchValue) {
			return new ZodCatch({
				type: "catch",
				innerType,
				catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
			});
		}
		const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
			$ZodPipe.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
			inst.in = def.in;
			inst.out = def.out;
		});
		function pipe(in_, out) {
			return new ZodPipe({
				type: "pipe",
				in: in_,
				out
			});
		}
		const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
			$ZodReadonly.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function readonly(innerType) {
			return new ZodReadonly({
				type: "readonly",
				innerType
			});
		}
		const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
			$ZodCustom.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
		});
		function refine(fn, _params = {}) {
			return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
		}
		function superRefine(fn, params) {
			return /* @__PURE__ */ _superRefine(fn, params);
		}
		//#endregion
		//#region src/platforms.ts
		/**
		* 共享发布平台契约。
		*
		* 保持本模块不依赖 Node 和 UI，让 Host、schema 与客户端复用同一份定义。
		*/
		const PUBLISH_PLATFORM_DEFINITIONS = {
			xiaohongshu: {
				name: "小红书",
				icon: "xhs",
				settingsLabel: "settings.platform.xiaohongshu",
				inspectorLabel: "inspector.platform.xhs",
				collectUrl: "https://creator.xiaohongshu.com/new/note-manager"
			},
			douyin: {
				name: "抖音",
				icon: "douyin",
				settingsLabel: "settings.platform.douyin",
				inspectorLabel: "inspector.platform.douyin",
				collectUrl: "https://creator.douyin.com/creator-micro/content/manage"
			},
			bilibili: {
				name: "B站",
				icon: "bilibili",
				settingsLabel: "settings.platform.bilibili",
				inspectorLabel: "inspector.platform.bilibili",
				collectUrl: "https://member.bilibili.com/platform/upload-manager/article"
			},
			wechat: {
				name: "视频号",
				icon: "wechat",
				settingsLabel: "settings.platform.wechat",
				inspectorLabel: "inspector.platform.wechat",
				collectUrl: "https://channels.weixin.qq.com/platform/post/list"
			}
		};
		const PUBLISH_PLATFORMS = Object.freeze(Object.keys(PUBLISH_PLATFORM_DEFINITIONS));
		function isPublishPlatform(value) {
			return typeof value === "string" && value in PUBLISH_PLATFORM_DEFINITIONS;
		}
		function normalizeEnabledPlatforms(value) {
			if (!Array.isArray(value)) return [...PUBLISH_PLATFORMS];
			const enabled = new Set(value.filter(isPublishPlatform));
			return PUBLISH_PLATFORMS.filter((platform) => enabled.has(platform));
		}
		//#endregion
		//#region src/schemas.ts
		const contentCoversSchema = object({
			"3x4": string().optional(),
			"4x3": string().optional(),
			"16x9": string().optional()
		});
		const contentSubtitlesSchema = object({
			srt: string().optional(),
			ass: string().optional(),
			transcript: string().optional()
		});
		const pipelineSchema = union([
			literal("raw"),
			literal("subtitled"),
			literal("covered"),
			literal("packaged")
		]);
		const workflowSchema = union([
			literal("idle"),
			literal("record"),
			literal("cut"),
			literal("finish"),
			literal("publish"),
			literal("live")
		]);
		const publishMarkSchema = union([
			literal("unpublished"),
			literal("draft"),
			literal("published")
		]);
		const publishPlatformSchema = _enum(PUBLISH_PLATFORMS);
		const platformPublishSchema = object({
			status: publishMarkSchema,
			source: union([
				literal("none"),
				literal("publisher"),
				literal("overlay"),
				literal("sync")
			]),
			url: string().optional(),
			remoteId: string().optional(),
			views: number().optional(),
			likes: number().optional(),
			comments: number().optional(),
			syncedAt: number().optional()
		});
		const contentPublishSchema = object(Object.fromEntries(PUBLISH_PLATFORMS.map((platform) => [platform, platformPublishSchema])));
		const burnJobSchema = object({
			status: union([
				literal("idle"),
				literal("running"),
				literal("done"),
				literal("error")
			]),
			startedAt: number().optional(),
			output: string().optional(),
			error: string().optional(),
			pid: number().optional()
		});
		const contentSummarySchema = object({
			id: string().min(1),
			folderPath: string().min(1),
			title: string(),
			date: string().optional(),
			recordedAt: number(),
			createdMs: number(),
			videoRaw: string().optional(),
			videoSubtitled: string().optional(),
			covers: contentCoversSchema,
			subtitles: contentSubtitlesSchema,
			hasPublishPackage: boolean(),
			hasArticle: boolean(),
			studioPath: string().optional(),
			waitingForExport: boolean(),
			exportTimedOut: boolean().optional(),
			articlePath: string().optional(),
			tags: array(string()),
			pipeline: pipelineSchema,
			workflow: workflowSchema,
			publish: contentPublishSchema,
			burn: burnJobSchema,
			subtitleJob: burnJobSchema,
			coverJob: burnJobSchema
		});
		const creatorProfileSchema = object({ enabledPlatforms: array(publishPlatformSchema) });
		const secretViewSchema = object({
			kind: union([literal("subtitle"), literal("cover")]),
			ref: string(),
			configured: boolean(),
			writable: boolean(),
			source: string().optional()
		});
		const librarySettingsSchema = object({
			libraryRoot: string(),
			profile: creatorProfileSchema,
			secrets: object({
				subtitle: secretViewSchema,
				cover: secretViewSchema
			}),
			scriptRules: string().optional()
		});
		const listContentsRequestSchema = object({
			query: string(),
			filter: union([
				literal("all"),
				literal("cover"),
				literal("subtitle"),
				literal("article")
			])
		});
		const listContentsResultSchema = object({
			settings: librarySettingsSchema,
			items: array(contentSummarySchema),
			counts: object({
				total: number().int().nonnegative(),
				cover: number().int().nonnegative(),
				subtitle: number().int().nonnegative(),
				article: number().int().nonnegative()
			}),
			revision: number().int().nonnegative()
		});
		const idRequestSchema = object({ id: string().min(1) });
		const contentDetailSchema = contentSummarySchema.and(object({
			publishCopy: string(),
			topicNote: string(),
			script: string(),
			article: string(),
			secrets: object({
				subtitle: secretViewSchema,
				cover: secretViewSchema
			})
		}));
		const coverThumbResultSchema = object({
			found: boolean(),
			mime: string(),
			base64: string()
		});
		const videoPlaybackResultSchema = object({
			found: boolean(),
			url: string(),
			kind: union([literal("raw"), literal("subtitled")])
		});
		const articleMediaResultSchema = object({
			found: boolean(),
			origin: string()
		});
		const subtitleTextResultSchema = object({
			text: string(),
			cues: array(object({
				text: string(),
				at: string().optional()
			}))
		});
		const setContentStageRequestSchema = object({
			id: string().min(1),
			readyToRecord: boolean()
		});
		const bindStudioRequestSchema = object({
			id: string().min(1),
			path: string().min(1)
		});
		const setPublishRequestSchema = object({
			id: string().min(1),
			platform: publishPlatformSchema,
			status: publishMarkSchema,
			url: string().optional()
		});
		const subtitlePreviewResultSchema = object({
			url: string().min(1),
			port: number().int().positive()
		});
		const syncPublishRequestSchema = object({
			id: string().min(1).optional(),
			platform: publishPlatformSchema.optional(),
			force: boolean().optional()
		});
		const syncPublishResultSchema = object({
			matched: number().int().nonnegative(),
			cached: boolean().optional(),
			platforms: array(object({
				platform: publishPlatformSchema,
				count: number().int().nonnegative(),
				loginRequired: boolean().optional(),
				error: string().optional()
			}))
		});
		const revisionResultSchema = object({ revision: number().int().nonnegative() });
		const capabilitySchema = object({
			state: union([
				literal("ready"),
				literal("missing"),
				literal("unsupported")
			]),
			required: boolean(),
			detail: string(),
			path: string().optional()
		});
		const capabilitiesResultSchema = object({ capabilities: object({
			library: capabilitySchema,
			screenStudio: capabilitySchema,
			subtitleSkill: capabilitySchema,
			subtitleCredential: capabilitySchema,
			coverSkill: capabilitySchema,
			coverCredential: capabilitySchema,
			publishSync: capabilitySchema,
			editingSkill: capabilitySchema,
			publishSkill: capabilitySchema,
			articleSkill: capabilitySchema
		}) });
		object({
			id: string().min(1),
			timeoutMs: number().optional()
		});
		const setLibraryRootRequestSchema = object({ path: string().min(1) });
		const createContentRequestSchema = object({ title: string().min(1) });
		const createContentResultSchema = object({
			id: string().min(1),
			folderPath: string().min(1)
		});
		const setProfileRequestSchema = object({ profile: creatorProfileSchema });
		const setScriptRulesRequestSchema = object({ text: string() });
		object({
			id: string().min(1),
			text: string()
		});
		const setScriptRequestSchema = object({
			id: string().min(1),
			text: string()
		});
		object({
			apply: boolean(),
			ids: array(string())
		});
		object({
			moves: array(object({
				from: string().min(1),
				to: string().min(1),
				reason: union([
					literal("add-date"),
					literal("readable-title"),
					literal("both")
				])
			})),
			unchanged: number().int().nonnegative()
		});
		//#endregion
		//#region src/remote-contract.ts
		const PACKAGE_NAME = "dsh-oil-creator";
		const REMOTE_NAMESPACE = "oilCreator";
		const emptyObjectSchema = object({});
		function codec(typeSymbol, schema) {
			return {
				mode: "strict",
				typeSymbol,
				schema
			};
		}
		function jsonParam(name, typeSymbol, schema) {
			return {
				name,
				wire: name,
				source: "json",
				codec: codec(typeSymbol, schema)
			};
		}
		function invocation(method, request, result) {
			return {
				id: `${PACKAGE_NAME}#${REMOTE_NAMESPACE}/${method}`,
				service: REMOTE_NAMESPACE,
				namespace: REMOTE_NAMESPACE,
				method,
				invocation: { kind: "direct" },
				parameters: [jsonParam("request", `${PACKAGE_NAME}#${method}Request`, request)],
				cancellation: { parameter: "signal" },
				result: codec(`${PACKAGE_NAME}#${method}Result`, result),
				sourceLocation: {
					file: "src/service.ts",
					line: 1,
					column: 1
				}
			};
		}
		//#endregion
		//#region src/remote.ts
		const TYPERT_REMOTE = {
			package: PACKAGE_NAME,
			descriptors: [
				invocation("listContents", listContentsRequestSchema, listContentsResultSchema),
				invocation("getContent", idRequestSchema, contentDetailSchema),
				invocation("getCoverThumb", idRequestSchema, coverThumbResultSchema),
				invocation("getVideoPlayback", idRequestSchema, videoPlaybackResultSchema),
				invocation("getArticleMedia", idRequestSchema, articleMediaResultSchema),
				invocation("getSubtitleText", idRequestSchema, subtitleTextResultSchema),
				invocation("getSettings", emptyObjectSchema, librarySettingsSchema),
				invocation("getCapabilities", emptyObjectSchema, capabilitiesResultSchema),
				invocation("getRevision", emptyObjectSchema, revisionResultSchema),
				invocation("setLibraryRoot", setLibraryRootRequestSchema, librarySettingsSchema),
				invocation("refreshCatalog", emptyObjectSchema, listContentsResultSchema),
				invocation("createContent", createContentRequestSchema, createContentResultSchema),
				invocation("setContentStage", setContentStageRequestSchema, contentDetailSchema),
				invocation("setProfile", setProfileRequestSchema, librarySettingsSchema),
				invocation("setScriptRules", setScriptRulesRequestSchema, librarySettingsSchema),
				invocation("bindStudio", bindStudioRequestSchema, contentDetailSchema),
				invocation("openStudio", idRequestSchema, contentDetailSchema),
				invocation("setPublish", setPublishRequestSchema, contentDetailSchema),
				invocation("syncPublish", syncPublishRequestSchema, syncPublishResultSchema),
				invocation("setScript", setScriptRequestSchema, contentDetailSchema),
				invocation("openSubtitlePreview", idRequestSchema, subtitlePreviewResultSchema),
				invocation("startSubtitleBurn", idRequestSchema, contentDetailSchema),
				invocation("startSubtitleGenerate", idRequestSchema, contentDetailSchema),
				invocation("startCoverGenerate", idRequestSchema, contentDetailSchema)
			]
		};
		//#endregion
		//#region src/settingsContract.ts
		const CREATOR_SETTINGS_NAMESPACE = "dsh-oil-creator";
		//#endregion
		//#region src/client/persistence.ts
		const CREATOR_STORAGE_KEY = "dsh-oil-creator/ui/v1";
		const DEFAULT_UI_STATE = {
			schemaVersion: 1,
			selectedId: null,
			filter: "all",
			query: "",
			sidebarTab: "sessions"
		};
		function browserCreatorStorage() {
			try {
				return globalThis.localStorage;
			} catch {
				return;
			}
		}
		function loadCreatorUiState(storage) {
			if (storage === void 0) return { ...DEFAULT_UI_STATE };
			try {
				const raw = storage.getItem(CREATOR_STORAGE_KEY);
				if (raw === null) return { ...DEFAULT_UI_STATE };
				const parsed = JSON.parse(raw);
				const filter = parsed.filter;
				return {
					schemaVersion: 1,
					selectedId: typeof parsed.selectedId === "string" ? parsed.selectedId : null,
					filter: filter === "cover" || filter === "subtitle" || filter === "article" ? filter : "all",
					query: typeof parsed.query === "string" ? parsed.query : "",
					sidebarTab: parsed.sidebarTab === "content" ? "content" : "sessions",
					...typeof parsed.inspectorWidth === "number" && Number.isFinite(parsed.inspectorWidth) ? { inspectorWidth: parsed.inspectorWidth } : {}
				};
			} catch {
				return { ...DEFAULT_UI_STATE };
			}
		}
		function saveCreatorUiState(storage, state) {
			if (storage === void 0) return false;
			try {
				storage.setItem(CREATOR_STORAGE_KEY, JSON.stringify(state));
				return true;
			} catch {
				return false;
			}
		}
		//#endregion
		//#region src/client/contentSelection.ts
		const listeners = /* @__PURE__ */ new Set();
		const libraryListeners = /* @__PURE__ */ new Set();
		const profileListeners = /* @__PURE__ */ new Set();
		const initialUi = loadCreatorUiState(browserCreatorStorage());
		let selectedId = initialUi.selectedId;
		let sidebarTab = initialUi.sidebarTab;
		let libraryEpoch = 0;
		let profileEpoch = 0;
		let sidebarWidthPx = 280;
		let inspectorWidthPx = clampInspectorWidth(initialUi.inspectorWidth ?? 640);
		function clampInspectorWidth(px) {
			return Math.min(800, Math.max(320, Math.round(px)));
		}
		const chromeListeners = /* @__PURE__ */ new Set();
		let sidebarWidthStyleCaptured = false;
		let previousSidebarWidthStyle = "";
		let previousSidebarWidthPriority = "";
		let insetHost = null;
		let insetStyleSnapshot = null;
		function emitChrome() {
			for (const listener of chromeListeners) listener();
		}
		function subscribeSidebarChrome(listener) {
			chromeListeners.add(listener);
			return () => {
				chromeListeners.delete(listener);
			};
		}
		function setSidebarChromeWidth(px) {
			if (sidebarWidthPx === px && (typeof document === "undefined" || sidebarWidthStyleCaptured)) return;
			sidebarWidthPx = px;
			if (typeof document !== "undefined") {
				if (!sidebarWidthStyleCaptured) {
					previousSidebarWidthStyle = document.documentElement.style.getPropertyValue("--oil-sidebar-width");
					previousSidebarWidthPriority = document.documentElement.style.getPropertyPriority("--oil-sidebar-width");
					sidebarWidthStyleCaptured = true;
				}
				document.documentElement.style.setProperty("--oil-sidebar-width", `${px}px`);
			}
			emitChrome();
		}
		function releaseShellChrome() {
			if (typeof document !== "undefined") {
				if (sidebarWidthStyleCaptured) {
					if (previousSidebarWidthStyle === "") document.documentElement.style.removeProperty("--oil-sidebar-width");
					else document.documentElement.style.setProperty("--oil-sidebar-width", previousSidebarWidthStyle, previousSidebarWidthPriority);
				}
			}
			sidebarWidthStyleCaptured = false;
			previousSidebarWidthStyle = "";
			previousSidebarWidthPriority = "";
			clearConversationInset();
		}
		function setInspectorWidth(px) {
			const next = clampInspectorWidth(px);
			if (inspectorWidthPx === next) return;
			inspectorWidthPx = next;
			const state = loadCreatorUiState(browserCreatorStorage());
			saveCreatorUiState(browserCreatorStorage(), {
				...state,
				inspectorWidth: next
			});
		}
		function getInspectorWidth() {
			return inspectorWidthPx;
		}
		function emit() {
			for (const listener of listeners) listener();
		}
		function emitLibrary() {
			for (const listener of libraryListeners) listener();
		}
		function bumpLibrary() {
			libraryEpoch += 1;
			emitLibrary();
		}
		function getLibraryEpoch() {
			return libraryEpoch;
		}
		function subscribeLibrary(listener) {
			libraryListeners.add(listener);
			return () => {
				libraryListeners.delete(listener);
			};
		}
		function useLibraryEpoch() {
			const [epoch, setEpoch] = (0, react.useState)(getLibraryEpoch);
			(0, react.useEffect)(() => subscribeLibrary(() => {
				setEpoch(getLibraryEpoch());
			}), []);
			return epoch;
		}
		function bumpProfile() {
			profileEpoch += 1;
			for (const listener of profileListeners) listener();
		}
		function getProfileEpoch() {
			return profileEpoch;
		}
		function subscribeProfile(listener) {
			profileListeners.add(listener);
			return () => {
				profileListeners.delete(listener);
			};
		}
		function useProfileEpoch() {
			const [epoch, setEpoch] = (0, react.useState)(getProfileEpoch);
			(0, react.useEffect)(() => subscribeProfile(() => {
				setEpoch(getProfileEpoch());
			}), []);
			return epoch;
		}
		/**
		* The rc.7 public layout face exposes panel actions and shell slots, but no
		* content-column inset. The host's stable scrollport is therefore the only
		* remaining compatibility seam for keeping the overlay from covering the
		* conversation. This adapter intentionally has one host, no observer, and a
		* complete inline-style restore path.
		*/
		function conversationHost() {
			if (typeof document === "undefined" || typeof HTMLElement === "undefined") return null;
			const host = document.querySelector("[data-conversation-scroll]")?.parentElement;
			return host instanceof HTMLElement ? host : null;
		}
		function restoreInsetHost() {
			if (insetHost === null || insetStyleSnapshot === null) return;
			if (insetStyleSnapshot.paddingLeft === "") insetHost.style.removeProperty("padding-left");
			else insetHost.style.setProperty("padding-left", insetStyleSnapshot.paddingLeft, insetStyleSnapshot.paddingLeftPriority);
			if (insetStyleSnapshot.transition === "") insetHost.style.removeProperty("transition");
			else insetHost.style.setProperty("transition", insetStyleSnapshot.transition, insetStyleSnapshot.transitionPriority);
			insetHost = null;
			insetStyleSnapshot = null;
		}
		function captureInsetHost(host) {
			if (insetHost === host && insetStyleSnapshot !== null) return;
			restoreInsetHost();
			insetHost = host;
			insetStyleSnapshot = {
				paddingLeft: host.style.getPropertyValue("padding-left"),
				paddingLeftPriority: host.style.getPropertyPriority("padding-left"),
				transition: host.style.getPropertyValue("transition"),
				transitionPriority: host.style.getPropertyPriority("transition")
			};
		}
		function clearConversationInset() {
			restoreInsetHost();
		}
		function applyConversationInset(width, animate = true) {
			const host = conversationHost();
			if (host === null) return null;
			captureInsetHost(host);
			if (width <= 0) {
				restoreInsetHost();
				return host;
			}
			host.style.setProperty("transition", animate ? "padding-left var(--ds-transition-duration-slow) var(--ds-ease-in-out)" : "none");
			host.style.setProperty("padding-left", `${width}px`);
			return host;
		}
		function getSidebarTab() {
			return sidebarTab;
		}
		function setSidebarTab(tab) {
			if (sidebarTab === tab) return;
			sidebarTab = tab;
			const state = loadCreatorUiState(browserCreatorStorage());
			saveCreatorUiState(browserCreatorStorage(), {
				...state,
				sidebarTab
			});
			emitChrome();
		}
		function useSidebarTab() {
			const [tab, setTab] = (0, react.useState)(getSidebarTab);
			(0, react.useEffect)(() => subscribeSidebarChrome(() => {
				setTab(getSidebarTab());
			}), []);
			return tab;
		}
		function getSelectedContentId() {
			return selectedId;
		}
		function setSelectedContentId(id) {
			if (selectedId === id) {
				if (id === null) clearConversationInset();
				return;
			}
			selectedId = id;
			const state = loadCreatorUiState(browserCreatorStorage());
			saveCreatorUiState(browserCreatorStorage(), {
				...state,
				selectedId
			});
			if (id === null) clearConversationInset();
			emit();
		}
		function subscribeSelectedContentId(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		function useSelectedContentId() {
			const [selectedId, setSelectedId] = (0, react.useState)(getSelectedContentId);
			(0, react.useEffect)(() => subscribeSelectedContentId(() => {
				setSelectedId(getSelectedContentId());
			}), []);
			return [selectedId, setSelectedContentId];
		}
		//#endregion
		//#region src/client/catalogSync.ts
		const LIBRARY_POLL_MS = 1e3;
		function startLibraryLiveSync(readRevision, intervalMs = LIBRARY_POLL_MS) {
			let last = -1;
			let inFlight = false;
			let stopped = false;
			const tick = async () => {
				if (stopped || inFlight) return;
				inFlight = true;
				try {
					const revision = await readRevision();
					if (stopped) return;
					if (last < 0) {
						last = revision;
						if (revision > 0) bumpLibrary();
						return;
					}
					if (revision !== last) {
						last = revision;
						bumpLibrary();
					}
				} catch {} finally {
					inFlight = false;
				}
			};
			tick();
			const timer = globalThis.setInterval(() => {
				tick();
			}, intervalMs);
			return () => {
				stopped = true;
				globalThis.clearInterval(timer);
			};
		}
		//#endregion
		//#region src/client/pluginCss.ts
		const STORE = "__dshOilCreatorCss";
		function cssStore() {
			const global = globalThis;
			global[STORE] ??= { sheets: /* @__PURE__ */ new Map() };
			return global[STORE];
		}
		function registerPluginCss(tagId, css) {
			cssStore().sheets.set(tagId, css);
			mountPluginCss(tagId, css);
		}
		function mountPluginCss(tagId, css) {
			if (typeof document === "undefined") return;
			const existing = document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`);
			const tag = existing instanceof HTMLStyleElement ? existing : document.createElement("style");
			tag.dataset.plugin = "dsh-oil-creator";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			if (existing === null) document.head.appendChild(tag);
		}
		function remountPluginCss() {
			for (const [tagId, css] of cssStore().sheets) mountPluginCss(tagId, css);
		}
		function releasePluginCss() {
			if (typeof document === "undefined") return;
			for (const tag of document.querySelectorAll("style[data-plugin=\"dsh-oil-creator\"]")) tag.remove();
		}
		//#endregion
		//#region src/contentRef.ts
		function formatContentRef(detail) {
			return detail.folderPath;
		}
		//#endregion
		//#region src/client/contentTriggers.ts
		/** Composer chips occupy a fixed 4em cell; longer labels are centered and clipped. */
		const CHIP_UNITS = 8;
		function charUnits(ch) {
			return /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? 2 : 1;
		}
		function chipLabel(title) {
			const chars = [...title.trim()];
			if (chars.length === 0) return "内容";
			let used = 0;
			const out = [];
			for (const ch of chars) {
				const w = charUnits(ch);
				if (used + w > CHIP_UNITS) {
					while (used > 7 && out.length > 0) {
						used -= charUnits(out[out.length - 1] ?? "");
						out.pop();
					}
					while (out.length > 0 && out[out.length - 1] === " ") {
						used -= 1;
						out.pop();
					}
					out.push("…");
					return out.join("");
				}
				out.push(ch);
				used += w;
			}
			return out.join("");
		}
		function registerContentTriggers(inputTriggers, load, list) {
			if (inputTriggers === void 0) return () => void 0;
			const serialize = async (ref) => {
				const id = ref === "current" ? getSelectedContentId() : ref;
				if (id === null || id === "") return "当前没有打开的内容。用 @ 选一条，或先在左侧打开详情。";
				return formatContentRef(await load(id));
			};
			const insert = (ref, title) => ({ insert: {
				source: "oil",
				ref,
				label: chipLabel(title),
				clipboardText: `@${title}`
			} });
			const atSource = {
				trigger: "@",
				name: "oil",
				order: 30,
				async candidates(_session, req) {
					const query = req.query.trim().toLowerCase();
					const items = await list();
					const rows = [];
					const selected = getSelectedContentId();
					if (selected !== null && ("当前".includes(query) || query === "")) {
						const current = items.find((item) => item.id === selected);
						rows.push({
							name: "当前详情",
							description: current?.title ?? selected
						});
					}
					for (const item of items) {
						if (query !== "" && !item.title.toLowerCase().includes(query) && !item.id.toLowerCase().includes(query)) continue;
						rows.push({
							name: item.title,
							description: item.id
						});
					}
					return rows.slice(0, 20);
				},
				onPick({ candidate }) {
					if (candidate.name === "当前详情") return insert("current", "当前详情");
					return insert(candidate.description ?? candidate.name, candidate.name);
				},
				lexicon() {
					return ["当前详情"];
				},
				subscribeLexicon(_session, listener) {
					return subscribeSelectedContentId(listener);
				},
				codec: {
					clipboardText: (ref) => ref === "current" ? "@当前详情" : `@${ref}`,
					serialize
				}
			};
			const slashSource = {
				trigger: "/",
				name: "oil",
				order: 40,
				async candidates(_session, req) {
					const query = req.query.trim().toLowerCase();
					const name = "current content";
					if (query !== "" && !name.includes(query) && !"当前内容".includes(query)) return [];
					return [{
						name,
						description: "把当前打开的内容交给对话"
					}];
				},
				onPick() {
					return insert("current", "当前内容");
				},
				lexicon() {
					return ["current content", "当前内容"];
				},
				codec: {
					clipboardText: () => "/current content",
					serialize
				}
			};
			const stopAt = inputTriggers.registerSource(atSource);
			const stopSlash = inputTriggers.registerSource(slashSource);
			return () => {
				stopAt();
				stopSlash();
			};
		}
		//#endregion
		//#region src/collectPublish.ts
		function formatCount(value) {
			if (!Number.isFinite(value) || value < 0) return "";
			if (value >= 1e4) {
				const wan = value / 1e4;
				return `${wan >= 100 ? String(Math.round(wan)) : wan.toFixed(1).replace(/\.0$/, "")}万`;
			}
			return String(Math.round(value));
		}
		PUBLISH_PLATFORMS.map((platform) => ({
			platform,
			url: PUBLISH_PLATFORM_DEFINITIONS[platform].collectUrl
		}));
		Object.fromEntries([...PUBLISH_PLATFORMS.map((platform) => [platform, platform]), ["wechat_channels", "wechat"]]);
		function isPublishMark(value) {
			return value === "unpublished" || value === "draft" || value === "published";
		}
		//#endregion
		//#region src/articleMarkdown.ts
		function rewriteArticleImages(markdown, origin) {
			const base = origin.replace(/\/$/, "");
			return markdown.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?((?:\s+(?:"[^"]*"|'[^']*'))?)\s*\)/g, (all, alt, src, title) => {
				const dest = src.trim();
				if (/^(https?:|data:|file:)/i.test(dest)) return all;
				const rel = dest.replace(/^\.\//, "").replace(/^\/+/, "");
				return `![${alt}](${base}/${rel}${title})`;
			});
		}
		//#endregion
		//#region src/client/CoverThumb.tsx
		function coverThumbRevision(covers) {
			return `${covers["3x4"] ?? ""}|${covers["4x3"] ?? ""}|${covers["16x9"] ?? ""}`;
		}
		function CoverThumb({ id, load, fallback = null, revision = 0 }) {
			const [src, setSrc] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				setSrc(void 0);
			}, [id]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				load(id).then((thumb) => {
					if (cancelled || !thumb.found) return;
					setSrc(`data:${thumb.mime};base64,${thumb.base64}`);
				});
				return () => {
					cancelled = true;
				};
			}, [
				id,
				load,
				revision
			]);
			if (src === void 0) return fallback;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
				src,
				alt: ""
			});
		}
		//#endregion
		//#region src/client/platformIcons.ts
		const PLATFORM_ICONS = {
			xhs: "data:image/svg+xml,%3Csvg%20fill%3D%22%23FF2442%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Ctitle%3EXiaohongshu%3C/title%3E%3Cpath%20d%3D%22M22.405%209.879c.002.016.01.02.07.019h.725a.797.797%200%200%200%20.78-.972.794.794%200%200%200-.884-.618.795.795%200%200%200-.692.794c0%20.101-.002.666.001.777zm-11.509%204.808c-.203.001-1.353.004-1.685.003a2.528%202.528%200%200%201-.766-.126.025.025%200%200%200-.03.014L7.7%2016.127a.025.025%200%200%200%20.01.032c.111.06.336.124.495.124.66.01%201.32.002%201.981%200%20.01%200%20.02-.006.023-.015l.712-1.545a.025.025%200%200%200-.024-.036zM.477%209.91c-.071%200-.076.002-.076.01a.834.834%200%200%200-.01.08c-.027.397-.038.495-.234%203.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681%201.523.787%201.74.008.015.011.02.017.02.008%200%20.033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029%200-.033-.03-.034zm7.203%203.757a1.427%201.427%200%200%201-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443%200%200%200-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153%201.964.233%202.946.05.4.186%201.085.487%201.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126%200%200%201-.116-.178l1.178-2.625a.025.025%200%200%200-.023-.035l-1.318-.003a.148.148%200%200%201-.135-.21l.876-1.954a.025.025%200%200%200-.023-.035h-1.56c-.01%200-.02.006-.024.015l-.926%202.068c-.085.169-.314.634-.399.938a.534.534%200%200%200-.02.191.46.46%200%200%200%20.23.378.981.981%200%200%200%20.46.119h.59c.041%200-.688%201.482-.834%201.972a.53.53%200%200%200-.023.172.465.465%200%200%200%20.23.398c.15.092.342.12.475.12l1.66-.001c.01%200%20.02-.006.023-.015l.575-1.28a.025.025%200%200%200-.024-.035zm-6.93-4.937H3.1a.032.032%200%200%200-.034.033c0%201.048-.01%202.795-.01%206.829%200%20.288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465%201.064.555%201.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33%200-4.66-.007-6.991a.032.032%200%200%200-.032-.032zm11.784%206.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08%200%20.075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064%200-.075-.006-.075.073v1.445c0%20.083-.006.077.08.077h.854c.075%200%20.07-.004.07.07v4.624c0%20.095.008.084-.085.084-.37%200-1.11-.002-1.304%200-.048.001-.06.03-.06.03l-.697%201.519s-.014.025-.008.036c.006.01.013.008.058.008%201.748.003%203.495.002%205.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0%20.013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303%200-.072-.006-.071.07-.07l.733-.003c.041%200%20.081.002.12.015.093.025.16.107.165.204.006.431.002%201.153.001%201.153zm2.67.244a1.953%201.953%200%200%200-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823%201.823%200%200%200-.153-.53%201.533%201.533%200%200%200-.677-.71%202.167%202.167%200%200%200-1-.258c-.153-.003-.567%200-.72%200-.07%200-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016%200-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0%20.09-.004.082.082.082h.913c.082%200%20.072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068%200-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082%200%20.076-.006.076.079v3.225c0%20.088-.007.081.082.081h1.43c.09%200%20.082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098%200%20.191.02.28.061a.46.46%200%200%201%20.274.407c.008.395.003.79.003%201.185%200%20.259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57%201.303a.045.045%200%200%200%20.04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03%202.03%200%200%200%20.408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38%200%20.078-.029-.641-.724-.998z%22/%3E%3C/svg%3E",
			bilibili: "data:image/svg+xml,%3Csvg%20fill%3D%22%2300A1D6%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Ctitle%3EBilibili%3C/title%3E%3Cpath%20d%3D%22M17.813%204.653h.854c1.51.054%202.769.578%203.773%201.574%201.004.995%201.524%202.249%201.56%203.76v7.36c-.036%201.51-.556%202.769-1.56%203.773s-2.262%201.524-3.773%201.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036%2018.858%200%2017.347v-7.36c.036-1.511.556-2.765%201.56-3.76%201.004-.996%202.262-1.52%203.773-1.574h.774l-1.174-1.12a1.234%201.234%200%200%201-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347%200%20.653.124.92.373L9.653%204.44c.071.071.134.142.187.213h4.267a.836.836%200%200%201%20.16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347%200%20.662.151.929.4.267.249.391.551.391.907%200%20.355-.124.657-.373.906zM5.333%207.24c-.746.018-1.373.276-1.88.773-.506.498-.769%201.13-.786%201.894v7.52c.017.764.28%201.395.786%201.893.507.498%201.134.756%201.88.773h13.334c.746-.017%201.373-.275%201.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8%2011.107c.373%200%20.684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8%200c.373%200%20.684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373Z%22/%3E%3C/svg%3E",
			douyin: "data:image/svg+xml,%3Csvg%20fill%3D%22%23000000%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Ctitle%3ETikTok%3C/title%3E%3Cpath%20d%3D%22M12.525.02c1.31-.02%202.61-.01%203.91-.02.08%201.53.63%203.09%201.75%204.17%201.12%201.11%202.7%201.62%204.24%201.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01%202.92.01%205.84-.02%208.75-.08%201.4-.54%202.79-1.35%203.94-1.31%201.92-3.58%203.17-5.91%203.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9%201.12-3.72%202.58-4.96%201.66-1.44%203.98-2.13%206.15-1.72.02%201.48-.04%202.96-.04%204.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11%201.04-1.36%201.75-.21.51-.15%201.07-.14%201.61.24%201.64%201.82%203.02%203.5%202.87%201.12-.01%202.19-.66%202.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z%22/%3E%3C/svg%3E",
			wechat: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cg%20stroke-linejoin%3D%22round%22%20stroke-linecap%3D%22round%22%3E%3Cpath%20fill%3D%22%23F5C84A%22%20stroke%3D%22%23F5C84A%22%20stroke-width%3D%222.2%22%20d%3D%22M2.2%206.1v11.8L13.4%2012z%22/%3E%3Cpath%20fill%3D%22%23EE8A28%22%20stroke%3D%22%23EE8A28%22%20stroke-width%3D%222.2%22%20d%3D%22M9.4%206.1v11.8L20.6%2012z%22/%3E%3C/g%3E%3C/svg%3E",
			article: "data:image/svg+xml,%3Csvg%20fill%3D%22%2307C160%22%20role%3D%22img%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Ctitle%3EWeChat%3C/title%3E%3Cpath%20d%3D%22M8.691%202.188C3.891%202.188%200%205.476%200%209.53c0%202.212%201.17%204.203%203.002%205.55a.59.59%200%200%201%20.213.665l-.39%201.48c-.019.07-.048.141-.048.213%200%20.163.13.295.29.295a.326.326%200%200%200%20.167-.054l1.903-1.114a.864.864%200%200%201%20.717-.098%2010.16%2010.16%200%200%200%202.837.403c.276%200%20.543-.027.811-.05-.857-2.578.157-4.972%201.932-6.446%201.703-1.415%203.882-1.98%205.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785%205.991c.642%200%201.162.529%201.162%201.18a1.17%201.17%200%200%201-1.162%201.178A1.17%201.17%200%200%201%204.623%207.17c0-.651.52-1.18%201.162-1.18zm5.813%200c.642%200%201.162.529%201.162%201.18a1.17%201.17%200%200%201-1.162%201.178%201.17%201.17%200%200%201-1.162-1.178c0-.651.52-1.18%201.162-1.18zm5.34%202.867c-1.797-.052-3.746.512-5.28%201.786-1.72%201.428-2.687%203.72-1.78%206.22.942%202.453%203.666%204.229%206.884%204.229.826%200%201.622-.12%202.361-.336a.722.722%200%200%201%20.598.082l1.584.926a.272.272%200%200%200%20.14.047c.134%200%20.24-.111.24-.247%200-.06-.023-.12-.038-.177l-.327-1.233a.582.582%200%200%201-.023-.156.49.49%200%200%201%20.201-.398C23.024%2018.48%2024%2016.82%2024%2014.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53%203.274c.535%200%20.969.44.969.982a.976.976%200%200%201-.969.983.976.976%200%200%201-.969-.983c0-.542.434-.982.97-.982zm4.844%200c.535%200%20.969.44.969.982a.976.976%200%200%201-.969.983.976.976%200%200%201-.969-.983c0-.542.434-.982.969-.982z%22/%3E%3C/svg%3E"
		};
		//#endregion
		//#region src/client/PlatformMark.tsx
		function PlatformMark({ id, size = 18 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
				className: "platformMark",
				src: PLATFORM_ICONS[id],
				width: size,
				height: size,
				alt: "",
				draggable: false
			});
		}
		//#endregion
		//#region src/client/publishPlatforms.ts
		const PUBLISH_UI_PLATFORMS = PUBLISH_PLATFORMS.map((key) => ({
			key,
			id: PUBLISH_PLATFORM_DEFINITIONS[key].icon,
			label: PUBLISH_PLATFORM_DEFINITIONS[key].inspectorLabel
		}));
		const CREATOR_SETTINGS_PLATFORMS = PUBLISH_PLATFORMS.map((key) => ({
			key,
			label: PUBLISH_PLATFORM_DEFINITIONS[key].settingsLabel
		}));
		function selectEnabledPublishPlatforms(enabledPlatforms) {
			const enabled = new Set(enabledPlatforms);
			return PUBLISH_UI_PLATFORMS.filter((platform) => enabled.has(platform.key));
		}
		function isPublishSyncDisabled(busy, platformSettingsPending, enabledPlatforms) {
			return busy !== void 0 || platformSettingsPending || selectEnabledPublishPlatforms(enabledPlatforms).length === 0;
		}
		//#endregion
		//#region src/client/relativeTime.ts
		function formatRelativeTime(recordedAt, now, t) {
			const delta = now - recordedAt;
			if (delta < 45e3) return t("time.justNow");
			if (delta < 36e5) return t("time.minutes").replace("{n}", String(Math.max(1, Math.round(delta / 6e4))));
			if (delta < 864e5) return t("time.hours").replace("{n}", String(Math.max(1, Math.round(delta / 36e5))));
			const days = Math.round(delta / 864e5);
			if (days === 1) return t("time.yesterday");
			if (days < 7) return t("time.days").replace("{n}", String(days));
			const date = new Date(recordedAt);
			const current = new Date(now);
			if (date.getFullYear() === current.getFullYear()) return t("time.monthDay").replace("{m}", String(date.getMonth() + 1)).replace("{d}", String(date.getDate()));
			return t("time.yearMonthDay").replace("{y}", String(date.getFullYear())).replace("{m}", String(date.getMonth() + 1)).replace("{d}", String(date.getDate()));
		}
		//#endregion
		//#region \0dsh-oil-creator-css:/private/tmp/dsh-oil-creator-ed9417d/dsh-oil-creator-ed9417d1e0d24bdecdac831d4e72d3428e49a123/src/client/ui/StatusPill.css.mjs
		registerPluginCss("dsh-oil-creator/StatusPill.css", ".statusPill {\n  gap: 5px;\n  max-width: 100%;\n  font-weight: 500;\n  white-space: nowrap;\n}\n\n.statusPill.pending {\n  color: var(--dsw-alias-state-warn-label);\n}\n\n.statusPill.active {\n  color: var(--dsw-alias-state-business-primary);\n}\n\n.statusPill.success {\n  color: var(--dsw-alias-state-success-primary);\n}\n\n.statusPill.error {\n  color: var(--dsw-alias-state-error-primary);\n}\n\nbutton.statusPill:disabled {\n  opacity: 0.5;\n  cursor: default;\n}\n");
		//#endregion
		//#region src/client/ui/StatusPill.tsx
		const TONE_STATE = {
			neutral: void 0,
			pending: "warning",
			active: "ongoing",
			success: "done",
			error: "error"
		};
		function statusPillClass(tone, extra) {
			return [
				"statusPill",
				tone,
				extra
			].filter((part) => part !== void 0 && part !== "").join(" ");
		}
		function StatusPill({ tone = "neutral", title, children, onClick, ...rest }) {
			const state = TONE_STATE[tone];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
				className: statusPillClass(tone),
				...title === void 0 ? {} : { title },
				...onClick === void 0 ? {} : { onClick },
				...rest,
				children: [state !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
					state,
					size: 10
				}) : null, children]
			});
		}
		//#endregion
		//#region \0dsh-oil-creator-css:/private/tmp/dsh-oil-creator-ed9417d/dsh-oil-creator-ed9417d1e0d24bdecdac831d4e72d3428e49a123/src/client/sidebar/ContentSidebarPanel.css.mjs
		registerPluginCss("dsh-oil-creator/ContentSidebarPanel.css", "[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentPanel {\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n  height: 100%;\n  padding-right: var(--dsh-sidebar-inline-padding);\n  box-sizing: border-box;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentHeader {\n  flex: none;\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 4px;\n  height: 36px;\n  padding-left: 4px;\n  margin: 2px -4px 4px 0;\n  box-sizing: border-box;\n  border-radius: 12px;\n  overflow: hidden;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .searchSlot {\n  flex: 1;\n  max-width: 28px;\n  min-width: 0;\n  display: flex;\n  align-items: center;\n  margin-left: auto;\n  padding-left: 0;\n  box-sizing: border-box;\n  transition:\n    max-width 180ms var(--ds-ease-in-out),\n    padding-left 180ms var(--ds-ease-in-out);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .searchSlot.expanded {\n  max-width: 100%;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentSearch {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 0;\n  width: 100%;\n  height: 28px;\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n  border: none;\n  border-radius: 50%;\n  background: transparent;\n  cursor: text;\n  color: var(--dsw-alias-label-secondary);\n  overflow: hidden;\n  transition:\n    width 180ms var(--ds-ease-in-out),\n    padding 180ms var(--ds-ease-in-out),\n    border-color 180ms var(--ds-ease-in-out),\n    background-color 180ms var(--ds-ease-in-out);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentSearch.expanded {\n  width: calc(100% + 4px);\n  height: 30px;\n  margin-inline: -2px;\n  padding: 0 4px 0 0;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 10px;\n  background: transparent;\n  color: var(--dsw-alias-label-caption);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .searchButton {\n  flex: none;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 28px;\n  height: 28px;\n  padding: 0;\n  border: none;\n  border-radius: 50%;\n  background: transparent;\n  color: inherit;\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentSearch.expanded .searchButton {\n  width: 28px;\n  height: 30px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .searchButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentSearch.expanded .searchButton:hover {\n  background: transparent;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .searchInput {\n  flex: 1;\n  width: 0;\n  min-width: 0;\n  border: none;\n  outline: none;\n  background: transparent;\n  opacity: 0;\n  pointer-events: none;\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n  line-height: 18px;\n  transition: opacity 120ms var(--ds-ease-in-out);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentSearch.expanded .searchInput {\n  margin-left: -2px;\n  opacity: 1;\n  pointer-events: auto;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .searchInput::placeholder {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .clearButton {\n  flex: none;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 24px;\n  height: 24px;\n  padding: 0;\n  border: none;\n  border-radius: 50%;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary);\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .clearButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .headerActions {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  max-width: 64px;\n  opacity: 1;\n  overflow: hidden;\n  visibility: visible;\n  transition:\n    max-width 180ms var(--ds-ease-in-out),\n    opacity 120ms var(--ds-ease-in-out),\n    transform 180ms var(--ds-ease-in-out),\n    visibility 0s linear;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .headerActions.hidden {\n  max-width: 0;\n  opacity: 0;\n  transform: translateX(4px);\n  visibility: hidden;\n  pointer-events: none;\n  transition-delay: 0s, 0s, 0s, 180ms;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentList {\n  flex: 1;\n  min-height: 0;\n  overflow: auto;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentEmpty {\n  padding: 16px 8px;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 13px;\n  line-height: 20px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentRow {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  width: 100%;\n  min-height: 64px;\n  margin: 0 0 4px;\n  padding: 8px;\n  border: none;\n  border-radius: 10px;\n  background: transparent;\n  color: inherit;\n  text-align: left;\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentRow:hover,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentRow.selected {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentRow:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 2px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .rowCover {\n  flex: none;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 48px;\n  height: 64px;\n  overflow: hidden;\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .rowCover img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .coverFallback {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .rowBody {\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .rowTitle {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 14px;\n  line-height: 20px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"create-dialog\"] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  width: 100%;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .createField,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"create-dialog\"] .createField {\n  display: flex;\n  flex-direction: column;\n  align-items: stretch;\n  gap: 8px;\n  width: 100%;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"create-dialog\"] .createLabel {\n  display: block;\n  width: 100%;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 13px;\n  line-height: 20px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"create-dialog\"] .createInput {\n  display: flex;\n  width: 100%;\n  box-sizing: border-box;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .createError,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"create-dialog\"] .createError {\n  margin-top: 0;\n  color: var(--dsw-alias-state-error-primary);\n  font-size: 12px;\n  line-height: 18px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .rowMeta {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  min-width: 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .rowCover .coverFallback {\n  opacity: 0.5;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .rowDate {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 17px;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .searchSlot,\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .contentSearch,\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .searchInput,\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .headerActions {\n    transition: none;\n  }\n}\n");
		//#endregion
		//#region src/client/sidebar/ContentSidebarPanel.tsx
		const WORKFLOW_TONE = {
			idle: "neutral",
			record: "pending",
			cut: "pending",
			finish: "pending",
			publish: "pending",
			live: "success"
		};
		function sortByRecency(items) {
			return [...items].sort((a, b) => {
				if (a.recordedAt !== b.recordedAt) return b.recordedAt - a.recordedAt;
				return b.createdMs - a.createdMs;
			});
		}
		function ContentSidebarPanel({ t, ready, listContents, getCoverThumb, refreshCatalog, createContent }) {
			const [query, setQuery] = (0, react.useState)("");
			const [searchOpen, setSearchOpen] = (0, react.useState)(false);
			const searchRoot = (0, react.useRef)(null);
			const searchInput = (0, react.useRef)(null);
			const libraryEpoch = useLibraryEpoch();
			const [selectedId, setSelectedId] = useSelectedContentId();
			const selectedIdRef = (0, react.useRef)(selectedId);
			selectedIdRef.current = selectedId;
			const [items, setItems] = (0, react.useState)([]);
			const [error, setError] = (0, react.useState)(void 0);
			const [loading, setLoading] = (0, react.useState)(false);
			const [creating, setCreating] = (0, react.useState)(false);
			const [createOpen, setCreateOpen] = (0, react.useState)(false);
			const [createName, setCreateName] = (0, react.useState)("");
			const [createError, setCreateError] = (0, react.useState)(void 0);
			const loadList = async (nextQuery = query) => {
				if (!ready()) {
					setError(t("empty.remote"));
					return;
				}
				setLoading(true);
				setError(void 0);
				try {
					const result = await listContents(nextQuery, "all");
					setItems(sortByRecency(result.items));
					const currentId = selectedIdRef.current;
					if (nextQuery === "" && currentId !== null && !result.items.some((item) => item.id === currentId)) setSelectedId(null);
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : t("empty.error"));
				} finally {
					setLoading(false);
				}
			};
			(0, react.useEffect)(() => {
				const handle = window.setTimeout(() => {
					loadList(query);
				}, 200);
				return () => {
					window.clearTimeout(handle);
				};
			}, [query, libraryEpoch]);
			(0, react.useEffect)(() => {
				if (!searchOpen) return;
				searchInput.current?.focus({ preventScroll: true });
			}, [searchOpen]);
			(0, react.useEffect)(() => {
				if (!searchOpen) return;
				const onClick = (event) => {
					if (!(event.target instanceof Node) || searchRoot.current?.contains(event.target) === true) return;
					searchInput.current?.blur();
					if (query !== "") return;
					setSearchOpen(false);
				};
				document.addEventListener("click", onClick);
				return () => {
					document.removeEventListener("click", onClick);
				};
			}, [searchOpen, query]);
			const closeSearch = () => {
				setQuery("");
				setSearchOpen(false);
			};
			const closeCreate = () => {
				if (creating) return;
				setCreateOpen(false);
				setCreateName("");
				setCreateError(void 0);
			};
			const onCreate = async () => {
				const title = createName.trim();
				if (title === "" || creating) return;
				setCreating(true);
				setCreateError(void 0);
				try {
					const created = await createContent(title);
					setCreateOpen(false);
					setCreateName("");
					await loadList(query);
					setSelectedId(created.id);
				} catch (cause) {
					setCreateError(cause instanceof Error ? cause.message : t("create.failed"));
				} finally {
					setCreating(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "contentPanel",
				"data-surface": "content-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "contentHeader",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: searchOpen ? "searchSlot expanded" : "searchSlot",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								ref: searchRoot,
								className: searchOpen ? "contentSearch expanded" : "contentSearch",
								onClick: () => {
									if (searchOpen) return;
									setSearchOpen(true);
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
										label: t("toolbar.search"),
										delayMs: 500,
										disabled: searchOpen,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "searchButton",
											"aria-label": t("toolbar.search.aria"),
											"aria-expanded": searchOpen,
											onClick: () => {
												setSearchOpen(true);
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: searchOpen ? 11 : 14 })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										ref: searchInput,
										className: "searchInput",
										value: query,
										placeholder: t("toolbar.search"),
										tabIndex: searchOpen ? 0 : -1,
										onChange: (event) => {
											setQuery(event.target.value);
										},
										onKeyDown: (event) => {
											if (event.key !== "Escape") return;
											closeSearch();
										}
									}),
									searchOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "clearButton",
										"aria-label": t("toolbar.search.clear"),
										onClick: (event) => {
											event.stopPropagation();
											closeSearch();
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})
									})
								]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: searchOpen ? "headerActions hidden" : "headerActions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("toolbar.refresh"),
								delayMs: 500,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "iconButton",
									"aria-label": t("toolbar.refresh"),
									onClick: () => {
										refreshCatalog().then(() => loadList(query));
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, { size: 16 })
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("toolbar.create"),
								delayMs: 500,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "iconButton",
									"aria-label": t("toolbar.create.aria"),
									onClick: () => {
										setCreateOpen(true);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconProjectAddOutline16, { size: 16 })
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: createOpen,
						onClose: closeCreate,
						title: t("create.title"),
						closeLabel: t("create.cancel"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: creating,
							onClick: closeCreate,
							children: t("create.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: creating || createName.trim() === "",
							onClick: () => {
								onCreate();
							},
							children: t("create.confirm")
						})] }),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-plugin": "dsh-oil-creator",
							"data-surface": "create-dialog",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "createField",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									className: "createLabel",
									htmlFor: "oil-create-name",
									children: t("create.name")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "oil-create-name",
									className: "createInput",
									value: createName,
									placeholder: t("create.name.placeholder"),
									autoFocus: true,
									disabled: creating,
									onChange: (event) => {
										setCreateName(event.target.value);
									},
									onKeyDown: (event) => {
										if (event.key !== "Enter") return;
										event.preventDefault();
										onCreate();
									}
								})]
							}), createError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "createError",
								children: createError
							})]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "contentList",
						children: [
							error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "contentEmpty",
								children: error
							}),
							error === void 0 && items.length === 0 && !loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "contentEmpty",
								children: t("empty.library")
							}),
							items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: item.id === selectedId ? "contentRow selected" : "contentRow",
								onClick: () => {
									setSelectedId(item.id === selectedId ? null : item.id);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "rowCover",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CoverThumb, {
										id: item.id,
										load: getCoverThumb,
										revision: coverThumbRevision(item.covers),
										fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, {
											className: "coverFallback",
											size: 20
										})
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "rowBody",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "rowTitle",
										children: item.title
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "rowMeta",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
											tone: WORKFLOW_TONE[item.workflow],
											children: t(`inspector.stage.${item.workflow}`)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "rowDate",
											children: formatRelativeTime(item.recordedAt, Date.now(), t)
										})]
									})]
								})]
							}, item.id))
						]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-oil-creator-css:/private/tmp/dsh-oil-creator-ed9417d/dsh-oil-creator-ed9417d1e0d24bdecdac831d4e72d3428e49a123/src/client/ui/ActionButton.css.mjs
		registerPluginCss("dsh-oil-creator/ActionButton.css", "[data-plugin=\"dsh-oil-creator\"] .oilActionBar {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n");
		//#endregion
		//#region src/client/ui/ActionButton.tsx
		const VARIANT = {
			primary: "primary",
			secondary: "outline",
			ghost: "ghost"
		};
		function ActionButton({ tone = "secondary", children, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				type: "button",
				size: "sm",
				variant: VARIANT[tone],
				...rest,
				children
			});
		}
		function ActionBar({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "oilActionBar",
				children
			});
		}
		//#endregion
		//#region \0dsh-oil-creator-css:/private/tmp/dsh-oil-creator-ed9417d/dsh-oil-creator-ed9417d1e0d24bdecdac831d4e72d3428e49a123/src/client/ui/Surface.css.mjs
		registerPluginCss("dsh-oil-creator/Surface.css", "[data-plugin=\"dsh-oil-creator\"] .oilSurface {\n  padding: 14px 14px 16px;\n  border-radius: 12px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n[data-plugin=\"dsh-oil-creator\"] .oilSurface + .oilSurface,\n[data-plugin=\"dsh-oil-creator\"] .oilSurface + .block,\n[data-plugin=\"dsh-oil-creator\"] .lede + .oilSurface {\n  margin-top: 16px;\n}\n\n[data-plugin=\"dsh-oil-creator\"] .oilSurfaceTitle {\n  margin-bottom: 4px;\n  font: var(--dsw-font-markdown-base-strong);\n  color: var(--dsw-alias-label-primary);\n}\n\n[data-plugin=\"dsh-oil-creator\"] .oilSurfaceHint {\n  margin: 0 0 12px;\n  color: var(--dsw-alias-label-tertiary);\n  font: var(--dsw-font-markdown-small);\n}\n\n[data-plugin=\"dsh-oil-creator\"] .oilSurfaceTitle + .oilActionBar,\n[data-plugin=\"dsh-oil-creator\"] .oilSurfaceHint + .oilActionBar {\n  margin-top: 12px;\n}\n");
		//#endregion
		//#region src/client/ui/Surface.tsx
		function Surface({ title, hint, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "oilSurface",
				children: [
					title !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "oilSurfaceTitle",
						children: title
					}),
					hint !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "oilSurfaceHint",
						children: hint
					}),
					children
				]
			});
		}
		//#endregion
		//#region \0dsh-oil-creator-css:/private/tmp/dsh-oil-creator-ed9417d/dsh-oil-creator-ed9417d1e0d24bdecdac831d4e72d3428e49a123/src/client/ContentInspector.css.mjs
		registerPluginCss("dsh-oil-creator/ContentInspector.css", "[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  min-width: 0;\n  min-height: 0;\n  overflow: hidden;\n  background: var(--dsw-alias-bg-base);\n  border-right: 1px solid var(--dsw-alias-border-l1);\n  box-sizing: border-box;\n  font: var(--dsw-font-markdown-base);\n  color: var(--dsw-alias-label-primary);\n  --dsh-scrollbar-thumb: transparent;\n  --dsh-scrollbar-thumb-hover: transparent;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"].docked {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  left: var(--oil-sidebar-width, 280px);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"].docked.open:not(.dragging) {\n  transition: width var(--ds-transition-duration-slow) var(--ds-ease-in-out);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .header {\n  flex: none;\n  padding: 12px 16px 0 16px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .titleRow {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  min-height: 32px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .title {\n  min-width: 0;\n  overflow: hidden;\n  font-size: 14px;\n  font-weight: 500;\n  line-height: 20px;\n  color: var(--dsw-alias-label-primary);\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .titleActions {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .close {\n  flex: none;\n  display: grid;\n  place-items: center;\n  width: 28px;\n  height: 28px;\n  padding: 0;\n  border: none;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary);\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .close:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .close:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 2px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .tabs {\n  display: flex;\n  gap: 20px;\n  margin-top: 4px;\n  padding-left: 2px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .tab {\n  position: relative;\n  padding: 0 0 11px;\n  border: none;\n  background: transparent;\n  font-size: 13px;\n  line-height: 16px;\n  font-weight: 500;\n  color: var(--dsw-alias-label-tertiary);\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .tab::after {\n  content: \"\";\n  position: absolute;\n  right: 0;\n  bottom: 1px;\n  left: 0;\n  height: 2px;\n  border-radius: 2px;\n  background: transparent;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .tab.active {\n  color: var(--dsw-alias-state-business-primary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .tab.active::after {\n  background: var(--dsw-alias-state-business-primary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .tab:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 2px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .body {\n  flex: 1;\n  min-height: 0;\n  padding: 20px 20px 32px;\n  overflow-y: auto;\n  scrollbar-width: none;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .body::-webkit-scrollbar {\n  width: 0;\n  height: 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .empty {\n  padding: 8px 0;\n  color: var(--dsw-alias-label-tertiary);\n  font: var(--dsw-font-markdown-small);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .lede {\n  display: flex;\n  gap: 16px;\n  align-items: flex-start;\n  margin-bottom: 20px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .coverPair {\n  flex: none;\n  display: flex;\n  align-items: stretch;\n  gap: 10px;\n  height: calc(80px * 4 / 3);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .coverHero {\n  flex: none;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  aspect-ratio: 3 / 4;\n  overflow: hidden;\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .coverWide {\n  flex: none;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  aspect-ratio: 4 / 3;\n  overflow: hidden;\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .coverHero img,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .coverWide img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .coverFallback {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .ledeText {\n  min-width: 0;\n  padding-top: 2px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .stepper {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n  margin: -8px 0 16px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .step {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n  line-height: 18px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .step + .step::before {\n  content: \"\";\n  width: 14px;\n  height: 1px;\n  margin-right: 2px;\n  background: var(--dsw-alias-border-l2);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .stepDot {\n  flex: none;\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  background: var(--dsw-alias-border-l2);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .step.done {\n  color: var(--dsw-alias-label-secondary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .step.done .stepDot {\n  background: var(--dsw-alias-state-success-primary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .step.current {\n  color: var(--dsw-alias-state-business-primary);\n  font-weight: 500;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .step.current .stepDot {\n  background: var(--dsw-alias-state-business-primary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .time {\n  margin-top: 4px;\n  color: var(--dsw-alias-label-tertiary);\n  font: var(--dsw-font-markdown-small);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .workList {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .workRow {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .workMain {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  min-width: 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .workName {\n  font: var(--dsw-font-markdown-base);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .workMain .statusPill {\n  align-self: center;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .jobNote {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin: 12px 0 0;\n  color: var(--dsw-alias-label-tertiary);\n  font: var(--dsw-font-markdown-small);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .oilSurface .jobNote {\n  margin: 0 0 12px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .jobNote.done {\n  color: var(--dsw-alias-state-success-primary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .jobNote.error {\n  color: var(--dsw-alias-state-error-primary);\n  max-height: 72px;\n  overflow: hidden;\n  overflow-wrap: anywhere;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .publishGrid {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 10px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"].wide .publishGrid {\n  grid-template-columns: 1fr 1fr;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .publishCard {\n  padding: 10px 12px;\n  border-radius: 10px;\n  background: var(--dsw-alias-bg-layer-1);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .scriptEditor {\n  display: block;\n  flex: 1;\n  width: 100%;\n  min-height: 240px;\n  margin: 0;\n  padding: 0;\n  border: none;\n  border-radius: 0;\n  background: transparent;\n  color: var(--dsw-alias-label-primary);\n  font: var(--dsw-font-markdown-base);\n  line-height: 24px;\n  resize: none;\n  box-sizing: border-box;\n  outline: none;\n  box-shadow: none;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .scriptEditor:focus {\n  outline: none;\n  box-shadow: none;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .scriptEditor::placeholder {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .body:has(.scriptEditor) {\n  display: flex;\n  flex-direction: column;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .videoPlayer {\n  display: block;\n  width: 100%;\n  max-height: min(70vh, 520px);\n  border-radius: 10px;\n  background: #111;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .publishRow {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .publishName {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n  font: var(--dsw-font-markdown-base);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .publishRow.articleRow {\n  width: 100%;\n  padding: 0;\n  border: none;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n  text-align: left;\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .publishRow.articleRow:hover .publishName {\n  color: var(--dsw-alias-state-business-primary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .oilSurface .oilActionBar + .publishRows {\n  margin-top: 12px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .publishMetrics {\n  margin-top: 4px;\n  color: var(--dsw-alias-label-tertiary);\n  font: var(--dsw-font-markdown-small);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .publishUrl {\n  display: block;\n  margin-top: 4px;\n  overflow: hidden;\n  color: var(--dsw-alias-label-tertiary);\n  font: var(--dsw-font-markdown-small);\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .cues {\n  margin: 20px 0 0;\n  padding: 0;\n  list-style: none;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .cue + .cue {\n  margin-top: 16px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .cueTime {\n  margin-bottom: 4px;\n  color: var(--dsw-alias-label-tertiary);\n  font: var(--dsw-font-markdown-small);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .cueText {\n  margin: 0;\n  font: var(--dsw-font-markdown-base);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .block {\n  margin-top: 20px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .blockLabel {\n  margin-bottom: 8px;\n  color: var(--dsw-alias-label-tertiary);\n  font: var(--dsw-font-markdown-small);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .platformMark {\n  flex: none;\n  display: block;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .copyTitle {\n  margin-bottom: 6px;\n  font: var(--dsw-font-markdown-base-strong);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .article {\n  min-width: 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .article > :first-child > :first-child {\n  margin-top: 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .article img {\n  display: block;\n  max-width: 100%;\n  height: auto;\n  margin: 16px 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .tags:first-child {\n  margin-top: 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .tags {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  margin-top: 12px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .tag {\n  color: var(--dsw-alias-label-secondary);\n  font: var(--dsw-font-markdown-small);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"] .resize {\n  position: absolute;\n  top: 0;\n  right: -4px;\n  bottom: 0;\n  width: 8px;\n  cursor: col-resize;\n  z-index: 2;\n  touch-action: none;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"inspector\"].docked.open:not(.dragging) {\n    transition: none;\n  }\n}\n");
		//#endregion
		//#region src/client/ContentInspector.tsx
		const TABS = [
			"overview",
			"video",
			"script",
			"subtitle",
			"article"
		];
		const PIPELINE_STEPS = [
			{
				id: "topic",
				label: "inspector.step.topic",
				hint: "inspector.step.topicHint"
			},
			{
				id: "record",
				label: "inspector.step.record",
				hint: "inspector.step.recordHint"
			},
			{
				id: "cut",
				label: "inspector.step.cut",
				hint: "inspector.step.cutHint"
			},
			{
				id: "finish",
				label: "inspector.step.finish",
				hint: "inspector.step.finishHint"
			},
			{
				id: "publish",
				label: "inspector.step.publish"
			}
		];
		const WORKFLOW_INDEX = {
			idle: 0,
			record: 1,
			cut: 2,
			finish: 3,
			publish: 4,
			live: 4
		};
		const PUBLISH_KEY = {
			unpublished: "inspector.publish.unpublished",
			draft: "inspector.publish.draft",
			published: "inspector.publish.published"
		};
		const PUBLISH_TONE = {
			unpublished: "neutral",
			draft: "pending",
			published: "success"
		};
		const PUBLISH_MARKS = [
			"unpublished",
			"draft",
			"published"
		];
		const STAGE_KEY = {
			idle: "inspector.stage.idle",
			record: "inspector.stage.record",
			cut: "inspector.stage.cut",
			finish: "inspector.stage.finish",
			publish: "inspector.stage.publish",
			live: "inspector.stage.live"
		};
		const TAB_KEY = {
			overview: "inspector.tab.overview",
			video: "inspector.tab.video",
			script: "inspector.tab.script",
			subtitle: "inspector.tab.subtitle",
			article: "inspector.tab.article"
		};
		function cuesFromSubtitle(nextSubtitle) {
			if (nextSubtitle.cues.length > 0) return nextSubtitle.cues;
			if (nextSubtitle.text === "") return [];
			return nextSubtitle.text.split("\n").filter((line) => line.trim() !== "").map((text) => ({ text }));
		}
		function friendlyError(cause, t) {
			if (cause instanceof Error) {
				if (cause.message.startsWith("content not found")) return t("empty.gone");
				return cause.message;
			}
			return t("empty.error");
		}
		function metricParts(row, t) {
			const parts = [];
			if (row.views !== void 0) parts.push(t("inspector.publish.views").replace("{n}", formatCount(row.views)));
			if (row.likes !== void 0) parts.push(t("inspector.publish.likes").replace("{n}", formatCount(row.likes)));
			if (row.comments !== void 0) parts.push(t("inspector.publish.comments").replace("{n}", formatCount(row.comments)));
			return parts;
		}
		function JobNote({ tone, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: tone === void 0 ? "jobNote" : `jobNote ${tone}`,
				children: [
					tone === "running" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
						state: "ongoing",
						size: 12
					}),
					tone === "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
						state: "done",
						size: 12
					}),
					tone === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
						state: "error",
						size: 12
					}),
					children
				]
			});
		}
		function WorkRow({ name, status, tone, actions }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "workRow",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "workMain",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "workName",
						children: name
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
						tone: tone ?? "neutral",
						children: status
					})]
				}), actions !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionBar, { children: actions })]
			});
		}
		function ContentInspector({ t, useSessions, ready, getContent, getCoverThumb, getVideoPlayback, getArticleMedia, getSubtitleText, getSettings, markReadyToRecord, bindStudio, openStudio, setPublish, syncPublish, startSubtitleGenerate, startSubtitleBurn, startCoverGenerate, setScript, pickDirectory, openSubtitlePreview, openPath, closeDetails }) {
			const [selectedId, setSelectedId] = useSelectedContentId();
			const currentSessionId = useSessions((sessions) => sessions.current);
			const libraryEpoch = useLibraryEpoch();
			const profileEpoch = useProfileEpoch();
			const [enabledPlatforms, setEnabledPlatforms] = (0, react.useState)(void 0);
			const scriptSavedRef = (0, react.useRef)(true);
			const loadedId = (0, react.useRef)(null);
			const [detail, setDetail] = (0, react.useState)(void 0);
			const [cues, setCues] = (0, react.useState)([]);
			const [error, setError] = (0, react.useState)(void 0);
			const [tab, setTab] = (0, react.useState)("overview");
			const [panelWidth, setPanelWidth] = (0, react.useState)(getInspectorWidth);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [dragging, setDragging] = (0, react.useState)(false);
			const [actionError, setActionError] = (0, react.useState)(void 0);
			const [busy, setBusy] = (0, react.useState)(void 0);
			const expectSubtitlePreview = (0, react.useRef)(false);
			const [syncHint, setSyncHint] = (0, react.useState)(void 0);
			const [scriptDraft, setScriptDraft] = (0, react.useState)("");
			const [scriptSaved, setScriptSaved] = (0, react.useState)(true);
			scriptSavedRef.current = scriptSaved;
			const [videoSrc, setVideoSrc] = (0, react.useState)(void 0);
			const [videoReady, setVideoReady] = (0, react.useState)(false);
			const [articleOrigin, setArticleOrigin] = (0, react.useState)(void 0);
			const [publishMenu, setPublishMenu] = (0, react.useState)(null);
			const [publishPending, setPublishPending] = (0, react.useState)(null);
			const drag = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				setTab("overview");
				setActionError(void 0);
				setSyncHint(void 0);
				setScriptDraft("");
				setScriptSaved(true);
				setVideoSrc(void 0);
				setVideoReady(false);
				setArticleOrigin(void 0);
				setBusy(void 0);
				expectSubtitlePreview.current = false;
				setPublishMenu(null);
				setPublishPending(null);
			}, [selectedId]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				setEnabledPlatforms(void 0);
				if (!ready()) {
					setEnabledPlatforms([]);
					return () => {
						cancelled = true;
					};
				}
				getSettings().then((settings) => {
					if (!cancelled) setEnabledPlatforms(settings.profile.enabledPlatforms);
				}, () => {
					if (!cancelled) setEnabledPlatforms([]);
				});
				return () => {
					cancelled = true;
				};
			}, [
				getSettings,
				libraryEpoch,
				profileEpoch,
				ready
			]);
			(0, react.useEffect)(() => {
				const frame = window.requestAnimationFrame(() => {
					setExpanded(true);
				});
				return () => {
					window.cancelAnimationFrame(frame);
				};
			}, []);
			(0, react.useEffect)(() => {
				if (selectedId === null) {
					loadedId.current = null;
					setDetail(void 0);
					setCues([]);
					setError(void 0);
					return;
				}
				if (!ready()) {
					setError(t("empty.remote"));
					return;
				}
				const switched = loadedId.current !== selectedId;
				let cancelled = false;
				setError(void 0);
				Promise.all([getContent(selectedId), getSubtitleText(selectedId)]).then(([nextDetail, nextSubtitle]) => {
					if (cancelled) return;
					loadedId.current = selectedId;
					setDetail(nextDetail);
					if (switched || scriptSavedRef.current) {
						setScriptDraft(nextDetail.script);
						setScriptSaved(true);
					}
					setCues(cuesFromSubtitle(nextSubtitle));
				}, (cause) => {
					if (cancelled) return;
					setDetail(void 0);
					setCues([]);
					setError(friendlyError(cause, t));
				});
				return () => {
					cancelled = true;
				};
			}, [selectedId, libraryEpoch]);
			(0, react.useEffect)(() => {
				if (tab !== "video" || selectedId === null || !ready()) return;
				let cancelled = false;
				setVideoReady(false);
				getVideoPlayback(selectedId).then((next) => {
					if (cancelled) return;
					setVideoSrc(next.found ? next.url : void 0);
					setVideoReady(true);
				}, () => {
					if (cancelled) return;
					setVideoSrc(void 0);
					setVideoReady(true);
				});
				return () => {
					cancelled = true;
				};
			}, [
				tab,
				selectedId,
				libraryEpoch
			]);
			(0, react.useEffect)(() => {
				if (tab !== "article" || selectedId === null || !ready()) return;
				let cancelled = false;
				getArticleMedia(selectedId).then((next) => {
					if (cancelled) return;
					setArticleOrigin(next.found ? next.origin : void 0);
				}, () => {
					if (!cancelled) setArticleOrigin(void 0);
				});
				return () => {
					cancelled = true;
				};
			}, [
				tab,
				selectedId,
				libraryEpoch
			]);
			(0, react.useEffect)(() => {
				if (detail === void 0 || scriptSaved) return;
				const timer = window.setTimeout(() => {
					setScript(detail.id, scriptDraft).then((next) => {
						setDetail(next);
						setScriptSaved(scriptDraft === next.script);
					}, (cause) => {
						setActionError(cause instanceof Error ? cause.message : t("empty.error"));
					});
				}, 700);
				return () => {
					window.clearTimeout(timer);
				};
			}, [
				detail?.id,
				scriptDraft,
				scriptSaved
			]);
			(0, react.useEffect)(() => {
				if (!(detail?.burn.status === "running" || detail?.subtitleJob.status === "running" || detail?.coverJob.status === "running") || selectedId === null || !ready()) return;
				const timer = window.setInterval(() => {
					getContent(selectedId).then((next) => {
						setDetail(next);
					});
				}, 3e3);
				return () => {
					window.clearInterval(timer);
				};
			}, [
				selectedId,
				detail?.burn.status,
				detail?.subtitleJob.status,
				detail?.coverJob.status
			]);
			(0, react.useEffect)(() => {
				if (selectedId === null || detail?.subtitleJob.status !== "done" || !ready()) return;
				getSubtitleText(selectedId).then((nextSubtitle) => {
					setCues(cuesFromSubtitle(nextSubtitle));
				});
			}, [selectedId, detail?.subtitleJob.status]);
			(0, react.useEffect)(() => {
				if (!expectSubtitlePreview.current || selectedId === null || !ready()) return;
				if (detail?.subtitleJob.status === "done") {
					expectSubtitlePreview.current = false;
					openSubtitlePreview(selectedId).then(() => void 0, (cause) => {
						setActionError(cause instanceof Error ? cause.message : t("empty.error"));
					});
					return;
				}
				if (detail?.subtitleJob.status === "error") expectSubtitlePreview.current = false;
			}, [selectedId, detail?.subtitleJob.status]);
			const shownWidth = expanded ? panelWidth : 0;
			const applyPublish = (platform, status) => {
				setPublishMenu(null);
				if (detail === void 0 || detail.publish[platform].status === status) return;
				setPublishPending(platform);
				setPublish(detail.id, platform, status).then((next) => {
					setDetail(next);
					setPublishPending(null);
				}, (cause) => {
					setActionError(cause instanceof Error ? cause.message : t("empty.error"));
					setPublishPending(null);
				});
			};
			(0, react.useEffect)(() => {
				if (selectedId === null) {
					clearConversationInset();
					return;
				}
				applyConversationInset(shownWidth, !dragging);
			}, [
				selectedId,
				currentSessionId,
				shownWidth,
				dragging
			]);
			(0, react.useEffect)(() => () => {
				clearConversationInset();
			}, []);
			(0, react.useEffect)(() => {
				const onMove = (event) => {
					if (drag.current === null) return;
					setInspectorWidth(drag.current.startWidth + (event.clientX - drag.current.startX));
					setPanelWidth(getInspectorWidth());
				};
				const onUp = () => {
					if (drag.current === null) return;
					drag.current = null;
					setDragging(false);
				};
				document.addEventListener("pointermove", onMove);
				document.addEventListener("pointerup", onUp);
				return () => {
					document.removeEventListener("pointermove", onMove);
					document.removeEventListener("pointerup", onUp);
				};
			}, []);
			if (selectedId === null) return null;
			const hasVideo = detail?.videoRaw !== void 0 || detail?.videoSubtitled !== void 0;
			const hasSubtitleDraft = detail?.subtitles.srt !== void 0 || detail?.subtitles.transcript !== void 0;
			const canPreviewSubtitle = hasSubtitleDraft || detail?.subtitleJob.status === "done";
			const hasAnyCover = detail !== void 0 && (detail.covers["3x4"] !== void 0 || detail.covers["4x3"] !== void 0 || detail.covers["16x9"] !== void 0);
			const platformSettingsPending = enabledPlatforms === void 0;
			const visiblePlatforms = platformSettingsPending ? [] : selectEnabledPublishPlatforms(enabledPlatforms);
			const publishedCount = detail === void 0 ? 0 : visiblePlatforms.filter((platform) => detail.publish[platform.key].status === "published").length;
			const anyPublishMarked = detail !== void 0 && visiblePlatforms.some((platform) => detail.publish[platform.key].status !== "unpublished");
			const publishStepDone = visiblePlatforms.length > 0 && publishedCount === visiblePlatforms.length;
			const stageIndex = detail === void 0 ? 0 : WORKFLOW_INDEX[detail.workflow];
			const currentStep = publishStepDone ? "publish" : PIPELINE_STEPS[stageIndex]?.id ?? "topic";
			const onReadyToRecord = () => {
				if (detail === void 0) return;
				markReadyToRecord(detail.id).then((next) => {
					setDetail(next);
				});
			};
			const onBindStudio = () => {
				if (detail === void 0) return;
				pickDirectory().then((path) => {
					if (path === null) return;
					return bindStudio(detail.id, path);
				}).then((next) => {
					if (next !== void 0) setDetail(next);
				});
			};
			const onOpenStudio = () => {
				if (detail === void 0) return;
				openStudio(detail.id);
			};
			const onGenerateCover = () => {
				if (detail === void 0) return;
				if (detail.videoRaw === void 0 && detail.videoSubtitled === void 0) {
					setActionError(t("inspector.cover.needVideo"));
					return;
				}
				if (!detail.secrets.cover.configured) {
					setActionError(t("inspector.cover.needKey"));
					return;
				}
				setActionError(void 0);
				setBusy("cover");
				startCoverGenerate(detail.id).then((next) => {
					setDetail(next);
					setBusy(void 0);
				}, (cause) => {
					setActionError(cause instanceof Error ? cause.message : t("empty.error"));
					setBusy(void 0);
				});
			};
			const onGenerateSubtitle = () => {
				if (detail === void 0) return;
				if (detail.videoRaw === void 0 && detail.videoSubtitled === void 0) {
					setActionError(t("inspector.subtitle.needVideo"));
					return;
				}
				if (!detail.secrets.subtitle.configured) {
					setActionError(t("inspector.subtitle.needKey"));
					return;
				}
				setActionError(void 0);
				setBusy("subtitle");
				expectSubtitlePreview.current = true;
				startSubtitleGenerate(detail.id).then((next) => {
					setDetail(next);
					setBusy(void 0);
				}, (cause) => {
					expectSubtitlePreview.current = false;
					setActionError(cause instanceof Error ? cause.message : t("empty.error"));
					setBusy(void 0);
				});
			};
			const onBurnSubtitle = () => {
				if (detail === void 0) return;
				if (detail.videoRaw === void 0) {
					setActionError(t("inspector.subtitle.needVideo"));
					return;
				}
				if (!hasSubtitleDraft && detail.subtitleJob.status !== "done") {
					setActionError(t("inspector.subtitle.needDraft"));
					return;
				}
				setActionError(void 0);
				setBusy("burn");
				startSubtitleBurn(detail.id).then((next) => {
					setDetail(next);
					setBusy(void 0);
				}, (cause) => {
					setActionError(cause instanceof Error ? cause.message : t("empty.error"));
					setBusy(void 0);
				});
			};
			const onPreviewSubtitle = () => {
				if (detail === void 0) return;
				openSubtitlePreview(detail.id).then(() => void 0, (cause) => {
					setActionError(cause instanceof Error ? cause.message : t("empty.error"));
				});
			};
			const onSyncPublish = () => {
				if (detail === void 0) return;
				setActionError(void 0);
				setBusy("sync");
				syncPublish({ id: detail.id }).then((result) => {
					const login = result.platforms.filter((page) => page.loginRequired === true).map((page) => {
						const label = PUBLISH_UI_PLATFORMS.find((item) => item.key === page.platform);
						return label === void 0 ? page.platform : t(label.label);
					});
					setSyncHint(t(result.cached === true ? "inspector.publish.cached" : "inspector.publish.synced").replace("{n}", String(result.matched)));
					if (login.length > 0) setActionError(t("inspector.publish.login").replace("{name}", login.join("、")));
					setBusy(void 0);
					return getContent(detail.id);
				}).then((next) => {
					if (next !== void 0) setDetail(next);
				}, (cause) => {
					setActionError(cause instanceof Error ? cause.message : t("empty.error"));
					setBusy(void 0);
				});
			};
			const subtitleStatus = () => {
				if (detail === void 0) return { status: "" };
				if (detail.subtitleJob.status === "running" || busy === "subtitle") return {
					status: t("inspector.subtitle.generating"),
					tone: "active"
				};
				if (detail.burn.status === "running" || busy === "burn") return {
					status: t("inspector.subtitle.burning"),
					tone: "active"
				};
				if (detail.subtitleJob.status === "error" || detail.burn.status === "error") {
					const raw = detail.subtitleJob.error ?? detail.burn.error;
					return {
						status: raw !== void 0 && raw.includes("process exited") ? t("inspector.subtitle.failed") : raw ?? t("inspector.subtitle.failed"),
						tone: "error"
					};
				}
				if (detail.videoSubtitled !== void 0) return {
					status: t("inspector.subtitle.burned"),
					tone: "success"
				};
				if (hasSubtitleDraft) return {
					status: t("inspector.subtitle.proofPending"),
					tone: "pending"
				};
				return { status: t("inspector.track.notGenerated") };
			};
			const coverStatus = () => {
				if (detail === void 0) return { status: "" };
				if (detail.coverJob.status === "running" || busy === "cover") return {
					status: t("inspector.cover.generating"),
					tone: "active"
				};
				if (detail.coverJob.status === "error") return {
					status: detail.coverJob.error ?? t("inspector.cover.failed"),
					tone: "error"
				};
				if (hasAnyCover) return {
					status: t("inspector.cover.ready"),
					tone: "success"
				};
				return { status: t("inspector.track.notGenerated") };
			};
			const currentStepMeta = PIPELINE_STEPS.find((step) => step.id === currentStep);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-plugin": "dsh-oil-creator",
				"data-surface": "inspector",
				className: [
					"docked",
					expanded ? "open" : "",
					dragging ? "dragging" : "",
					panelWidth >= 560 ? "wide" : ""
				].filter((part) => part !== "").join(" "),
				style: { width: shownWidth },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "header",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "titleRow",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "title",
								children: detail?.title ?? (error === void 0 ? t("empty.loading") : "")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "titleActions",
								children: [detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "close",
									"aria-label": t("inspector.openFolder"),
									onClick: () => {
										openPath(detail.folderPath);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, { size: 14 })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "close",
									"aria-label": t("inspector.close"),
									onClick: () => {
										setSelectedId(null);
										closeDetails();
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
								})]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "tabs",
							role: "tablist",
							children: TABS.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === id,
								className: tab === id ? "tab active" : "tab",
								onClick: () => {
									setTab(id);
								},
								children: t(TAB_KEY[id])
							}, id))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "body",
						children: [
							error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "empty",
								children: error
							}),
							error === void 0 && detail === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "empty",
								children: t("empty.loading")
							}),
							detail !== void 0 && tab === "overview" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "lede",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "coverPair",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "coverHero",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CoverThumb, {
												id: detail.id,
												load: getCoverThumb,
												revision: coverThumbRevision(detail.covers),
												fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, {
													className: "coverFallback",
													size: 22
												})
											})
										}), detail.covers["4x3"] !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "coverWide",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CoverThumb, {
												id: `${detail.id}::4x3`,
												load: getCoverThumb,
												revision: detail.covers["4x3"],
												fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, {
													className: "coverFallback",
													size: 22
												})
											})
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "ledeText",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
											tone: WORKFLOW_TONE[detail.workflow],
											children: t(STAGE_KEY[detail.workflow])
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "time",
											children: formatRelativeTime(detail.recordedAt, Date.now(), t)
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "stepper",
									"aria-hidden": "true",
									children: PIPELINE_STEPS.map((step, index) => {
										const done = index < stageIndex || step.id === "publish" && publishStepDone;
										const current = !done && step.id === currentStep;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: `step ${done ? "done" : current ? "current" : ""}`,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "stepDot" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "stepLabel",
												children: t(step.label)
											})]
										}, step.id);
									})
								}),
								hasVideo && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Surface, {
									title: t("inspector.make"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "workList",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkRow, {
											name: t("inspector.track.subtitle"),
											...subtitleStatus()
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkRow, {
											name: t("inspector.track.cover"),
											...coverStatus(),
											actions: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
												tone: hasAnyCover ? "secondary" : "primary",
												onClick: onGenerateCover,
												disabled: busy !== void 0 || detail.coverJob.status === "running",
												children: t(hasAnyCover ? "inspector.cover.regenerate" : "inspector.cover.generate")
											})
										})]
									})
								}),
								currentStepMeta !== void 0 && currentStep !== "publish" && currentStep !== "finish" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Surface, {
									title: t(currentStepMeta.label),
									hint: "hint" in currentStepMeta ? t(currentStepMeta.hint) : void 0,
									children: [
										currentStep === "topic" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionBar, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
											tone: "primary",
											onClick: onReadyToRecord,
											children: t("inspector.readyToRecord")
										}) }),
										currentStep === "record" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionBar, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
											tone: "primary",
											onClick: detail.studioPath === void 0 ? onBindStudio : onOpenStudio,
											children: t(detail.studioPath === void 0 ? "inspector.studio.bind" : "inspector.studio.open")
										}) }),
										currentStep === "cut" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [detail.waitingForExport && !hasVideo && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobNote, {
											tone: detail.exportTimedOut === true ? "error" : "running",
											children: t(detail.exportTimedOut === true ? "inspector.step.exportTimedOut" : "inspector.step.waitingExport")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ActionBar, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
											tone: "primary",
											onClick: detail.studioPath === void 0 ? onBindStudio : onOpenStudio,
											children: t(detail.studioPath === void 0 ? "inspector.studio.bind" : "inspector.studio.open")
										}), detail.studioPath !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
											onClick: onBindStudio,
											children: t("inspector.studio.rebind")
										})] })] })
									]
								}),
								actionError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobNote, {
									tone: "error",
									children: actionError
								}),
								(detail.workflow === "publish" || anyPublishMarked || detail.hasArticle) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Surface, {
										title: t("inspector.sync.title"),
										hint: syncHint ?? t(platformSettingsPending ? "inspector.publish.platformsLoading" : "inspector.sync.hint"),
										children: [!platformSettingsPending && visiblePlatforms.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "empty",
											children: t("inspector.publish.enablePlatforms")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionBar, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
											tone: "primary",
											onClick: onSyncPublish,
											disabled: isPublishSyncDisabled(busy, platformSettingsPending, enabledPlatforms ?? []),
											children: t(busy === "sync" ? "inspector.publish.syncing" : "inspector.publish.sync")
										}) })]
									}),
									visiblePlatforms.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Surface, {
										title: t("inspector.platforms"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "publishGrid",
											children: visiblePlatforms.map((platform) => {
												const row = detail.publish[platform.key];
												const metrics = metricParts(row, t);
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "publishCard",
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
															className: "publishRow",
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: "publishName",
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlatformMark, {
																	id: platform.id,
																	size: 16
																}), t(platform.label)]
															}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
																portal: true,
																align: "end",
																open: publishMenu === platform.key,
																anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
																	tone: PUBLISH_TONE[row.status],
																	disabled: publishPending === platform.key,
																	"aria-haspopup": "menu",
																	"aria-label": `${t(platform.label)}：${t(PUBLISH_KEY[row.status])}`,
																	onClick: () => {
																		setPublishMenu(publishMenu === platform.key ? null : platform.key);
																	},
																	children: t(PUBLISH_KEY[row.status])
																}),
																items: PUBLISH_MARKS.map((mark) => ({
																	id: mark,
																	label: t(PUBLISH_KEY[mark])
																})),
																selectedId: row.status,
																onSelect: (id) => {
																	if (isPublishMark(id)) applyPublish(platform.key, id);
																},
																onClose: () => {
																	setPublishMenu(null);
																}
															})]
														}),
														metrics.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: "publishMetrics",
															children: metrics.join(" · ")
														}),
														row.status === "published" && row.url !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
															className: "publishUrl",
															href: row.url,
															target: "_blank",
															rel: "noreferrer",
															children: t("inspector.publish.open")
														})
													]
												}, platform.id);
											})
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Surface, {
										title: t("inspector.article"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "publishRow articleRow",
											onClick: () => {
												setTab("article");
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "publishName",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlatformMark, {
													id: "article",
													size: 16
												}), t("inspector.article.draft")]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
												tone: detail.hasArticle ? "success" : "neutral",
												children: t(detail.hasArticle ? "inspector.article.ready" : "inspector.article.missing")
											})]
										})
									})
								] }),
								detail.tags.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Surface, {
									title: t("detail.tags"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "tags",
										children: detail.tags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "tag",
											children: ["#", tag]
										}, tag))
									})
								})
							] }),
							detail !== void 0 && tab === "video" && (!videoReady ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "empty",
								children: t("empty.loading")
							}) : videoSrc === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "empty",
								children: t("inspector.video.empty")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
								className: "videoPlayer",
								controls: true,
								playsInline: true,
								preload: "metadata",
								src: videoSrc
							})),
							detail !== void 0 && tab === "script" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: "scriptEditor",
								value: scriptDraft,
								placeholder: t("inspector.script.placeholder"),
								onChange: (event) => {
									setScriptDraft(event.target.value);
									setScriptSaved(event.target.value === detail.script);
								}
							}),
							detail !== void 0 && tab === "article" && (detail.article.trim() === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "empty",
								children: t("inspector.article.empty")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "article",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: articleOrigin === void 0 ? detail.article : rewriteArticleImages(detail.article, articleOrigin) })
							})),
							detail !== void 0 && tab === "subtitle" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								hasVideo && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ActionBar, { children: [
									canPreviewSubtitle && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
										tone: "ghost",
										onClick: onPreviewSubtitle,
										children: t("inspector.subtitle.previewEdit")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
										tone: !hasSubtitleDraft && detail.videoSubtitled === void 0 ? "primary" : "secondary",
										onClick: onGenerateSubtitle,
										disabled: busy !== void 0 || detail.subtitleJob.status === "running" || detail.burn.status === "running",
										children: t(!hasSubtitleDraft ? "inspector.subtitle.generate" : "inspector.subtitle.regenerate")
									}),
									hasSubtitleDraft && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
										tone: detail.videoSubtitled === void 0 ? "primary" : "secondary",
										onClick: onBurnSubtitle,
										disabled: busy !== void 0 || detail.subtitleJob.status === "running" || detail.burn.status === "running",
										children: t(detail.videoSubtitled === void 0 ? "inspector.subtitle.burn" : "inspector.subtitle.reburn")
									})
								] }),
								actionError !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobNote, {
									tone: "error",
									children: actionError
								}) : detail.subtitleJob.status === "running" || detail.burn.status === "running" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobNote, {
									tone: "running",
									children: t(detail.subtitleJob.status === "running" ? "inspector.subtitle.generating" : "inspector.subtitle.burning")
								}) : detail.subtitleJob.status === "error" || detail.burn.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobNote, {
									tone: "error",
									children: (detail.subtitleJob.error ?? detail.burn.error ?? "").includes("process exited") ? t("inspector.subtitle.burnFailed") : detail.subtitleJob.error ?? detail.burn.error ?? t("inspector.subtitle.burnFailed")
								}) : null,
								cues.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "empty",
									children: t("inspector.subtitle.empty")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
									className: "cues",
									children: cues.map((cue, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										className: "cue",
										children: [cue.at !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "cueTime",
											children: cue.at
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "cueText",
											children: cue.text
										})]
									}, `${cue.at ?? "cue"}-${index}`))
								})
							] })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "resize",
						onPointerDown: (event) => {
							event.preventDefault();
							drag.current = {
								startX: event.clientX,
								startWidth: panelWidth
							};
							setDragging(true);
						}
					})
				]
			});
		}
		//#endregion
		//#region src/secrets.ts
		const SUBTITLE_KEY_REFS = ["DASHSCOPE_API_KEY", "BAILIAN_API_KEY"];
		const COVER_KEY_REFS = ["ZENMUX_API_KEY"];
		//#endregion
		//#region src/client/credentialsApi.ts
		function secretDraftOf(view) {
			return {
				kind: view.kind,
				ref: view.ref,
				configured: view.configured,
				writable: view.writable,
				...view.source === void 0 ? {} : { source: view.source },
				nextValue: "",
				loadError: false
			};
		}
		function applyDescribed(draft, credentials) {
			const row = credentials[draft.ref];
			if (row === void 0) return {
				...draft,
				configured: false,
				writable: true,
				loadError: false
			};
			return {
				...draft,
				configured: row.configured === true,
				writable: row.writable !== false,
				...row.source === void 0 ? {} : { source: row.source },
				loadError: false
			};
		}
		//#endregion
		//#region \0dsh-oil-creator-css:/private/tmp/dsh-oil-creator-ed9417d/dsh-oil-creator-ed9417d1e0d24bdecdac831d4e72d3428e49a123/src/client/CreatorSettingsCard.css.mjs
		registerPluginCss("dsh-oil-creator/CreatorSettingsCard.css", "[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] {\n  list-style: none;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 12px;\n  background: var(--dsw-alias-bg-layer-3);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"].open {\n  background: var(--dsw-alias-bg-layer-2);\n  border-color: var(--dsw-alias-label-dimmed);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .header {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  width: 100%;\n  padding: 14px 16px;\n  border: 0;\n  border-radius: 12px;\n  background: none;\n  color: inherit;\n  font: inherit;\n  text-align: left;\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .header:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: -2px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .headText {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .name {\n  color: var(--dsw-alias-label-primary);\n  font-size: 15px;\n  font-weight: 600;\n  line-height: 1.4;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .description {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .pending {\n  flex: none;\n  padding: 1px 8px;\n  border-radius: 999px;\n  background: var(--dsw-alias-bg-module-platform);\n  color: var(--dsw-alias-label-secondary);\n  font-size: 11px;\n  font-weight: 500;\n  line-height: 17px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .chevron {\n  flex: none;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .chevron.open {\n  transform: rotate(180deg);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .body {\n  margin: 0 16px;\n  padding-bottom: 8px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .field {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 12px 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .fieldLabel {\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 20px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .fieldHint {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n  line-height: 18px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .inputLabel {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin-top: 8px;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 18px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .input {\n  width: 100%;\n  box-sizing: border-box;\n  padding: 6px 10px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-3);\n  color: var(--dsw-alias-label-primary);\n  font: inherit;\n  font-size: 13px;\n  line-height: 20px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .input:focus {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: -1px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .textarea {\n  min-height: 64px;\n  resize: vertical;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .pathRow {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-top: 6px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .path {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  padding: 6px 10px;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n  line-height: 20px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .path.empty {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .footer {\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 8px;\n  padding: 12px 0 4px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .failed,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .ok {\n  flex: 1;\n  min-width: 0;\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .failed {\n  color: var(--dsw-alias-label-error);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .ok {\n  color: var(--dsw-alias-label-secondary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .capabilityGrid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 6px 12px;\n  margin-top: 8px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .capabilityItem {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  min-width: 0;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 20px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .capabilityName {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"settings-card\"] .secretHead {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n");
		//#endregion
		//#region src/client/CreatorSettingsCard.tsx
		const EMPTY_SECRETS = {
			subtitle: {
				kind: "subtitle",
				ref: SUBTITLE_KEY_REFS[0],
				configured: false,
				writable: true
			},
			cover: {
				kind: "cover",
				ref: COVER_KEY_REFS[0],
				configured: false,
				writable: true
			}
		};
		const EMPTY_PROFILE = { enabledPlatforms: [...PUBLISH_PLATFORMS] };
		const CAPABILITY_ROWS = [
			{
				id: "library",
				label: "settings.capability.library"
			},
			{
				id: "screenStudio",
				label: "settings.capability.screenStudio"
			},
			{
				id: "subtitleSkill",
				label: "settings.capability.subtitle"
			},
			{
				id: "coverSkill",
				label: "settings.capability.cover"
			},
			{
				id: "editingSkill",
				label: "settings.capability.editing"
			},
			{
				id: "publishSkill",
				label: "settings.capability.publish"
			},
			{
				id: "articleSkill",
				label: "settings.capability.article"
			},
			{
				id: "publishSync",
				label: "settings.capability.ego"
			}
		];
		function capabilityTone(state) {
			return state === "ready" ? "success" : "neutral";
		}
		function capabilityStateKey(state) {
			if (state === "ready") return "settings.state.ready";
			if (state === "unsupported") return "settings.state.unsupported";
			return "settings.state.missing";
		}
		function cloneProfile(profile) {
			return { enabledPlatforms: [...profile.enabledPlatforms] };
		}
		function sameProfile(left, right) {
			return left.enabledPlatforms.length === right.enabledPlatforms.length && left.enabledPlatforms.every((platform, index) => platform === right.enabledPlatforms[index]);
		}
		function CreatorSettingsCard({ t, ready, getSettings, setLibraryRoot, setProfile, setScriptRules, pickDirectory, getCapabilities, credentials }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [savedRoot, setSavedRoot] = (0, react.useState)("");
			const [draftRoot, setDraftRoot] = (0, react.useState)("");
			const [savedProfile, setSavedProfile] = (0, react.useState)(EMPTY_PROFILE);
			const [draftProfile, setDraftProfile] = (0, react.useState)(EMPTY_PROFILE);
			const [savedRules, setSavedRules] = (0, react.useState)("");
			const [draftRules, setDraftRules] = (0, react.useState)("");
			const [secrets, setSecrets] = (0, react.useState)([secretDraftOf(EMPTY_SECRETS.subtitle), secretDraftOf(EMPTY_SECRETS.cover)]);
			const [loaded, setLoaded] = (0, react.useState)(false);
			const [capabilities, setCapabilities] = (0, react.useState)(void 0);
			const [saving, setSaving] = (0, react.useState)(false);
			const [failed, setFailed] = (0, react.useState)(false);
			const [saved, setSaved] = (0, react.useState)(false);
			const [keyFailed, setKeyFailed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!ready()) return;
				let cancelled = false;
				getSettings().then((settings) => {
					if (cancelled) return;
					setSavedRoot(settings.libraryRoot);
					setDraftRoot(settings.libraryRoot);
					setSavedProfile(cloneProfile(settings.profile));
					setDraftProfile(cloneProfile(settings.profile));
					setSavedRules(settings.scriptRules ?? "");
					setDraftRules(settings.scriptRules ?? "");
					const nextSecrets = settings.secrets ?? EMPTY_SECRETS;
					setSecrets([secretDraftOf(nextSecrets.subtitle), secretDraftOf(nextSecrets.cover)]);
					setLoaded(true);
				}, () => {
					if (!cancelled) setLoaded(true);
				});
				return () => {
					cancelled = true;
				};
			}, [ready, getSettings]);
			(0, react.useEffect)(() => {
				if (!open || credentials === void 0) return;
				let cancelled = false;
				const refs = secrets.map((item) => item.ref);
				credentials.describe({ refs }).then((response) => {
					if (cancelled || !response.result.ok || response.result.value === void 0) {
						if (!cancelled && response.result.ok !== true) setSecrets((current) => current.map((item) => ({
							...item,
							loadError: true
						})));
						return;
					}
					const described = response.result.value.credentials;
					setSecrets((current) => current.map((item) => applyDescribed(item, described)));
				}, () => {
					if (!cancelled) setSecrets((current) => current.map((item) => ({
						...item,
						loadError: true
					})));
				});
				return () => {
					cancelled = true;
				};
			}, [
				open,
				credentials,
				secrets.map((item) => item.ref).join(",")
			]);
			(0, react.useEffect)(() => {
				if (!open || !ready()) return;
				let cancelled = false;
				getCapabilities().then((next) => {
					if (!cancelled) setCapabilities(next);
				}, () => void 0);
				return () => {
					cancelled = true;
				};
			}, [
				open,
				ready,
				getCapabilities
			]);
			const dirtyRoot = draftRoot !== savedRoot;
			const dirtyProfile = !sameProfile(draftProfile, savedProfile);
			const dirtyRules = draftRules !== savedRules;
			const dirtyKeys = secrets.some((item) => item.nextValue.trim() !== "");
			const dirty = dirtyRoot || dirtyProfile || dirtyRules || dirtyKeys;
			const title = t("settings.title");
			const onPick = async () => {
				const path = await pickDirectory();
				if (path === null) return;
				setDraftRoot(path);
				setSaved(false);
				setFailed(false);
			};
			const patchProfile = (platform, enabled) => {
				setDraftProfile((current) => {
					return { enabledPlatforms: normalizeEnabledPlatforms(enabled ? [...current.enabledPlatforms, platform] : current.enabledPlatforms.filter((item) => item !== platform)) };
				});
				setSaved(false);
				setFailed(false);
			};
			const onSave = async () => {
				if (!dirty || saving) return;
				if (dirtyRoot && draftRoot === "") return;
				setSaving(true);
				setFailed(false);
				setKeyFailed(false);
				setSaved(false);
				try {
					if (dirtyKeys) {
						if (credentials === void 0) {
							setKeyFailed(true);
							return;
						}
						for (const item of secrets) {
							const value = item.nextValue.trim();
							if (value === "") continue;
							if (!(await credentials.set({
								ref: item.ref,
								value
							})).result.ok) {
								setKeyFailed(true);
								return;
							}
						}
						setSecrets((current) => current.map((item) => item.nextValue.trim() === "" ? item : {
							...item,
							nextValue: "",
							configured: true,
							loadError: false
						}));
					}
					if (dirtyRoot) {
						await setLibraryRoot(draftRoot);
						setSavedRoot(draftRoot);
					}
					if (dirtyProfile) {
						await setProfile(draftProfile);
						setSavedProfile(cloneProfile(draftProfile));
					}
					if (dirtyRules) {
						await setScriptRules(draftRules);
						setSavedRules(draftRules);
					}
					setSaved(true);
				} catch {
					setFailed(true);
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				"data-plugin": "dsh-oil-creator",
				"data-surface": "settings-card",
				className: open ? "card open" : "card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "header",
					"aria-expanded": open,
					"aria-label": `${t(open ? "settings.collapse" : "settings.expand")}: ${title}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "headText",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "name",
								children: title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "description",
								children: t("settings.description")
							})]
						}),
						dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "pending",
							children: t("settings.save")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: open ? "chevron open" : "chevron" })
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "body",
					children: [
						capabilities !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldLabel",
									children: t("settings.capabilities")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldHint",
									children: t("settings.capabilitiesHint")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "capabilityGrid",
									children: CAPABILITY_ROWS.map((row) => {
										const item = capabilities[row.id];
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "capabilityItem",
											title: item.detail,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "capabilityName",
												children: t(row.label)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
												tone: capabilityTone(item.state),
												children: t(capabilityStateKey(item.state))
											})]
										}, row.id);
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "field",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldLabel",
									children: t("settings.libraryRoot")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldHint",
									children: t("settings.libraryRootHint")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "pathRow",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: draftRoot === "" ? "path empty" : "path",
										children: draftRoot === "" ? t("settings.libraryRootEmpty") : draftRoot
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
										onClick: () => {
											onPick();
										},
										children: t("settings.pick")
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldLabel",
									children: t("settings.enabledPlatforms")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldHint",
									children: t("settings.enabledPlatformsHint")
								}),
								CREATOR_SETTINGS_PLATFORMS.map((platform) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									className: "inputLabel",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: draftProfile.enabledPlatforms.includes(platform.key),
										onChange: (event) => {
											patchProfile(platform.key, event.target.checked);
										}
									}), t(platform.label)] })
								}, platform.key))
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldLabel",
									children: t("settings.scriptRules")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldHint",
									children: t("settings.scriptRulesHint")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: "input textarea",
									rows: 6,
									placeholder: t("settings.scriptRulesPlaceholder"),
									value: draftRules,
									onChange: (event) => {
										setDraftRules(event.target.value);
										setSaved(false);
										setFailed(false);
									}
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "field",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldLabel",
									children: t("settings.secrets")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "fieldHint",
									children: t("settings.secretsHint")
								}),
								secrets.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "inputLabel",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "secretHead",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`settings.secret.${item.kind}`) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusPill, {
												tone: item.loadError ? "error" : item.configured ? "success" : "neutral",
												children: t(item.loadError ? "settings.secret.loadFailed" : item.configured ? "settings.secret.configured" : "settings.secret.missing")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "fieldHint",
											children: t(`settings.secret.${item.kind}Hint`)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: "input",
											type: "password",
											autoComplete: "off",
											placeholder: t("settings.secret.placeholder"),
											disabled: !item.writable || saving,
											value: item.nextValue,
											onChange: (event) => {
												const value = event.target.value;
												setSecrets((current) => current.map((row) => row.kind === item.kind ? {
													...row,
													nextValue: value
												} : row));
												setSaved(false);
												setFailed(false);
												setKeyFailed(false);
											}
										}),
										!item.writable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "fieldHint",
											children: t("settings.secret.readOnly")
										})
									]
								}, item.kind))
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "footer",
							children: [
								failed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "failed",
									role: "status",
									children: t("settings.saveFailed")
								}),
								keyFailed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "failed",
									role: "status",
									children: t("settings.secret.saveFailed")
								}),
								saved && !dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "ok",
									role: "status",
									children: t("settings.saved")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ActionBar, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
									disabled: !dirty || saving || !loaded,
									onClick: () => {
										setDraftRoot(savedRoot);
										setDraftProfile(cloneProfile(savedProfile));
										setDraftRules(savedRules);
										setSecrets((current) => current.map((item) => ({
											...item,
											nextValue: ""
										})));
										setFailed(false);
										setKeyFailed(false);
										setSaved(false);
									},
									children: t("settings.discard")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
									tone: "primary",
									disabled: !dirty || saving || dirtyRoot && draftRoot === "",
									onClick: () => {
										onSave();
									},
									children: t(saving ? "settings.saving" : "settings.save")
								})] })
							]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		const NS = "dsh.oil.creator";
		const zh = {
			tab: "内容",
			"tab.sessions": "会话",
			"session.new.label": "新建会话",
			"toggle.open": "打开侧边栏",
			"toggle.collapse": "收起侧边栏",
			"toolbar.search": "搜索标题",
			"toolbar.search.aria": "搜索内容",
			"toolbar.search.clear": "清除搜索",
			"toolbar.refresh": "刷新",
			"toolbar.create": "新建内容",
			"toolbar.create.aria": "新建内容",
			"create.title": "新建内容",
			"create.name": "这一期视频的名字",
			"create.name.placeholder": "例如：DeepSeek Harness 安装上手",
			"create.confirm": "创建",
			"create.cancel": "取消",
			"create.failed": "创建失败",
			"inspector.tab.overview": "概览",
			"inspector.tab.video": "视频",
			"inspector.tab.article": "文章",
			"inspector.tab.script": "脚本",
			"inspector.tab.subtitle": "字幕",
			"inspector.stage.idle": "未开始",
			"inspector.stage.record": "待录制",
			"inspector.stage.cut": "待剪辑",
			"inspector.stage.finish": "待加字幕 / 封面",
			"inspector.stage.publish": "待发布",
			"inspector.stage.live": "已发布",
			"inspector.studio.open": "打开工程",
			"inspector.studio.bind": "绑定工程",
			"inspector.studio.rebind": "换绑",
			"inspector.article": "公众号",
			"inspector.article.draft": "图文稿",
			"inspector.article.ready": "已成稿",
			"inspector.article.missing": "未转写",
			"inspector.article.empty": "还没有转成文章。成稿会放在这一期的 公众号文章/ 里。",
			"inspector.readyToRecord": "准备好录制了",
			"inspector.video.empty": "还没有成片。",
			"inspector.publish.unpublished": "未发布",
			"inspector.publish.draft": "草稿已备",
			"inspector.publish.published": "已发布",
			"inspector.step.topic": "选题",
			"inspector.step.record": "录制",
			"inspector.step.cut": "剪辑",
			"inspector.step.finish": "字幕封面",
			"inspector.step.publish": "发布",
			"inspector.step.topicHint": "在对话里定这一期讲什么，笔记写进 topic.md。",
			"inspector.step.recordHint": "用 Screen Studio 录完，把 .screenstudio 工程绑定到这一期。",
			"inspector.step.cutHint": "在 Screen Studio 里剪完并导出 MP4；成片落盘后自动进入字幕和封面。",
			"inspector.step.finishHint": "字幕和封面可以同时做。先预览改稿，再烧进视频。",
			"inspector.step.waitingExport": "正在等待成片落盘",
			"inspector.step.exportTimedOut": "两小时内没有等到成片，仍在标记等待导出",
			"inspector.track.subtitle": "字幕",
			"inspector.track.cover": "封面",
			"inspector.track.notGenerated": "未生成",
			"inspector.subtitle.empty": "还没有字幕稿。回到概览可以生成字幕稿。",
			"inspector.subtitle.proofPending": "待校对",
			"inspector.subtitle.burning": "烧录中",
			"inspector.subtitle.burned": "烧录完成",
			"inspector.subtitle.burnFailed": "烧录失败",
			"inspector.subtitle.burn": "烧录字幕",
			"inspector.subtitle.reburn": "再烧录",
			"inspector.subtitle.needDraft": "先生成并预览字幕稿，再烧录",
			"empty.library": "还没有内容文件夹，点右上角新建第一条。",
			"empty.remote": "内容服务还没连上",
			"empty.error": "读取失败",
			"empty.gone": "这条内容已被移动或删除。",
			"empty.loading": "正在读取",
			"detail.tags": "标签",
			"time.justNow": "刚刚",
			"time.minutes": "{n} 分钟前",
			"time.hours": "{n} 小时前",
			"time.yesterday": "昨天",
			"time.days": "{n} 天前",
			"time.monthDay": "{m}月{d}日",
			"time.yearMonthDay": "{y}年{m}月{d}日",
			"inspector.close": "关闭",
			"inspector.openFolder": "打开文件夹",
			"inspector.subtitle.previewEdit": "预览编辑",
			"inspector.platforms": "视频平台",
			"inspector.sync.title": "发布数据",
			"inspector.sync.hint": "从各平台创作者后台回收播放、赞和评论。",
			"inspector.publish.open": "打开作品",
			"inspector.script.placeholder": "还没有脚本。在这里直接写，或在对话里让 AI 起草。",
			"inspector.platform.xhs": "小红书",
			"inspector.platform.bilibili": "B 站",
			"inspector.platform.douyin": "抖音",
			"inspector.platform.wechat": "视频号",
			"inspector.publish.sync": "已发布，同步数据",
			"inspector.publish.syncing": "正在同步",
			"inspector.publish.platformsLoading": "正在读取已启用的平台。",
			"inspector.publish.enablePlatforms": "还没有启用平台，请先到设置里启用平台。",
			"inspector.publish.synced": "已对上 {n} 条",
			"inspector.publish.cached": "已对上 {n} 条 · 用刚才的结果",
			"inspector.publish.login": "{name} 需要先在 Ego 里登录创作者后台",
			"inspector.publish.views": "{n} 播放",
			"inspector.publish.likes": "{n} 赞",
			"inspector.publish.comments": "{n} 评论",
			"settings.title": "内容工作台",
			"settings.description": "内容目录、启用的平台，以及字幕和封面用的 API Key。",
			"settings.libraryRoot": "影片目录",
			"settings.libraryRootHint": "每个子文件夹是一条内容，命名为 日期_可读标题。",
			"settings.enabledPlatforms": "启用平台",
			"settings.enabledPlatformsHint": "选择 AI 发布和数据同步使用的平台。",
			"settings.scriptRules": "脚本规则（人设）",
			"settings.scriptRulesHint": "写脚本时 AI 必须遵循的语气、结构和禁忌。AI 也可以在对话里帮你记录和更新。",
			"settings.scriptRulesPlaceholder": "例如：口语化，少用术语；开头 3 秒抛出结论；不堆砌 emoji。",
			"settings.platform.xiaohongshu": "小红书",
			"settings.platform.douyin": "抖音",
			"settings.platform.bilibili": "B 站",
			"settings.platform.wechat": "视频号",
			"settings.libraryRootEmpty": "尚未选择",
			"settings.pick": "选择",
			"settings.save": "保存",
			"settings.saving": "保存中",
			"settings.discard": "放弃",
			"settings.saved": "已保存",
			"settings.saveFailed": "保存失败",
			"settings.expand": "展开",
			"settings.collapse": "收起",
			"settings.secrets": "接口密钥",
			"settings.capabilities": "环境状态",
			"settings.capabilitiesHint": "缺失的环节可以需要时再装，AI 会给出安装方式。",
			"settings.capability.library": "内容目录",
			"settings.capability.screenStudio": "Screen Studio",
			"settings.capability.subtitle": "字幕",
			"settings.capability.cover": "封面",
			"settings.capability.editing": "自动剪辑",
			"settings.capability.publish": "自动发布",
			"settings.capability.article": "公众号图文",
			"settings.capability.ego": "Ego Browser",
			"settings.state.ready": "可用",
			"settings.state.missing": "不可用",
			"settings.state.unsupported": "不支持",
			"settings.secretsHint": "和视觉识别共用官方凭据。页面只知道有没有 Key，不会把 Key 读回来。",
			"settings.secret.subtitle": "字幕 · 百炼",
			"settings.secret.subtitleHint": "生成字幕用 FunAudio ASR。对应 DASHSCOPE_API_KEY，到百炼控制台 bailian.console.aliyun.com 申请。",
			"settings.secret.cover": "封面 · ZenMux",
			"settings.secret.coverHint": "分析画面和生成封面。对应 ZENMUX_API_KEY，到 zenmux.ai 控制台申请。",
			"settings.secret.placeholder": "留空保留当前 Key",
			"settings.secret.configured": "已配置",
			"settings.secret.missing": "未配置",
			"settings.secret.loadFailed": "状态未知",
			"settings.secret.readOnly": "当前 Key 来自只读环境变量。",
			"settings.secret.saveFailed": "API Key 保存失败，已保留当前输入。",
			"inspector.make": "制作",
			"inspector.cover.generate": "一键生成封面",
			"inspector.cover.regenerate": "再生成封面",
			"inspector.cover.generating": "封面生成中",
			"inspector.cover.ready": "封面已生成",
			"inspector.cover.failed": "封面生成失败",
			"inspector.cover.needKey": "先到设置 → 插件 → 内容工作台 填写 ZenMux API Key",
			"inspector.cover.needVideo": "先有成片才能生成封面",
			"inspector.subtitle.generate": "生成字幕稿",
			"inspector.subtitle.regenerate": "再生成字幕",
			"inspector.subtitle.generating": "字幕生成中",
			"inspector.subtitle.failed": "字幕生成失败",
			"inspector.subtitle.needKey": "先到设置 → 插件 → 内容工作台 填写百炼 API Key",
			"inspector.subtitle.needVideo": "先有成片才能生成字幕"
		};
		const en = {
			tab: "Library",
			"tab.sessions": "Chats",
			"session.new.label": "New session",
			"toggle.open": "Open sidebar",
			"toggle.collapse": "Collapse sidebar",
			"toolbar.search": "Search titles",
			"toolbar.search.aria": "Search content",
			"toolbar.search.clear": "Clear search",
			"toolbar.refresh": "Refresh",
			"toolbar.create": "New content",
			"toolbar.create.aria": "New content",
			"create.title": "New content",
			"create.name": "Episode title",
			"create.name.placeholder": "e.g. Getting started with DeepSeek Harness",
			"create.confirm": "Create",
			"create.cancel": "Cancel",
			"create.failed": "Could not create",
			"inspector.tab.overview": "Overview",
			"inspector.tab.video": "Video",
			"inspector.tab.article": "Article",
			"inspector.tab.script": "Script",
			"inspector.tab.subtitle": "Subtitles",
			"inspector.stage.idle": "Not started",
			"inspector.stage.record": "Ready to record",
			"inspector.stage.cut": "Ready to edit",
			"inspector.stage.finish": "Needs subtitles / cover",
			"inspector.stage.publish": "Ready to publish",
			"inspector.stage.live": "Published",
			"inspector.studio.open": "Open project",
			"inspector.studio.bind": "Bind project",
			"inspector.studio.rebind": "Change project",
			"inspector.article": "WeChat article",
			"inspector.article.draft": "Article draft",
			"inspector.article.ready": "Draft ready",
			"inspector.article.missing": "Not written",
			"inspector.article.empty": "No article yet. Finished drafts go in this episode's 公众号文章/ folder.",
			"inspector.readyToRecord": "Ready to record",
			"inspector.video.empty": "No video yet.",
			"inspector.publish.unpublished": "Not published",
			"inspector.publish.draft": "Draft ready",
			"inspector.publish.published": "Published",
			"inspector.step.topic": "Topic",
			"inspector.step.record": "Record",
			"inspector.step.cut": "Cut & export",
			"inspector.step.finish": "Subtitles & cover",
			"inspector.step.publish": "Publish",
			"inspector.step.topicHint": "Decide this episode's topic in chat; notes go into topic.md.",
			"inspector.step.recordHint": "Record with Screen Studio, then bind the .screenstudio project here.",
			"inspector.step.cutHint": "Cut and export the MP4 in Screen Studio; the workbench moves on once the file lands.",
			"inspector.step.finishHint": "Subtitles and cover can run in parallel. Preview the draft, then burn it in.",
			"inspector.step.waitingExport": "Waiting for the exported video",
			"inspector.step.exportTimedOut": "No export arrived within two hours; still marked as waiting",
			"inspector.track.subtitle": "Subtitles",
			"inspector.track.cover": "Cover",
			"inspector.track.notGenerated": "Not generated",
			"inspector.subtitle.empty": "No subtitle draft yet. Generate one from the overview.",
			"inspector.subtitle.proofPending": "Ready to proofread",
			"inspector.subtitle.burning": "Burning",
			"inspector.subtitle.burned": "Burn finished",
			"inspector.subtitle.burnFailed": "Burn failed",
			"inspector.subtitle.burn": "Burn subtitles",
			"inspector.subtitle.reburn": "Burn again",
			"inspector.subtitle.needDraft": "Generate and preview the subtitle draft before burning",
			"empty.library": "No episodes yet. Create the first one from the top-right button.",
			"empty.remote": "Library service is not ready",
			"empty.error": "Failed to load",
			"empty.gone": "This episode was moved or deleted.",
			"empty.loading": "Loading",
			"detail.tags": "Tags",
			"time.justNow": "Just now",
			"time.minutes": "{n}m ago",
			"time.hours": "{n}h ago",
			"time.yesterday": "Yesterday",
			"time.days": "{n}d ago",
			"time.monthDay": "{m}/{d}",
			"time.yearMonthDay": "{y}/{m}/{d}",
			"inspector.close": "Close",
			"inspector.openFolder": "Open folder",
			"inspector.subtitle.previewEdit": "Preview & edit",
			"inspector.platforms": "Video platforms",
			"inspector.sync.title": "Published data",
			"inspector.sync.hint": "Pull views, likes, and comments back from the creator dashboards.",
			"inspector.publish.open": "Open post",
			"inspector.script.placeholder": "No script yet. Write it here, or ask the AI to draft one in chat.",
			"inspector.platform.xhs": "Xiaohongshu",
			"inspector.platform.bilibili": "Bilibili",
			"inspector.platform.douyin": "Douyin",
			"inspector.platform.wechat": "Channels",
			"inspector.publish.sync": "Already published, sync data",
			"inspector.publish.syncing": "Syncing",
			"inspector.publish.platformsLoading": "Reading enabled platforms.",
			"inspector.publish.enablePlatforms": "No platforms are enabled. Enable one in Settings first.",
			"inspector.publish.synced": "Matched {n}",
			"inspector.publish.cached": "Matched {n} · reused last snapshot",
			"inspector.publish.login": "{name} needs an Ego login on the creator site",
			"inspector.publish.views": "{n} views",
			"inspector.publish.likes": "{n} likes",
			"inspector.publish.comments": "{n} comments",
			"settings.title": "Content workbench",
			"settings.description": "Library folder, enabled platforms, and the API keys for subtitles and covers.",
			"settings.libraryRoot": "Library folder",
			"settings.libraryRootHint": "Each subfolder is one episode, named date_readable title.",
			"settings.enabledPlatforms": "Enabled platforms",
			"settings.enabledPlatformsHint": "Choose the platforms used by AI publishing and data sync.",
			"settings.scriptRules": "Script rules (persona)",
			"settings.scriptRulesHint": "Tone, structure, and taboos the AI must follow when writing scripts. The AI can also record and update these in chat.",
			"settings.scriptRulesPlaceholder": "e.g. Conversational, few buzzwords; lead with the conclusion in 3 seconds; no emoji piles.",
			"settings.platform.xiaohongshu": "Xiaohongshu",
			"settings.platform.douyin": "Douyin",
			"settings.platform.bilibili": "Bilibili",
			"settings.platform.wechat": "Channels",
			"settings.libraryRootEmpty": "Not chosen",
			"settings.pick": "Choose",
			"settings.save": "Save",
			"settings.saving": "Saving",
			"settings.discard": "Discard",
			"settings.saved": "Saved",
			"settings.saveFailed": "Save failed",
			"settings.expand": "Expand",
			"settings.collapse": "Collapse",
			"settings.secrets": "API keys",
			"settings.capabilities": "Environment",
			"settings.capabilitiesHint": "Missing pieces can be installed later; the AI will guide you.",
			"settings.capability.library": "Library",
			"settings.capability.screenStudio": "Screen Studio",
			"settings.capability.subtitle": "Subtitles",
			"settings.capability.cover": "Covers",
			"settings.capability.editing": "Auto editing",
			"settings.capability.publish": "Auto publish",
			"settings.capability.article": "Article",
			"settings.capability.ego": "Ego Browser",
			"settings.state.ready": "Ready",
			"settings.state.missing": "Unavailable",
			"settings.state.unsupported": "Unsupported",
			"settings.secretsHint": "Stored in the same official credential store as Vision Recognition. The page can only see whether a key exists.",
			"settings.secret.subtitle": "Subtitles · Bailian",
			"settings.secret.subtitleHint": "FunAudio ASR for generating subtitles. Uses DASHSCOPE_API_KEY; apply at bailian.console.aliyun.com.",
			"settings.secret.cover": "Covers · ZenMux",
			"settings.secret.coverHint": "Frame analysis and cover generation. Uses ZENMUX_API_KEY; apply at zenmux.ai.",
			"settings.secret.placeholder": "Leave blank to keep the current key",
			"settings.secret.configured": "Configured",
			"settings.secret.missing": "Missing",
			"settings.secret.loadFailed": "Status unknown",
			"settings.secret.readOnly": "The current key comes from a read-only environment variable.",
			"settings.secret.saveFailed": "The API key could not be saved. Your input was preserved.",
			"inspector.make": "Produce",
			"inspector.cover.generate": "Generate covers",
			"inspector.cover.regenerate": "Generate covers again",
			"inspector.cover.generating": "Generating covers",
			"inspector.cover.ready": "Covers ready",
			"inspector.cover.failed": "Cover generation failed",
			"inspector.cover.needKey": "Add a ZenMux API key in Settings → Plugins → Content workbench",
			"inspector.cover.needVideo": "A finished video is required to generate covers",
			"inspector.subtitle.generate": "Generate subtitle draft",
			"inspector.subtitle.regenerate": "Regenerate subtitle draft",
			"inspector.subtitle.generating": "Generating subtitles",
			"inspector.subtitle.failed": "Subtitle generation failed",
			"inspector.subtitle.needKey": "Add a Bailian API key in Settings → Plugins → Content workbench",
			"inspector.subtitle.needVideo": "A finished video is required to generate subtitles"
		};
		//#endregion
		//#region src/client/assets/oilIcon.ts
		const OIL_ICON_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAHhlWElmTU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAIdpAAQAAAABAAAATgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAADCgAwAEAAAAAQAAADAAAAAA6LhYOwAAAAlwSFlzAAALEwAACxMBAJqcGAAADOFJREFUaAXtGntclFX2zAwDDO+HPBVULNQSQ018b7mmKUk+SdRN7emrdSsr03bX9lfbz7duJmqmktnj52NlQ63MdVVSUwGLpzDyFBQBFRAGmGHm7Dl3+IZvcBBBd+uP7u93597vfuece86553U/APit/bIaUP2S2zs4qCLt7FTdjEZTXkf5UHYU8R7xVHb2dssQMUytbvxJRqvd/ChkyP+3qdpBOQ9MinqDwRjn6OgYgqiPQlQGKhSKooYGw1ZipPFumbnfAvjQxr2aelelErwUClAZjVBHa+XU2VRuUh9I/T21WjUbQBFmZwfxdXWNSbRWT71d7X4I4Ek7PqXROEwN69N38CPh4X5hYX2ga3BX8PTyApVKCbpaHVy/fh1yc3PhwoUUSE1Ly8rJ0V4ivMvUX7e3t++BSuMQckiyKrvEhoYGbbuk6CCwO+G9FRLSPe/tJUvw/PnzWFdXRwy03UgYPJiQgDHTptW7uDinE529ag0M1mjshlAf1kF+2oU2ztvLK+3d5cux9OpVC8eNjY1oMBja7Eaj0YKTRIJPnTKFTWc39YB2cdEBYI4Sfxs+bJjh/LlzggmTySQYbmxinEdpzsJIz/I1g0FvwTFLYsJP4+LQ39+vkOiP7gBfd4XiQFBxM2fMwJLiYrGvxJScSWlu6yQkeLNg+mbh6OS4XbhwAcPCwmppn5l3xVE7gDjhxb304ovCZPT6BouWJYblo6ThZiHMGm9+bj4lCY/fcSvIz8d+4eENtN+UdvDXJujyKZMnY35uLtbW1mBLW5eYYNvmLjHK6/K5/JnXJTw5DAuRk52N3bp143Dbv03O7gJgZJ8+D+uTk5KE9hsbm5kSmtbreU/U01hSUkK9GBvq620yJzEtMSyN1oKZ6X37zTeocXBIIf5c7sRjW7WQo5NGs+eDDz7oHBoaCp18OlFcl6MoQEnP3x85AuvWroUfTp2CEyeOQ052DgwePBgos1r25lnzk2VZTOwokykp63EjXQDFBeD9ysvLA86ePcsR6qR42Z4foqPo4qt86+moKMzKzMTLRUVotBEm2ZyysjKxrKxMnATS7tXV1WigE5E0LI3WmjabUF2dDv8VH48HDx7Ea9euCRoMbzIZ8eqVKxgcFHSd+A5qjXe5Oq1gYiJGhSYcv7l77oK3HDp3DgQ/f39gTcmbpDmT0QSUD6CCsq2DgwO4ubkJ7bM2W9M60+EDIp8BbY4WtFotfL57N9TU1EBY377iFNzc3aG6qkpz/MSJagI/zjgtm036vO97r3TfcDwjcNH6DbHg6uIMQcHBZqaIAm+sUtlBYmIi7N+3TzDh4eEBdBpw/cYNIK3By3Pngq+vL60ZGKPlvpZnuVLqdDo4fPgwjBs3jhThKMoQ7aVLEDFwoLayqiqckHQWxDtNMCPSf8ZYn6JXX12MF7Oy6GhLLebDZsDtHxs24ML58zEtNRXpBMQa/+hqa3HPnj04PWYaZl+8KNYlE5KHVzOCSZjfITIf7lm0l9QYh/fiRPnkmDEm4vcxWzxb24QFQvlwRZUyaHzEILBXq8HFuSkQIGlebQef7doFZK+wcdMmcSqseeAtqNmTCUVHR8ODDz4I77//PmyKjQVnJyfhnJJBsdbT0tJgy+ZYcHTUQPfu3cWxHjt2DHS6Wpg3fwH0JTPi0+NA8MQTTyi+O3JkJJE/ITZp60d7+PEl4b28cfHiN4SDceY1Gs3ZsqK8HOfMmY06nc4q5nP8l8oK1h63TR99hDt37BBz6RT4IfHkSZwxfTomJyeLd/KfCykp9C4GT586ZVn+z7FjSIIcssW3zRMoLavvqXbwBHc3Vzh69CjEx8cLDfmTI5MAMOr3o0Cj0Qibp8BHzq2GW9XVQNUo+Pr5iXVEE0RGRsK6detgznPPgZIdh3pp6VXYsmULrFm7BgICAptoNLMW3q8frFy5CpYuXQq9evUSJXkQ+ZSHu2u3m5XVaoJkp7I0mwLU6vT+jk5uMHnyFPDx9QEPD3coLyuHgsJC2LB+PfTu3dtCQKlUAdk6TJs2jeM2bN26FZ4aP56iiJGE8QWq7aGQ8FxcXMDb25ucfj9MmDDBwrzkxByNSOXCbLoQwyNGjICEhASYNXs2uNP+bm4eniSAK218w7I5TW4TADFadWxbvhsrjJwOaimseXp6QGBgIHTu0gVOnrA2Q05An+76FH5OTRV0d5F/jI+KEnOOVGR+sGrVKhGHOOkVFRTA9p07gexNJMXDhw4JAWfNmgWOGkcSgjYmQYYPHw67Kaxyc3Jypqhkb09TPgGrdpsAdLcwuTgPajAYasgk6gnZSYRJpUIJKmLWx8cHLuVeggGPPkqEyKup+fv5i5F/IiIixJwFu3q1GEIe6AEffrhR0OCToqwOrq6uoFAq4MzpMzBh4kRhRgw/d968JvND8O7kTY6eChTRyJTdoL6u3kiEuVu12wQgzWPeN44V0FhKSaVWmI9eb6BoZE+KMcHjI0fC6tWrKNI8IyIEH/3zLzwvGKQLurB3cniRJ4589x2EP8Lh29x69uxJp+lJzNQBXSOBwqbFByorKyUw4Su1tDdHqPKyMkg8eQLKK8pvQSDlgSvNYK3OjD89tSJyhD/u2LELMzMysLy8zJIHODSsXLECYzdtElGCow+XE1LjcoObVpuDf5g5E2/evGmF+86yZXjmzBkBU1RYiEOHDMHhw4ch+UlTVDMXc1999RVujo0VcJxrHBzU1rbbKvf0AjOi5rzxbBAu+tObIlHxRlzbcGJhZuup2lz8+mu4cuUKJM2JTeQ/PyQmUiKLQQ6J3MwhVC/C7LlzZ3HhggVizu/oNET1ag7BDGOkkr0WZz37LBYWFDAIbv/kE7bVD23xTB5ze8PsqF7xh4qS1uxzdd6wYZ2IIBzKHCl0Ej1RObI5xe2MgzNnTkMwfYHgEEuCiS8PXLEufOUV6NGjh4gqZBOWTTjqcCSjgg+WLlsGakqU8kbMw59pPWLQIJg+Y4Z4RbdA+OLLL/mC8085LM+bKcveIL6rrDx9+mjkgp9Hzn1tDfQPDxPxvVOnTk1uK8xU2DnH//T0dIrvpSKKhIb2FIwzOZGhmzYxu7sZj0Pvls2bISU5GUaPGQPsG6yYNKLzb8o7Y8eOhZjp08Ua0x0woD/ViqV9iBRXplbNpgAMgWlPz1+zPSP2VMEA+Ms7b4IzxfHgrl3J+dRE2ExDIJPXy+8IzAg7thShbOmIQzSHWP5OxAwXU6jlkqEblRRjRo8W4ZqF59P6aONG+OOiRbFEcKF517v8xdxo95Kjo7L7hnrjtm3bhT1fvVJis86XygRplJyab2/Cb8h3+B3PJRgeyeBJXuvGPsDvTBQcOAD07tWTL/kPt8Z2qx9TFT32VgX6O61+faYfZdePgW2ztPQaUFnLFUFTkwyj+ZnjOX+FO3DgABgbjaAiLXK3I7/QU2KUNz4p1rS805dqAaIgOuvXrYWsi9kf00KGHE8+t7AiX5TmnJUhvX7frCXnJhrcx8Kri+aJxBZMdwNORqQ/CbRppHqTpDMYGuGTbdsgIyMDuoeEgIbyA5cTU6dOhUF01TSbmITKNKzZYNPhjE8lSQ5dcIYSwG22L2FbY0qrshFTJnctq751NGrhuQdGjFsAMc9MEkJ0obKC/YIMoAlaGtlRKWuTxjkJXczOBrrwQwjZN/sQO5DEcjOGtKG5MMzLyyNHfrJGq700jt78IL3t8Iipk4Zkf/1YWT8qsd9e+ldMTjovLjpVlAPkNi6/sLAdc5KTmtm2m7/ItfQH4RMEnJ+fhwP69+fvQjEdZtgWImZOGq1NGHlteD9vnD3nZVGv842LtIz6BvrQRQmOmbDu0sVeGlu+Nz9Ld40ff/wRH3qo9y3a35wAbDFyL2uYGTW4InF01pwofxw4cAju/uwLTE9LFV/TOGKIbG0liMS4NFoLIDFOd2Fcu2YNenl5XiT+HrsXHtvExbQJQZgadeCzv4fhwLAAjI6egXv37MeM9HQsvnwZKbFZBGk0SKfSLIDcrLhk2Lt3Lw4dOoT/ALKJum+bDLQAaNOJW8CLR/JDBWROfKm04tbizxMuh8Yf14GzdxgMHfY76BfelzJxdwgM8AdXKoPlSY6RuerksvrI998DfQ+qTE5J+ZqWN1Lnv9C0u3VIAGkXzJrkTVHlhRuVddOPn70WfjLpJmQVIDSAN7h7BoB/QGdRjnNsZ8avXCmppwhzJb8gP1WvbzxCdL6lni/R68h4TwJIG2L+HEeoqxoBaBxN19FHiktruu7YX+S3Kq4oi2BWU+c/2nHBf416CXXOrr/ehmXRLiHBrkvp72Nx/2sub7uR3Y8NFb57a6ikMFJSrr8f9O5Eo9Va6E5Id/NOSSUQwVl9ArkbvPbCtPpxt72EWsKr7O0MKoWi4F7+jaAlzd+ef40a+C9PfC0d6Ud/AAAAAABJRU5ErkJggg==";
		//#endregion
		//#region src/client/sidebar/OilBrand.tsx
		function OilBrand({ compact = false, name = "Oil Creator" }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "oilBrand",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					className: "oilBrandIcon",
					src: OIL_ICON_SRC,
					alt: "",
					"aria-hidden": "true"
				}), !compact && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "oilBrandText",
					children: name
				})]
			});
		}
		//#endregion
		//#region \0dsh-oil-creator-css:/private/tmp/dsh-oil-creator-ed9417d/dsh-oil-creator-ed9417d1e0d24bdecdac831d4e72d3428e49a123/src/client/sidebar/OilSidebarRoot.css.mjs
		registerPluginCss("dsh-oil-creator/OilSidebarRoot.css", "[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] {\n  --dsh-sidebar-inline-padding: 12px;\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  padding: 6px var(--dsh-sidebar-inline-padding);\n  box-sizing: border-box;\n  background: var(--dsw-specific-sidebar-fill);\n  color: var(--dsw-alias-label-primary);\n  font-size: 14px;\n  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);\n  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed {\n  padding: 18px 10px 6px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].quietBars {\n  --dsh-scrollbar-thumb: transparent;\n  --dsh-scrollbar-thumb-hover: transparent;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].fading > * {\n  opacity: 0;\n  transition: opacity 150ms var(--ds-ease-in-out);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .wide {\n  animation: oil-sidebar-wide-in 200ms var(--ds-ease-in-out);\n}\n\n@keyframes oil-sidebar-wide-in {\n  from { opacity: 0; }\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].railIn .iconButton,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].railIn .newSession,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].railIn .regionArea {\n  animation: oil-sidebar-rail-in 150ms var(--ds-ease-in-out) backwards;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].railIn .footArea {\n  animation: oil-sidebar-rail-fade-in 150ms var(--ds-ease-in-out) backwards;\n}\n\n@keyframes oil-sidebar-rail-in {\n  from {\n    opacity: 0;\n    transform: translateX(49px);\n  }\n}\n\n@keyframes oil-sidebar-rail-fade-in {\n  from { opacity: 0; }\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .logoRow {\n  flex: none;\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 8px;\n  height: 52px;\n  padding: 4px 0 4px 4px;\n  margin-bottom: 4px;\n  box-sizing: border-box;\n  overflow: hidden;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .logoRow {\n  height: 36px;\n  padding: 0;\n  margin-bottom: 12px;\n  justify-content: flex-start;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .brandButton {\n  flex: 1;\n  min-width: 0;\n  display: inline-flex;\n  align-items: center;\n  padding: 0;\n  border: none;\n  background: transparent;\n  color: inherit;\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .oilBrand {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .oilBrandIcon {\n  width: 24px;\n  height: 24px;\n  flex: none;\n  border-radius: 999px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .oilBrandText {\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 16px;\n  font-weight: 650;\n  letter-spacing: -0.03em;\n  line-height: 1;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .iconButton {\n  flex: none;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 28px;\n  height: 28px;\n  border: none;\n  border-radius: 50%;\n  padding: 0;\n  background: transparent;\n  cursor: pointer;\n  color: var(--dsw-alias-label-secondary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .iconButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .iconButton {\n  width: 36px;\n  height: 36px;\n  color: var(--dsw-alias-label-primary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .toggle .panelIcon {\n  display: none;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .toggle:hover .panelIcon {\n  display: inline;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .railBrand {\n  display: inline-flex;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .toggle:hover .railBrand {\n  display: none;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .brandButton:focus-visible,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .iconButton:focus-visible,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .newSession:focus-visible,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .tabButton:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 2px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .newSession {\n  flex: none;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 36px;\n  height: 36px;\n  margin: 0 0 12px;\n  padding: 0;\n  border: none;\n  border-radius: 8px;\n  background: transparent;\n  color: var(--dsw-alias-label-primary);\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .newSession:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .tabRow {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  margin: 0 2px 8px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .tabList {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  gap: 4px;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .tabButton {\n  flex: 1;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 5px;\n  height: 28px;\n  border: none;\n  border-radius: 8px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 13px;\n  line-height: 20px;\n  cursor: pointer;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .tabButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .tabButton.active {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n  font-weight: 500;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .regionArea {\n  position: relative;\n  flex: 1;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n  margin-left: -4px;\n  margin-right: calc(-1 * var(--dsh-sidebar-inline-padding));\n  padding-left: 4px;\n  overflow: hidden;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .regionPane {\n  flex: 1;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .regionPane.hidden {\n  display: none;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .headerNewSession {\n  position: absolute;\n  top: 6px;\n  right: 104px;\n  z-index: 2;\n  display: flex;\n  align-items: center;\n  max-width: 28px;\n  opacity: 1;\n  overflow: hidden;\n  visibility: visible;\n  transition:\n    max-width 180ms var(--ds-ease-in-out),\n    opacity 120ms var(--ds-ease-in-out),\n    transform 180ms var(--ds-ease-in-out),\n    visibility 0s linear;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .regionArea:has(input:not([tabindex=\"-1\"])) .headerNewSession {\n  max-width: 0;\n  opacity: 0;\n  transform: translateX(4px);\n  visibility: hidden;\n  pointer-events: none;\n  transition-delay: 0s, 0s, 0s, 180ms;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .regionArea {\n  margin-left: 0;\n  margin-right: 0;\n  padding-left: 0;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .footArea {\n  flex: none;\n  display: flex;\n  flex-direction: column;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .settingsArea,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .footerActions {\n  flex: none;\n  min-width: 0;\n  width: 100%;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .footerActions {\n  display: flex;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .footArea {\n  align-items: center;\n}\n\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .settingsArea,\n[data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].collapsed .footerActions {\n  display: flex;\n  justify-content: center;\n  width: auto;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .wide,\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].fading > *,\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].railIn .iconButton,\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].railIn .newSession,\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].railIn .footArea,\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"].railIn .regionArea,\n  [data-plugin=\"dsh-oil-creator\"][data-surface=\"sidebar\"] .headerNewSession {\n    transition: none;\n    animation: none;\n  }\n}\n");
		//#endregion
		//#region src/client/sidebar/OilSidebarRoot.tsx
		const COLLAPSE_SETTLE_MS = 150;
		const SCROLLBAR_LINGER_MS = 2e3;
		function cx(...parts) {
			return parts.filter((part) => typeof part === "string" && part !== "").join(" ");
		}
		function OilSidebarRoot({ collapsed, width, startSession, toggleSidebar, t, renderSlot, tabLabels, contentFace, contentT }) {
			const [settled, setSettled] = (0, react.useState)(collapsed);
			(0, react.useEffect)(() => {
				if (!collapsed) {
					setSettled(false);
					return;
				}
				const timer = window.setTimeout(() => {
					setSettled(true);
				}, COLLAPSE_SETTLE_MS);
				return () => {
					window.clearTimeout(timer);
				};
			}, [collapsed]);
			const wide = !collapsed || !settled;
			const lastWideWidth = (0, react.useRef)(width);
			if (!collapsed) lastWideWidth.current = width;
			const everWide = (0, react.useRef)(!collapsed);
			if (!collapsed) everWide.current = true;
			const sidebarTab = useSidebarTab();
			const chooseTab = (tab) => {
				setSidebarTab(tab);
			};
			const column = (0, react.useRef)(null);
			const [pointerInside, setPointerInside] = (0, react.useState)(false);
			const lingerTimer = (0, react.useRef)(void 0);
			const armLinger = () => {
				if (lingerTimer.current !== void 0) return;
				lingerTimer.current = window.setTimeout(() => {
					lingerTimer.current = void 0;
					setPointerInside(false);
				}, SCROLLBAR_LINGER_MS);
			};
			const cancelLinger = () => {
				window.clearTimeout(lingerTimer.current);
				lingerTimer.current = void 0;
			};
			(0, react.useEffect)(() => {
				if (!pointerInside) return;
				const onMove = (event) => {
					const rect = column.current?.getBoundingClientRect();
					if (rect === void 0) return;
					if (event.clientX >= rect.left && event.clientX < rect.right && event.clientY >= rect.top && event.clientY < rect.bottom) cancelLinger();
					else armLinger();
				};
				document.addEventListener("pointermove", onMove);
				return () => {
					document.removeEventListener("pointermove", onMove);
					cancelLinger();
				};
			}, [pointerInside]);
			const [contentMounted, setContentMounted] = (0, react.useState)(sidebarTab === "content");
			(0, react.useEffect)(() => {
				if (sidebarTab === "content") setContentMounted(true);
			}, [sidebarTab]);
			const sessionsVisible = !wide || sidebarTab === "sessions";
			const contentVisible = wide && sidebarTab === "content";
			(0, react.useEffect)(() => {
				setSidebarChromeWidth(!wide ? 56 : collapsed ? lastWideWidth.current : width);
			}, [
				wide,
				collapsed,
				width
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: column,
				"data-plugin": "dsh-oil-creator",
				"data-surface": "sidebar",
				className: cx(!wide && "collapsed", !wide && everWide.current && "railIn", collapsed && wide && "fading", !pointerInside && "quietBars"),
				style: wide ? { width: collapsed ? lastWideWidth.current : width } : void 0,
				onPointerEnter: () => {
					cancelLinger();
					setPointerInside(true);
				},
				onPointerLeave: () => {
					armLinger();
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "logoRow",
						children: [wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: cx("brandButton", "wide"),
							"aria-label": t("session.new.label"),
							onClick: () => {
								startSession();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "oilBrand",
								children: [renderSlot("sidebar.brand.mark", { size: 24 }, {
									fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OilBrand, { compact: true })
								}), renderSlot("sidebar.brand.name", {}, {
									fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "oilBrandText",
										children: "Oil Creator"
									})
								})]
							})
						}), wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "headerActions wide",
							children: renderSlot("sidebar.header.action", {})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: collapsed ? t("toggle.open") : t("toggle.collapse"),
							delayMs: 500,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: cx("iconButton", "toggle"),
								"aria-label": collapsed ? t("toggle.open") : t("toggle.collapse"),
								onClick: () => {
									toggleSidebar();
								},
								children: [!wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "railBrand",
									children: renderSlot("sidebar.brand.mark", { size: 24 }, {
										fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OilBrand, { compact: true })
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {
									className: "panelIcon",
									size: wide ? 16 : 18
								})]
							})
						})]
					}),
					!wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: t("session.new.label"),
						delayMs: 500,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "newSession",
							"aria-label": t("session.new.label"),
							onClick: () => {
								startSession();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, { size: 18 })
						})
					}),
					wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "tabRow",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "tabList",
							role: "tablist",
							"aria-label": tabLabels.sessions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "tab",
								"aria-selected": sidebarTab === "sessions",
								className: cx("tabButton", sidebarTab === "sessions" && "active"),
								onClick: () => {
									chooseTab("sessions");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, { size: 14 }), tabLabels.sessions]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "tab",
								"aria-selected": sidebarTab === "content",
								className: cx("tabButton", sidebarTab === "content" && "active"),
								onClick: () => {
									chooseTab("content");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 }), tabLabels.content]
							})]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "regionArea",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: cx("regionPane", !sessionsVisible && "hidden"),
							children: [wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "headerNewSession",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: t("session.new.label"),
									delayMs: 500,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "iconButton",
										"aria-label": t("session.new.label"),
										onClick: () => {
											startSession();
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, { size: 16 })
									})
								})
							}), renderSlot("sidebar.workspaces", {
								wide,
								expandSidebar: () => {
									if (collapsed) toggleSidebar();
								}
							})]
						}), contentMounted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: cx("regionPane", !contentVisible && "hidden"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContentSidebarPanel, {
								t: contentT,
								...contentFace
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "footArea",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "footerActions",
							children: renderSlot("sidebar.footer.action", { wide })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "settingsArea",
							children: renderSlot("sidebar.settings", { wide })
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/sidebar/startSession.ts
		/** 0.1.2-rc.1 将导航迁入 uiWorkspace；0.1.1-rc.2 仍由 workspaces 提供。 */
		function startSidebarSession(ctx, workspaceId) {
			for (const name of ["uiWorkspace", "workspaces"]) {
				const navigation = ctx.get(name);
				if (typeof navigation?.startSession === "function") {
					navigation.startSession(workspaceId);
					return;
				}
			}
			throw new Error("新建会话服务尚未就绪，请刷新页面后重试。");
		}
		//#endregion
		//#region src/client/settingsSlot.ts
		function registerCreatorSettingsCard(slots, component, options) {
			return slots.register({
				name: "settings.plugin.item",
				key: options.namespace,
				id: options.legacyId,
				order: options.legacyOrder,
				locale: options.locale,
				inject: options.inject
			}, component);
		}
		//#endregion
		//#region src/client/index.tsx
		function credentialsOf(ctx) {
			return ctx.get("connection")?.api?.credentials;
		}
		function unwrap(answer, fallback) {
			if (!answer.ok || answer.value === void 0) throw new Error(answer.error?.message ?? fallback);
			return answer.value;
		}
		const inject = [
			"slots",
			"locale",
			"remote",
			"workspaces",
			"layout",
			"connection"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-oil-creator: dictionaries");
			ctx.effect(() => {
				remountPluginCss();
				return () => {
					releasePluginCss();
					releaseShellChrome();
				};
			}, "dsh-oil-creator: chrome");
			const remoteOf = () => ctx.get("remote.oilCreator");
			const face = () => ({
				ready: () => remoteOf() !== void 0,
				listContents: async (query, filter) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					return unwrap(await remote.listContents({
						query,
						filter
					}), "list failed");
				},
				getContent: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					return unwrap(await remote.getContent({ id }), "content failed");
				},
				getCoverThumb: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) return {
						found: false,
						mime: "",
						base64: ""
					};
					const answer = await remote.getCoverThumb({ id });
					return answer.ok && answer.value !== void 0 ? answer.value : {
						found: false,
						mime: "",
						base64: ""
					};
				},
				getVideoPlayback: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) return {
						found: false,
						url: "",
						kind: "raw"
					};
					const answer = await remote.getVideoPlayback({ id });
					return answer.ok && answer.value !== void 0 ? answer.value : {
						found: false,
						url: "",
						kind: "raw"
					};
				},
				getArticleMedia: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) return {
						found: false,
						origin: ""
					};
					const answer = await remote.getArticleMedia({ id });
					return answer.ok && answer.value !== void 0 ? answer.value : {
						found: false,
						origin: ""
					};
				},
				getSubtitleText: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) return {
						text: "",
						cues: []
					};
					const answer = await remote.getSubtitleText({ id });
					return answer.ok && answer.value !== void 0 ? answer.value : {
						text: "",
						cues: []
					};
				},
				pickDirectory: () => ctx.workspaces.pickDirectory(),
				openPath: (path) => ctx.workspaces.openPath(path),
				getSettings: async () => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					return unwrap(await remote.getSettings({}), "settings failed");
				},
				getCapabilities: async () => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					return unwrap(await remote.getCapabilities({}), "capabilities failed").capabilities;
				},
				getRevision: async () => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					return unwrap(await remote.getRevision({}), "revision failed").revision;
				},
				setLibraryRoot: async (path) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					unwrap(await remote.setLibraryRoot({ path }), "set root failed");
					bumpLibrary();
				},
				setProfile: async (profile) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					unwrap(await remote.setProfile({ profile }), "set profile failed");
					bumpProfile();
				},
				setScriptRules: async (text) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					unwrap(await remote.setScriptRules({ text }), "set script rules failed");
					bumpProfile();
				},
				refreshCatalog: async () => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					const listed = unwrap(await remote.refreshCatalog({}), "refresh failed");
					bumpLibrary();
					return listed;
				},
				createContent: async (title) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					const created = unwrap(await remote.createContent({ title }), "create failed");
					bumpLibrary();
					return created;
				},
				markReadyToRecord: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					const next = unwrap(await remote.setContentStage({
						id,
						readyToRecord: true
					}), "stage failed");
					bumpLibrary();
					return next;
				},
				bindStudio: async (id, path) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					const next = unwrap(await remote.bindStudio({
						id,
						path
					}), "bind failed");
					bumpLibrary();
					return next;
				},
				openStudio: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					return unwrap(await remote.openStudio({ id }), "open failed");
				},
				setPublish: async (id, platform, status, url) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					const next = unwrap(await remote.setPublish(url === void 0 ? {
						id,
						platform,
						status
					} : {
						id,
						platform,
						status,
						url
					}), "publish failed");
					bumpLibrary();
					return next;
				},
				syncPublish: async (request) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					const result = unwrap(await remote.syncPublish(request ?? {}), "sync failed");
					bumpLibrary();
					return result;
				},
				openSubtitlePreview: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					return unwrap(await remote.openSubtitlePreview({ id }), "preview failed");
				},
				startSubtitleBurn: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					const next = unwrap(await remote.startSubtitleBurn({ id }), "burn failed");
					bumpLibrary();
					return next;
				},
				startSubtitleGenerate: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					const next = unwrap(await remote.startSubtitleGenerate({ id }), "transcribe failed");
					bumpLibrary();
					return next;
				},
				startCoverGenerate: async (id) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					const next = unwrap(await remote.startCoverGenerate({ id }), "cover failed");
					bumpLibrary();
					return next;
				},
				setScript: async (id, text) => {
					const remote = remoteOf();
					if (remote === void 0) throw new Error("remote unavailable");
					return unwrap(await remote.setScript({
						id,
						text
					}), "script failed");
				}
			});
			const contentFace = face();
			ctx.effect(() => {
				return registerContentTriggers(ctx.get("inputTriggers"), (id) => contentFace.getContent(id), async () => {
					return (await contentFace.listContents("", "all")).items.map((item) => ({
						id: item.id,
						title: item.title
					}));
				});
			}, "dsh-oil-creator: content triggers");
			const injectSidebar = () => ({
				startSession: (workspaceId) => {
					startSidebarSession(ctx, workspaceId);
				},
				toggleSidebar: () => {
					ctx.layout.toggleSidebar();
				}
			});
			function BoundSidebar(props) {
				const contentT = ctx.locale.bind(NS);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OilSidebarRoot, {
					...props,
					tabLabels: {
						sessions: contentT("tab.sessions"),
						content: contentT("tab")
					},
					contentFace,
					contentT
				});
			}
			ctx.slots.inject("sidebar", () => ctx.slots.register({
				name: "sidebar",
				locale: NS,
				priority: -1,
				children: {
					"sidebar.brand.mark": {
						kind: "single",
						scope: "root"
					},
					"sidebar.brand.name": {
						kind: "single",
						scope: "root"
					},
					"sidebar.header.action": {
						kind: "list",
						scope: "root"
					},
					"sidebar.workspaces": {
						kind: "single",
						scope: "root"
					},
					"sidebar.settings": {
						kind: "single",
						scope: "root"
					},
					"sidebar.footer.action": {
						kind: "list",
						scope: "root"
					}
				},
				inject: injectSidebar
			}, BoundSidebar));
			ctx.effect(async () => {
				const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
				if (ctx.fiber.state >= 5) {
					await disposeRemote();
					return () => {};
				}
				bumpProfile();
				const stopOverlay = ctx.slots.inject("shell.overlay", () => {
					let disposeOccupant;
					const release = () => {
						disposeOccupant?.();
						disposeOccupant = void 0;
					};
					const sync = () => {
						if (getSelectedContentId() === null) {
							release();
							return;
						}
						if (disposeOccupant !== void 0) return;
						disposeOccupant = ctx.slots.register({
							name: "shell.overlay",
							id: "oil-creator-inspector",
							order: 20,
							locale: NS,
							inject: () => ({
								...face(),
								closeDetails: () => {
									setSelectedContentId(null);
								}
							})
						}, ContentInspector);
					};
					const stop = subscribeSelectedContentId(sync);
					sync();
					return () => {
						stop();
						release();
					};
				});
				const stopSettings = ctx.slots.inject("settings.plugin.item", () => registerCreatorSettingsCard(ctx.slots, CreatorSettingsCard, {
					namespace: CREATOR_SETTINGS_NAMESPACE,
					legacyId: "dsh-oil-creator",
					legacyOrder: 40,
					locale: NS,
					inject: () => ({
						...face(),
						credentials: credentialsOf(ctx)
					})
				}));
				const stopLive = startLibraryLiveSync(() => contentFace.getRevision());
				return async () => {
					stopLive();
					stopOverlay();
					stopSettings();
					await disposeRemote();
				};
			}, "dsh-oil-creator: remote-view");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map