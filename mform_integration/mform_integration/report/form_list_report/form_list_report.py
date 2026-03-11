import frappe
from frappe import _


def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"fieldname": "form_name", "label": _("Form Name"), "fieldtype": "Data", "width": 200},
		{"fieldname": "status", "label": _("Status"), "fieldtype": "Data", "width": 100},
		{"fieldname": "response_count", "label": _("Response Count"), "fieldtype": "Int", "width": 120},
		{"fieldname": "created_date", "label": _("Created Date"), "fieldtype": "Date", "width": 120},
		{"fieldname": "last_response", "label": _("Last Response"), "fieldtype": "Datetime", "width": 150},
	]


def get_data(filters):
	if not filters:
		filters = {}

	parent_doctype = filters.get("parent_doctype")
	parent_docname = filters.get("parent_docname")
	form_search = filters.get("form")

	if not parent_doctype or not parent_docname:
		return []

	conditions = "WHERE parent = %s AND parenttype = %s"
	values = [parent_docname, parent_doctype]

	if form_search:
		conditions += " AND form LIKE %s"
		values.append(f"%{form_search}%")

	forms = frappe.db.sql(
		f"""
		SELECT form FROM `tabForm Mapper`
		{conditions}
		ORDER BY idx
		""",
		tuple(values),
		pluck="form",
	)

	if not forms:
		return []

	# UNION ALL for exact COUNT(*) and MAX(creation) from each form table
	union_parts = []
	for form_dt in forms:
		table = f"`tab{form_dt}`"
		escaped_name = frappe.db.escape(form_dt)
		union_parts.append(
			f"SELECT {escaped_name} AS form_name, "
			f"COUNT(*) AS response_count, "
			f"MAX(creation) AS last_response "
			f"FROM {table}"
		)

	stats = frappe.db.sql("\nUNION ALL\n".join(union_parts), as_dict=True)
	stats_map = {row.form_name: row for row in stats}

	dt_creation = frappe.db.sql(
		"SELECT name, creation AS created_date FROM `tabDocType` WHERE name IN %s",
		(forms,),
		as_dict=True,
	)
	creation_map = {row.name: row.created_date for row in dt_creation}

	result = []
	for form_dt in forms:
		s = stats_map.get(form_dt, {})
		count = s.get("response_count", 0) or 0
		result.append({
			"form_name": form_dt,
			"status": "Active" if count > 0 else "Draft",
			"response_count": count,
			"created_date": creation_map.get(form_dt),
			"last_response": s.get("last_response"),
		})

	return result
