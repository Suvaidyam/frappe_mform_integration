import frappe
from frappe.utils import get_first_day_of_week


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
