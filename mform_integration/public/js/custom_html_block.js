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
		<div class="d-flex align-items-center justify-content-center">
			<div class="w-100">
				<div class="card border rounded-3 shadow-sm">
					<div class="card-body d-flex align-items-center gap-3 py-3 px-4">

						<!-- Icon -->
						<div class="card bg-opacity-10 rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style="width:52px; height:52px;">
							${frappe.utils.icon('edit')}
						</div>

						<!-- Content -->
						<div class="flex-grow-1 pl-3">
							<div class="fw-bold text-dark mb-1">{doc.programme_name}</div>
							<span class="badge text-secondary bg-light border fw-normal mb-2" style="font-size:0.72rem;">{doc.name}</span>
							<p class="text-muted mb-0 small">
								Flagship preventive healthcare program improving health and well-being of mothers, children, and adolescent girls in underserved communities.
							</p>
						</div>

						<!-- Stats -->
						<div class="d-flex align-items-center gap-4 flex-shrink-0 text-center ms-3">

							<div>
								<div class="fw-bold fs-5 text-dark lh-1">{doc.mform_form_mapper.length}</div>
								<div class="text-uppercase text-muted" style="font-size:0.65rem; letter-spacing:0.06em;">Total Forms</div>
							</div>

							<div class="vr"></div>

							<div>
								<div class="fw-bold fs-5 text-dark lh-1">124</div>
								<div class="text-uppercase text-muted" style="font-size:0.65rem; letter-spacing:0.06em;">Active Surveyors</div>
							</div>

							<div class="vr"></div>

							<div>
								<div class="fw-bold fs-5 text-dark lh-1">{doc.last_active}</div>
								<div class="text-uppercase text-muted" style="font-size:0.65rem; letter-spacing:0.06em;">Last Active</div>
							</div>

						</div>

					</div>
				</div>
			</div>
		</div>
	`);
}
