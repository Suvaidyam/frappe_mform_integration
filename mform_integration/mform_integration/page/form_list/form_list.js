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

	$(page.body).html(`<div id="mform-form-list" class="p-3"></div>`);

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
								{ fieldname: "form", fieldtype: "Data", label: "Search Form" },
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
			disable_workflow: true,
		},
	});
};
