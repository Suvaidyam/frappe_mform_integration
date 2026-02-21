frappe.pages["list-view"].on_page_load = function (wrapper) {
	wrapper.mform_page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "List View",
		single_column: true,
	});
};

frappe.pages["list-view"].on_page_show = async function (wrapper) {
	let page = wrapper.mform_page;
	let route = frappe.get_route() || [];
	let doctype = route[1] != null ? decodeURIComponent(route[1]) : null;

	page.set_title(doctype || "List View");
	page.clear_primary_action();
	page.clear_secondary_action();

	frappe.breadcrumbs.add({
		type: "Custom",
		items: frappe.mform_integration.get_breadcrumb_items({
			segment: "list-view",
			doctype: doctype || "",
		}),
	});

	if (!doctype) {
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("setting-gear", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);">
					${__("Please select a module from")}
					<a href="/app/module-list">${__("Module List")}</a>
				</p>
			</div>
		`);
		return;
	}

	page.set_primary_action(
		__("Add") + " " + doctype,
		() => {
			frappe.new_doc(doctype);
		},
		"add"
	);

	$(page.body).html(`
		<div style="display:flex;justify-content:center;align-items:center;height:80vh;background:white;">
			<div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;">
				<span class="sr-only">Loading...</span>
			</div>
		</div>
	`);

	let settings = await frappe.db.get_doc("mForm Settings");
	let match = (settings.module_integration || []).find((row) => row.module === doctype);
	let module_interface = match ? match.module_interface : null;

	let data = await frappe.db.get_list(doctype, { fields: ["*"] });

	if (!data || data.length === 0) {
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("file", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);">
					${__("No {0} records found. Create your first one!", [doctype])}
				</p>
			</div>
		`);
		return;
	}

	let custom_blocks = await frappe.db.get_doc("Custom HTML Block", module_interface);
	let template = custom_blocks.html;

	let rendered = data
		.map((doc) => {
			let html = template
				.replace(/\{frappe\.utils\.icon\(['"]([^'"]+)['"]\)\}/g, (match, icon) => {
					return frappe.utils.icon(icon);
				})
				.replace(/\{doc\.(\w+)\}/g, (match, field) => {
					return doc[field] !== undefined ? doc[field] : match;
				});
			return `<div class="py-2"><div class="mform-list-item-row" style="cursor:pointer;" data-doctype="${doctype}" data-docname="${doc.name}">${html}</div></div>`;
		})
		.join("");
	rendered = `<div class="p-3">${rendered}</div>`;
	$(page.body).html(rendered);

	$(page.body)
		.off("click", ".mform-list-item-row")
		.on("click", ".mform-list-item-row", function () {
			let dt = $(this).data("doctype");
			let dn = $(this).data("docname");
			frappe.set_route("form-list", dt, dn);
		});
};
