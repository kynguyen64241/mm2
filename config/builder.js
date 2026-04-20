const fs = require("node:fs");
const path = require("node:path");

const ROOT_PATH = path.resolve(__dirname, "..");

const DEFAULT_GENERAL = {
	address: "127.0.0.1",
	port: 8080,
	basePath: "/",
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],
	useHttps: false,
	httpsPrivateKey: "",
	httpsCertificate: "",
	language: "vi",
	locale: "vi-VN",
	logLevel: ["INFO", "LOG", "WARN", "ERROR"],
	timeFormat: 24,
	units: "metric"
};

const DEFAULT_THEME_VARIABLES = {
	"--color-text": "rgba(228, 217, 201, 0.78)",
	"--color-text-dimmed": "rgba(206, 193, 176, 0.42)",
	"--color-text-bright": "#f6efe6",
	"--color-background": "#050505",
	"--font-primary": "\"Roboto Condensed\"",
	"--font-secondary": "\"Roboto\"",
	"--font-size": "22px",
	"--font-size-small": "0.8rem",
	"--gap-body-top": "48px",
	"--gap-body-right": "56px",
	"--gap-body-bottom": "40px",
	"--gap-body-left": "56px",
	"--gap-modules": "28px",
	"--mirror-bg-glow-top": "rgba(198, 155, 103, 0.14)",
	"--mirror-bg-glow-bottom": "rgba(255, 255, 255, 0.05)",
	"--mirror-header-border": "rgba(255, 255, 255, 0.14)",
	"--mirror-header-text": "rgba(240, 227, 210, 0.72)",
	"--mirror-clock-date": "rgba(240, 227, 210, 0.8)",
	"--mirror-weather-text": "rgba(230, 219, 204, 0.7)",
	"--mirror-weather-icon": "rgba(241, 203, 138, 0.9)",
	"--mirror-weather-detail": "rgba(226, 213, 197, 0.65)",
	"--mirror-weather-day": "rgba(229, 216, 198, 0.6)",
	"--mirror-weather-min": "rgba(229, 216, 198, 0.55)",
	"--mirror-news-source": "rgba(229, 216, 198, 0.52)",
	"--mirror-dimmed": "rgba(229, 216, 198, 0.5)"
};

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
	return JSON.parse(fs.readFileSync(profilePath, "utf8"));
}

function buildGeneratedCss(profile, profilePath) {
	const deviceId = sanitizeFileName(profile.deviceId || path.basename(profilePath, path.extname(profilePath)));
	const theme = profile.theme || {};
	const outputFileName = sanitizeFileName(theme.outputFile || `${deviceId}.css`);
	const generatedCssRelativePath = path.posix.join("css", "generated", outputFileName);
	const generatedCssPath = path.resolve(ROOT_PATH, generatedCssRelativePath);
	const baseCssRelativePath = toPosixPath(theme.baseCss || "css/mirror.vps.css");
	const importPath = toPosixPath(path.relative(path.dirname(generatedCssPath), path.resolve(ROOT_PATH, baseCssRelativePath)));
	const cssVariables = { ...DEFAULT_THEME_VARIABLES, ...(theme.variables || {}) };
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
	const generatedCss = buildGeneratedCss(profile, profilePath);
	const general = {
		...DEFAULT_GENERAL,
		...(profile.general || {})
	};
	const modules = Array.isArray(profile.modules)
		? profile.modules.map(normalizeModule).filter(Boolean)
		: [];
	const watchTargets = uniqueWatchTargets([
		toRepoRelativePath(configPath),
		"config/builder.js",
		toRepoRelativePath(profilePath),
		toPosixPath((profile.theme && profile.theme.baseCss) || "css/mirror.vps.css"),
		...(Array.isArray(profile.watchTargets) ? profile.watchTargets : [])
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
