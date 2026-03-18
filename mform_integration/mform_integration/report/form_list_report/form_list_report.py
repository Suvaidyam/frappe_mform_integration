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

	# Handle filter format from SvaDataTable: ["like", "%value%"]
	if isinstance(form_search, (list, tuple)):
		form_search = form_search[-1] if form_search else None

	if not parent_doctype or not parent_docname:
		return []

	# Fetch parent document first to get Form Mapper child table
	try:
		parent_doc = frappe.get_doc(parent_doctype, parent_docname)
	except frappe.DoesNotExistError:
		return []
	except Exception as e:
		frappe.logger().error(f"Error fetching parent doc {parent_doctype}/{parent_docname}: {str(e)}")
		return []

	# Find all child table fields that contain "form" and have "form" attribute
	forms = []
	meta = frappe.get_meta(parent_doctype)
	
	for field in meta.fields:
		if field.fieldtype == "Table":
			child_table_name = field.options
			# Check if this child table has a "form" field
			child_meta = frappe.get_meta(child_table_name)
			has_form_field = any(f.fieldname == "form" for f in child_meta.fields)
			
			if has_form_field and hasattr(parent_doc, field.fieldname):
				rows = getattr(parent_doc, field.fieldname, [])
				for row in rows:
					if hasattr(row, "form") and row.form:
						forms.append(row.form)

	if form_search:
		forms = [f for f in forms if form_search.lower() in f.lower()]

	if not forms:
		return []

	# Aggregate response counts for each form using frappe.get_list
	stats_map = {}
	for form_dt in forms:
		try:
			# Check if form DocType exists
			if not frappe.db.exists("DocType", form_dt):
				stats_map[form_dt] = {
					"response_count": 0,
					"last_response": None
				}
				continue

			# Get all records for this form doctype with permission checks
			records = frappe.get_list(
				form_dt,
				fields=["creation"],
				order_by="creation desc",
				limit_page_length=None
			)

			response_count = len(records) if records else 0
			last_response = records[0].get("creation") if records else None

			stats_map[form_dt] = {
				"response_count": response_count,
				"last_response": last_response
			}
		except Exception as e:
			# Skip forms the user doesn't have access to or if there's an error
			frappe.logger().warning(f"Error fetching stats for form {form_dt}: {str(e)}")
			stats_map[form_dt] = {
				"response_count": 0,
				"last_response": None
			}

	# Fetch DocType creation dates from system metadata
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
