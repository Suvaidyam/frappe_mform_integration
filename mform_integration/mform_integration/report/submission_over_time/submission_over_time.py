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
	# Use frappe.get_list to fetch records with permission checks
	records = frappe.get_list(
		doctype,
		fields=['creation'],
		limit_page_length=None
	)

	if not records:
		return []

	# Aggregate by week in Python
	from datetime import datetime, timedelta
	week_map = {}

	for record in records:
		creation = record.get('creation')
		if creation:
			# Convert to datetime if string
			if isinstance(creation, str):
				creation = datetime.fromisoformat(creation)
			
			# Calculate year and week number (ISO 8601)
			iso_calendar = creation.isocalendar()
			year = iso_calendar[0]
			week_no = iso_calendar[1]
			week_key = (year, week_no)

			# Calculate week start date (Monday)
			week_start = creation - timedelta(days=creation.weekday())

			if week_key not in week_map:
				week_map[week_key] = {
					'week_start': week_start.date(),
					'count': 0
				}
			week_map[week_key]['count'] += 1

	# Build result sorted by year and week
	rows = []
	for (year, week_no), data in sorted(week_map.items()):
		rows.append({
			'week': f"{year}-W{week_no:02d}",
			'week_start': data['week_start'],
			'submission_count': data['count']
		})

	return rows

