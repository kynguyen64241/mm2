const fs = require("node:fs");
const path = require("node:path");

const ROOT_PATH = path.resolve(__dirname, "..");

const POSITIONS = [
	"fullscreen_below",
	"top_bar",
	"top_left",
	"top_center",
	"top_right",
	"upper_third",
	"middle_center",
	"lower_third",
	"bottom_bar",
	"bottom_left",
	"bottom_center",
	"bottom_right",
	"fullscreen_above"
];

const GENERAL_DEFAULTS = {
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

const THEME_VARS = {
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

function cloneJson(value) {
	return JSON.parse(JSON.stringify(value));
}

function isObj(value) {
	return value && typeof value === "object" && !Array.isArray(value);
}

function asText(value, fallback = "") {
	return typeof value === "string" ? value.trim() : fallback;
}

function asList(value) {
	return Array.isArray(value)
		? value.map((item) => String(item || "").trim()).filter(Boolean)
		: [];
}

function asVars(value) {
	if (!isObj(value)) {
		return {};
	}

	const vars = {};
	for (const [key, item] of Object.entries(value)) {
		const name = String(key || "").trim();
		const cssValue = String(item ?? "").trim();
		if (!name || !cssValue) {
			continue;
		}

		vars[name] = cssValue;
	}

	return vars;
}

function cleanModule(value) {
	const raw = isObj(value) ? cloneJson(value) : {};
	const item = { ...raw };

	item.enabled = raw.enabled !== false;
	item.module = asText(raw.module);

	for (const key of ["id", "position", "header", "classes"]) {
		const text = asText(raw[key]);
		if (text) {
			item[key] = text;
		} else {
			delete item[key];
		}
	}

	if (typeof raw.configDeepMerge === "boolean") {
		item.configDeepMerge = raw.configDeepMerge;
	} else {
		delete item.configDeepMerge;
	}

	if (isObj(raw.config)) {
		item.config = cloneJson(raw.config);
	} else {
		delete item.config;
	}

	return item;
}

function cleanProfile(value, options = {}) {
	const fileBase = String(options.fileName || "device").replace(/\.json$/i, "").trim() || "device";
	const raw = isObj(value) ? cloneJson(value) : {};
	const rawGeneral = isObj(raw.general) ? cloneJson(raw.general) : {};
	const rawTheme = isObj(raw.theme) ? cloneJson(raw.theme) : {};
	const clean = { ...raw };
	const deviceId = asText(raw.deviceId, fileBase) || fileBase;

	clean.deviceId = deviceId;
	clean.general = {
		...GENERAL_DEFAULTS,
		...rawGeneral,
		address: asText(rawGeneral.address, GENERAL_DEFAULTS.address) || GENERAL_DEFAULTS.address,
		basePath: asText(rawGeneral.basePath, GENERAL_DEFAULTS.basePath) || GENERAL_DEFAULTS.basePath,
		httpsPrivateKey: asText(rawGeneral.httpsPrivateKey),
		httpsCertificate: asText(rawGeneral.httpsCertificate),
		language: asText(rawGeneral.language, GENERAL_DEFAULTS.language) || GENERAL_DEFAULTS.language,
		locale: asText(rawGeneral.locale, GENERAL_DEFAULTS.locale) || GENERAL_DEFAULTS.locale,
		ipWhitelist: asList(rawGeneral.ipWhitelist),
		logLevel: asList(rawGeneral.logLevel),
		useHttps: Boolean(rawGeneral.useHttps)
	};

	if (rawGeneral.port !== undefined) {
		clean.general.port = rawGeneral.port;
	}
	if (rawGeneral.timeFormat !== undefined) {
		clean.general.timeFormat = rawGeneral.timeFormat;
	}
	if (rawGeneral.units !== undefined) {
		clean.general.units = rawGeneral.units;
	}

	clean.theme = {
		...rawTheme,
		baseCss: asText(rawTheme.baseCss, "css/mirror.vps.css") || "css/mirror.vps.css",
		outputFile: asText(rawTheme.outputFile, `${deviceId}.css`) || `${deviceId}.css`,
		variables: asVars(rawTheme.variables)
	};

	if (!clean.theme.outputFile.toLowerCase().endsWith(".css")) {
		clean.theme.outputFile = `${clean.theme.outputFile}.css`;
	}

	clean.modules = Array.isArray(raw.modules)
		? raw.modules.map(cleanModule)
		: [];
	clean.watchTargets = asList(raw.watchTargets);

	return clean;
}

function pushIssue(list, field, message) {
	list.push(field ? `${field}: ${message}` : message);
}

function isNum(value) {
	return typeof value === "number" && Number.isFinite(value);
}

function checkClock(config, field, issues) {
	if (config.displaySeconds !== undefined && typeof config.displaySeconds !== "boolean") {
		pushIssue(issues, field, "`displaySeconds` phai la boolean.");
	}
	if (config.clockBold !== undefined && typeof config.clockBold !== "boolean") {
		pushIssue(issues, field, "`clockBold` phai la boolean.");
	}
	if (config.dateFormat !== undefined && typeof config.dateFormat !== "string") {
		pushIssue(issues, field, "`dateFormat` phai la chuoi.");
	}
}

function checkWeather(config, field, issues) {
	const type = asText(config.type);
	if (!type) {
		pushIssue(issues, field, "module weather can `type`.");
	} else if (!["current", "forecast", "hourly"].includes(type)) {
		pushIssue(issues, field, "`type` chi ho tro current, forecast hoac hourly.");
	}

	if (!asText(config.weatherProvider)) {
		pushIssue(issues, field, "module weather can `weatherProvider`.");
	}
	if (!isNum(config.lat)) {
		pushIssue(issues, field, "`lat` phai la so.");
	}
	if (!isNum(config.lon)) {
		pushIssue(issues, field, "`lon` phai la so.");
	}
	if (config.maxNumberOfDays !== undefined && (!isNum(config.maxNumberOfDays) || config.maxNumberOfDays <= 0)) {
		pushIssue(issues, field, "`maxNumberOfDays` phai lon hon 0.");
	}
}

function checkNews(config, field, issues) {
	if (!Array.isArray(config.feeds) || config.feeds.length === 0) {
		pushIssue(issues, field, "module newsfeed can it nhat 1 feed.");
		return;
	}

	config.feeds.forEach((feed, index) => {
		if (!isObj(feed)) {
			pushIssue(issues, `${field}.feeds[${index}]`, "feed phai la object.");
			return;
		}
		if (!asText(feed.url)) {
			pushIssue(issues, `${field}.feeds[${index}]`, "feed can `url`.");
		}
	});

	if (config.maxNewsItems !== undefined && (!isNum(config.maxNewsItems) || config.maxNewsItems <= 0)) {
		pushIssue(issues, field, "`maxNewsItems` phai lon hon 0.");
	}
}

function checkCompliments(config, field, issues) {
	if (config.updateInterval !== undefined && (!isNum(config.updateInterval) || config.updateInterval <= 0)) {
		pushIssue(issues, field, "`updateInterval` phai lon hon 0.");
	}
	if (config.fadeSpeed !== undefined && (!isNum(config.fadeSpeed) || config.fadeSpeed < 0)) {
		pushIssue(issues, field, "`fadeSpeed` khong duoc am.");
	}

	if (config.compliments === undefined) {
		pushIssue(issues, field, "module compliments can `compliments`.");
		return;
	}

	if (Array.isArray(config.compliments)) {
		if (config.compliments.length === 0) {
			pushIssue(issues, field, "`compliments` khong duoc rong.");
		}
		return;
	}

	if (!isObj(config.compliments)) {
		pushIssue(issues, field, "`compliments` phai la array hoac object.");
		return;
	}

	const groups = Object.entries(config.compliments);
	if (groups.length === 0) {
		pushIssue(issues, field, "`compliments` khong duoc rong.");
	}

	for (const [key, items] of groups) {
		if (!Array.isArray(items) || items.length === 0) {
			pushIssue(issues, `${field}.compliments.${key}`, "moi nhom phai la array co noi dung.");
		}
	}
}

function checkCalendar(config, field, issues) {
	if (!Array.isArray(config.calendars) || config.calendars.length === 0) {
		pushIssue(issues, field, "module calendar can it nhat 1 calendar.");
		return;
	}

	config.calendars.forEach((item, index) => {
		if (!isObj(item)) {
			pushIssue(issues, `${field}.calendars[${index}]`, "calendar phai la object.");
			return;
		}
		if (!asText(item.url)) {
			pushIssue(issues, `${field}.calendars[${index}]`, "calendar can `url`.");
		}
	});
}

function getIssues(profile, options = {}) {
	const issues = [];
	const rootPath = options.rootPath || ROOT_PATH;
	const fileName = options.fileName || `${profile.deviceId || "device"}.json`;

	if (!asText(profile.deviceId)) {
		pushIssue(issues, "deviceId", "khong duoc de trong.");
	}

	const general = isObj(profile.general) ? profile.general : {};
	if (!asText(general.address)) {
		pushIssue(issues, "general.address", "khong duoc de trong.");
	}

	if (!Number.isInteger(Number(general.port)) || Number(general.port) < 1 || Number(general.port) > 65535) {
		pushIssue(issues, "general.port", "phai la so nguyen trong khoang 1..65535.");
	}

	if (!asText(general.basePath).startsWith("/")) {
		pushIssue(issues, "general.basePath", "phai bat dau bang `/`.");
	}

	if (![12, 24].includes(Number(general.timeFormat))) {
		pushIssue(issues, "general.timeFormat", "chi ho tro 12 hoac 24.");
	}

	if (!["metric", "imperial"].includes(String(general.units))) {
		pushIssue(issues, "general.units", "chi ho tro metric hoac imperial.");
	}

	if (general.useHttps) {
		if (!asText(general.httpsPrivateKey)) {
			pushIssue(issues, "general.httpsPrivateKey", "bat buoc khi dung HTTPS.");
		}
		if (!asText(general.httpsCertificate)) {
			pushIssue(issues, "general.httpsCertificate", "bat buoc khi dung HTTPS.");
		}
	}

	const theme = isObj(profile.theme) ? profile.theme : {};
	const baseCss = asText(theme.baseCss, "css/mirror.vps.css");
	if (!baseCss) {
		pushIssue(issues, "theme.baseCss", "khong duoc de trong.");
	} else {
		const cssPath = path.isAbsolute(baseCss)
			? baseCss
			: path.resolve(rootPath, baseCss);
		if (!fs.existsSync(cssPath)) {
			pushIssue(issues, "theme.baseCss", `khong tim thay file CSS goc cho ${fileName}.`);
		}
	}

	if (!asText(theme.outputFile).toLowerCase().endsWith(".css")) {
		pushIssue(issues, "theme.outputFile", "phai ket thuc bang `.css`.");
	}

	for (const key of Object.keys(theme.variables || {})) {
		if (!key.startsWith("--")) {
			pushIssue(issues, `theme.variables.${key}`, "ten bien CSS phai bat dau bang `--`.");
		}
	}

	const ids = new Set();
	const modules = Array.isArray(profile.modules) ? profile.modules : [];
	modules.forEach((item, index) => {
		const field = `modules[${index}]`;
		if (!isObj(item)) {
			pushIssue(issues, field, "module phai la object.");
			return;
		}

		if (item.enabled === false) {
			return;
		}

		const name = asText(item.module);
		if (!name) {
			pushIssue(issues, `${field}.module`, "khong duoc de trong.");
			return;
		}

		const id = asText(item.id);
		if (id) {
			if (ids.has(id)) {
				pushIssue(issues, `${field}.id`, "bi trung voi module khac.");
			}
			ids.add(id);
		}

		if (item.position && !POSITIONS.includes(item.position)) {
			pushIssue(issues, `${field}.position`, "khong nam trong danh sach vi tri MagicMirror.");
		}

		if (item.config !== undefined && !isObj(item.config)) {
			pushIssue(issues, `${field}.config`, "phai la object.");
			return;
		}

		const config = isObj(item.config) ? item.config : {};
		switch (name) {
			case "clock":
				checkClock(config, `${field}.config`, issues);
				break;
			case "weather":
				checkWeather(config, `${field}.config`, issues);
				break;
			case "newsfeed":
				checkNews(config, `${field}.config`, issues);
				break;
			case "compliments":
				checkCompliments(config, `${field}.config`, issues);
				break;
			case "calendar":
				checkCalendar(config, `${field}.config`, issues);
				break;
			default:
				break;
		}
	});

	return issues;
}

module.exports = {
	GENERAL_DEFAULTS,
	POSITIONS,
	THEME_VARS,
	cleanProfile,
	getIssues
};
