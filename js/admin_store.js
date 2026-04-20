const fs = require("node:fs");
const path = require("node:path");
const { buildConfig, loadProfile } = require("../config/builder");

const ROOT_PATH = path.resolve(__dirname, "..");
const PROFILE_DIR = path.resolve(ROOT_PATH, "config", "profiles");
const ACTIVE_FILE = path.resolve(PROFILE_DIR, "active.txt");
const CONFIG_FILE = path.resolve(ROOT_PATH, "config", "config.vps.js");
const SAMPLE_FILE = "device.sample.json";

function toPosix(filePath) {
	return filePath.split(path.sep).join("/");
}

function relPath(filePath) {
	return toPosix(path.relative(ROOT_PATH, filePath));
}

function safeName(name) {
	const rawName = String(name || "").trim();
	const safeValue = rawName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
	if (!safeValue) {
		throw new Error("Tên profile không hợp lệ.");
	}

	return safeValue.toLowerCase().endsWith(".json") ? safeValue : `${safeValue}.json`;
}

function getPath(name) {
	const fileName = safeName(name);
	return path.resolve(PROFILE_DIR, fileName);
}

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function clone(data) {
	return JSON.parse(JSON.stringify(data));
}

function readActiveFile() {
	try {
		const activeName = fs.readFileSync(ACTIVE_FILE, "utf8").trim();
		return activeName || "vps.json";
	} catch {
		return "vps.json";
	}
}

function setActive(name) {
	const fileName = safeName(name);
	if (!fs.existsSync(getPath(fileName))) {
		throw new Error("Profile đang chọn không tồn tại.");
	}

	fs.writeFileSync(ACTIVE_FILE, `${fileName}\n`, "utf8");
	return fileName;
}

function genCss(profilePath, profile) {
	const config = buildConfig(profile, {
		configPath: CONFIG_FILE,
		extraWatchTargets: ["config/profiles/active.txt"],
		profilePath
	});

	return config.customCss;
}

function getMeta(fileName) {
	const filePath = getPath(fileName);
	const activeFile = readActiveFile();

	try {
		const profile = loadProfile(filePath);
		const css = genCss(filePath, profile);
		const moduleCount = Array.isArray(profile.modules)
			? profile.modules.filter((module) => module && module.enabled !== false).length
			: 0;

		return {
			error: null,
			deviceId: profile.deviceId || "",
			path: relPath(filePath),
			fileName,
			generatedCss: css,
			isActive: activeFile === fileName,
			isSample: fileName === SAMPLE_FILE,
			moduleCount
		};
	} catch (error) {
		return {
			error: error.message,
			deviceId: "",
			path: relPath(filePath),
			fileName,
			generatedCss: null,
			isActive: activeFile === fileName,
			isSample: fileName === SAMPLE_FILE,
			moduleCount: 0
		};
	}
}

function listProfiles() {
	if (!fs.existsSync(PROFILE_DIR)) {
		return [];
	}

	return fs.readdirSync(PROFILE_DIR)
		.filter((name) => name.toLowerCase().endsWith(".json"))
		.sort((a, b) => a.localeCompare(b))
		.map((name) => getMeta(name));
}

function readProfile(name) {
	const fileName = safeName(name);
	const filePath = getPath(fileName);
	if (!fs.existsSync(filePath)) {
		throw new Error("Không tìm thấy profile.");
	}

	const profile = readJson(filePath);
	const meta = getMeta(fileName);

	return {
		...meta,
		profile
	};
}

function newProfile(name, copyFrom = SAMPLE_FILE) {
	const fileName = safeName(name);
	const filePath = getPath(fileName);
	if (fs.existsSync(filePath)) {
		throw new Error("Profile đã tồn tại.");
	}

	const sourcePath = getPath(copyFrom);
	if (!fs.existsSync(sourcePath)) {
		throw new Error("Không tìm thấy profile mẫu để sao chép.");
	}

	const profile = clone(readJson(sourcePath));
	const baseName = path.basename(fileName, ".json");

	profile.deviceId = baseName;
	profile.theme = profile.theme || {};
	profile.theme.outputFile = `${baseName}.css`;

	writeJson(filePath, profile);
	return readProfile(fileName);
}

function saveProfile(name, data) {
	const fileName = safeName(name);
	const filePath = getPath(fileName);

	if (!data || typeof data !== "object" || Array.isArray(data)) {
		throw new Error("Dữ liệu profile không hợp lệ.");
	}

	const profile = clone(data);
	profile.deviceId = String(profile.deviceId || path.basename(fileName, ".json")).trim() || path.basename(fileName, ".json");
	profile.general = profile.general && typeof profile.general === "object" && !Array.isArray(profile.general) ? profile.general : {};
	profile.theme = profile.theme && typeof profile.theme === "object" && !Array.isArray(profile.theme) ? profile.theme : {};
	profile.theme.variables = profile.theme.variables && typeof profile.theme.variables === "object" && !Array.isArray(profile.theme.variables)
		? profile.theme.variables
		: {};
	profile.modules = Array.isArray(profile.modules) ? profile.modules : [];
	profile.theme.outputFile = profile.theme.outputFile || `${profile.deviceId}.css`;

	writeJson(filePath, profile);
	return readProfile(fileName);
}

module.exports = {
	listProfiles,
	newProfile,
	readActiveFile,
	readProfile,
	saveProfile,
	setActive
};
