frappe.pages["form-list"].on_page_load = function (wrapper) {
	wrapper.mform_page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Form List",
		single_column: true,
	});
};

frappe.pages["form-list"].on_page_show = async function (wrapper) {
	let page = wrapper.mform_page;
	let route = frappe.get_route() || [];
	let doctype = route[1] != null ? decodeURIComponent(route[1]) : null;
	let docname =
		route.length > 2
			? route
					.slice(2)
					.map(function (s) {
						return decodeURIComponent(s);
					})
					.join("/")
			: null;

	frappe.breadcrumbs.add({
		type: "Custom",
		items: frappe.mform_integration.get_breadcrumb_items({
			segment: "form-list",
			doctype: doctype || "",
			docname: docname || "",
		}),
	});

	if (!doctype || !docname) {
		page.set_title("Form List");
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("list", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);">
					${__("No record selected. Please select a record from the list to view its forms.")}
				</p>
			</div>
		`);
		return;
	}

	$(page.body).html(`
		<div style="display:flex;justify-content:center;align-items:center;height:60vh;">
			<div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;">
				<span class="sr-only">Loading...</span>
			</div>
		</div>
	`);

	let doc = await frappe.db.get_doc(doctype, docname);
	let doc_title = ((doc && (doc.programme_name || doc.name)) || docname || "") + " - Forms";
	page.set_title(doc_title);

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
			.mform-card-activity::before { background: linear-gradient(180deg, #f59e0b, #d97706); }
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
			.mform-card-activity:hover .mform-card-count { color: #d97706; }
			.mform-card-states::before { background: linear-gradient(180deg, #06b6d4, #0891b2); }
			.mform-card-districts::before { background: linear-gradient(180deg, #f43f5e, #e11d48); }
			.mform-card-blocks::before { background: linear-gradient(180deg, #84cc16, #65a30d); }
			.mform-card-states:hover .mform-card-count { color: #0891b2; }
			.mform-card-districts:hover .mform-card-count { color: #e11d48; }
			.mform-card-blocks:hover .mform-card-count { color: #65a30d; }
			.mform-card-states .mform-card-icon { background: #ecfeff; color: #06b6d4; }
			.mform-card-districts .mform-card-icon { background: #fff1f2; color: #f43f5e; }
			.mform-card-blocks .mform-card-icon { background: #f7fee7; color: #84cc16; }
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
			.mform-card-activity .mform-card-icon { background: #fef3c7; color: #f59e0b; }
			.mform-cards-container {
				display: flex;
				flex-wrap: wrap;
				gap: 20px;
				padding: 20px;
			}
		</style>
		<div class="mform-cards-container" style="opacity:0;transition:opacity 0.2s ease;">
			<div class="mform-card mform-card-total mform-card-anim" style="opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:0ms;">
				<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
					Total Responses
				</div>
				<div class="mform-card-count" id="stat-total">--</div>
				<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Across all forms</div>
				<div class="mform-card-icon">${frappe.utils.icon("file", "lg")}</div>
			</div>
			<div class="mform-card mform-card-surveyors mform-card-anim" style="opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:35ms;">
				<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
					Active Surveyors
				</div>
				<div class="mform-card-count" id="stat-surveyors">--</div>
				<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Unique users in last 30 days</div>
				<div class="mform-card-icon">${frappe.utils.icon("users", "lg")}</div>
			</div>
			<div class="mform-card mform-card-week mform-card-anim" style="opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:70ms;">
				<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
					This Week
				</div>
				<div class="mform-card-count" id="stat-week">--</div>
				<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Rolling last 7 days</div>
				<div class="mform-card-icon">${frappe.utils.icon("calendar", "lg")}</div>
			</div>
			<div class="mform-card mform-card-activity mform-card-anim" style="opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:105ms;">
				<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
					Last Activity
				</div>
				<div class="mform-card-count" id="stat-activity">--</div>
				<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Most recent submission</div>
				<div class="mform-card-icon">${frappe.utils.icon("dashboard", "lg")}</div>
			</div>
			<div class="mform-card mform-card-states mform-card-anim mform-geo-card" style="display:none;opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:140ms;">
				<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
					States Reached
				</div>
				<div class="mform-card-count" id="stat-states">--</div>
				<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Unique states covered</div>
				<div class="mform-card-icon">${frappe.utils.icon("map", "lg")}</div>
			</div>
			<div class="mform-card mform-card-districts mform-card-anim mform-geo-card" style="display:none;opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:175ms;">
				<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
					Districts Reached
				</div>
				<div class="mform-card-count" id="stat-districts">--</div>
				<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Unique districts covered</div>
				<div class="mform-card-icon">${frappe.utils.icon("shortcut", "lg")}</div>
			</div>
			<div class="mform-card mform-card-blocks mform-card-anim mform-geo-card" style="display:none;opacity:0;transform:translateY(8px);transition:opacity 0.25s ease, transform 0.25s ease;transition-delay:210ms;">
				<div style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
					Blocks Reached
				</div>
				<div class="mform-card-count" id="stat-blocks">--</div>
				<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Unique blocks covered</div>
				<div class="mform-card-icon">${frappe.utils.icon("grid", "lg")}</div>
			</div>
		</div>
		<div id="mform-form-list" class="p-3"></div>
	`);

	// Load stats asynchronously
	frappe.xcall("mform_integration.apis.api.get_form_list_stats", {
		parent_doctype: doctype,
		parent_docname: docname,
	}).then((stats) => {
		if (stats) {
			$("#stat-total").text(stats.total.toLocaleString());
			$("#stat-surveyors").text(stats.active_surveyors.toLocaleString());
			$("#stat-week").text(stats.this_week.toLocaleString());
			$("#stat-activity").text(stats.last_activity);

			// Show geo cards only if any value > 0
			if (stats.states_reached || stats.districts_reached || stats.blocks_reached) {
				$("#stat-states").text(stats.states_reached.toLocaleString());
				$("#stat-districts").text(stats.districts_reached.toLocaleString());
				$("#stat-blocks").text(stats.blocks_reached.toLocaleString());
				$(".mform-geo-card").css("display", "");
			}
		}
		const $container = $(page.body).find(".mform-cards-container");
		const $cards = $(page.body).find(".mform-card-anim");
		requestAnimationFrame(() => {
			$container.css("opacity", "1");
			requestAnimationFrame(() => {
				$cards.css({ opacity: "1", transform: "translateY(0)" });
				setTimeout(() => $cards.css("transform", ""), 300);
			});
		});
	});

	frappe.require("sva_datatable.bundle.js");
	page["mform_form_list"] = new frappe.ui.SvaDataTable({
		wrapper: document.getElementById("mform-form-list"),
		frm: {
			doc: { doctype: doctype, name: docname },
			dt_events: {
				"Form List Report": {
					get_filters: async () => ({
						parent_doctype: doctype,
						parent_docname: docname,
					}),
					before_load: (sva_dt) => {
						if (!sva_dt.columns?.length) {
							sva_dt.columns = [
								{ fieldname: "form", fieldtype: "Data", label: "Search Forms.." },
							];
						}
					},
					formatter: {
						form_name: (value) => {
							return `<span style="cursor:pointer;color:var(--text-color);text-decoration:underline;">${value || "-"}</span>`;
						},
						status: (value) => {
							let color = value === "Active" ? "green" : "yellow";
							return `<span class="indicator-pill ${color}">${value}</span>`;
						},
					},
					columnEvents: {
						form_name: {
							click: (element, value, column, row, sva_dt) => {
								if (value) {
									frappe.set_route("form-dashboard", value, doctype, docname);
								}
							},
						},
					},
				},
			},
		},
		doctype: null,
		connection: {
			connection_type: "Report",
			link_report: "Form List Report",
			report_type: "Script Report",
			title: "Forms",
			crud_permissions: '["read"]',
			list_filters: '[{"fieldname":"form","label":"Search Form","fieldtype":"Data","width":2,"inline_edit":0}]',
			listview_settings: `[{"fieldname":"form_name","fieldtype":"Data","label":"Form Name","width":"10","inline_edit":0},{"fieldname":"status","fieldtype":"Data","label":"Status","width":"2","inline_edit":0},{"fieldname":"response_count","fieldtype":"Int","label":"Response Count","width":"2","inline_edit":0},{"fieldname":"created_date","fieldtype":"Date","label":"Created Date","width":"2","inline_edit":0},{"fieldname":"last_response","fieldtype":"Datetime","label":"Last Response","width":"2","inline_edit":0}]`,
			disable_workflow: true,
		},
	});
};
