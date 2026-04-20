const state = {
	activeFile: "",
	currentProfile: null,
	profiles: []
};

const dom = {
	content: document.getElementById("content"),
	profileList: document.getElementById("profileList"),
	notice: document.getElementById("notice")
};

function escapeHtml(text) {
	return String(text ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}

function cloneJson(data) {
	return JSON.parse(JSON.stringify(data));
}

async function api(url, options = {}) {
	const response = await fetch(url, {
		headers: {
			"Content-Type": "application/json",
			...(options.headers || {})
		},
		...options
	});

	const data = await response.json().catch(() => ({}));
	if (!response.ok || data.ok === false) {
		throw new Error(data.error || "Có lỗi xảy ra khi gọi API.");
	}

	return data;
}

function showNotice(message, type = "is-success") {
	dom.notice.className = `notice ${type}`;
	dom.notice.textContent = message;
}

function clearNotice() {
	dom.notice.className = "notice is-hidden";
	dom.notice.textContent = "";
}

function splitLines(text) {
	return String(text || "")
		.split("\n")
		.map((item) => item.trim())
		.filter(Boolean);
}

function splitCsv(text) {
	return String(text || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function toNum(text, fallback) {
	const num = Number(text);
	return Number.isFinite(num) ? num : fallback;
}

function themeRow(key = "", value = "") {
	return `
		<div class="theme-row" data-theme-row>
			<input type="text" placeholder="--ten-bien" data-theme-key value="${escapeHtml(key)}" />
			<input type="text" placeholder="Giá trị CSS" data-theme-value value="${escapeHtml(value)}" />
			<button class="btn btn-alt btn-sm" type="button" data-action="remove-theme-var">Xóa</button>
		</div>
	`;
}

function moduleCard(module = {}) {
	const configText = module.config ? JSON.stringify(module.config, null, 2) : "{}";

	return `
		<article class="module-card" data-module-card>
			<div class="module-head">
				<div class="module-title">
					<strong>${escapeHtml(module.module || "Module mới")}</strong>
					<span>${escapeHtml(module.id || "Không có id")}</span>
				</div>

				<div class="action-row">
					<label class="check">
						<input type="checkbox" data-module-enabled ${module.enabled === false ? "" : "checked"} />
						<span>Bật</span>
					</label>
					<button class="btn btn-danger btn-sm" type="button" data-action="remove-module">Xóa</button>
				</div>
			</div>

			<div class="form-grid">
				<div class="field">
					<label>Tên module</label>
					<input type="text" data-module-field="module" value="${escapeHtml(module.module || "")}" />
				</div>
				<div class="field">
					<label>Id</label>
					<input type="text" data-module-field="id" value="${escapeHtml(module.id || "")}" />
				</div>
				<div class="field">
					<label>Vị trí</label>
					<input type="text" data-module-field="position" value="${escapeHtml(module.position || "")}" />
				</div>
				<div class="field span-6">
					<label>Header</label>
					<input type="text" data-module-field="header" value="${escapeHtml(module.header || "")}" />
				</div>
				<div class="field span-6">
					<label>Classes</label>
					<input type="text" data-module-field="classes" value="${escapeHtml(module.classes || "")}" />
				</div>
				<div class="field span-12">
					<label>Config JSON</label>
					<textarea data-module-config>${escapeHtml(configText)}</textarea>
				</div>
			</div>
		</article>
	`;
}

function renderList() {
	if (!state.profiles.length) {
		dom.profileList.innerHTML = "<p class=\"meta-sm\">Chưa có profile nào.</p>";
		return;
	}

	dom.profileList.innerHTML = state.profiles.map((item) => `
		<button class="profile-item ${state.currentProfile && state.currentProfile.fileName === item.fileName ? "is-current" : ""}" type="button" data-action="open-profile" data-file="${escapeHtml(item.fileName)}">
			<span class="profile-name">${escapeHtml(item.fileName)}</span>
			<span class="profile-meta">${escapeHtml(item.deviceId || "Chưa có deviceId")}</span>
			<div class="item-foot">
				<span class="meta-sm">${item.moduleCount} module đang bật</span>
				<div>
					${item.isActive ? "<span class=\"badge badge-ok\">Đang dùng</span>" : ""}
					${item.error ? "<span class=\"badge badge-danger\">Có lỗi</span>" : ""}
				</div>
			</div>
		</button>
	`).join("");
}

function renderEmpty() {
	dom.content.innerHTML = `
		<section class="card empty">
			<div>
				<p class="kicker">Sẵn sàng cấu hình</p>
				<h2>Chọn một profile để bắt đầu</h2>
				<p>Trang này giúp bạn quản lý từng gương bằng website thay vì sửa tay nhiều file config.</p>
			</div>
		</section>
	`;
}

function renderProfile() {
	if (!state.currentProfile) {
		renderEmpty();
		return;
	}

	const data = state.currentProfile.profile;
	const general = data.general || {};
	const theme = data.theme || {};
	const vars = theme.variables || {};
	const modules = Array.isArray(data.modules) ? data.modules : [];
	const watchTargets = Array.isArray(data.watchTargets) ? data.watchTargets : [];
	const logLevel = Array.isArray(general.logLevel) ? general.logLevel.join(", ") : "";
	const ipWhitelist = Array.isArray(general.ipWhitelist) ? general.ipWhitelist.join("\n") : "";
	const themeRows = Object.entries(vars).length
		? Object.entries(vars).map(([key, value]) => themeRow(key, value)).join("")
		: themeRow("--color-text", "#ffffff");
	const moduleCards = modules.length
		? modules.map((module) => moduleCard(module)).join("")
		: moduleCard({ enabled: true, module: "", id: "" });

	dom.content.innerHTML = `
		<div class="profile-view">
			<section class="card">
				<div class="overview">
					<div>
						<p class="kicker">Profile hiện tại</p>
						<div class="profile-head">
							<h2>${escapeHtml(state.currentProfile.fileName)}</h2>
							${state.currentProfile.isActive ? "<span class=\"badge badge-ok\">Đang dùng trên gương</span>" : "<span class=\"badge\">Chưa kích hoạt</span>"}
						</div>
						<p class="lead">File: <code>${escapeHtml(state.currentProfile.path)}</code><br />CSS sinh ra: <code>${escapeHtml(state.currentProfile.generatedCss || "Chưa có")}</code></p>
					</div>

					<div class="stats">
						<div class="stat">
							<span class="stat-value">${modules.filter((item) => item.enabled !== false).length}</span>
							<span class="stat-label">Module đang bật</span>
						</div>
						<div class="stat">
							<span class="stat-value">${Object.keys(vars).length}</span>
							<span class="stat-label">Biến theme</span>
						</div>
						<div class="stat">
							<span class="stat-value">${escapeHtml(data.deviceId || "...")}</span>
							<span class="stat-label">Device ID</span>
						</div>
					</div>
				</div>

				<div class="action-row">
					<button class="btn" type="button" data-action="set-active">Đặt làm profile đang dùng</button>
					<button class="btn btn-alt" type="button" data-action="clone-profile">Nhân bản profile này</button>
				</div>
			</section>

			<section class="card section-block">
				<div>
					<p class="kicker">Thông tin chung</p>
					<h3>Cấu hình lõi</h3>
				</div>

				<div class="form-grid">
					<div class="field">
						<label>Device ID</label>
						<input id="deviceId" type="text" value="${escapeHtml(data.deviceId || "")}" />
					</div>
					<div class="field">
						<label>Ngôn ngữ</label>
						<input id="language" type="text" value="${escapeHtml(general.language || "")}" />
					</div>
					<div class="field">
						<label>Locale</label>
						<input id="locale" type="text" value="${escapeHtml(general.locale || "")}" />
					</div>
					<div class="field">
						<label>Address</label>
						<input id="address" type="text" value="${escapeHtml(general.address || "")}" />
					</div>
					<div class="field">
						<label>Port</label>
						<input id="port" type="number" value="${escapeHtml(general.port || 8080)}" />
					</div>
					<div class="field">
						<label>Base path</label>
						<input id="basePath" type="text" value="${escapeHtml(general.basePath || "/")}" />
					</div>
					<div class="field">
						<label>Time format</label>
						<select id="timeFormat">
							<option value="12" ${String(general.timeFormat) === "12" ? "selected" : ""}>12 giờ</option>
							<option value="24" ${String(general.timeFormat) !== "12" ? "selected" : ""}>24 giờ</option>
						</select>
					</div>
					<div class="field">
						<label>Units</label>
						<select id="units">
							<option value="metric" ${general.units === "metric" ? "selected" : ""}>Metric</option>
							<option value="imperial" ${general.units === "imperial" ? "selected" : ""}>Imperial</option>
						</select>
					</div>
					<div class="field">
						<label>HTTPS</label>
						<select id="useHttps">
							<option value="false" ${general.useHttps ? "" : "selected"}>Tắt</option>
							<option value="true" ${general.useHttps ? "selected" : ""}>Bật</option>
						</select>
					</div>
					<div class="field span-6">
						<label>HTTPS private key</label>
						<input id="httpsPrivateKey" type="text" value="${escapeHtml(general.httpsPrivateKey || "")}" />
					</div>
					<div class="field span-6">
						<label>HTTPS certificate</label>
						<input id="httpsCertificate" type="text" value="${escapeHtml(general.httpsCertificate || "")}" />
					</div>
					<div class="field span-6">
						<label>IP whitelist, mỗi dòng một giá trị</label>
						<textarea id="ipWhitelist">${escapeHtml(ipWhitelist)}</textarea>
					</div>
					<div class="field span-6">
						<label>Log level, cách nhau bằng dấu phẩy</label>
						<input id="logLevel" type="text" value="${escapeHtml(logLevel)}" />
					</div>
					<div class="field span-12">
						<label>Watch targets bổ sung, mỗi dòng một file</label>
						<textarea id="watchTargets">${escapeHtml(watchTargets.join("\n"))}</textarea>
					</div>
				</div>
			</section>

			<section class="card section-block">
				<div class="card-head">
					<div>
						<p class="kicker">Theme</p>
						<h3>Biến giao diện</h3>
					</div>
					<button class="btn btn-alt btn-sm" type="button" data-action="add-theme-var">Thêm biến</button>
				</div>

				<div class="form-grid">
					<div class="field span-6">
						<label>CSS gốc</label>
						<input id="baseCss" type="text" value="${escapeHtml(theme.baseCss || "css/mirror.vps.css")}" />
					</div>
					<div class="field span-6">
						<label>File CSS sinh ra</label>
						<input id="outputFile" type="text" value="${escapeHtml(theme.outputFile || "")}" />
					</div>
				</div>

				<div id="themeList" class="theme-list">
					${themeRows}
				</div>
			</section>

			<section class="card section-block">
				<div class="card-head">
					<div>
						<p class="kicker">Modules</p>
						<h3>Bật tắt và cấu hình từng khối</h3>
					</div>
					<button class="btn btn-alt btn-sm" type="button" data-action="add-module">Thêm module</button>
				</div>

				<div id="moduleList" class="module-list">
					${moduleCards}
				</div>
			</section>
		</div>
	`;
}

function renderApp() {
	renderList();
	renderProfile();
}

async function loadMeta(keepFile = "") {
	const data = await api("/admin/api/meta");
	state.activeFile = data.activeProfile;
	state.profiles = data.profiles || [];

	const fileToOpen = keepFile || (state.currentProfile && state.currentProfile.fileName) || state.activeFile || (state.profiles[0] && state.profiles[0].fileName);
	renderList();

	if (fileToOpen) {
		await openProfile(fileToOpen, true);
	} else {
		renderEmpty();
	}
}

async function openProfile(fileName, silent = false) {
	const data = await api(`/admin/api/profiles/${encodeURIComponent(fileName)}`);
	state.currentProfile = data.data;
	renderApp();
	if (!silent) {
		clearNotice();
	}
}

function addThemeRow() {
	const themeList = document.getElementById("themeList");
	if (!themeList) {
		return;
	}

	themeList.insertAdjacentHTML("beforeend", themeRow());
}

function addModuleCard() {
	const moduleList = document.getElementById("moduleList");
	if (!moduleList) {
		return;
	}

	moduleList.insertAdjacentHTML("beforeend", moduleCard({
		config: {},
		enabled: true,
		id: "",
		module: ""
	}));
}

function readThemeVars() {
	const rows = [...document.querySelectorAll("[data-theme-row]")];
	const variables = {};

	for (const row of rows) {
		const key = row.querySelector("[data-theme-key]").value.trim();
		const value = row.querySelector("[data-theme-value]").value.trim();

		if (!key && !value) {
			continue;
		}

		if (!key || !value) {
			throw new Error("Mỗi biến theme cần đủ tên và giá trị.");
		}

		variables[key] = value;
	}

	return variables;
}

function readModules() {
	const cards = [...document.querySelectorAll("[data-module-card]")];

	return cards.map((card) => {
		const configText = card.querySelector("[data-module-config]").value.trim();
		let config = {};

		try {
			config = configText ? JSON.parse(configText) : {};
		} catch {
			throw new Error("Có module có Config JSON chưa đúng định dạng.");
		}

		const module = {
			enabled: card.querySelector("[data-module-enabled]").checked,
			module: card.querySelector("[data-module-field=\"module\"]").value.trim()
		};

		const id = card.querySelector("[data-module-field=\"id\"]").value.trim();
		const position = card.querySelector("[data-module-field=\"position\"]").value.trim();
		const header = card.querySelector("[data-module-field=\"header\"]").value.trim();
		const classes = card.querySelector("[data-module-field=\"classes\"]").value.trim();

		if (id) {
			module.id = id;
		}
		if (position) {
			module.position = position;
		}
		if (header) {
			module.header = header;
		}
		if (classes) {
			module.classes = classes;
		}
		if (config && typeof config === "object" && !Array.isArray(config) && Object.keys(config).length > 0) {
			module.config = config;
		}

		return module;
	}).filter((module) => module.module);
}

function readProfileForm() {
	if (!state.currentProfile) {
		throw new Error("Chưa có profile nào được mở.");
	}

	const profile = cloneJson(state.currentProfile.profile);
	profile.deviceId = document.getElementById("deviceId").value.trim();
	profile.general = profile.general || {};
	profile.theme = profile.theme || {};

	profile.general.address = document.getElementById("address").value.trim();
	profile.general.basePath = document.getElementById("basePath").value.trim() || "/";
	profile.general.port = toNum(document.getElementById("port").value, 8080);
	profile.general.language = document.getElementById("language").value.trim() || "vi";
	profile.general.locale = document.getElementById("locale").value.trim() || "vi-VN";
	profile.general.timeFormat = toNum(document.getElementById("timeFormat").value, 24);
	profile.general.units = document.getElementById("units").value;
	profile.general.useHttps = document.getElementById("useHttps").value === "true";
	profile.general.httpsPrivateKey = document.getElementById("httpsPrivateKey").value.trim();
	profile.general.httpsCertificate = document.getElementById("httpsCertificate").value.trim();
	profile.general.ipWhitelist = splitLines(document.getElementById("ipWhitelist").value);
	profile.general.logLevel = splitCsv(document.getElementById("logLevel").value);

	profile.theme.baseCss = document.getElementById("baseCss").value.trim() || "css/mirror.vps.css";
	profile.theme.outputFile = document.getElementById("outputFile").value.trim();
	profile.theme.variables = readThemeVars();

	profile.watchTargets = splitLines(document.getElementById("watchTargets").value);
	profile.modules = readModules();

	return profile;
}

async function saveProfile() {
	const fileName = state.currentProfile && state.currentProfile.fileName;
	if (!fileName) {
		throw new Error("Chưa có profile để lưu.");
	}

	const profile = readProfileForm();
	const data = await api(`/admin/api/profiles/${encodeURIComponent(fileName)}`, {
		body: JSON.stringify({ profile }),
		method: "PUT"
	});

	state.currentProfile = data.data;
	await loadMeta(fileName);
	showNotice("Đã lưu profile thành công. Nếu đang chạy bằng server:watch thì gương sẽ tự cập nhật.", "is-success");
}

async function setActive() {
	const fileName = state.currentProfile && state.currentProfile.fileName;
	if (!fileName) {
		throw new Error("Chưa có profile để kích hoạt.");
	}

	await api(`/admin/api/profiles/${encodeURIComponent(fileName)}/active`, {
		method: "POST"
	});

	await loadMeta(fileName);
	showNotice("Đã đặt profile này làm profile đang dùng. Nếu đang chạy server:watch, gương sẽ tự nạp lại.", "is-success");
}

async function reloadUi() {
	await api("/admin/api/reload", {
		method: "POST"
	});

	showNotice("Đã gửi lệnh tải lại giao diện tới các client đang kết nối.", "is-success");
}

async function newProfile(copyFrom = "") {
	const defaultName = state.currentProfile ? state.currentProfile.fileName.replace(".json", "-copy.json") : "thiet-bi-moi.json";
	const name = window.prompt("Nhập tên file profile mới", defaultName);

	if (!name) {
		return;
	}

	const data = await api("/admin/api/profiles", {
		body: JSON.stringify({
			copyFrom: copyFrom || (state.currentProfile ? state.currentProfile.fileName : "device.sample.json"),
			fileName: name
		}),
		method: "POST"
	});

	await loadMeta(data.data.fileName);
	showNotice("Đã tạo profile mới từ bản mẫu hiện có.", "is-success");
}

document.addEventListener("click", async (event) => {
	const button = event.target.closest("[data-action]");
	if (!button) {
		return;
	}

	try {
		switch (button.dataset.action) {
			case "open-profile":
				await openProfile(button.dataset.file);
				break;
			case "new-profile":
				await newProfile();
				break;
			case "clone-profile":
				await newProfile(state.currentProfile && state.currentProfile.fileName);
				break;
			case "save-profile":
				await saveProfile();
				break;
			case "set-active":
				await setActive();
				break;
			case "reload-ui":
				await reloadUi();
				break;
			case "add-theme-var":
				addThemeRow();
				break;
			case "remove-theme-var":
				button.closest("[data-theme-row]").remove();
				break;
			case "add-module":
				addModuleCard();
				break;
			case "remove-module":
				button.closest("[data-module-card]").remove();
				break;
			default:
				break;
		}
	} catch (error) {
		showNotice(error.message, "is-error");
	}
});

async function boot() {
	try {
		await loadMeta();
		clearNotice();
	} catch (error) {
		showNotice(error.message, "is-error");
	}
}

boot();
