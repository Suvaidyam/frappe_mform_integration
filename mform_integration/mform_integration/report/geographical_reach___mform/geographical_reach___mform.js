// Copyright (c) 2026, tech@suvaidyam.com and contributors
// For license information, please see license.txt

frappe.query_reports["Geographical Reach - mForm"] = {
	filters: [
		{
			"fieldname": "reference_doctype",
			"label": __("Doctype"),
			"fieldtype": "Link",
			"options": "DocType",
			"reqd": 1,
		},
	],
};
