frappe.ui.form.on("Custom HTML Block", {
	refresh(frm) {
		if (frm.doc.is_mform) {
			render_mform_interaction(frm);
		}
	},
	is_mform(frm) {
		if (frm.doc.is_mform) {
			render_mform_interaction(frm);
		}
	},
});

function render_mform_interaction(frm) {
	let wrapper = frm.fields_dict.mform_interaction_html;
	if (!wrapper || !wrapper.$wrapper) return;

	wrapper.$wrapper.html(`
			<div class="card border rounded-1 mb-2" style="background:#F4F5F6;">
				<div class="card-body align-items-center gap-3 py-3 px-4">
					<p>// here doc provided by default</p>
					<p>{doc.name}</p>

				</div>
			</div>
	`);
}
