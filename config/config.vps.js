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
	customCss: "css/mirror.vps.css",

	// server:watch only watches files, not directories.
	watchTargets: [
		"config/config.vps.js",
		"css/mirror.vps.css"
	],

	modules: [
		{
			module: "alert"
		},
		{
			module: "clock",
			position: "top_left",
			classes: "mirror-clock",
			config: {
				displaySeconds: false,
				clockBold: true,
				dateFormat: "dddd, D [thg] M [nam] YYYY"
			}
		},
		// Bat lai module calendar khi ban co link .ics public that.
		// {
		// 	module: "calendar",
		// 	header: "Lich",
		// 	position: "top_left",
		// 	classes: "mirror-calendar",
		// 	config: {
		// 		calendars: [
		// 			{
		// 				symbol: "calendar-check",
		// 				url: "YOUR_PUBLIC_ICS_URL"
		// 			}
		// 		]
		// 	}
		// },
		{
			module: "compliments",
			position: "lower_third",
			classes: "mirror-compliment",
			config: {
				updateInterval: 45 * 1000,
				fadeSpeed: 2000,
				morningStartTime: 5,
				morningEndTime: 12,
				afternoonStartTime: 12,
				afternoonEndTime: 18,
				compliments: {
					anytime: [
						"Hom nay lam tung viec mot nhe.",
						"Di cham mot chut cung duoc, mien la dung huong.",
						"San sang cho mot ngay moi."
					],
					morning: [
						"Chao buoi sang.",
						"Nhin ban hom nay rat on.",
						"Pha mot ly cafe roi bat dau thoi."
					],
					afternoon: [
						"Buoi chieu van con nhieu nang luong.",
						"Lam tiep chut nua la xong.",
						"Ban dang lam kha tot day."
					],
					evening: [
						"Toi nay nho nghi ngoi mot chut.",
						"Mot ngay nhu vay la du roi.",
						"Thu gian di, mai tinh tiep."
					],
					"....-01-01": ["Chuc mung nam moi!"]
				}
			}
		},
		{
			module: "weather",
			position: "top_right",
			header: "Hien tai",
			classes: "mirror-weather-current",
			config: {
				weatherProvider: "openmeteo",
				type: "current",
				lat: 10.8231,
				lon: 106.6297,
				showHumidity: "below",
				showUVIndex: true,
				showSun: true
			}
		},
		{
			module: "weather",
			position: "top_right",
			header: "Du bao 5 ngay",
			classes: "mirror-weather-forecast",
			config: {
				weatherProvider: "openmeteo",
				type: "forecast",
				lat: 10.8231,
				lon: 106.6297,
				fade: false,
				maxNumberOfDays: 5
			}
		},
		{
			module: "newsfeed",
			position: "bottom_bar",
			classes: "mirror-news",
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
				broadcastNewsUpdates: true,
				showDescription: false,
				wrapTitle: true,
				maxNewsItems: 10
			}
		}
	]
};

if (typeof module !== "undefined") { module.exports = config; }
