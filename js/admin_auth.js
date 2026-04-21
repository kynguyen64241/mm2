const crypto = require("node:crypto");

function getAuth() {
	const user = String(process.env.MM_ADMIN_USER || "").trim();
	const pass = String(process.env.MM_ADMIN_PASS || "").trim();

	return {
		enabled: Boolean(user && pass),
		pass,
		realm: String(process.env.MM_ADMIN_REALM || "MagicMirror Admin").trim() || "MagicMirror Admin",
		user
	};
}

function sameText(left, right) {
	const leftBuf = Buffer.from(String(left || ""), "utf8");
	const rightBuf = Buffer.from(String(right || ""), "utf8");

	if (leftBuf.length !== rightBuf.length) {
		return false;
	}

	return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function readBasic(header) {
	if (!header || typeof header !== "string" || !header.startsWith("Basic ")) {
		return null;
	}

	try {
		const raw = Buffer.from(header.slice(6), "base64").toString("utf8");
		const cut = raw.indexOf(":");
		if (cut < 0) {
			return null;
		}

		return {
			pass: raw.slice(cut + 1),
			user: raw.slice(0, cut)
		};
	} catch {
		return null;
	}
}

function askLogin(res, realm) {
	res.setHeader("WWW-Authenticate", `Basic realm="${realm}", charset="UTF-8"`);
	res.status(401).send("Authentication required.");
}

function guardAdmin(req, res, next) {
	const auth = getAuth();
	if (!auth.enabled) {
		next();
		return;
	}

	const creds = readBasic(req.headers.authorization);
	if (!creds || !sameText(creds.user, auth.user) || !sameText(creds.pass, auth.pass)) {
		askLogin(res, auth.realm);
		return;
	}

	next();
}

module.exports = {
	getAuth,
	guardAdmin
};
