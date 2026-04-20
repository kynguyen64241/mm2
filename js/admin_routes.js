const path = require("node:path");
const express = require("express");
const Log = require("logger");
const { listProfiles, newProfile, readActiveFile, readProfile, saveProfile, setActive } = require("./admin_store");

function sendErr(res, statusCode, message) {
	res.status(statusCode).json({
		ok: false,
		error: message
	});
}

function regAdmin({ app, io }) {
	const adminPath = path.resolve(global.root_path, "admin");
	const router = express.Router();

	router.use(express.json({ limit: "2mb" }));

	router.get("/meta", (_req, res) => {
		res.json({
			ok: true,
			activeProfile: readActiveFile(),
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
			sendErr(res, 404, error.message);
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
			sendErr(res, 400, error.message);
		}
	});

	router.put("/profiles/:name", (req, res) => {
		try {
			res.json({
				ok: true,
				data: saveProfile(req.params.name, req.body && req.body.profile)
			});
		} catch (error) {
			sendErr(res, 400, error.message);
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
			sendErr(res, 400, error.message);
		}
	});

	router.post("/reload", (_req, res) => {
		Log.info("Yêu cầu tải lại giao diện từ trang quản trị");
		io.emit("RELOAD");
		res.json({
			ok: true
		});
	});

	app.use("/admin/api", router);
	app.use("/admin", express.static(adminPath));
}

module.exports = {
	regAdmin
};
