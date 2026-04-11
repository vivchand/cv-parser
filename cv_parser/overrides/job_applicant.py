import frappe

def before_save(doc, method):
    if doc.resume_attachment and not doc.applicant_name and not doc.email_id:
        doc.flags.ignore_mandatory = True

def validate(doc, method):
    if doc.resume_attachment and not doc.applicant_name and not doc.email_id:
        doc.flags.ignore_mandatory = True
