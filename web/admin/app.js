const POSITIONS = [
	"top_bar",
	"top_left",
	"top_center",
	"top_right",
	"upper_third",
	"middle_center",
	"lower_third",
	"bottom_left",
	"bottom_center",
	"bottom_right",
	"bottom_bar",
	"fullscreen_above",
	"fullscreen_below"
];

const MODULES = ["alert", "clock", "calendar", "compliments", "weather", "newsfeed"];

const state = {
	activeFile: "",
	authEnabled: false,
	currentProfile: null,
	profiles: []
};

const dom = {
	content: document.getElementById("content"),
	notice: document.getElementById("notice"),
	profileList: document.getElementById("profileList"),
	statusCard: document.getElementById("statusCard")
};

function escapeHtml(text) {
	return String(text ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}

function isObj(value) {
	return value && typeof value === "object" && !Array.isArray(value);
}

function cloneJson(data) {
	return JSON.parse(JSON.stringify(data));
}

function jsonText(data) {
	return JSON.stringify(data, null, 2);
}

async function api(url, options = {}) {
	const response = await fetch(url, {
		headers: {
			"Content-Type": "application/json",
			...(options.headers || {})
		},
		...options
	});

	const text = await response.text();
	let data = {};

	try {
		data = text ? JSON.parse(text) : {};
	} catch {
		data = text ? { error: text } : {};
	}

	if (!response.ok || data.ok === false) {
		const error = new Error(data.error || "Có lỗi xảy ra khi gọi API.");
		error.issues = Array.isArray(data.issues) ? data.issues : [];
		throw error;
	}

	return data;
}

function showNotice(message, type = "is-success", details = []) {
	const items = Array.isArray(details) && details.length
		? `<ul>${details.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
		: "";

	dom.notice.className = `notice ${type}`;
	dom.notice.innerHTML = `<strong>${escapeHtml(message)}</strong>${items}`;
}

function clearNotice() {
	dom.notice.className = "notice is-hidden";
	dom.notice.innerHTML = "";
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

function asText(value) {
	return String(value || "").trim();
}

function toNum(text, fallback) {
	const num = Number(text);
	return Number.isFinite(num) ? num : fallback;
}

function fmtDate(value) {
	if (!value) {
		return "Chưa rõ thời gian";
	}

	try {
		return new Date(value).toLocaleString("vi-VN");
	} catch {
		return value;
	}
}

function pruneObj(data) {
	const output = { ...data };

	for (const [key, value] of Object.entries(output)) {
		if (value === undefined || value === "") {
			delete output[key];
			continue;
		}

		if (Array.isArray(value) && value.length === 0) {
			delete output[key];
			continue;
		}

		if (isObj(value) && Object.keys(value).length === 0) {
			delete output[key];
		}
	}

	return output;
}

function opt(value, label, current) {
	return `<option value="${escapeHtml(value)}" ${String(current) === String(value) ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function posOpts(current) {
	return [
		opt("", "Không đặt vị trí", current),
		...POSITIONS.map((name) => opt(name, name, current))
	].join("");
}

function boolAttr(value) {
	return value ? "checked" : "";
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

function feedRow(feed = {}) {
	return `
		<div class="mini-row feed-row" data-feed-row>
			<input type="text" placeholder="Tên feed" data-feed-title value="${escapeHtml(feed.title || "")}" />
			<input type="text" placeholder="URL RSS" data-feed-url value="${escapeHtml(feed.url || "")}" />
			<button class="btn btn-alt btn-sm" type="button" data-action="remove-feed">Xóa</button>
		</div>
	`;
}

function calRow(item = {}) {
	return `
		<div class="mini-row cal-row" data-cal-row>
			<input type="text" placeholder="Symbol" data-cal-symbol value="${escapeHtml(item.symbol || "")}" />
			<input type="text" placeholder="ICS URL" data-cal-url value="${escapeHtml(item.url || "")}" />
			<button class="btn btn-alt btn-sm" type="button" data-action="remove-cal">Xóa</button>
		</div>
	`;
}

function omitKeys(config, keys) {
	const extra = isObj(config) ? cloneJson(config) : {};
	for (const key of keys) {
		delete extra[key];
	}

	return extra;
}

function pickCompliments(config) {
	const source = Array.isArray(config.compliments)
		? { anytime: config.compliments }
		: (isObj(config.compliments) ? config.compliments : {});

	return {
		afternoon: Array.isArray(source.afternoon) ? source.afternoon.join("\n") : "",
		anytime: Array.isArray(source.anytime) ? source.anytime.join("\n") : "",
		evening: Array.isArray(source.evening) ? source.evening.join("\n") : "",
		morning: Array.isArray(source.morning) ? source.morning.join("\n") : "",
		special: jsonText(Object.fromEntries(
			Object.entries(source).filter(([key]) => !["anytime", "morning", "afternoon", "evening"].includes(key))
		))
	};
}

function getExtra(name, config) {
	switch (name) {
		case "clock":
			return omitKeys(config, ["displaySeconds", "clockBold", "dateFormat"]);
		case "weather":
			return omitKeys(config, ["weatherProvider", "type", "lat", "lon", "showHumidity", "showUVIndex", "showSun", "fade", "maxNumberOfDays"]);
		case "newsfeed":
			return omitKeys(config, ["feeds", "showSourceTitle", "showPublishDate", "broadcastNewsFeeds", "broadcastNewsUpdates", "showDescription", "wrapTitle", "maxNewsItems"]);
		case "compliments":
			return omitKeys(config, ["updateInterval", "fadeSpeed", "morningStartTime", "morningEndTime", "afternoonStartTime", "afternoonEndTime", "compliments"]);
		case "calendar":
			return omitKeys(config, ["calendars", "maximumEntries", "maximumNumberOfDays", "broadcastEvents", "colored", "fetchInterval"]);
		default:
			return isObj(config) ? cloneJson(config) : {};
	}
}

function makeModule(kind = "") {
	switch (kind) {
		case "alert":
			return { enabled: true, id: "alert-main", module: "alert" };
		case "clock":
			return {
				enabled: true,
				id: "clock-main",
				module: "clock",
				position: "top_left",
				config: {
					clockBold: true,
					displaySeconds: false
				}
			};
		case "weather":
			return {
				enabled: true,
				id: "weather-main",
				module: "weather",
				position: "top_right",
				config: {
					lat: 10.8231,
					lon: 106.6297,
					showSun: true,
					showUVIndex: true,
					type: "current",
					weatherProvider: "openmeteo"
				}
			};
		case "newsfeed":
			return {
				enabled: true,
				id: "news-main",
				module: "newsfeed",
				position: "bottom_bar",
				config: {
					broadcastNewsFeeds: true,
					broadcastNewsUpdates: true,
					feeds: [{ title: "", url: "" }],
					maxNewsItems: 10,
					showPublishDate: true,
					showSourceTitle: true,
					wrapTitle: true
				}
			};
		case "compliments":
			return {
				enabled: true,
				id: "compliments-main",
				module: "compliments",
				position: "lower_third",
				config: {
					compliments: {
						anytime: ["Xin chào."]
					},
					fadeSpeed: 2000,
					updateInterval: 45000
				}
			};
		case "calendar":
			return {
				enabled: true,
				id: "calendar-main",
				module: "calendar",
				position: "top_left",
				config: {
					calendars: [{ symbol: "calendar-check", url: "" }]
				}
			};
		default:
			return {
				config: {},
				enabled: true,
				id: "",
				module: ""
			};
	}
}

function moduleCard(module = {}) {
	const kind = asText(module.module).toLowerCase();
	const config = isObj(module.config) ? module.config : {};
	const extra = getExtra(kind, config);
	const compliments = pickCompliments(config);
	const feeds = Array.isArray(config.feeds) && config.feeds.length ? config.feeds : [{ title: "", url: "" }];
	const calendars = Array.isArray(config.calendars) && config.calendars.length ? config.calendars : [{ symbol: "calendar-check", url: "" }];
	const badgeClass = kind ? (MODULES.includes(kind) ? "badge badge-ok" : "badge badge-warn") : "badge";

	return `
		<article class="module-card" data-module-card>
			<div class="module-head">
				<div class="module-title">
					<div class="item-foot">
						<strong data-module-name>${escapeHtml(module.module || "Module mới")}</strong>
						<span class="${badgeClass}" data-module-kind>${kind ? `Form: ${escapeHtml(kind)}` : "Chọn module"}</span>
					</div>
					<span data-module-id>${escapeHtml(module.id || "Không có id")}</span>
				</div>

				<div class="action-row">
					<label class="check">
						<input type="checkbox" data-module-enabled ${boolAttr(module.enabled !== false)} />
						<span>Bật</span>
					</label>
					<button class="btn btn-danger btn-sm" type="button" data-action="remove-module">Xóa</button>
				</div>
			</div>

			<div class="form-grid">
				<div class="field span-3">
					<label>Tên module</label>
					<input type="text" list="moduleNameList" data-module-field="module" value="${escapeHtml(module.module || "")}" />
				</div>
				<div class="field span-3">
					<label>Id</label>
					<input type="text" data-module-field="id" value="${escapeHtml(module.id || "")}" />
				</div>
				<div class="field span-3">
					<label>Vị trí</label>
					<select data-module-field="position">
						${posOpts(module.position || "")}
					</select>
				</div>
				<div class="field span-3">
					<label>Header</label>
					<input type="text" data-module-field="header" value="${escapeHtml(module.header || "")}" />
				</div>
				<div class="field span-12">
					<label>Classes</label>
					<input type="text" data-module-field="classes" value="${escapeHtml(module.classes || "")}" />
				</div>
			</div>

			<section class="module-pane" data-module-section="clock" ${kind === "clock" ? "" : "hidden"}>
				<h4>Clock</h4>
				<p class="hint">Form nhanh cho đồng hồ và định dạng ngày.</p>
				<div class="form-grid">
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-clock-seconds ${boolAttr(config.displaySeconds === true)} />
							<span>Hiện giây</span>
						</label>
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-clock-bold ${boolAttr(config.clockBold !== false)} />
							<span>Giờ đậm</span>
						</label>
					</div>
					<div class="field span-6">
						<label>Date format</label>
						<input type="text" data-clock-date value="${escapeHtml(config.dateFormat || "")}" />
					</div>
				</div>
			</section>

			<section class="module-pane" data-module-section="weather" ${kind === "weather" ? "" : "hidden"}>
				<h4>Weather</h4>
				<p class="hint">Nhập tọa độ và loại thời tiết để tránh phải sửa raw JSON.</p>
				<div class="form-grid">
					<div class="field span-3">
						<label>Provider</label>
						<input type="text" data-weather-provider value="${escapeHtml(config.weatherProvider || "openmeteo")}" />
					</div>
					<div class="field span-3">
						<label>Type</label>
						<select data-weather-type>
							${opt("current", "current", config.type || "current")}
							${opt("forecast", "forecast", config.type || "current")}
							${opt("hourly", "hourly", config.type || "current")}
						</select>
					</div>
					<div class="field span-3">
						<label>Latitude</label>
						<input type="number" step="any" data-weather-lat value="${escapeHtml(config.lat ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Longitude</label>
						<input type="number" step="any" data-weather-lon value="${escapeHtml(config.lon ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Show humidity</label>
						<input type="text" data-weather-humidity value="${escapeHtml(config.showHumidity ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Max days</label>
						<input type="number" min="1" data-weather-days value="${escapeHtml(config.maxNumberOfDays ?? "")}" />
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-weather-uv ${boolAttr(config.showUVIndex === true)} />
							<span>Hiện UV index</span>
						</label>
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-weather-sun ${boolAttr(config.showSun === true)} />
							<span>Hiện mặt trời</span>
						</label>
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-weather-fade ${boolAttr(config.fade === true)} />
							<span>Fade forecast</span>
						</label>
					</div>
				</div>
			</section>

			<section class="module-pane" data-module-section="newsfeed" ${kind === "newsfeed" ? "" : "hidden"}>
				<h4>Newsfeed</h4>
				<p class="hint">Có thể thêm nhiều RSS feed và các tùy chọn hiển thị phổ biến.</p>
				<div class="quick-row">
					<div class="card-head">
						<span class="lead-sm">Danh sách feed</span>
						<button class="btn btn-alt btn-sm" type="button" data-action="add-feed">Thêm feed</button>
					</div>
					<div class="theme-list" data-feed-list>
						${feeds.map((feed) => feedRow(feed)).join("")}
					</div>
				</div>
				<div class="form-grid">
					<div class="field span-3">
						<label>Max news</label>
						<input type="number" min="1" data-news-max value="${escapeHtml(config.maxNewsItems ?? "")}" />
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-news-source ${boolAttr(config.showSourceTitle !== false)} />
							<span>Hiện nguồn</span>
						</label>
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-news-date ${boolAttr(config.showPublishDate === true)} />
							<span>Hiện ngày đăng</span>
						</label>
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-news-desc ${boolAttr(config.showDescription === true)} />
							<span>Hiện mô tả</span>
						</label>
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-news-wrap ${boolAttr(config.wrapTitle === true)} />
							<span>Wrap title</span>
						</label>
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-news-broadcast-feed ${boolAttr(config.broadcastNewsFeeds === true)} />
							<span>Broadcast feeds</span>
						</label>
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-news-broadcast-update ${boolAttr(config.broadcastNewsUpdates === true)} />
							<span>Broadcast updates</span>
						</label>
					</div>
				</div>
			</section>

			<section class="module-pane" data-module-section="compliments" ${kind === "compliments" ? "" : "hidden"}>
				<h4>Compliments</h4>
				<p class="hint">Mỗi dòng là một câu. Các ngày đặc biệt dùng JSON object với key là ngày.</p>
				<div class="form-grid">
					<div class="field span-3">
						<label>Update interval</label>
						<input type="number" min="1" data-comp-update value="${escapeHtml(config.updateInterval ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Fade speed</label>
						<input type="number" min="0" data-comp-fade value="${escapeHtml(config.fadeSpeed ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Morning start</label>
						<input type="number" min="0" max="24" data-comp-morning-start value="${escapeHtml(config.morningStartTime ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Morning end</label>
						<input type="number" min="0" max="24" data-comp-morning-end value="${escapeHtml(config.morningEndTime ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Afternoon start</label>
						<input type="number" min="0" max="24" data-comp-afternoon-start value="${escapeHtml(config.afternoonStartTime ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Afternoon end</label>
						<input type="number" min="0" max="24" data-comp-afternoon-end value="${escapeHtml(config.afternoonEndTime ?? "")}" />
					</div>
					<div class="field span-6">
						<label>Anytime</label>
						<textarea data-comp-anytime>${escapeHtml(compliments.anytime)}</textarea>
					</div>
					<div class="field span-6">
						<label>Morning</label>
						<textarea data-comp-morning>${escapeHtml(compliments.morning)}</textarea>
					</div>
					<div class="field span-6">
						<label>Afternoon</label>
						<textarea data-comp-afternoon>${escapeHtml(compliments.afternoon)}</textarea>
					</div>
					<div class="field span-6">
						<label>Evening</label>
						<textarea data-comp-evening>${escapeHtml(compliments.evening)}</textarea>
					</div>
					<div class="field span-12">
						<label>Ngày đặc biệt (JSON)</label>
						<textarea data-comp-special>${escapeHtml(compliments.special)}</textarea>
					</div>
				</div>
			</section>

			<section class="module-pane" data-module-section="calendar" ${kind === "calendar" ? "" : "hidden"}>
				<h4>Calendar</h4>
				<p class="hint">Mỗi lịch cần ít nhất một URL công khai dạng ICS.</p>
				<div class="quick-row">
					<div class="card-head">
						<span class="lead-sm">Danh sách calendar</span>
						<button class="btn btn-alt btn-sm" type="button" data-action="add-cal">Thêm calendar</button>
					</div>
					<div class="theme-list" data-cal-list>
						${calendars.map((item) => calRow(item)).join("")}
					</div>
				</div>
				<div class="form-grid">
					<div class="field span-3">
						<label>Maximum entries</label>
						<input type="number" min="1" data-cal-max value="${escapeHtml(config.maximumEntries ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Maximum days</label>
						<input type="number" min="1" data-cal-days value="${escapeHtml(config.maximumNumberOfDays ?? "")}" />
					</div>
					<div class="field span-3">
						<label>Fetch interval</label>
						<input type="number" min="1" data-cal-fetch value="${escapeHtml(config.fetchInterval ?? "")}" />
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-cal-broadcast ${boolAttr(config.broadcastEvents === true)} />
							<span>Broadcast events</span>
						</label>
					</div>
					<div class="field span-3">
						<label class="check">
							<input type="checkbox" data-cal-colored ${boolAttr(config.colored === true)} />
							<span>Colored</span>
						</label>
					</div>
				</div>
			</section>

			<p class="module-note" data-module-unknown ${MODULES.includes(kind) || !kind ? "hidden" : ""}>Module này chưa có form riêng. Bạn vẫn có thể lưu bằng phần Advanced JSON bên dưới.</p>

			<details class="advanced-box">
				<summary>Advanced JSON</summary>
				<p class="hint">Dùng để giữ các key nâng cao không có sẵn trên form. Form nhanh sẽ ưu tiên ghi đè các key phổ biến.</p>
				<textarea data-module-extra>${escapeHtml(jsonText(extra))}</textarea>
			</details>
		</article>
	`;
}

function renderStatus() {
	dom.statusCard.innerHTML = `
		<p class="kicker">Trạng thái quản trị</p>
		<div class="status-list">
			<div class="status-row">
				<strong>Admin auth</strong>
				<span class="badge ${state.authEnabled ? "badge-ok" : "badge-warn"}">${state.authEnabled ? "Đã bật" : "Đang tắt"}</span>
			</div>
			<p class="status-copy">${state.authEnabled ? "Truy cập /admin đang được bảo vệ bằng HTTP Basic Auth." : "Hiện chưa có lớp đăng nhập cho /admin. Nên bật MM_ADMIN_USER và MM_ADMIN_PASS trước khi mở ra mạng ngoài."}</p>
			<div class="status-row">
				<strong>Rollback</strong>
				<span class="badge badge-ok">Snapshot file</span>
			</div>
			<p class="status-copy">Mỗi lần lưu hoặc restore đều tạo version mới trong <code>config/profiles/history</code>.</p>
		</div>
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
				<span class="meta-sm">${item.moduleCount} module bật, ${item.historyCount || 0} snapshot</span>
				<div class="item-foot">
					${item.isActive ? "<span class=\"badge badge-ok\">Đang dùng</span>" : ""}
					${item.issueCount ? `<span class="badge badge-danger">${item.issueCount} lỗi</span>` : ""}
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
				<p class="lead-sm">Trang này giúp bạn quản lý từng gương bằng website thay vì sửa tay nhiều file config.</p>
			</div>
		</section>
	`;
}

function issueCard(issues) {
	if (!issues.length) {
		return `
			<section class="card section-block">
				<div class="card-head">
					<div>
						<p class="kicker">Kiểm tra profile</p>
						<h3>Không phát hiện lỗi validate</h3>
					</div>
					<span class="badge badge-ok">Ổn</span>
				</div>
				<p class="issue-copy">Profile hiện tại đi qua được các kiểm tra cơ bản trước khi build config.</p>
			</section>
		`;
	}

	return `
		<section class="card section-block">
			<div class="card-head">
				<div>
					<p class="kicker">Kiểm tra profile</p>
					<h3>Cần xử lý ${issues.length} lỗi</h3>
				</div>
				<span class="badge badge-danger">Có lỗi</span>
			</div>
			<ul class="issue-list">
				${issues.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
			</ul>
		</section>
	`;
}

function historyCard(history) {
	return `
		<section class="card section-block">
			<div class="card-head">
				<div>
					<p class="kicker">Version history</p>
					<h3>Snapshot và rollback</h3>
				</div>
				<span class="badge">${history.length} bản</span>
			</div>
			<div class="snap-list">
				${history.length ? history.map((item) => `
					<div class="snap-item">
						<div class="snap-meta">
							<strong>${escapeHtml(item.snapId)}</strong>
							<p class="snap-copy">${escapeHtml(item.note || "Không có ghi chú")}</p>
							<p class="meta-sm">${escapeHtml(item.source || "save")} • ${escapeHtml(fmtDate(item.createdAt))}</p>
						</div>
						<div class="snap-actions">
							<button class="btn btn-alt btn-sm" type="button" data-action="restore-snap" data-snap="${escapeHtml(item.snapId)}">Restore</button>
						</div>
					</div>
				`).join("") : "<p class=\"meta-sm\">Chưa có snapshot nào.</p>"}
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
		? modules.map((item) => moduleCard(item)).join("")
		: moduleCard(makeModule());
	const history = Array.isArray(state.currentProfile.history) ? state.currentProfile.history : [];
	const issues = Array.isArray(state.currentProfile.issues) ? state.currentProfile.issues : [];

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
							<span class="stat-value">${history.length}</span>
							<span class="stat-label">Snapshot</span>
						</div>
					</div>
				</div>

				<div class="form-grid">
					<div class="field span-9">
						<label>Ghi chú lần lưu</label>
						<input id="saveNote" type="text" placeholder="Ví dụ: đổi bố cục cho khách A" />
					</div>
					<div class="field span-3">
						<label>Device ID</label>
						<input id="deviceIdTop" type="text" value="${escapeHtml(data.deviceId || "")}" disabled />
					</div>
				</div>

				<div class="action-row">
					<button class="btn" type="button" data-action="set-active">Đặt làm profile đang dùng</button>
					<button class="btn btn-alt" type="button" data-action="clone-profile">Nhân bản profile này</button>
				</div>
			</section>

			${issueCard(issues)}
			${historyCard(history)}

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
							${opt("12", "12 giờ", String(general.timeFormat || 24))}
							${opt("24", "24 giờ", String(general.timeFormat || 24))}
						</select>
					</div>
					<div class="field">
						<label>Units</label>
						<select id="units">
							${opt("metric", "Metric", general.units || "metric")}
							${opt("imperial", "Imperial", general.units || "metric")}
						</select>
					</div>
					<div class="field">
						<label>HTTPS</label>
						<select id="useHttps">
							${opt("false", "Tắt", String(general.useHttps))}
							${opt("true", "Bật", String(general.useHttps))}
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
					<button class="btn btn-alt btn-sm" type="button" data-action="add-module">Thêm module trống</button>
				</div>

				<div class="quick-row">
					<p class="lead-sm">Thêm nhanh module phổ biến:</p>
					<div class="quick-actions">
						<button class="chip-btn" type="button" data-action="add-module" data-kind="clock">Clock</button>
						<button class="chip-btn" type="button" data-action="add-module" data-kind="weather">Weather</button>
						<button class="chip-btn" type="button" data-action="add-module" data-kind="newsfeed">Newsfeed</button>
						<button class="chip-btn" type="button" data-action="add-module" data-kind="compliments">Compliments</button>
						<button class="chip-btn" type="button" data-action="add-module" data-kind="calendar">Calendar</button>
					</div>
				</div>

				<div id="moduleList" class="module-list">
					${moduleCards}
				</div>
			</section>
		</div>
	`;

	syncModuleCards();
}

function renderApp() {
	renderStatus();
	renderList();
	renderProfile();
}

async function loadMeta(keepFile = "") {
	const data = await api("/admin/api/meta");
	state.activeFile = data.activeProfile;
	state.authEnabled = Boolean(data.authEnabled);
	state.profiles = data.profiles || [];

	const fileToOpen = keepFile || (state.currentProfile && state.currentProfile.fileName) || state.activeFile || (state.profiles[0] && state.profiles[0].fileName);
	renderStatus();
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

function syncModuleCard(card) {
	if (!card) {
		return;
	}

	const name = asText(card.querySelector("[data-module-field=\"module\"]").value).toLowerCase();
	const id = asText(card.querySelector("[data-module-field=\"id\"]").value);
	const nameEl = card.querySelector("[data-module-name]");
	const idEl = card.querySelector("[data-module-id]");
	const kindEl = card.querySelector("[data-module-kind]");
	const isKnown = MODULES.includes(name);
	const unknownEl = card.querySelector("[data-module-unknown]");

	nameEl.textContent = name || "Module mới";
	idEl.textContent = id || "Không có id";
	kindEl.textContent = name ? (isKnown ? `Form: ${name}` : "Advanced JSON") : "Chọn module";
	kindEl.className = `badge ${!name ? "" : isKnown ? "badge-ok" : "badge-warn"}`.trim();

	card.querySelectorAll("[data-module-section]").forEach((section) => {
		section.hidden = section.dataset.moduleSection !== name;
	});

	if (unknownEl) {
		unknownEl.hidden = !name || isKnown;
	}
}

function syncModuleCards() {
	document.querySelectorAll("[data-module-card]").forEach((card) => syncModuleCard(card));
}

function addThemeRow() {
	const themeList = document.getElementById("themeList");
	if (!themeList) {
		return;
	}

	themeList.insertAdjacentHTML("beforeend", themeRow());
}

function addModuleCard(kind = "") {
	const moduleList = document.getElementById("moduleList");
	if (!moduleList) {
		return;
	}

	moduleList.insertAdjacentHTML("beforeend", moduleCard(makeModule(kind)));
	syncModuleCards();
}

function addFeedRow(card) {
	const list = card.querySelector("[data-feed-list]");
	if (!list) {
		return;
	}

	list.insertAdjacentHTML("beforeend", feedRow());
}

function addCalRow(card) {
	const list = card.querySelector("[data-cal-list]");
	if (!list) {
		return;
	}

	list.insertAdjacentHTML("beforeend", calRow({ symbol: "calendar-check", url: "" }));
}

function parseObjText(text, label) {
	const raw = asText(text);
	if (!raw) {
		return {};
	}

	let data;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error(`${label} chưa đúng JSON.`);
	}

	if (!isObj(data)) {
		throw new Error(`${label} phải là object JSON.`);
	}

	return data;
}

function readNumField(el, label, required = false) {
	const raw = asText(el.value);
	if (!raw) {
		if (required) {
			throw new Error(`${label} không được để trống.`);
		}
		return undefined;
	}

	const num = Number(raw);
	if (!Number.isFinite(num)) {
		throw new Error(`${label} phải là số.`);
	}

	return num;
}

function readThemeVars() {
	const rows = [...document.querySelectorAll("[data-theme-row]")];
	const variables = {};

	for (const row of rows) {
		const key = asText(row.querySelector("[data-theme-key]").value);
		const value = asText(row.querySelector("[data-theme-value]").value);

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

function readFeeds(card) {
	return [...card.querySelectorAll("[data-feed-row]")]
		.map((row) => ({
			title: asText(row.querySelector("[data-feed-title]").value),
			url: asText(row.querySelector("[data-feed-url]").value)
		}))
		.filter((item) => item.title || item.url);
}

function readCalendars(card) {
	return [...card.querySelectorAll("[data-cal-row]")]
		.map((row) => ({
			symbol: asText(row.querySelector("[data-cal-symbol]").value),
			url: asText(row.querySelector("[data-cal-url]").value)
		}))
		.filter((item) => item.symbol || item.url);
}

function readCompGroups(card) {
	const groups = {};
	const any = splitLines(card.querySelector("[data-comp-anytime]").value);
	const morning = splitLines(card.querySelector("[data-comp-morning]").value);
	const afternoon = splitLines(card.querySelector("[data-comp-afternoon]").value);
	const evening = splitLines(card.querySelector("[data-comp-evening]").value);
	const special = parseObjText(card.querySelector("[data-comp-special]").value || "{}", "Ngày đặc biệt");

	if (any.length) {
		groups.anytime = any;
	}
	if (morning.length) {
		groups.morning = morning;
	}
	if (afternoon.length) {
		groups.afternoon = afternoon;
	}
	if (evening.length) {
		groups.evening = evening;
	}

	for (const [key, value] of Object.entries(special)) {
		groups[key] = value;
	}

	return groups;
}

function buildClockCfg(card, extra) {
	return pruneObj({
		...extra,
		clockBold: card.querySelector("[data-clock-bold]").checked,
		dateFormat: asText(card.querySelector("[data-clock-date]").value),
		displaySeconds: card.querySelector("[data-clock-seconds]").checked
	});
}

function buildWeatherCfg(card, extra) {
	return pruneObj({
		...extra,
		fade: card.querySelector("[data-weather-fade]").checked,
		lat: readNumField(card.querySelector("[data-weather-lat]"), "Latitude", true),
		lon: readNumField(card.querySelector("[data-weather-lon]"), "Longitude", true),
		maxNumberOfDays: readNumField(card.querySelector("[data-weather-days]"), "Max days"),
		showHumidity: asText(card.querySelector("[data-weather-humidity]").value),
		showSun: card.querySelector("[data-weather-sun]").checked,
		showUVIndex: card.querySelector("[data-weather-uv]").checked,
		type: asText(card.querySelector("[data-weather-type]").value),
		weatherProvider: asText(card.querySelector("[data-weather-provider]").value)
	});
}

function buildNewsCfg(card, extra) {
	return pruneObj({
		...extra,
		broadcastNewsFeeds: card.querySelector("[data-news-broadcast-feed]").checked,
		broadcastNewsUpdates: card.querySelector("[data-news-broadcast-update]").checked,
		feeds: readFeeds(card),
		maxNewsItems: readNumField(card.querySelector("[data-news-max]"), "Max news"),
		showDescription: card.querySelector("[data-news-desc]").checked,
		showPublishDate: card.querySelector("[data-news-date]").checked,
		showSourceTitle: card.querySelector("[data-news-source]").checked,
		wrapTitle: card.querySelector("[data-news-wrap]").checked
	});
}

function buildCompCfg(card, extra) {
	return pruneObj({
		...extra,
		afternoonEndTime: readNumField(card.querySelector("[data-comp-afternoon-end]"), "Afternoon end"),
		afternoonStartTime: readNumField(card.querySelector("[data-comp-afternoon-start]"), "Afternoon start"),
		compliments: readCompGroups(card),
		fadeSpeed: readNumField(card.querySelector("[data-comp-fade]"), "Fade speed"),
		morningEndTime: readNumField(card.querySelector("[data-comp-morning-end]"), "Morning end"),
		morningStartTime: readNumField(card.querySelector("[data-comp-morning-start]"), "Morning start"),
		updateInterval: readNumField(card.querySelector("[data-comp-update]"), "Update interval")
	});
}

function buildCalCfg(card, extra) {
	return pruneObj({
		...extra,
		broadcastEvents: card.querySelector("[data-cal-broadcast]").checked,
		calendars: readCalendars(card),
		colored: card.querySelector("[data-cal-colored]").checked,
		fetchInterval: readNumField(card.querySelector("[data-cal-fetch]"), "Fetch interval"),
		maximumEntries: readNumField(card.querySelector("[data-cal-max]"), "Maximum entries"),
		maximumNumberOfDays: readNumField(card.querySelector("[data-cal-days]"), "Maximum days")
	});
}

function readModule(card, index) {
	const name = asText(card.querySelector("[data-module-field=\"module\"]").value);
	if (!name) {
		return null;
	}

	const label = `Module ${index + 1} (${name})`;
	const extra = parseObjText(card.querySelector("[data-module-extra]").value || "{}", `${label} - Advanced JSON`);
	const item = {
		enabled: card.querySelector("[data-module-enabled]").checked,
		module: name
	};

	for (const field of ["id", "position", "header", "classes"]) {
		const value = asText(card.querySelector(`[data-module-field="${field}"]`).value);
		if (value) {
			item[field] = value;
		}
	}

	let config = cloneJson(extra);
	switch (name.toLowerCase()) {
		case "clock":
			config = buildClockCfg(card, extra);
			break;
		case "weather":
			config = buildWeatherCfg(card, extra);
			break;
		case "newsfeed":
			config = buildNewsCfg(card, extra);
			break;
		case "compliments":
			config = buildCompCfg(card, extra);
			break;
		case "calendar":
			config = buildCalCfg(card, extra);
			break;
		default:
			break;
	}

	if (Object.keys(config).length > 0) {
		item.config = config;
	}

	return item;
}

function readModules() {
	return [...document.querySelectorAll("[data-module-card]")]
		.map((card, index) => readModule(card, index))
		.filter(Boolean);
}

function readProfileForm() {
	if (!state.currentProfile) {
		throw new Error("Chưa có profile nào được mở.");
	}

	const profile = cloneJson(state.currentProfile.profile);
	profile.deviceId = asText(document.getElementById("deviceId").value);
	profile.general = profile.general || {};
	profile.theme = profile.theme || {};

	profile.general.address = asText(document.getElementById("address").value);
	profile.general.basePath = asText(document.getElementById("basePath").value) || "/";
	profile.general.port = toNum(document.getElementById("port").value, 8080);
	profile.general.language = asText(document.getElementById("language").value) || "vi";
	profile.general.locale = asText(document.getElementById("locale").value) || "vi-VN";
	profile.general.timeFormat = toNum(document.getElementById("timeFormat").value, 24);
	profile.general.units = document.getElementById("units").value;
	profile.general.useHttps = document.getElementById("useHttps").value === "true";
	profile.general.httpsPrivateKey = asText(document.getElementById("httpsPrivateKey").value);
	profile.general.httpsCertificate = asText(document.getElementById("httpsCertificate").value);
	profile.general.ipWhitelist = splitLines(document.getElementById("ipWhitelist").value);
	profile.general.logLevel = splitCsv(document.getElementById("logLevel").value);

	profile.theme.baseCss = asText(document.getElementById("baseCss").value) || "css/mirror.vps.css";
	profile.theme.outputFile = asText(document.getElementById("outputFile").value);
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
	const note = asText(document.getElementById("saveNote") && document.getElementById("saveNote").value);
	const data = await api(`/admin/api/profiles/${encodeURIComponent(fileName)}`, {
		body: JSON.stringify({ note, profile }),
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

async function restoreSnap(snapId) {
	const fileName = state.currentProfile && state.currentProfile.fileName;
	if (!fileName) {
		throw new Error("Chưa có profile để restore.");
	}

	const ok = window.confirm(`Restore snapshot ${snapId}? Trạng thái hiện tại sẽ được backup trước khi ghi đè.`);
	if (!ok) {
		return;
	}

	const data = await api(`/admin/api/profiles/${encodeURIComponent(fileName)}/restore`, {
		body: JSON.stringify({ snapId }),
		method: "POST"
	});

	state.currentProfile = data.data;
	await loadMeta(fileName);
	showNotice("Đã restore profile từ snapshot đã chọn.", "is-success");
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
				addModuleCard(button.dataset.kind || "");
				break;
			case "remove-module":
				button.closest("[data-module-card]").remove();
				break;
			case "add-feed":
				addFeedRow(button.closest("[data-module-card]"));
				break;
			case "remove-feed":
				button.closest("[data-feed-row]").remove();
				break;
			case "add-cal":
				addCalRow(button.closest("[data-module-card]"));
				break;
			case "remove-cal":
				button.closest("[data-cal-row]").remove();
				break;
			case "restore-snap":
				await restoreSnap(button.dataset.snap);
				break;
			default:
				break;
		}
	} catch (error) {
		showNotice(error.message, "is-error", error.issues || []);
	}
});

document.addEventListener("input", (event) => {
	const field = event.target.closest("[data-module-field=\"module\"], [data-module-field=\"id\"]");
	if (!field) {
		return;
	}

	syncModuleCard(field.closest("[data-module-card]"));
});

async function boot() {
	try {
		await loadMeta();
		clearNotice();
	} catch (error) {
		showNotice(error.message, "is-error", error.issues || []);
	}
}

boot();
