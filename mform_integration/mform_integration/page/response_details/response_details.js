frappe.pages['response-details'].on_page_load = function(wrapper) {
	wrapper.response_page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Response Details',
		single_column: true
	});
};

frappe.pages['response-details'].on_page_show = async function(wrapper) {
	let page = wrapper.response_page;
	page.clear_actions();
	page.clear_custom_actions();
	page.clear_actions_menu();
	page.clear_indicator();
	let route = frappe.get_route() || [];
	let name = route[1] ? decodeURIComponent(route[1]) : null;
	let doctype = route[2] ? decodeURIComponent(route[2]) : '';
	let source_doctype = route[3] ? decodeURIComponent(route[3]) : '';
	let source_docname = route.length > 4
		? route.slice(4).map(s => decodeURIComponent(s)).join('/')
		: '';

	if (name) {
		let title  = await frappe.utils.fetch_link_title(doctype, name) || name;
		page.set_title(title);
	}

	frappe.breadcrumbs.add({
		type: "Custom",
		items: frappe.mform_integration.get_breadcrumb_items({
			segment: "response-details",
			name: name || "",
			doctype: doctype,
			source_doctype: source_doctype,
			source_docname: source_docname,
		}),
	});

	// Cleanup previous map instance
	if (wrapper._response_map) {
		wrapper._response_map.destroy();
		wrapper._response_map = null;
	}

	if (!name || !doctype) {
		page.set_title("Response Details");
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("file", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);">
					${__("No response selected.")}
				</p>
			</div>
		`);
		return;
	}

	// Loading spinner
	$(page.body).html(`
		<div style="display:flex;justify-content:center;align-items:center;height:60vh;">
			<div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;">
				<span class="sr-only">Loading...</span>
			</div>
		</div>
	`);

	// Fetch data via dt_api
	let [meta_result, data] = await Promise.all([
		frappe.xcall("frappe_theme.dt_api.get_meta_fields", {
			doctype: doctype, _type: "List", meta_attached: true
		}),
		frappe.xcall("frappe_theme.dt_api.get_dt_list", {
			doctype: doctype,
			filters: JSON.stringify([[doctype, "name", "=", name]]),
			fields: ["*"],
			limit_page_length: 1
		})
	]);

	let fields = meta_result ? meta_result.fields : [];
	let doc = data && data.length ? data[0] : null;

	if (!doc) {
		$(page.body).html(`
			<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:80vh;background:white;">
				<div style="font-size:48px;color:var(--text-light);">
					${frappe.utils.icon("warning", "xl")}
				</div>
				<p style="margin-top:16px;font-size:16px;color:var(--text-muted);">
					${__("Response not found.")}
				</p>
			</div>
		`);
		return;
	}

	// Show workflow state in page header
	if (doc.workflow_state) {
		page.set_indicator(doc.workflow_state, get_workflow_state_color(doc.workflow_state));
	}

	// Edit button - redirect to main form with back icon
	let return_route = frappe.get_route_str();
	page.add_inner_button(frappe.utils.icon("edit"), () => {
		frappe.route_hooks.after_page_load = function (frm_page) {
			frm_page.add_inner_button(frappe.utils.icon("arrow-left"), () => {
				frappe.set_route(return_route);
			});
		};
		frappe.set_route("Form", doctype, name);
	});

	// Setup workflow action buttons
	await setup_workflow_actions(wrapper, page, doc, doctype);

	// Determine rendering mode: check form_interface
	let form_interface = null;
	if (source_doctype && source_docname) {
		try {
			let parent_doc = await frappe.db.get_doc(source_doctype, source_docname);
			let mapper_row = (parent_doc.mform_form_mapper || []).find(r => r.form === doctype);
			if (mapper_row && mapper_row.form_interface && String(mapper_row.form_interface).trim() !== "") {
				form_interface = mapper_row.form_interface;
			}
		} catch (e) {
			form_interface = null;
		}
	}

	if (form_interface) {
		await render_custom_interface(wrapper, page, doc, fields, form_interface);
	} else {
		await render_default_view(wrapper, page, doc, fields);
	}
};

// ─── Default View ────────────────────────────────────────────────────

async function render_default_view(wrapper, page, doc, fields) {
	let display_fields = get_display_fields(fields);
	let data_section_html = await build_data_section(doc, display_fields);
	let meta_info_html = build_meta_info(doc, fields);
	let geo_html = build_geo_section(doc, fields);

	$(page.body).html(`
		<style>
			.response-detail-container { display: flex; gap: 20px; padding: 20px; }
			.response-detail-left { flex: 2; min-width: 0; }
			.response-detail-right { flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 16px; }
			.mform-detail-card {
				background: #fff;
				border-radius: 10px;
				border: 1px solid #e2e8f0;
				padding: 16px;
			}
			.response-data-grid {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 20px 32px;
			}
			.response-field-label {
				font-size: 11px;
				text-transform: uppercase;
				color: #6c757d;
				font-weight: 600;
				letter-spacing: 0.5px;
			}
			.response-field-value {
				font-size: 14px;
				color: var(--text-color);
				margin-top: 4px;
				word-break: break-word;
			}
			.meta-info-row {
				display: flex;
				flex-direction: column;
				padding: 8px 0;
			}
			.meta-info-row:not(:last-child) {
				border-bottom: 1px solid #f1f5f9;
			}
			.meta-info-label {
				font-size: 12px;
				font-weight: 600;
				color: var(--text-muted);
			}
			.meta-info-value {
				font-size: 13px;
				color: #6c757d;
				margin-top: 2px;
			}
			@media (max-width: 768px) {
				.response-detail-container { flex-direction: column; }
				.response-data-grid { grid-template-columns: 1fr; }
			}
		</style>
		<div class="response-detail-container" style="opacity:0;transition:opacity 0.2s ease;">
			<div class="response-detail-left">
				<div class="mform-detail-card">
					<div style="font-size:16px;font-weight:600;color:#1e293b;margin-bottom:16px;">Data Section</div>
					<div class="response-data-grid">
						${data_section_html}
					</div>
				</div>
			</div>
			<div class="response-detail-right">
				<div class="mform-detail-card">
					<div style="font-size:14px;font-weight:600;color:#e74c3c;margin-bottom:12px;">Meta Info</div>
					${meta_info_html}
				</div>
				${geo_html}
			</div>
		</div>
	`);

	// Fade in
	requestAnimationFrame(() => {
		$(page.body).find(".response-detail-container").css("opacity", "1");
	});

	// Init map if geo section exists
	let coords = parse_coordinates(doc, fields);
	if (coords) {
		init_geo_map(wrapper, coords);
	}
}

function get_display_fields(fields) {
	const SYSTEM_FIELDS = new Set([
		'name', 'owner', 'creation', 'modified', 'modified_by',
		'docstatus', 'idx', 'doctype', 'parent', 'parentfield',
		'parenttype', '_user_tags', '_comments', '_assign', '_liked_by',
		'coordinates'
	]);
	const LAYOUT_FIELDTYPES = new Set([
		'Section Break', 'Column Break', 'Tab Break', 'HTML',
		'Table', 'Table MultiSelect', 'Button'
	]);
	return fields.filter(f =>
		!SYSTEM_FIELDS.has(f.fieldname) &&
		!LAYOUT_FIELDTYPES.has(f.fieldtype) &&
		!f.hidden
	);
}

async function build_data_section(doc, display_fields) {
	let items = await Promise.all(display_fields.map(async (f) => {
		let value = doc[f.fieldname];
		let formatted = await format_field_value(value, f);
		return `
			<div>
				<div class="response-field-label">${frappe.utils.escape_html(f.label || f.fieldname)}</div>
				<div class="response-field-value">${formatted}</div>
			</div>
		`;
	}));
	return items.join('');
}

async function format_field_value(value, field_def) {
	if (value === null || value === undefined || value === '') {
		return '<span style="color:var(--text-light);">—</span>';
	}
	if (field_def.fieldtype === 'Check') {
		return value ? 'Yes' : 'No';
	}
	if (field_def.fieldtype === 'Link' && field_def.options && value) {
		try {
			let title = await frappe.utils.fetch_link_title(field_def.options, value);
			return frappe.utils.escape_html(title || value);
		} catch (e) {
			return frappe.utils.escape_html(String(value));
		}
	}
	try {
		return frappe.format(value, field_def, { only_value: true }) || String(value);
	} catch (e) {
		return frappe.utils.escape_html(String(value));
	}
}

function build_meta_info(doc, fields) {
	let rows = [];

	// Submitted By
	let owner_name = doc.owner ? frappe.user.full_name(doc.owner) : '—';
	rows.push({ label: 'Submitted By', value: frappe.utils.escape_html(owner_name) });

	// Partner (auto-detect)
	let partner = detect_partner_field(fields, doc);
	if (partner) {
		rows.push({ label: partner.label, value: frappe.utils.escape_html(partner.value) });
	}

	// Submitted On
	let creation = doc.creation
		? frappe.datetime.str_to_user(doc.creation)
		: '—';
	rows.push({ label: 'Submitted On', value: creation });

	// Status
	rows.push({ label: 'Status', value: get_status_badge(doc) });

	return rows.map(r => `
		<div class="meta-info-row">
			<div class="meta-info-label">${r.label}: <span class="meta-info-value">${r.value}</span></div>
		</div>
	`).join('');
}

function detect_partner_field(fields, doc) {
	// Look for fieldname containing 'partner' or 'ngo'
	let f = fields.find(f =>
		f.fieldtype === 'Link' &&
		(f.fieldname.includes('partner') || f.fieldname.includes('ngo'))
	);
	if (f && doc[f.fieldname]) {
		return { label: f.label, value: doc[f.fieldname] };
	}
	// Look for Link field pointing to NGO/Partner doctype
	f = fields.find(f =>
		f.fieldtype === 'Link' &&
		(f.options === 'NGO' || f.options === 'Partner')
	);
	if (f && doc[f.fieldname]) {
		return { label: f.label, value: doc[f.fieldname] };
	}
	return null;
}

function get_status_badge(doc) {
	if (doc.workflow_state) {
		let color = 'gray';
		let state = doc.workflow_state;
		if (['Approved', 'Active', 'Completed', 'Submitted'].includes(state)) color = 'green';
		else if (['Pending', 'Draft', 'Open'].includes(state)) color = 'orange';
		else if (['Rejected', 'Cancelled'].includes(state)) color = 'red';
		return `<span class="indicator-pill ${color}">${frappe.utils.escape_html(state)}</span>`;
	}
	let map = {
		0: { label: 'Draft', color: 'orange' },
		1: { label: 'Submitted', color: 'green' },
		2: { label: 'Cancelled', color: 'red' }
	};
	let s = map[doc.docstatus] || map[0];
	return `<span class="indicator-pill ${s.color}">${s.label}</span>`;
}

// ─── Geo Tagging ─────────────────────────────────────────────────────

function parse_coordinates(doc, fields) {
	let has_coords = fields.some(f => f.fieldname === 'coordinates');
	if (!has_coords || !doc.coordinates) return null;
	let parts = String(doc.coordinates).split(',');
	if (parts.length === 2) {
		let lat = parseFloat(parts[0].trim());
		let lng = parseFloat(parts[1].trim());
		if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
	}
	return null;
}

function build_geo_section(doc, fields) {
	let coords = parse_coordinates(doc, fields);
	if (!coords) return '';

	return `<div class="mform-detail-card"><div id="response-geo-container"></div></div>`;
}

function init_geo_map(wrapper, coords) {
	let container = document.getElementById('response-geo-container');
	if (!container) return;
	frappe.require("geo_details.bundle.js", () => {
		wrapper._response_map = new frappe.ui.GeoDetails({
			wrapper: container,
			coords: coords,
			title: 'Household Geo Tagging',
			maximizeTitle: 'Household Geo Tagging',
			height: 250,
			zoom: 15,
			showMaximize: true,
			showFooter: true,
		});
	});
}

function get_workflow_state_color(state) {
	if (['Approved', 'Active', 'Completed', 'Submitted'].includes(state)) return 'green';
	if (['Pending', 'Draft', 'Open'].includes(state)) return 'orange';
	if (['Rejected', 'Cancelled'].includes(state)) return 'red';
	return 'blue';
}

// ─── Workflow Actions ────────────────────────────────────────────────

async function setup_workflow_actions(wrapper, page, doc, doctype) {
	// Check if active workflow exists for this doctype
	let workflow_exists = await frappe.db.exists("Workflow", {
		document_type: doctype,
		is_active: 1,
	});
	if (!workflow_exists) return;

	let transitions = [];
	try {
		let result = await frappe.call({
			method: "frappe.model.workflow.get_transitions",
			args: { doc: { ...doc, doctype: doctype } },
			silent: true,
		}).then(r => r?.message);
		transitions = result || [];
	} catch (e) {
		return;
	}

	if (!transitions.length) return;

	// Deduplicate by action name
	let seen = new Set();
	let unique_transitions = transitions.filter(t => {
		if (seen.has(t.action)) return false;
		seen.add(t.action);
		return true;
	});

	unique_transitions.forEach((transition) => {
		page.add_action_item(__(transition.action), () => {
			show_workflow_dialog(wrapper, page, doc, doctype, transition);
		});
	});
}

async function show_workflow_dialog(wrapper, page, doc, doctype, transition) {
	// Build dialog fields
	let wf_dialog_fields = JSON.parse(transition.custom_selected_fields || "[]");
	let fields = [];

	if (wf_dialog_fields.length) {
		try {
			let meta = await frappe.xcall("frappe_theme.api.get_meta", { doctype: doctype });
			if (meta?.fields) {
				fields = meta.fields
					.filter(field => wf_dialog_fields.some(f => f.fieldname == field.fieldname))
					.map(field => {
						let field_obj = wf_dialog_fields.find(f => f.fieldname == field.fieldname);
						return {
							label: field.label,
							fieldname: field.fieldname,
							fieldtype: field.fieldtype,
							default: (field_obj?.read_only || field_obj?.fetch_if_exists) && doc[field.fieldname],
							reqd: field_obj?.read_only ? 0 : field_obj?.reqd,
							read_only: field_obj?.read_only,
							options: field.options,
						};
					});
			}
		} catch (e) {
			// proceed without custom fields
		}
	}

	// Comment field
	let customFields = [];
	if (transition.is_comment_required || transition.custom_comment) {
		customFields.push({
			label: "Comment",
			fieldname: "wf_comment",
			fieldtype: "Small Text",
			reqd: transition.custom_comment_required ? 1 : 0,
		});
	}

	// Approval assignment fields
	if (transition.custom_allow_assignment) {
		try {
			let approval_fields = await frappe.xcall("frappe_theme.dt_api.get_meta_fields", {
				doctype: "Approval Assignment Child",
				_type: "Direct",
			});
			if (approval_fields) {
				approval_fields.forEach(f => {
					if (f.fieldname === "user") {
						let role_profiles = JSON.parse(transition.custom_selected_role_profile || "[]")
							.map(rp => rp.role_profile);
						f.get_query = function (row) {
							let filters = { status: "Active" };
							if (row?.role_profile) {
								filters["role_profile"] = ["=", row.role_profile];
							} else if (role_profiles.length) {
								filters["role_profile"] = ["in", role_profiles];
							}
							return { filters };
						};
					} else if (f.fieldname === "role_profile") {
						let role_profiles = JSON.parse(transition.custom_selected_role_profile || "[]")
							.map(rp => rp.role_profile);
						if (role_profiles.length) {
							f.get_query = function () {
								return { filters: { role_profile: ["in", role_profiles] } };
							};
						}
					}
				});
				customFields.push({
					label: "Approval Assignments",
					fieldname: "approval_assignments",
					fieldtype: "Table",
					options: "Approval Assignment Child",
					fields: approval_fields,
					reqd: 1,
				});
			}
		} catch (e) {
			// proceed without approval assignments
		}
	}

	// Action badge color
	let color = 'secondary';
	let ns = transition.next_state;
	if (['Approved', 'Active', 'Completed', 'Submitted'].includes(ns)) color = 'success';
	else if (['Pending', 'Draft', 'Open'].includes(ns)) color = 'warning';
	else if (['Rejected', 'Cancelled'].includes(ns)) color = 'danger';

	let popupFields = [
		{
			label: "Action",
			fieldname: "action_html",
			fieldtype: "HTML",
			options: `<p>Action: <span style="padding: 4px 8px; border-radius: 100px; color:white; font-size: 12px; font-weight: 400;" class="bg-${color}">${frappe.utils.escape_html(transition.action)}</span></p>`,
		},
		...customFields,
		...fields,
	];

	let dialog = new frappe.ui.Dialog({
		title: __("Confirm"),
		size: frappe.utils.get_dialog_size(popupFields),
		fields: popupFields,
		primary_action_label: __("Proceed"),
		primary_action: (values) => {
			frappe.dom.freeze(__("Processing..."));
			$(dialog.get_primary_btn()).prop("disabled", true);
			$(dialog.get_primary_btn()).html(
				'<span style="width: 0.75rem !important; height: 0.75rem !important;" class="spinner-border spinner-border-sm"></span> ' +
				(dialog.primary_action_label || __("Proceed"))
			);

			let updateFields = {
				...doc,
				...values,
				wf_dialog_fields: { ...values },
				doctype: doctype,
			};

			frappe.xcall("frappe.model.workflow.apply_workflow", {
				doc: updateFields,
				action: transition.action,
				is_custom_transition: transition.is_custom_transition || 0,
				is_comment_required: transition.is_comment_required || 0,
				custom_comment: transition.is_comment_required == 1 ? (values.wf_comment || "") : "",
			}).then(() => {
				frappe.show_alert({
					message: __("Action completed successfully"),
					indicator: "green",
				});
				dialog.hide();
				frappe.dom.unfreeze();
				// Reload page to reflect new state
				frappe.pages['response-details'].on_page_show(wrapper);
			}).catch((err) => {
				frappe.dom.unfreeze();
				$(dialog.get_primary_btn()).prop("disabled", false);
				$(dialog.get_primary_btn()).html(dialog.primary_action_label || __("Proceed"));
			});
		},
		secondary_action_label: __("Cancel"),
		secondary_action: () => {
			dialog.hide();
			frappe.show_alert({
				message: __("{0} Action has been cancelled.", [transition.action]),
				indicator: "orange",
			});
		},
	});
	dialog.show();
}

// ─── Custom Interface View ──────────────────────────────────────────

async function render_custom_interface(wrapper, page, doc, fields, form_interface) {
	let custom_block = null;
	try {
		custom_block = await frappe.db.get_doc("Custom HTML Block", form_interface);
	} catch (e) {
		// Fallback to default view
		render_default_view(wrapper, page, doc, fields);
		return;
	}

	let template = custom_block.html || '';
	let style = custom_block.style || '';
	let script = custom_block.script || '';

	// Resolve Link field titles before template substitution
	let link_fields = fields.filter(f => f.fieldtype === 'Link' && f.options && doc[f.fieldname]);
	let title_map = {};
	await Promise.all(link_fields.map(async (f) => {
		try {
			let title = await frappe.utils.fetch_link_title(f.options, doc[f.fieldname]);
			if (title) title_map[f.fieldname] = title;
		} catch (e) {}
	}));

	// Build a doc copy with link titles resolved
	let resolved_doc = { ...doc };
	for (let fieldname in title_map) {
		resolved_doc[fieldname] = title_map[fieldname];
	}

	// Template substitution (same pattern as list_view.js)
	let html = template
		.replace(/\{frappe\.utils\.icon\(['"]([^'"]+)['"]\)\}/g, (match, icon) => {
			return frappe.utils.icon(icon);
		})
		.replace(/\{doc\.([^}]+)\}/g, (match, expr) => {
			try {
				let value = new Function('doc', 'return doc.' + expr)(resolved_doc);
				return value !== undefined && value !== null && value !== '' ? value : '—';
			} catch (e) {
				return '—';
			}
		});

	$(page.body).html(`
		${style ? `<style>${style}</style>` : ''}
		<div class="response-detail-custom p-3" style="opacity:0;transition:opacity 0.2s ease;">
			${html}
		</div>
	`);

	// Populate #meta-info placeholder if present
	let $meta = $(page.body).find('#meta-info');
	if ($meta.length) {
		let meta_html = build_meta_info(doc, fields);
		$meta.html(`
			<div class="mform-detail-card">
				<div style="font-size:14px;font-weight:600;color:#e74c3c;margin-bottom:12px;">Meta Info</div>
				${meta_html}
			</div>
		`);
	}

	// Populate #household-geo placeholder if present
	let $geo = $(page.body).find('#household-geo');
	if ($geo.length) {
		let geo_html = build_geo_section(doc, fields);
		if (geo_html) {
			$geo.html(geo_html);
			let coords = parse_coordinates(doc, fields);
			if (coords) {
				init_geo_map(wrapper, coords);
			}
		}
	}

	// Fade in
	requestAnimationFrame(() => {
		$(page.body).find(".response-detail-custom").css("opacity", "1");
	});

	// Execute script if present
	if (script) {
		let root_element = $(page.body).find('.response-detail-custom')[0];
		try {
			new Function('root_element', 'doc', 'frappe', script)(root_element, doc, frappe);
		} catch (e) {
			console.error('Custom HTML Block script error:', e);
		}
	}
}
