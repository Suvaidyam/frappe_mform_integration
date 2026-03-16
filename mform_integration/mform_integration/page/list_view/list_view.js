frappe.pages["list-view"].on_page_load = function (wrapper) {
	wrapper.mform_page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "List View",
		single_column: true,
	});
};

frappe.pages["list-view"].on_page_show = async function (wrapper) {
	let page = wrapper.mform_page;
	if (!page) return;
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
			const return_doctype = doctype;
			frappe.route_hooks.after_save = function () {
				setTimeout(() => {
					frappe.set_route("list-view", return_doctype);
				}, 0);
			};
			frappe.set_route("Form", doctype, "new");
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

	let settings = null;
	try {
		settings = await frappe.db.get_doc("mForm Settings");
	} catch (e) {
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("warning", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);text-align:center;max-width:400px;">
					${__("mForm Settings not found. Configure it and add this module in Module Integration.")}
				</p>
				<p style="margin-top:8px;font-size:13px;color:var(--text-light);">
					<a href="/app/module-list">${__("Module List")}</a> · <a href="/app/mform-settings">${__("mForm Settings")}</a>
				</p>
			</div>
		`);
		return;
	}

	let module_integration = (settings && settings.module_integration) ? settings.module_integration : [];
	let match = module_integration.find((row) => row.module === doctype);
	if (!match) {
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("info", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);text-align:center;max-width:400px;">
					${__("This module is not in Module Integration. Add it in")} <a href="/app/mform-settings">${__("mForm Settings")}</a> ${__("to use list view here.")}
				</p>
				<p style="margin-top:8px;font-size:13px;color:var(--text-light);">
					<a href="/app/module-list">${__("Module List")}</a>
				</p>
			</div>
		`);
		return;
	}

	let module_interface = match.module_interface || null;
	let data = await frappe.call("mform_integration.apis.api.get_module_list", { doctype: doctype });
	data = data.message || [];
    
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

	let template = null;
	if (module_interface && String(module_interface).trim() !== "") {
		try {
			let custom_blocks = await frappe.db.get_doc("Custom HTML Block", module_interface);
			template = custom_blocks && custom_blocks.html ? custom_blocks.html : null;
			var block_script = custom_blocks && custom_blocks.script ? custom_blocks.script : null;
			var block_style = custom_blocks && custom_blocks.style ? custom_blocks.style : null;
		} catch (err) {
			template = null;
		}
	}
	if (!template) {
		template = "<div>{doc.name}</div>";
	}

	let rendered = data
		.map((doc, idx) => {
			let html = template
				.replace(/\{frappe\.utils\.icon\(['"]([^'"]+)['"]\)\}/g, (match, icon) => {
					return frappe.utils.icon(icon);
				})
				.replace(/\{doc\.([^}]+)\}/g, (match, expr) => {
					try {
						let value = new Function('doc', 'return doc.' + expr)(doc);
						return value !== undefined && value !== null ? value : match;
					} catch (e) {
						return match;
					}
				});
			const delay = Math.min(idx * 35, 400);
			return `<div class="py-2 mform-list-item" style="cursor:pointer;opacity:0;transform:translateY(8px);transition:opacity 0.25s ease,transform 0.25s ease;transition-delay:${delay}ms;" data-doctype="${doctype}" data-docname="${doc.name}">${html}</div>`;
		})
		.join("");
	rendered = `${block_style ? `<style>${block_style}</style>` : ''}<div class="p-3 mform-list-view-content" style="opacity:0;transition:opacity 0.2s ease;">${rendered}</div>`;
	$(page.body).html(rendered);

	const $content = $(page.body).find(".mform-list-view-content");
	const $items = $(page.body).find(".mform-list-item");
	$(page.body).off("click", ".mform-list-item").on("click", ".mform-list-item", function () {
		let dt = $(this).data("doctype");
		let dn = $(this).data("docname");
		frappe.set_route("form-list", dt, dn);
	});

	requestAnimationFrame(() => {
		$content.css("opacity", "1");
		requestAnimationFrame(() => {
			$items.css({ opacity: "1", transform: "translateY(0)" });
		});
	});

	if (block_script) {
		$items.each(function (idx) {
			let root_element = this;
			let doc = data[idx];
			try {
				new Function('root_element', 'doc', 'frappe', block_script)(root_element, doc, frappe);
			} catch (e) {
				console.error("Error executing block script for item", doc.name, e);
			}
		});
	}
};
