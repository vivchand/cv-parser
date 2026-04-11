import frappe
from frappe import _

@frappe.whitelist()
def set_user_password(user, password):
    if "System Manager" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Only System Manager can set passwords"))
    
    user_doc = frappe.get_doc("User", user)
    user_doc.new_password = password
    user_doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"message": "Password updated successfully ✅"}
