import frappe

MFORM_CUSTOM_FIELDNAMES = ["mform_mapper_section", "mform_form_mapper"]


def before_uninstall():
	cleanup_custom_fields()


def cleanup_custom_fields():
	custom_fields = frappe.get_all(
		"Custom Field",
		filters={"fieldname": ["in", MFORM_CUSTOM_FIELDNAMES]},
		fields=["name", "dt"],
	)

	doctypes_to_clear = set()
	for cf in custom_fields:
		frappe.delete_doc("Custom Field", cf.name, force=True)
		doctypes_to_clear.add(cf.dt)

	for dt in doctypes_to_clear:
		frappe.clear_cache(doctype=dt)
