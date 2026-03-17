import frappe
from frappe import _


def execute(filters=None):
	if not filters:
		filters = {}

	doctype = filters.get("reference_doctype")
	if not doctype or not frappe.db.exists("DocType", doctype):
		return get_columns(), [], None, None

	columns = get_columns()
	data = get_data(doctype)

	return columns, data


def get_columns():
	return [
		{"fieldname": "state", "label": _("State"), "fieldtype": "Data", "width": 200},
		{"fieldname": "response_count", "label": _("Responses"), "fieldtype": "Int", "width": 150},
	]


def get_data(doctype):
	meta = frappe.get_meta(doctype)
	has_state = any(f.fieldname == "state" for f in meta.fields)

	if not has_state:
		return []

	table = f"`tab{doctype}`"
	rows = frappe.db.sql(
		f"""
		SELECT
			st.state_name AS state,
			COUNT(*) AS response_count
		FROM {table}
		LEFT JOIN `tabState` AS st ON st.name = {table}.state
		WHERE state IS NOT NULL AND state != ''
		GROUP BY state
		ORDER BY response_count DESC
		""",
		as_dict=True,
	)

	return rows

