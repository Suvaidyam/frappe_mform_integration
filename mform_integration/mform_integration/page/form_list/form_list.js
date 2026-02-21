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
	<div class="px-3 py-2 mform-form-list-content" style="opacity:0;transition:opacity 0.2s ease;">
		<div class="mform-form-list" style="background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
			<div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
				<input type="text" class="form-control mform-search-input"
					placeholder="Search forms..." style="max-width:240px;height:36px;font-size:13px;">
			</div>
			<div class="mform-grid-table" style="margin:0;display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.5fr;">
				<div class="mform-grid-head" style="display:contents;">
					<div style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Form Name</div>
					<div style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Status</div>
					<div style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Response Count</div>
					<div style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Created Date</div>
					<div style="padding:12px 20px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">Last Response</div>
				</div>
				<div class="mform-table-body" style="display:contents;">
					${form_data.map((item, idx) => get_row_html(item, idx)).join("")}
				</div>
			</div>
			${
				form_data.length === 0
					? '<div style="padding:40px;text-align:center;color:#94a3b8;">No forms mapped yet.</div>'
					: ""
			}
		</div>
	</div>
	`;

	$(page.body).html(html);

	const $content = $(page.body).find(".mform-form-list-content");
	const $rows = $(page.body).find(".mform-form-row");
	requestAnimationFrame(() => {
		$content.css("opacity", "1");
		requestAnimationFrame(() => {
			$rows.children().css({ opacity: "1", transform: "translateY(0)" });
		});
	});

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
			let $body = $(page.body).find(".mform-table-body");
			if (filtered.length) {
				$body.html(filtered.map((item, idx) => get_row_html(item, idx)).join(""));
				requestAnimationFrame(() => {
					$body.find(".mform-form-row").children().css({ opacity: "1", transform: "translateY(0)" });
				});
			} else {
				$body.html(
					'<div class="mform-grid-empty" style="grid-column:1/-1;padding:40px;text-align:center;color:#94a3b8;">No matching forms.</div>'
				);
			}
		});
}

function get_row_html(item, idx) {
	if (idx == null) idx = 0;
	let delay = Math.min(idx * 35, 400);
	let rowTransition = `opacity 0.25s ease, transform 0.25s ease; transition-delay: ${delay}ms;`;
	let status = item.count > 0 ? "Active" : "Draft";
	let status_color =
		item.count > 0
			? "background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;"
			: "background:#fef3c7;color:#d97706;border:1px solid #fde68a;";

	let created_str = item.created
		? frappe.datetime.str_to_user(item.created).split(" ")[0]
		: "\u2014";
	let last_str = item.last_response ? frappe.datetime.str_to_user(item.last_response) : "\u2014";

	let cell = "padding:14px 20px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;";
	return `
		<div class="mform-form-row" style="display:contents;" data-form="${item.form}">
			<div style="cursor:pointer;opacity:0;transform:translateY(8px);transition:${rowTransition};${cell}font-weight:500;color:#1e40af;">
				${item.form}
			</div>
			<div style="cursor:pointer;opacity:0;transform:translateY(8px);transition:${rowTransition};padding:14px 20px;border-bottom:1px solid #f1f5f9;">
				<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:500;${status_color}">
					${status}
				</span>
			</div>
			<div style="cursor:pointer;opacity:0;transform:translateY(8px);transition:${rowTransition};${cell}">
				${item.count}
			</div>
			<div style="cursor:pointer;opacity:0;transform:translateY(8px);transition:${rowTransition};${cell}">
				${created_str}
			</div>
			<div style="cursor:pointer;opacity:0;transform:translateY(8px);transition:${rowTransition};${cell}">
				${last_str}
			</div>
		</div>
	`;
}
