const fs = require("node:fs");
const path = require("node:path");
const { buildConfig, loadProfile } = require("./builder");

const ROOT_PATH = path.resolve(__dirname, "..");
const PROFILE_DIR = path.resolve(__dirname, "profiles");
const ACTIVE_FILE = path.resolve(PROFILE_DIR, "active.txt");

function readActivePath() {
	try {
		const activeName = fs.readFileSync(ACTIVE_FILE, "utf8").trim();
		if (!activeName) {
			return null;
		}

		const filePath = path.isAbsolute(activeName) ? activeName : path.resolve(PROFILE_DIR, activeName);
		return fs.existsSync(filePath) ? filePath : null;
	} catch {
		return null;
	}
}

function resolveProfilePath() {
	const requestedProfile = process.env.MM_PROFILE_FILE;

	if (requestedProfile) {
		return path.isAbsolute(requestedProfile)
			? requestedProfile
			: path.resolve(ROOT_PATH, requestedProfile);
	}

	const activePath = readActivePath();
	if (activePath) {
		return activePath;
	}

	return path.resolve(PROFILE_DIR, "vps.json");
}

const profilePath = resolveProfilePath();
const profile = loadProfile(profilePath);

module.exports = buildConfig(profile, {
	configPath: __filename,
	extraWatchTargets: ["config/profiles/active.txt"],
	profilePath
});
