/**
 * Common breadcrumb support for mform_integration pages.
 * Patches frappe.breadcrumbs to handle type: 'Custom' with items[] (route + label).
 * Ensures labels/routes are normalized so navbar never shows "undefined".
 */
;(function() {
	if (typeof frappe === 'undefined' || frappe.breadcrumbs._mform_patched) return;
	frappe.breadcrumbs._mform_patched = true;

	function normalize_breadcrumb_item(item) {
		if (item == null || typeof item !== 'object') return null;
		var route = (item.route != null && String(item.route).trim() !== '') ? String(item.route) : '/';
		var label = (item.label != null && String(item.label).trim() !== '') ? String(item.label) : (typeof __ !== 'undefined' ? __('Page') : 'Page') || 'Page';
		return { route: route, label: label };
	}

	function get_safe_items(breadcrumbs) {
		if (!breadcrumbs || !Array.isArray(breadcrumbs.items) || breadcrumbs.items.length === 0) return null;
		var out = [];
		for (var i = 0; i < breadcrumbs.items.length; i++) {
			var n = normalize_breadcrumb_item(breadcrumbs.items[i]);
			if (n) out.push(n);
		}
		return out.length ? out : null;
	}

	var _set_custom = frappe.breadcrumbs.set_custom_breadcrumbs.bind(frappe.breadcrumbs);
	frappe.breadcrumbs.set_custom_breadcrumbs = function(breadcrumbs) {
		var items = get_safe_items(breadcrumbs);
		if (items && items.length) {
			frappe.breadcrumbs.clear();
			items.forEach(function(item) {
				frappe.breadcrumbs.append_breadcrumb_element(item.route, item.label);
			});
			frappe.breadcrumbs.toggle(true);
		} else {
			_set_custom(breadcrumbs);
		}
	};
})();

/**
 * Build breadcrumb items for mform_integration pages. Single place for route/label logic.
 * @param {Object} opts - { segment: 'list-view'|'form-list'|'form-dashboard', doctype?, docname?, source_doctype?, source_docname?, form_list_label? }
 * @returns {Array<{route:string, label:string}>}
 */
function get_mform_breadcrumb_items(opts) {
	var seg = opts && opts.segment;
	var doctype = opts && (opts.doctype != null) ? String(opts.doctype) : '';
	var docname = opts && (opts.docname != null) ? String(opts.docname) : '';
	var source_doctype = opts && (opts.source_doctype != null) ? String(opts.source_doctype) : '';
	var source_docname = opts && (opts.source_docname != null) ? String(opts.source_docname) : '';
	var form_list_label = opts && (opts.form_list_label != null && opts.form_list_label !== '') ? String(opts.form_list_label) : (typeof __ !== 'undefined' ? __('Form') : 'Form') || 'Form';

	var modules = { route: '/app/module-list', label: (typeof __ !== 'undefined' ? __('Modules') : 'Modules') || 'Modules' };
	var list_view_route = doctype ? '/app/list-view/' + encodeURIComponent(doctype) : '/app/module-list';
	var list_view_label = (doctype && doctype !== '') ? doctype : ((typeof __ !== 'undefined' ? __('List View') : 'List View') || 'List View');
	var form_list_route = (doctype && docname) ? '/app/form-list/' + encodeURIComponent(doctype) + '/' + encodeURIComponent(docname) : '/app/module-list';
	var forms_label = (typeof __ !== 'undefined' ? __('Forms') : 'Forms') || 'Forms';
	var form_dashboard_label = (doctype && doctype !== '') ? doctype : ((typeof __ !== 'undefined' ? __('Form Dashboard') : 'Form Dashboard') || 'Form Dashboard');

	var items = [modules];

	if (seg === 'list-view') {
		items.push({ route: list_view_route, label: list_view_label });
		return items;
	}

	var list_doctype = (seg === 'form-list') ? doctype : source_doctype;
	items.push({
		route: list_doctype ? '/app/list-view/' + encodeURIComponent(list_doctype) : '/app/module-list',
		label: (list_doctype && list_doctype !== '') ? list_doctype : list_view_label
	});

	if (seg === 'form-list') {
		items.push({ route: form_list_route, label: form_list_label });
		return items;
	}

	if (seg === 'form-dashboard') {
		if (source_doctype && source_docname) {
			items.push({
				route: '/app/form-list/' + encodeURIComponent(source_doctype) + '/' + encodeURIComponent(source_docname),
				label: forms_label
			});
		}
		items.push({ route: '/', label: form_dashboard_label });
		return items;
	}

	if (seg === 'response-details') {
		var name = opts && (opts.name != null) ? String(opts.name) : '';
		if (source_doctype && source_docname) {
			items.push({
				route: '/app/form-list/' + encodeURIComponent(source_doctype) + '/' + encodeURIComponent(source_docname),
				label: forms_label
			});
		}
		if (doctype) {
			var dashboard_route = '/app/form-dashboard/' + encodeURIComponent(doctype);
			if (source_doctype) dashboard_route += '/' + encodeURIComponent(source_doctype);
			if (source_docname) dashboard_route += '/' + encodeURIComponent(source_docname);
			items.push({ route: dashboard_route, label: doctype });
		}
		items.push({ route: '/', label: name || 'Response Details' });
		return items;
	}

	return items;
}

if (typeof frappe !== 'undefined') {
	frappe.mform_integration = frappe.mform_integration || {};
	frappe.mform_integration.get_breadcrumb_items = get_mform_breadcrumb_items;
}
