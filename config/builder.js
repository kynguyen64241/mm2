const fs = require("node:fs");
const path = require("node:path");
const { GENERAL_DEFAULTS, THEME_VARS, cleanProfile, getIssues } = require("./profile_tools");

const ROOT_PATH = path.resolve(__dirname, "..");

function cloneJsonValue(value) {
	if (value === undefined) {
		return undefined;
	}

	return JSON.parse(JSON.stringify(value));
}

function toPosixPath(filePath) {
	return filePath.split(path.sep).join("/");
}

function toRepoRelativePath(filePath) {
	return toPosixPath(path.relative(ROOT_PATH, filePath));
}

function sanitizeFileName(value) {
	return String(value).trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function writeFileIfChanged(filePath, contents) {
	if (fs.existsSync(filePath)) {
		const currentContents = fs.readFileSync(filePath, "utf8");
		if (currentContents === contents) {
			return;
		}
	}

	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, contents, "utf8");
}

function loadProfile(profilePath) {
	const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
	return cleanProfile(profile, { fileName: path.basename(profilePath) });
}

function buildGeneratedCss(profile, profilePath) {
	const deviceId = sanitizeFileName(profile.deviceId || path.basename(profilePath, path.extname(profilePath)));
	const theme = profile.theme || {};
	const outputFileName = sanitizeFileName(theme.outputFile || `${deviceId}.css`);
	const generatedCssRelativePath = path.posix.join("css", "generated", outputFileName);
	const generatedCssPath = path.resolve(ROOT_PATH, generatedCssRelativePath);
	const baseCssRelativePath = toPosixPath(theme.baseCss || "css/mirror.vps.css");
	const importPath = toPosixPath(path.relative(path.dirname(generatedCssPath), path.resolve(ROOT_PATH, baseCssRelativePath)));
	const cssVariables = { ...THEME_VARS, ...(theme.variables || {}) };
	const cssLines = [];

	if (baseCssRelativePath) {
		cssLines.push(`@import url("${importPath.startsWith(".") ? importPath : `./${importPath}`}");`);
		cssLines.push("");
	}

	cssLines.push(`/* Auto-generated from ${toRepoRelativePath(profilePath)}. */`);
	cssLines.push("/* Edit the profile file instead of this generated CSS. */");
	cssLines.push("");
	cssLines.push(":root {");

	for (const [name, value] of Object.entries(cssVariables)) {
		cssLines.push(`  ${name}: ${String(value)};`);
	}

	cssLines.push("}");
	cssLines.push("");

	writeFileIfChanged(generatedCssPath, cssLines.join("\n"));

	return generatedCssRelativePath;
}

function normalizeModule(moduleProfile) {
	if (!moduleProfile || moduleProfile.enabled === false) {
		return null;
	}

	if (typeof moduleProfile.module !== "string" || moduleProfile.module.trim() === "") {
		throw new Error("Each enabled module must include a non-empty `module` field.");
	}

	const normalizedModule = {
		module: moduleProfile.module
	};

	if (typeof moduleProfile.position === "string" && moduleProfile.position.trim() !== "") {
		normalizedModule.position = moduleProfile.position;
	}

	if (typeof moduleProfile.header === "string" && moduleProfile.header.trim() !== "") {
		normalizedModule.header = moduleProfile.header;
	}

	if (typeof moduleProfile.classes === "string" && moduleProfile.classes.trim() !== "") {
		normalizedModule.classes = moduleProfile.classes;
	}

	if (typeof moduleProfile.configDeepMerge === "boolean") {
		normalizedModule.configDeepMerge = moduleProfile.configDeepMerge;
	}

	if (moduleProfile.config && typeof moduleProfile.config === "object" && !Array.isArray(moduleProfile.config)) {
		normalizedModule.config = cloneJsonValue(moduleProfile.config);
	}

	return normalizedModule;
}

function uniqueWatchTargets(targets) {
	return [...new Set(targets.filter((target) => typeof target === "string" && target.trim() !== ""))];
}

function buildConfig(profile, options = {}) {
	const profilePath = options.profilePath || path.resolve(__dirname, "profiles", "vps.json");
	const configPath = options.configPath || path.resolve(__dirname, "config.vps.js");
	const clean = cleanProfile(profile, { fileName: path.basename(profilePath) });
	const issues = getIssues(clean, {
		fileName: path.basename(profilePath),
		rootPath: ROOT_PATH
	});

	if (issues.length > 0) {
		const error = new Error(`Profile invalid:\n- ${issues.join("\n- ")}`);
		error.issues = issues;
		throw error;
	}

	const generatedCss = buildGeneratedCss(clean, profilePath);
	const general = {
		...GENERAL_DEFAULTS,
		...(clean.general || {})
	};
	const modules = Array.isArray(clean.modules)
		? clean.modules.map(normalizeModule).filter(Boolean)
		: [];
	const watchTargets = uniqueWatchTargets([
		toRepoRelativePath(configPath),
		"config/profile_tools.js",
		"config/builder.js",
		toRepoRelativePath(profilePath),
		toPosixPath((clean.theme && clean.theme.baseCss) || "css/mirror.vps.css"),
		"js/server.js",
		"js/server_functions.js",
		"js/admin_auth.js",
		"js/admin_routes.js",
		"js/admin_store.js",
		"web/admin/index.html",
		"web/admin/app.js",
		"web/admin/app.css",
		...(Array.isArray(options.extraWatchTargets) ? options.extraWatchTargets : []),
		...(Array.isArray(clean.watchTargets) ? clean.watchTargets : [])
	]);

	return {
		...general,
		customCss: generatedCss,
		watchTargets,
		modules
	};
}

module.exports = {
	buildConfig,
	loadProfile
};
