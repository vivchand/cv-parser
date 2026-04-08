import frappe
import re
import os
import logging
logging.getLogger("pdfminer").setLevel(logging.ERROR)
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams

SKILLS_LIST = [
    "python", "java", "html", "css", "mysql", "flutter", "javascript",
    "react", "nodejs", "node.js", "django", "flask", "mongodb", "sql",
    "git", "docker", "aws", "machine learning", "deep learning",
    "typescript", "php", "swift", "kotlin", "c++", "c#", "ruby",
    "postgresql", "redis", "kubernetes", "tensorflow", "pytorch",
    "excel", "powerpoint", "photoshop", "figma", "linux",
    "microsoft word", "microsoft excel", "communication",
    "leadership", "teamwork", "problem solving"
]

SECTION_KEYWORDS = [
    "objective", "summary", "education", "experience", "projects",
    "internship", "skills", "technical skills", "interpersonal skills",
    "achievements", "certifications", "languages", "language",
    "hobbies", "activities", "declaration", "workshop", "patent",
    "personal details", "personal information"
]

def extract_resume_text(file_path):
    laparams = LAParams(
        char_margin=2.0,
        line_margin=0.5,
        word_margin=0.1,
        boxes_flow=0.5
    )
    return extract_text(file_path, laparams=laparams)

def clean_text(text):
    text = re.sub(r'-\n', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return '\n'.join([l.rstrip() for l in text.split('\n')]).strip()

def extract_email(text):
    match = re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return match[0] if match else ""

def extract_phone(text):
    match = re.findall(r"(\+?\d{1,3}[\s\-.]?)?(\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}|\d{10})", text)
    return "".join(match[0]).strip() if match else ""

def extract_name(text):
    """First clean line = name. Skip contact/address lines."""
    lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
    for line in lines[:3]:
        if re.match(r"[A-Za-z0-9._%+-]+@", line): continue
        if re.match(r"[\+\d][\d\s\-]{7,}", line): continue
        if re.match(r"https?://", line): continue
        if re.match(r"\d{2}-\d{2}-\d{4}", line): continue
        if ',' in line and len(line) > 20: continue
        return line
    return lines[0] if lines else ""

def extract_skills(text):
    text_lower = text.lower()
    found = [s for s in SKILLS_LIST if s in text_lower]
    return sorted(set(found))

def extract_country(text):
    countries = [
        "India", "United States", "USA", "UK", "United Kingdom",
        "Canada", "Australia", "Germany", "France", "Singapore",
        "UAE", "Dubai", "Sri Lanka", "Bangladesh", "Nepal"
    ]
    for country in countries:
        if re.search(rf"\b{country}\b", text, re.IGNORECASE):
            return country
    return ""

def is_section(line):
    return line.strip().lower() in SECTION_KEYWORDS

def format_sections(text):
    lines = text.split('\n')
    result = []
    for line in lines:
        stripped = line.strip()
        if is_section(stripped):
            result.append(f"\n[ {stripped.upper()} ]")
            result.append("-" * 40)
        else:
            result.append(line)
    return '\n'.join(result)

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
    text = clean_text(text)
    formatted = format_sections(text)

    return {
        "applicant_name": extract_name(text),
        "email_id":       extract_email(text),
        "phone_number":   extract_phone(text),
        "country":        extract_country(text),
        "skills":         ", ".join(extract_skills(text)),
        "cover_letter":   formatted
    }

# -------- DIRECT FILE PATH VARIANT (used by bulk_import) --------
def parse_resume_file(filepath):
    """Parse a PDF from an absolute file path (no Frappe file URL needed)."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")
    text = extract_resume_text(filepath)
    text = clean_text(text)
    formatted = format_sections(text)
    return {
        "name":      extract_name(text),
        "email":     extract_email(text),
        "phone":     extract_phone(text),
        "country":   extract_country(text),
        "skills":    ", ".join(extract_skills(text)),
        "full_text": formatted
    }
