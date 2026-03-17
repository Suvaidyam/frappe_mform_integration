import frappe
from frappe import _


def execute(filters=None):
	if not filters:
		filters = {}

	doctype = filters.get("reference_doctype")
	if not doctype or not frappe.db.exists("DocType", doctype):
		return get_columns(), []

	columns = get_columns()
	data = get_data(doctype)

	return columns, data


def get_columns():
	return [
		{"fieldname": "week", "label": _("Week"), "fieldtype": "Data", "width": 150},
		{"fieldname": "week_start", "label": _("Week Start"), "fieldtype": "Date", "width": 120},
		{"fieldname": "submission_count", "label": _("Submissions"), "fieldtype": "Int", "width": 120},
	]


def get_data(doctype):
	table = f"`tab{doctype}`"
	rows = frappe.db.sql(
		f"""
		SELECT
			YEARWEEK(creation, 1) AS week_num,
			MIN(DATE(creation)) AS week_start,
			COUNT(*) AS submission_count
		FROM {table}
		GROUP BY week_num
		ORDER BY week_num
		""",
		as_dict=True,
	)

	for row in rows:
		week_num_str = str(row["week_num"])
		year = week_num_str[:-2]
		week_no = int(week_num_str[-2:])
		row["week"] = f"{year}-W{week_no}"

	return rows

