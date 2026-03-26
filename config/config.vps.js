let config = {
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
	units: "metric",

	// server:watch only watches files, not directories.
	watchTargets: [
		"config/config.vps.js"
	],

	modules: [
		{
			module: "alert"
		},
		{
			module: "updatenotification",
			position: "top_bar"
		},
		{
			module: "clock",
			position: "top_left"
		},
		{
			module: "calendar",
			header: "Lich",
			position: "top_left",
			config: {
				calendars: [
					{
						symbol: "calendar-check",
						url: "https://calendar.google.com/calendar/embed?src=thanhnguyen64la%40gmail.com&ctz=Asia%2FHo_Chi_Minh"
					}
				]
			}
		},
		{
			module: "compliments",
			position: "lower_third"
		},
		{
			module: "weather",
			position: "top_right",
			config: {
				weatherProvider: "openmeteo",
				type: "current",
				lat: 10.8231,
				lon: 106.6297,
				showHumidity: "below",
				showUVIndex: true
			}
		},
		{
			module: "weather",
			position: "top_right",
			header: "Du bao",
			config: {
				weatherProvider: "openmeteo",
				type: "forecast",
				lat: 10.8231,
				lon: 106.6297
			}
		},
		{
			module: "newsfeed",
			position: "bottom_bar",
			config: {
				feeds: [
					{
						title: "VNExpress",
						url: "https://vnexpress.net/rss/tin-moi-nhat.rss"
					}
				],
				showSourceTitle: true,
				showPublishDate: true,
				broadcastNewsFeeds: true,
				broadcastNewsUpdates: true
			}
		}
	]
};

if (typeof module !== "undefined") { module.exports = config; }
