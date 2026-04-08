import frappe
import os
import re

def windows_to_wsl_path(path: str) -> str:
    path = path.strip().replace('\\', '/')
    match = re.match(r'^([A-Za-z]):/(.+)', path)
    if match:
        drive = match.group(1).lower()
        rest = match.group(2)
        return f"/mnt/{drive}/{rest}"
    return path  # already a Linux path

@frappe.whitelist()
def get_cv_count(folder: str) -> int:
    wsl_path = windows_to_wsl_path(folder)
    if not os.path.isdir(wsl_path):
        frappe.throw(f"Folder not found: {wsl_path}")
    return len([f for f in os.listdir(wsl_path) if f.lower().endswith('.pdf')])

@frappe.whitelist()
def import_all_cvs(folder: str) -> dict:
    from cv_parser.api.resume_parser import parse_resume_file

    wsl_path = windows_to_wsl_path(folder)
    if not os.path.isdir(wsl_path):
        frappe.throw(f"Folder not found: {wsl_path}")

    pdfs = [f for f in os.listdir(wsl_path) if f.lower().endswith('.pdf')]
    imported, skipped, failed = 0, 0, 0
    details = []

    for filename in pdfs:
        filepath = os.path.join(wsl_path, filename)
        try:
            data = parse_resume_file(filepath)
            email = data.get('email')

            if email and frappe.db.exists('Job Applicant', {'email_id': email}):
                skipped += 1
                details.append(f"SKIP  {filename} — duplicate ({email})")
                continue

            doc = frappe.get_doc({
                'doctype': 'Job Applicant',
                'applicant_name': data.get('name') or filename,
                'email_id': email or '',
                'phone_number': data.get('phone') or '',
                'country': data.get('country') or '',
                'cover_letter': data.get('full_text') or '',
                'status': 'Open',
            })
            doc.insert(ignore_permissions=True)
            frappe.db.commit()
            imported += 1
            details.append(f"OK    {filename} — {data.get('name')}")
        except Exception as e:
            failed += 1
            details.append(f"FAIL  {filename} — {str(e)}")

    return {'imported': imported, 'skipped': skipped, 'failed': failed, 'details': details}
