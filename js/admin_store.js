const fs = require("node:fs");
const path = require("node:path");
const { buildConfig } = require("../config/builder");
const { cleanProfile, getIssues } = require("../config/profile_tools");

const ROOT_PATH = path.resolve(__dirname, "..");
const PROFILE_DIR = path.resolve(ROOT_PATH, "config", "profiles");
const HISTORY_DIR = path.resolve(PROFILE_DIR, "history");
const ACTIVE_FILE = path.resolve(PROFILE_DIR, "active.txt");
const CONFIG_FILE = path.resolve(ROOT_PATH, "config", "config.vps.js");
const SAMPLE_FILE = "device.sample.json";
const MAX_SNAPS = 30;

function toPosix(filePath) {
	return filePath.split(path.sep).join("/");
}

function relPath(filePath) {
	return toPosix(path.relative(ROOT_PATH, filePath));
}

function cloneJson(data) {
	return JSON.parse(JSON.stringify(data));
}

function makeErr(message, issues = []) {
	const error = new Error(message);
	error.issues = issues;
	return error;
}

function safeName(name) {
	const rawName = String(name || "").trim();
	const safeValue = rawName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
	if (!safeValue) {
		throw new Error("Ten profile khong hop le.");
	}

	return safeValue.toLowerCase().endsWith(".json") ? safeValue : `${safeValue}.json`;
}

function safeSnapId(name) {
	const snapId = path.basename(String(name || "").trim());
	if (!snapId.toLowerCase().endsWith(".json")) {
		throw new Error("Snapshot khong hop le.");
	}

	return snapId;
}

function getPath(name) {
	return path.resolve(PROFILE_DIR, safeName(name));
}

function getSnapDir(fileName) {
	return path.resolve(HISTORY_DIR, path.basename(fileName, ".json"));
}

function getSnapPath(fileName, snapId) {
	return path.resolve(getSnapDir(fileName), safeSnapId(snapId));
}

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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
		throw new Error("Profile dang chon khong ton tai.");
	}

	fs.writeFileSync(ACTIVE_FILE, `${fileName}\n`, "utf8");
	return fileName;
}

function snapStamp(date = new Date()) {
	const pad = (value, size = 2) => String(value).padStart(size, "0");

	return [
		date.getUTCFullYear(),
		pad(date.getUTCMonth() + 1),
		pad(date.getUTCDate())
	].join("") + "-" + [
		pad(date.getUTCHours()),
		pad(date.getUTCMinutes()),
		pad(date.getUTCSeconds()),
		pad(date.getUTCMilliseconds(), 3)
	].join("");
}

function pruneSnaps(dirPath) {
	if (!fs.existsSync(dirPath)) {
		return;
	}

	const files = fs.readdirSync(dirPath)
		.filter((name) => name.toLowerCase().endsWith(".json"))
		.sort((left, right) => right.localeCompare(left));

	for (const fileName of files.slice(MAX_SNAPS)) {
		fs.unlinkSync(path.resolve(dirPath, fileName));
	}
}

function writeSnap(fileName, profile, options = {}) {
	const snapDir = getSnapDir(fileName);
	const createdAt = new Date().toISOString();
	const source = String(options.source || "save").trim() || "save";
	const note = String(options.note || "").trim();
	const snapId = `${snapStamp()}-${source}.json`;
	const snapPath = path.resolve(snapDir, snapId);
	const payload = {
		createdAt,
		fileName,
		kind: "profile-snap",
		note,
		profile: cloneJson(profile),
		snapId,
		source
	};

	writeJson(snapPath, payload);
	pruneSnaps(snapDir);

	return payload;
}

function readSnap(fileName, snapId) {
	const snapPath = getSnapPath(fileName, snapId);
	if (!fs.existsSync(snapPath)) {
		throw new Error("Khong tim thay snapshot.");
	}

	const payload = readJson(snapPath);
	if (!payload || payload.kind !== "profile-snap" || !payload.profile) {
		throw new Error("Snapshot khong hop le.");
	}

	return payload;
}

function listSnaps(name) {
	const fileName = safeName(name);
	const snapDir = getSnapDir(fileName);
	if (!fs.existsSync(snapDir)) {
		return [];
	}

	return fs.readdirSync(snapDir)
		.filter((snapId) => snapId.toLowerCase().endsWith(".json"))
		.sort((left, right) => right.localeCompare(left))
		.map((snapId) => {
			try {
				const payload = readSnap(fileName, snapId);
				return {
					createdAt: payload.createdAt,
					note: payload.note || "",
					path: relPath(path.resolve(snapDir, snapId)),
					snapId: payload.snapId,
					source: payload.source || "save"
				};
			} catch {
				return null;
			}
		})
		.filter(Boolean);
}

function checkProfile(fileName, data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		throw new Error("Du lieu profile khong hop le.");
	}

	const profile = cleanProfile(data, { fileName });
	const issues = getIssues(profile, {
		fileName,
		rootPath: ROOT_PATH
	});

	if (issues.length > 0) {
		throw makeErr("Profile khong hop le.", issues);
	}

	return profile;
}

function genCss(profilePath, profile) {
	const config = buildConfig(profile, {
		configPath: CONFIG_FILE,
		extraWatchTargets: ["config/profiles/active.txt"],
		profilePath
	});

	return config.customCss;
}

function makeMeta(fileName, profile) {
	const filePath = getPath(fileName);
	const activeFile = readActiveFile();
	const issues = getIssues(profile, {
		fileName,
		rootPath: ROOT_PATH
	});
	const moduleCount = Array.isArray(profile.modules)
		? profile.modules.filter((item) => item && item.enabled !== false).length
		: 0;
	const history = listSnaps(fileName);

	return {
		error: issues[0] || null,
		deviceId: profile.deviceId || "",
		fileName,
		generatedCss: issues.length > 0 ? null : genCss(filePath, profile),
		historyCount: history.length,
		isActive: activeFile === fileName,
		isSample: fileName === SAMPLE_FILE,
		issueCount: issues.length,
		moduleCount,
		path: relPath(filePath)
	};
}

function getMeta(fileName) {
	const filePath = getPath(fileName);
	try {
		const raw = readJson(filePath);
		const profile = cleanProfile(raw, { fileName });
		return makeMeta(fileName, profile);
	} catch (error) {
		return {
			error: error.message,
			deviceId: "",
			fileName,
			generatedCss: null,
			historyCount: 0,
			isActive: readActiveFile() === fileName,
			isSample: fileName === SAMPLE_FILE,
			issueCount: 1,
			moduleCount: 0,
			path: relPath(filePath)
		};
	}
}

function listProfiles() {
	if (!fs.existsSync(PROFILE_DIR)) {
		return [];
	}

	return fs.readdirSync(PROFILE_DIR)
		.filter((name) => name.toLowerCase().endsWith(".json"))
		.sort((left, right) => left.localeCompare(right))
		.map((name) => getMeta(name));
}

function readProfile(name) {
	const fileName = safeName(name);
	const filePath = getPath(fileName);
	if (!fs.existsSync(filePath)) {
		throw new Error("Khong tim thay profile.");
	}

	const raw = readJson(filePath);
	const profile = cleanProfile(raw, { fileName });
	const meta = makeMeta(fileName, profile);
	const issues = getIssues(profile, {
		fileName,
		rootPath: ROOT_PATH
	});

	return {
		...meta,
		history: listSnaps(fileName),
		issues,
		profile
	};
}

function newProfile(name, copyFrom = SAMPLE_FILE) {
	const fileName = safeName(name);
	const filePath = getPath(fileName);
	if (fs.existsSync(filePath)) {
		throw new Error("Profile da ton tai.");
	}

	const sourcePath = getPath(copyFrom);
	if (!fs.existsSync(sourcePath)) {
		throw new Error("Khong tim thay profile mau de sao chep.");
	}

	const profile = checkProfile(fileName, readJson(sourcePath));
	const baseName = path.basename(fileName, ".json");

	profile.deviceId = baseName;
	profile.theme = profile.theme || {};
	profile.theme.outputFile = `${baseName}.css`;

	writeJson(filePath, profile);
	writeSnap(fileName, profile, {
		note: "Initial profile",
		source: "create"
	});

	return readProfile(fileName);
}

function saveProfile(name, data, note = "") {
	const fileName = safeName(name);
	const filePath = getPath(fileName);
	const profile = checkProfile(fileName, data);

	writeJson(filePath, profile);
	writeSnap(fileName, profile, {
		note: String(note || "").trim(),
		source: "save"
	});

	return readProfile(fileName);
}

function restoreSnap(name, snapId) {
	const fileName = safeName(name);
	const filePath = getPath(fileName);
	if (!fs.existsSync(filePath)) {
		throw new Error("Khong tim thay profile.");
	}

	const current = cleanProfile(readJson(filePath), { fileName });
	writeSnap(fileName, current, {
		note: `Before restore ${snapId}`,
		source: "backup"
	});

	const payload = readSnap(fileName, snapId);
	const profile = checkProfile(fileName, payload.profile);

	writeJson(filePath, profile);
	writeSnap(fileName, profile, {
		note: `Restore from ${snapId}`,
		source: "restore"
	});

	return readProfile(fileName);
}

module.exports = {
	listProfiles,
	newProfile,
	readActiveFile,
	readProfile,
	restoreSnap,
	saveProfile,
	setActive
};
