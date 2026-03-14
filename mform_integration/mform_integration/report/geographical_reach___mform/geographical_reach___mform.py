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
		{"fieldname": "name", "label": _("Record"), "fieldtype": "Data", "width": 200},
		{"fieldname": "latitude", "label": _("Latitude"), "fieldtype": "Float", "width": 120},
		{"fieldname": "longitude", "label": _("Longitude"), "fieldtype": "Float", "width": 120},
	]


def get_data(doctype):
	meta = frappe.get_meta(doctype)
	has_coordinates = any(f.fieldname == "coordinates" for f in meta.fields)

	if not has_coordinates:
		return []

	table = f"`tab{doctype}`"
	rows = frappe.db.sql(
		f"""
		SELECT name, coordinates
		FROM {table}
		WHERE coordinates IS NOT NULL AND coordinates != ''
		ORDER BY creation DESC
		""",
		as_dict=True,
	)

	data = []
	for row in rows:
		lat, lng = parse_coordinates(row.get("coordinates"))
		if lat and lng:
			data.append({
				"name": row["name"],
				"latitude": lat,
				"longitude": lng,
			})

	return data


def parse_coordinates(value):
	if not value:
		return None, None
	try:
		parts = str(value).split(",")
		if len(parts) == 2:
			return float(parts[0].strip()), float(parts[1].strip())
	except (ValueError, TypeError):
		pass
	return None, None
