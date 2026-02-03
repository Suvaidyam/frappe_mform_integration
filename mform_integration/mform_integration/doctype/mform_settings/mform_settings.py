# Copyright (c) 2026, tech@suvaidyam.com and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
from mform_integration.services.mform import MForm
class mFormSettings(Document):
    def get_mform_client(self):
        return MForm(self)
