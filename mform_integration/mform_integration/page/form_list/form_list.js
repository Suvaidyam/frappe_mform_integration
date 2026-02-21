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

	let form_data = await frappe.xcall("mform_integration.apis.api.get_form_list", {
		doctype,
		docname,
	});

	render_table(page, form_data, doctype, docname);
};

function render_table(page, form_data, source_doctype, source_docname) {
	let html = `
	<div class="px-3 py-2">
		<div class="mform-form-list" style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
			<div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
				<input type="text" class="form-control mform-search-input"
					placeholder="Search forms..." style="max-width:240px;height:36px;font-size:13px;">
			</div>
			<table class="table table-hover" style="margin:0;">
				<thead>
					<tr style="background:#f8fafc;">
						<th style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">Form Name</th>
						<th style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">Status</th>
						<th style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">Response Count</th>
						<th style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">Created Date</th>
						<th style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">Last Response</th>
					</tr>
				</thead>
				<tbody class="mform-table-body">
					${form_data.map((item) => get_row_html(item)).join("")}
				</tbody>
			</table>
			${
				form_data.length === 0
					? '<div style="padding:40px;text-align:center;color:#94a3b8;">No forms mapped yet.</div>'
					: ""
			}
		</div>
	</div>
	`;

	$(page.body).html(html);

	$(page.body)
		.off("click", ".mform-form-row")
		.on("click", ".mform-form-row", function () {
			let form = $(this).data("form");
			frappe.set_route("form-dashboard", form, source_doctype || "", source_docname || "");
		});

	$(page.body)
		.off("input", ".mform-search-input")
		.on("input", ".mform-search-input", function () {
			let query = $(this).val().toLowerCase();
			let filtered = form_data.filter((item) => item.form.toLowerCase().includes(query));
			$(page.body)
				.find(".mform-table-body")
				.html(
					filtered.map((item) => get_row_html(item)).join("") ||
						'<tr><td colspan="5" style="padding:40px;text-align:center;color:#94a3b8;">No matching forms.</td></tr>'
				);
		});
}

function get_row_html(item) {
	let status = item.count > 0 ? "Active" : "Draft";
	let status_color =
		item.count > 0
			? "background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;"
			: "background:#fef3c7;color:#d97706;border:1px solid #fde68a;";

	let created_str = item.created
		? frappe.datetime.str_to_user(item.created).split(" ")[0]
		: "\u2014";
	let last_str = item.last_response ? frappe.datetime.str_to_user(item.last_response) : "\u2014";

	return `
		<tr class="mform-form-row" style="cursor:pointer;" data-form="${item.form}">
			<td style="padding:14px 20px;font-size:13px;font-weight:500;color:#1e40af;border-bottom:1px solid #f1f5f9;">
				${item.form}
			</td>
			<td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;">
				<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;${status_color}">
					${status}
				</span>
			</td>
			<td style="padding:14px 20px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;">
				${item.count}
			</td>
			<td style="padding:14px 20px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;">
				${created_str}
			</td>
			<td style="padding:14px 20px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;">
				${last_str}
			</td>
		</tr>
	`;
}
