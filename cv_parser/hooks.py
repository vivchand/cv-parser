app_name = "cv_parser"
app_title = "CV Parser"
app_publisher = "vivchand"
app_description = "CV Parser for HR Job Applicants"
app_email = "vivyn.crs@gmail.com"
app_license = "mit"

doctype_js = {
    "Job Applicant": "public/js/job_applicant.js",
    "User": "public/js/user_form.js"
}

doc_events = {
    "Job Applicant": {
        "validate": "cv_parser.overrides.job_applicant.validate",
        "before_save": "cv_parser.overrides.job_applicant.before_save"
    }
}
