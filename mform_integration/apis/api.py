import frappe
from frappe.utils import get_first_day_of_week, get_datetime, now_datetime


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