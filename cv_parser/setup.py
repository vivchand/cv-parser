import frappe

def after_migrate():
    try:
        system_settings = frappe.get_doc("System Settings")
        system_settings.app_logo = "/assets/cv_parser/images/cmplogo.png"
        system_settings.app_name = "Sarva Connect"
        system_settings.save(ignore_permissions=True)
        frappe.db.commit()
        print("✅ Company logo and name set successfully")
    except Exception as e:
        print(f"❌ Failed to set logo: {e}")
