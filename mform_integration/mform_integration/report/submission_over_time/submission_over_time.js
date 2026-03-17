// Copyright (c) 2026, tech@suvaidyam.com and contributors
// For license information, please see license.txt

frappe.query_reports["Submission Over Time"] = {
	filters: [
		{
			"fieldname": "reference_doctype",
			"label": __("Doctype"),
			"fieldtype": "Data",
		},
	],
};
