// Copyright (c) 2026, tech@suvaidyam.com and contributors
// For license information, please see license.txt

frappe.query_reports["Form List Report"] = {
	filters: [
		{
			"fieldname": "form",
			"label": __("Search Form"),
			"fieldtype": "Data",
		},
		{
			"fieldname": "parent_doctype",
			"label": __("Parent Doctype"),
			"fieldtype": "Link",
			"options": "DocType"
		},
		{
			"fieldname": "parent_docname",
			"label": __("Parent Docname"),
			"fieldtype": "Data",
		},
	],
};
