# Copyright (c) 2026, tech@suvaidyam.com and contributors
# For license information, please see license.txt

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.model.document import Document

from mform_integration.services.mform import MForm
from mform_integration.uninstall import MFORM_CUSTOM_FIELDNAMES


class mFormSettings(Document):
	def get_mform_client(self):
		return MForm(self)

	def on_update(self):
		old_doc = self.get_doc_before_save()
		old_modules = set()
		if old_doc and old_doc.module_integration:
			old_modules = {row.module for row in old_doc.module_integration}

		new_modules = {row.module for row in self.module_integration} if self.module_integration else set()

		for module in old_modules - new_modules:
			self.remove_form_mapper_from_doctype(module)

		for module in new_modules - old_modules:
			self.add_form_mapper_to_doctype(module)

	def remove_form_mapper_from_doctype(self, doctype):
		for fieldname in MFORM_CUSTOM_FIELDNAMES:
			cf_name = f"{doctype}-{fieldname}"
			if frappe.db.exists("Custom Field", cf_name):
				frappe.delete_doc("Custom Field", cf_name, force=True)

		frappe.clear_cache(doctype=doctype)

	def add_form_mapper_to_doctype(self, doctype):
		if frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": "mform_form_mapper"}):
			return

		meta = frappe.get_meta(doctype)
		first_tab = self.get_first_tab_fieldname(meta)

		create_custom_fields(
			{
				doctype: [
					{
						"fieldname": "mform_mapper_section",
						"fieldtype": "Section Break",
						"label": "",
						"insert_after": first_tab,
						"hidden": 0,
					},
					{
						"fieldname": "mform_form_mapper",
						"fieldtype": "Table",
						"label": "Form Mapper",
						"options": "Form Mapper",
						"insert_after": "mform_mapper_section",
						"hidden": 0,
					},
				]
			},
			update=True,
		)

	def get_first_tab_fieldname(self, meta):
		for field in meta.fields:
			if field.fieldtype == "Tab Break":
				return field.fieldname
		return meta.fields[0].fieldname if meta.fields else None
