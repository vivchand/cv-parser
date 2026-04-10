import frappe
from frappe import _

def validate(doc, method):
    # If resume is attached but name/email not yet filled (pre-parse state), skip mandatory
    if doc.resume_attachment and not doc.applicant_name and not doc.email_id:
        doc.flags.ignore_mandatory = True
