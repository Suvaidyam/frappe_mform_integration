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
	
	# Find field with Link fieldtype and State options
	state_field = None
	for field in meta.fields:
		if field.fieldtype == "Link" and field.options == "State":
			state_field = field.fieldname
			break

	if not state_field:
		return []

	# Use frappe.get_list to fetch data with permission checks
	records = frappe.get_list(
		doctype,
		fields=[state_field],
		filters={state_field: ['!=', '']},
		limit_page_length=None
	)

	if not records:
		return []

	# Aggregate by state in Python
	state_map = {}
	for record in records:
		state = record.get(state_field)
		if state:
			state_map[state] = state_map.get(state, 0) + 1

	# Fetch state names for display
	states = frappe.get_list(
		'State',
		fields=['name', 'state_name'],
		filters={'name': ['in', list(state_map.keys())]}
	)

	state_names = {s['name']: s['state_name'] for s in states}

	# Build result with state names and convert to list sorted by count
	rows = []
	for state_code, count in sorted(state_map.items(), key=lambda x: x[1], reverse=True):
		rows.append({
			'state': state_names.get(state_code, state_code),
			'response_count': count
		})

	return rows

