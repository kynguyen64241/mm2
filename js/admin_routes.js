const path = require("node:path");
const express = require("express");
const Log = require("logger");
const { getAuth, guardAdmin } = require("./admin_auth");
const { listProfiles, newProfile, readActiveFile, readProfile, restoreSnap, saveProfile, setActive } = require("./admin_store");

function sendErr(res, statusCode, message) {
	res.status(statusCode).json({
		ok: false,
		error: message
	});
}

function sendFail(res, statusCode, error) {
	res.status(statusCode).json({
		error: error.message,
		issues: Array.isArray(error.issues) ? error.issues : [],
		ok: false
	});
}

function regAdmin({ app, io }) {
	const adminPath = path.resolve(global.root_path, "web", "admin");
	const router = express.Router();

	router.use(express.json({ limit: "2mb" }));

	router.get("/meta", (_req, res) => {
		res.json({
			ok: true,
			activeProfile: readActiveFile(),
			authEnabled: getAuth().enabled,
			profiles: listProfiles()
		});
	});

	router.get("/profiles/:name", (req, res) => {
		try {
			res.json({
				ok: true,
				data: readProfile(req.params.name)
			});
		} catch (error) {
			sendFail(res, 404, error);
		}
	});

	router.post("/profiles", (req, res) => {
		try {
			const fileName = req.body && req.body.fileName;
			const copyFrom = req.body && req.body.copyFrom;

			if (!fileName) {
				return sendErr(res, 400, "Thiếu tên profile.");
			}

			res.status(201).json({
				ok: true,
				data: newProfile(fileName, copyFrom)
			});
		} catch (error) {
			sendFail(res, 400, error);
		}
	});

	router.put("/profiles/:name", (req, res) => {
		try {
			res.json({
				ok: true,
				data: saveProfile(req.params.name, req.body && req.body.profile, req.body && req.body.note)
			});
		} catch (error) {
			sendFail(res, 400, error);
		}
	});

	router.post("/profiles/:name/restore", (req, res) => {
		try {
			const snapId = req.body && req.body.snapId;

			if (!snapId) {
				return sendErr(res, 400, "Thieu snapshot can restore.");
			}

			res.json({
				ok: true,
				data: restoreSnap(req.params.name, snapId)
			});
		} catch (error) {
			sendFail(res, 400, error);
		}
	});

	router.post("/profiles/:name/active", (req, res) => {
		try {
			const fileName = setActive(req.params.name);
			res.json({
				ok: true,
				activeProfile: fileName
			});
		} catch (error) {
			sendFail(res, 400, error);
		}
	});

	router.post("/reload", (_req, res) => {
		Log.info("Yêu cầu tải lại giao diện từ trang quản trị");
		io.emit("RELOAD");
		res.json({
			ok: true
		});
	});

	app.use("/admin/api", guardAdmin, router);
	app.use("/admin", guardAdmin, express.static(adminPath));
}

module.exports = {
	regAdmin
};
