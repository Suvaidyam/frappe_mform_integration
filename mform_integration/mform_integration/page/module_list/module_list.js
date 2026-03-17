frappe.pages["module-list"].on_page_load = function (wrapper) {
	wrapper.mform_page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Modules"),
		single_column: true,
	});
};

frappe.pages["module-list"].on_page_show = async function (wrapper) {
	let page = wrapper.mform_page;
	page.clear_secondary_action();

	$(page.body).html(`
		<div style="display:flex;justify-content:center;align-items:center;height:80vh;">
			<div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;">
				<span class="sr-only">Loading...</span>
			</div>
		</div>
	`);

	let settings = null;
	try {
		settings = await frappe.call("mform_integration.apis.api.get_mform_settings");
		settings = settings.message || null;
		// settings = await frappe.db.get_doc("mForm Settings"); --- IGNORE ---
	} catch (e) {
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("warning", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);text-align:center;max-width:400px;">
					${__("mForm Settings not found. The doctype may not exist or is not set up.")}
				</p>
				<p style="margin-top:8px;font-size:13px;color:var(--text-light);">
					${__("Configure")} <a href="/app/mform-settings">${__("mForm Settings")}</a> ${__("and add modules in Module Integration.")}
				</p>
			</div>
		`);
		return;
	}

	let modules = (settings && settings.module_integration) ? settings.module_integration : [];
	if (!modules.length) {
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("setting-gear", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);">
					${__("No modules configured. Add modules in")}
					<a href="/app/mform-settings">${__("mForm Settings")}</a>
				</p>
			</div>
		`);
		return;
	}

	let cards = modules
		.map(
			(row, idx) => {
				let delay = Math.min(idx * 50, 400);
				return `
		<div class="module-card" data-module="${encodeURIComponent(row.module)}"
			style="padding:20px 24px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;
				cursor:pointer;transition:box-shadow .2s,border-color .2s,opacity .25s ease,transform .25s ease;
				transition-delay:${delay}ms;display:flex;align-items:center;gap:16px;
				opacity:0;transform:translateY(10px);">
			<div style="width:44px;height:44px;border-radius:10px;background:var(--bg-blue);
				display:flex;align-items:center;justify-content:center;flex-shrink:0;">
				${frappe.utils.icon("list", "md")}
			</div>
			<div style="min-width:0;">
				<div style="font-size:15px;font-weight:600;color:var(--text-color);">${row.module}</div>
				<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
					${__("Interface")}: ${row.module_interface || "\u2014"}
				</div>
			</div>
			<div style="margin-left:auto;color:var(--text-muted);">
				${frappe.utils.icon("right", "sm")}
			</div>
		</div>
	`;
			}
		)
		.join("");

	$(page.body).html(`
		<style>.module-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.08);border-color:#cbd5e1 !important;}</style>
		<div class="p-4 module-list-content" style="margin:0 auto;opacity:0;transition:opacity 0.2s ease;">
			<div style="display:flex;flex-direction:column;gap:10px;">
				${cards}
			</div>
		</div>
	`);

	const $content = $(page.body).find(".module-list-content");
	const $cards = $(page.body).find(".module-card");
	requestAnimationFrame(() => {
		$content.css("opacity", "1");
		requestAnimationFrame(() => {
			$cards.css({ opacity: "1", transform: "translateY(0)" });
		});
	});

	frappe.breadcrumbs.add({
		type: "Custom",
		items: [{ route: "/app/module-list", label: __("Modules") }],
	});

	$(page.body)
		.off("click", ".module-card")
		.on("click", ".module-card", function () {
			let module = decodeURIComponent($(this).data("module"));
			frappe.set_route("list-view", module);
		});
};
