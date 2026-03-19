import frappe
from frappe.utils import get_first_day_of_week, get_datetime, now_datetime, add_days, today


@frappe.whitelist()
def get_mform_settings():
	try:
		settings = frappe.get_doc("mForm Settings","mForm Settings", ignore_permissions=True)
		return settings.as_dict()
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Error fetching mForm Settings")
		return None
@frappe.whitelist()
def get_module_list(doctype):
	names = frappe.get_list(
		doctype,
		pluck="name",
		order_by="creation desc",
		limit=1000
	)

	result = []

	for name in names:
		doc = frappe.get_doc(doctype, name)
		doc_dict = doc.as_dict()
		doc_dict["creation"] = frappe.utils.get_datetime(
			doc_dict["creation"]
		).strftime("%Y-%m-%d %H:%M:%S")

		# check all form latest response modified or creation time returned
		last_active = get_latest_overall_doc(doc.mform_form_mapper)
		doc_dict["last_active"] = time_ago(last_active.get("creation")) if last_active else '--'

		result.append(doc_dict)

	return result

@frappe.whitelist()
def get_form_list(doctype, docname):
	doc = frappe.get_doc(doctype, docname)
	result = []

	for item in doc.mform_form_mapper or []:
		form_dt = item.form
		count = frappe.db.count(form_dt)

		doc_create = frappe.db.get_all("DocType", filters={"name": form_dt}, pluck="creation", limit=1)
		last = frappe.get_all(form_dt, fields=["creation"], order_by="creation desc", limit=1)

		result.append(
			{
				"form": form_dt,
				"count": count or 0,
				"created": doc_create[0],
				"last_response": last[0].creation if last else None,
			}
		)

	return result


@frappe.whitelist()
def get_form_dashboard(doctype):
	total = frappe.db.count(doctype)
	week_start = get_first_day_of_week(frappe.utils.today())
	this_week = frappe.db.count(doctype, filters={"creation": [">=", week_start]})

	return {
		"total": total or 0,
		"this_week": this_week or 0,
	}


# @frappe.whitelist()
# def get_form_list_stats(parent_doctype, parent_docname):
# 	forms = frappe.db.sql(
# 		"""SELECT form FROM `tabForm Mapper`
# 		WHERE parent = %s AND parenttype = %s ORDER BY idx""",
# 		(parent_docname, parent_doctype),
# 		pluck="form",
# 	)

# 	if not forms:
# 		return {"total": 0, "active_surveyors": 0, "this_week": 0, "last_activity": "--"}

# 	total = 0
# 	this_week = 0
# 	all_owners = set()
# 	latest_creation = None
# 	all_states = set()
# 	all_districts = set()
# 	all_blocks = set()

# 	thirty_days_ago = add_days(today(), -30)
# 	seven_days_ago = add_days(today(), -7)

# 	for dt in forms:
# 		meta = frappe.get_meta(dt)

# 		# Total count (permission-filtered)
# 		count_res = frappe.get_list(dt, fields=["count(name) as total"], ignore_permissions=False)
# 		total += (count_res[0].total if count_res else 0) or 0

# 		# This week count
# 		week_res = frappe.get_list(
# 			dt,
# 			filters={"creation": [">=", seven_days_ago]},
# 			fields=["count(name) as total"],
# 			ignore_permissions=False,
# 		)
# 		this_week += (week_res[0].total if week_res else 0) or 0

# 		# Active surveyors (distinct owners in last 30 days)
# 		owners = frappe.get_list(
# 			dt,
# 			filters={"creation": [">=", thirty_days_ago]},
# 			fields=["distinct owner as owner"],
# 			ignore_permissions=False,
# 			limit_page_length=0,
# 		)
# 		all_owners.update(row.owner for row in owners)

# 		# Last activity
# 		latest = frappe.get_list(
# 			dt,
# 			fields=["max(creation) as latest"],
# 			ignore_permissions=False,
# 		)
# 		if latest and latest[0].latest:
# 			dt_time = get_datetime(latest[0].latest)
# 			if not latest_creation or dt_time > latest_creation:
# 				latest_creation = dt_time

# 		# Geographic reach — dynamically detect fields
# 		for field, collection in [("state", all_states), ("district", all_districts), ("block", all_blocks)]:
# 			if meta.has_field(field):
# 				values = frappe.get_list(
# 					dt,
# 					fields=[f"distinct `{field}` as val"],
# 					filters=[[field, "is", "set"]],
# 					ignore_permissions=False,
# 					limit_page_length=0,
# 				)
# 				collection.update(row.val for row in values if row.val)

# 	return {
# 		"total": total,
# 		"active_surveyors": len(all_owners),
# 		"this_week": this_week,
# 		"last_activity": time_ago(latest_creation) if latest_creation else "--",
# 		"states_reached": len(all_states),
# 		"districts_reached": len(all_districts),
# 		"blocks_reached": len(all_blocks),
# 	}

@frappe.whitelist()
def get_form_list_stats(parent_doctype=None, parent_docname=None, doctype=None):
	# If doctype is passed → only use that
	if doctype:
		forms = [doctype]
	else:
		# Get forms from parent document's child table dynamically
		try:
			parent_doc = frappe.get_doc(parent_doctype, parent_docname)
		except (frappe.DoesNotExistError, Exception):
			return {
				"total": 0,
				"active_surveyors": 0,
				"this_week": 0,
				"last_activity": "--",
				"states_reached": 0,
				"districts_reached": 0,
				"blocks_reached": 0,
			}

		# Find all child table fields that contain "form"
		forms = []
		meta = frappe.get_meta(parent_doctype)

		for field in meta.fields:
			if field.fieldtype == "Table":
				child_table_name = field.options
				child_meta = frappe.get_meta(child_table_name)
				has_form_field = any(f.fieldname == "form" for f in child_meta.fields)

				if has_form_field and hasattr(parent_doc, field.fieldname):
					rows = getattr(parent_doc, field.fieldname, [])
					for row in rows:
						if hasattr(row, "form") and row.form:
							forms.append(row.form)

	if not forms:
		return {
			"total": 0,
			"active_surveyors": 0,
			"this_week": 0,
			"last_activity": "--",
			"states_reached": 0,
			"districts_reached": 0,
			"blocks_reached": 0,
		}

	total = 0
	this_week = 0
	all_owners = set()
	latest_creation = None
	all_states = set()
	all_districts = set()
	all_blocks = set()

	thirty_days_ago = add_days(today(), -30)
	seven_days_ago = add_days(today(), -7)

	for dt in forms:
		meta = frappe.get_meta(dt)

		# Total count
		count_res = frappe.get_list(
			dt,
			fields=["count(name) as total"],
			ignore_permissions=False
		)
		total += (count_res[0].total if count_res else 0) or 0

		# This week count
		week_res = frappe.get_list(
			dt,
			filters={"creation": [">=", seven_days_ago]},
			fields=["count(name) as total"],
			ignore_permissions=False,
		)
		this_week += (week_res[0].total if week_res else 0) or 0

		# Active surveyors (distinct unique owners in last 30 days)
		owners = frappe.get_list(
			dt,
			filters={"creation": [">=", thirty_days_ago]},
			fields=["owner"],
			distinct=True,
			ignore_permissions=False,
			limit_page_length=0,
		)
		all_owners.update(row.owner for row in owners)

		# Last activity
		latest = frappe.get_list(
			dt,
			fields=["max(creation) as latest"],
			ignore_permissions=False,
		)
		if latest and latest[0].latest:
			dt_time = get_datetime(latest[0].latest)
			if not latest_creation or dt_time > latest_creation:
				latest_creation = dt_time

		# Geographic reach — dynamically detect fields by Link options
		geographic_mappings = [
			("State", all_states),
			("District", all_districts),
			("Block", all_blocks),
		]

		for referenced_doctype, collection in geographic_mappings:
			# Find field that links to this doctype
			field_name = None
			for field in meta.fields:
				if field.fieldtype == "Link" and field.options == referenced_doctype:
					field_name = field.fieldname
					break

			if field_name:
				values = frappe.get_list(
					dt,
					fields=[f"distinct `{field_name}` as val"],
					filters=[[field_name, "is", "set"]],
					ignore_permissions=False,
					limit_page_length=0,
				)
				collection.update(row.val for row in values if row.val)

	return {
		"total": total,
		"active_surveyors": len(all_owners),
		"this_week": this_week,
		"last_activity": time_ago(latest_creation) if latest_creation else "--",
		"states_reached": len(all_states),
		"districts_reached": len(all_districts),
		"blocks_reached": len(all_blocks),
	}

def get_latest_overall_doc(doctype_list):
	latest_doc = None
	latest_time = None

	if not doctype_list:
		return None

	for row in doctype_list:
		# row can be a plain doctype string, a dict, or a child row object
		if isinstance(row, str):
			dt = row
		elif isinstance(row, dict):
			dt = row.get("form") or row.get("doctype")
		else:
			dt = getattr(row, "form", None) or getattr(row, "doctype", None)

		if not dt:
			continue

		doc = frappe.get_all(
			dt,
			fields=["name", "creation", "modified"],
			order_by="creation desc",
			limit=1
		)

		if doc:
			doc = doc[0]
			doc_time = get_datetime(doc.creation)

			if not latest_time or doc_time > latest_time:
				latest_time = doc_time
				latest_doc = {
					"doctype": dt,
					"name": doc.name,
					"creation": doc.creation
				}

	return latest_doc


def time_ago(dt_value):
	if not dt_value:
		return None

	diff = now_datetime() - get_datetime(dt_value)
	seconds = int(diff.total_seconds())

	if seconds < 60:
		return "just now"
	elif seconds < 3600:
		m = seconds // 60
		return f"{m}m ago"
	elif seconds < 86400:
		h = seconds // 3600
		return f"{h}h ago"
	elif seconds < 2592000:
		d = seconds // 86400
		return f"{d}d ago"
	elif seconds < 31536000:
		mo = seconds // 2592000
		return f"{mo}mo ago"
	else:
		y = seconds // 31536000
		return f"{y}y ago"