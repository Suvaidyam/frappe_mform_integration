frappe.pages["form-dashboard"].on_page_load = function (wrapper) {
	wrapper.mform_page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Form Dashboard",
		single_column: true,
	});
};

frappe.pages["form-dashboard"].on_page_show = async function (wrapper) {
	let page = wrapper.mform_page;
	let route = frappe.get_route() || [];
	let doctype = route[1] != null ? decodeURIComponent(route[1]) : null;

	let source_doctype =
		route[2] != null
			? typeof route[2] === "string"
				? decodeURIComponent(route[2])
				: route[2]
			: null;
	let source_docname =
		route.length > 3
			? route
					.slice(3)
					.map(function (s) {
						return decodeURIComponent(s);
					})
					.join("/")
			: null;

	frappe.breadcrumbs.add({
		type: "Custom",
		items: frappe.mform_integration.get_breadcrumb_items({
			segment: "form-dashboard",
			doctype: doctype || "",
			source_doctype: source_doctype || "",
			source_docname: source_docname || "",
		}),
	});

	if (!doctype) {
		page.set_title("Form Dashboard");
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("chart", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);">
					${__("No form selected. Please select a form from the list to view its dashboard.")}
				</p>
			</div>
		`);
		return;
	}

	page.set_title(doctype);

	$(page.body).html(`
		<div style="display:flex;justify-content:center;align-items:center;height:60vh;">
			<div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;">
				<span class="sr-only">Loading...</span>
			</div>
		</div>
	`);

	let data = await frappe.xcall("mform_integration.apis.api.get_form_dashboard", { doctype });

	$(page.body).html(`
		<style>
			.mform-card {
				flex: 1 1 300px;
				min-width: 300px;
				background: #fff;
				border-radius: 10px;
				border: 1px solid #e2e8f0;
				padding: 11px;
				transition: all 0.3s ease;
				position: relative;
				overflow: hidden;
			}
	
			.mform-card-total::before { background: linear-gradient(180deg, #3b82f6, #1d4ed8); }
			.mform-card-surveyors::before { background: linear-gradient(180deg, #8b5cf6, #6d28d9); }
			.mform-card-week::before { background: linear-gradient(180deg, #10b981, #059669); }
			
			.mform-card-count {
				font-size: 20px;
				font-weight: 700;
				color: #1e293b;
				margin-top: 8px;
				transition: transform 0.3s ease;
			}
			.mform-card-total:hover .mform-card-count { color: #1d4ed8; }
			.mform-card-surveyors:hover .mform-card-count { color: #6d28d9; }
			.mform-card-week:hover .mform-card-count { color: #059669; }
			.mform-card-icon {
				position: absolute;
				top: 50%;
				right: 24px;
				transform: translateY(-50%);
				width: 52px;
				height: 52px;
				border-radius: 12px;
				display: flex;
				align-items: center;
				justify-content: center;
				transition: all 0.3s ease;
				opacity: 0.85;
			}
			.mform-card:hover .mform-card-icon { opacity: 1; transform: translateY(-50%) scale(1.1); }
			.mform-card-total .mform-card-icon { background: #eff6ff; color: #3b82f6; }
			.mform-card-surveyors .mform-card-icon { background: #f5f3ff; color: #8b5cf6; }
			.mform-card-week .mform-card-icon { background: #ecfdf5; color: #10b981; }
			.mform-cards-container {
				display: flex;
				flex-wrap: wrap;
				gap: 20px;
				padding: 20px;
			}
		</style>
		<div class="mform-dashboard-content" style="opacity:0;transition:opacity 0.2s ease;">
			<div class="mform-cards-container">
				<div class="mform-card mform-card-total mform-card-anim" style="opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:0ms;">
					<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
						Total Responses
					</div>
					<div class="mform-card-count">${data.total}</div>
					<div style="font-size:12px;color:#94a3b8;margin-top:4px;">All time</div>
					<div class="mform-card-icon">${frappe.utils.icon("file", "lg")}</div>
				</div>
				<div class="mform-card mform-card-surveyors mform-card-anim" style="opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:35ms;">
					<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
						Active Surveyors
					</div>
					<div class="mform-card-count">${data.this_week}</div>
					<div style="font-size:12px;color:#94a3b8;margin-top:4px;">All time</div>
					<div class="mform-card-icon">${frappe.utils.icon("users", "lg")}</div>
				</div>
				<div class="mform-card mform-card-week mform-card-anim" style="opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:70ms;">
					<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
						This Week Responses
					</div>
					<div class="mform-card-count">${data.this_week}</div>
					<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Since ${frappe.datetime.get_today()}</div>
					<div class="mform-card-icon">${frappe.utils.icon("calendar", "lg")}</div>
				</div>
			</div>
			<div class="mform-charts-container" style="display:flex;flex-direction:column;flex-wrap:wrap;gap:20px;padding:0 20px 20px;">
				<div style="flex:1 1 55%;min-width:300px;" id="mform-submission-chart"></div>
				<div class="mform-card" style="flex:1 1 35%;min-width:300px;">
					<div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:8px;">Geographical Reach</div>
					<div id="mform-geo-map" style="height:390px;border-radius:8px;overflow:hidden;"></div>
				</div>
			</div>
			<div id="mform-response-list" class="px-3"></div>
		</div>
	`);

	const $content = $(page.body).find(".mform-dashboard-content");
	const $cards = $(page.body).find(".mform-card-anim");
	requestAnimationFrame(() => {
		$content.css("opacity", "1");
		requestAnimationFrame(() => {
			$cards.css({ opacity: "1", transform: "translateY(0)" });
			setTimeout(() => $cards.css("transform", ""), 300);
		});
	});

	render_submission_chart(doctype);
	render_geo_map(doctype);
	render_response_table(page, doctype);
};

async function render_submission_chart(doctype) {
	frappe.require("sva_chart.bundle.js"); 
	let charts =  document.getElementById("mform-submission-chart")
	// if (typeof frappe.ui.SVADashboardManager === "tasdf") {
		// 	return;
		// }
		let item = await frappe.xcall("frappe_theme.dt_api.check_chart_permissions_and_settings", {
			chart_name: "Submission Over Time"
		});
		let items = {
			fetch_from: "Dashboard Chart",
			...item,
			details: item?.chart,
			is_permitted: true,

		};
		new frappe.ui.SVADashboardManager({
			wrapper: charts,
			frm: {
				'is_new': () => false, 
				"dt_events":{
					"Submission Over Time":{
						get_filters: function() {
							return {
								reference_doctype: doctype
							}
						}
					}
				}
			},
			charts: [items],
		});
}

function render_geo_map(doctype) {
	frappe.xcall("frappe.desk.query_report.run", {
		report_name: "Geographical Reach - mForm",
		filters: { reference_doctype: doctype },
	}).then((res) => {
		let result = res.result || [];
		if (!result.length) {
			$("#mform-geo-map").html('<p style="color:var(--text-muted);height: 379px;color: #6c757d;background-color: #f8f9fa;margin-top: 10px;display: flex;justify-content: center;align-items: center;">No location data</p>');
			return;
		}
		let map = L.map("mform-geo-map", { scrollWheelZoom: true });
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		}).addTo(map);
		let bounds = [];
		result.forEach((row) => {
			if (row.latitude && row.longitude) {
				let latlng = [row.latitude, row.longitude];
				L.marker(latlng).addTo(map).bindPopup(row.name || "");
				bounds.push(latlng);
			}
		});
		if (bounds.length) {
			map.fitBounds(bounds, { padding: [30, 30] });
		}
	});
}

function render_response_table(page, doctype) {
	frappe.require("sva_datatable.bundle.js");
	page["mform_response_list"] = new frappe.ui.SvaDataTable({
		wrapper: document.getElementById("mform-response-list"),
		frm: {},
		doctype: doctype,
		connection: {
			connection_type: "Unfiltered",
			title: "Responses",
			unfiltered: 1,
			crud_permissions: '["read"]',
		},
	});
}
