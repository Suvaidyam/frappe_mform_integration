from mform_integration.services.requests import Client


class MForm:
	def __init__(self, mform_settings):
		self.mform_settings = mform_settings
		self.client = Client(
			mform_settings.url,
			headers={
				"organisation": mform_settings.organisation_id,
				"project": mform_settings.project_id,
				"x-access-token": mform_settings.token,
				"Content-Type": "application/json",
			},
		)

	def update_action_status_response_by_id(self, response_id, form_id, action_status, action_remarks=""):
		data = [
			{"shortKey": "action_status", "answer": [{"value": action_status, "label": "", "textValue": ""}]},
			{
				"shortKey": "action_remarks",
				"answer": [{"value": action_remarks, "label": "", "textValue": action_remarks}],
			},
		]
		payload = {"data": data}
		print("payload:", payload)
		url = f"/admin-service/specific-question-update/{response_id}?formId={form_id}&bypassEncryption=true&byPassValidation=true"
		return self.client.post(url, json=payload)
