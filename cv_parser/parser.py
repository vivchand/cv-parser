import frappe
import re
import os
from pdfminer.high_level import extract_text


# -------- TEXT EXTRACTION --------
def extract_resume_text(file_path):
    return extract_text(file_path)


# -------- FIELD EXTRACTION --------
def extract_email(text):
    match = re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return match[0] if match else ""


def extract_phone(text):
    match = re.findall(r"\b\d{10}\b", text)
    return match[0] if match else ""


def extract_name(text):
    lines = text.strip().split("\n")
    return lines[0].strip() if lines else ""


SKILLS = ["python", "java", "html", "css", "mysql", "flutter"]


def extract_skills(text):
    text_lower = text.lower()
    found = [skill for skill in SKILLS if skill in text_lower]
    return list(set(found))


# -------- FRAPPE WHITELISTED METHOD --------
@frappe.whitelist()
def parse_resume(file_url):
    site_path = frappe.get_site_path()
    if "/private/files/" in file_url:
        pdf_path = os.path.join(site_path, "private", "files", os.path.basename(file_url))
    else:
        pdf_path = os.path.join(site_path, "public", "files", os.path.basename(file_url))

    if not os.path.exists(pdf_path):
        frappe.throw(f"File not found: {pdf_path}")

    text = extract_resume_text(pdf_path)

    return {
        "applicant_name": extract_name(text),
        "email_id":       extract_email(text),
        "mobile_number":  extract_phone(text),
        "skills":         ", ".join(extract_skills(text))
    }
