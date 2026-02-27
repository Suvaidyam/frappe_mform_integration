import frappe

MFORM_WORKSPACE = "mForm"
MODULE_NAME = "Grant"

# ANSI color codes for terminal messages
COLOR_OK = "\033[92m"  # green
COLOR_WARN = "\033[93m"  # yellow
COLOR_ERROR = "\033[91m"  # red
COLOR_RESET = "\033[0m"


def after_install():
	"""Create mForm workspace after app install, asking user which existing app to use."""
	create_mform_workspace()


def get_next_sequence_id(app_name: str) -> int:
	"""Return next sequence_id based on existing Workspace records for this app."""
	result = frappe.db.get_all(
		"Workspace",
		filters={"app": app_name},
		fields=["max(sequence_id) as max_seq"],
	)
	last_seq = (result[0].get("max_seq") if result else None) or 0
	return int(last_seq) + 1

def get_module(app_name: str) -> str:
	"""Return module name based on app name."""
	module = frappe.db.get_all("Workspace", filters={"app": app_name}, fields=["module"], limit=1)
	return module[0].get("module") if module else None

def create_mform_workspace():
	"""Ask for app name, validate it exists, then create/update Workspace so it shows in sidebar."""
	try:
		app_name = input(
			"Enter existing App name (e.g. mgrant_ngo) to map to mForm workspace "
			"(leave blank to skip workspace creation): "
		).strip()

		if not app_name:
			print(f"{COLOR_WARN}No app name provided. Skipping mForm workspace creation.{COLOR_RESET}")
			return

		# Ensure the app is actually installed on this site
		if not frappe.db.exists("Installed Application", {"app_name": app_name}):
			msg = f"App '{app_name}' is not installed on this site. mForm workspace not created."
			frappe.log_error(title="mForm Workspace", message=msg)
			print(f"{COLOR_ERROR}{msg}{COLOR_RESET}")
			return

		# Create or update the Workspace mapped to this existing app
		if frappe.db.exists("Workspace", MFORM_WORKSPACE):
			doc = frappe.get_doc("Workspace", MFORM_WORKSPACE)
			doc.app = app_name
			doc.module = get_module(app_name)
			doc.public = 1
			if not doc.sequence_id:
				doc.sequence_id = get_next_sequence_id(app_name)
			doc.save(ignore_permissions=True)
			print(f"{COLOR_OK}mForm workspace updated for app '{app_name}'.{COLOR_RESET}")
		else:
			doc = frappe.new_doc("Workspace")
			doc.label = MFORM_WORKSPACE
			doc.title = MFORM_WORKSPACE
			doc.app = app_name
			doc.module = get_module(app_name)
			doc.type = "Link"
			doc.link_type = "Page"
			doc.link_to = "module-list"
			doc.icon = "setting"
			doc.content = "[]"
			doc.public = 1
			doc.sequence_id = get_next_sequence_id(app_name)
			doc.insert(ignore_permissions=True)
			print(f"{COLOR_OK}mForm workspace created for app '{app_name}'.{COLOR_RESET}")

		frappe.db.commit()
	except EOFError:
		# Non-interactive install; just skip workspace creation
		print(f"{COLOR_WARN}No terminal input. Skipping mForm workspace creation.{COLOR_RESET}")
	except Exception as e:
		frappe.log_error(title="mForm Workspace", message=str(e))
		raise
