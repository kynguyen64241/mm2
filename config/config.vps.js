const path = require("node:path");
const { buildConfig, loadProfile } = require("./builder");

const ROOT_PATH = path.resolve(__dirname, "..");

function resolveProfilePath() {
	const requestedProfile = process.env.MM_PROFILE_FILE;

	if (!requestedProfile) {
		return path.resolve(__dirname, "profiles", "vps.json");
	}

	return path.isAbsolute(requestedProfile)
		? requestedProfile
		: path.resolve(ROOT_PATH, requestedProfile);
}

const profilePath = resolveProfilePath();
const profile = loadProfile(profilePath);

module.exports = buildConfig(profile, {
	configPath: __filename,
	profilePath
});
