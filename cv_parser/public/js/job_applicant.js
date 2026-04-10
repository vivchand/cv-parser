frappe.ui.form.on("Job Applicant", {
    refresh(frm) {
        frm.toggle_reqd("applicant_name", false);
        frm.toggle_reqd("email_id", false);

        frm.add_custom_button("Parse Resume", function () {
            if (!frm.doc.resume_attachment) {
                frappe.msgprint({
                    title: "No Resume",
                    message: "Please attach a PDF resume in the Resume Attachment field first.",
                    indicator: "orange"
                });
                return;
            }

            frm.page.set_indicator("Parsing...", "orange");
            frm.set_intro("⏳ Reading resume, please wait...", "blue");
            let slowWarning = setTimeout(() => {
                frappe.show_alert({
                    message: "Still working... large PDFs take a moment.",
                    indicator: "orange"
                }, 6);
            }, 10000);

            frappe.call({
                method: "cv_parser.api.resume_parser.parse_resume",
                args: { file_url: frm.doc.resume_attachment },
                timeout: 60,
                callback(r) {
                    clearTimeout(slowWarning);
                    frm.set_intro("");
                    frm.page.set_indicator("", "");
                    if (r.exc) {
                        frappe.msgprint({
                            title: "Parsing Failed",
                            message: r.exc,
                            indicator: "red"
                        });
                        return;
                    }
                    if (r.message) {
                        let d = r.message;
                        if (d.applicant_name) frm.set_value("applicant_name", d.applicant_name);
                        if (d.email_id)       frm.set_value("email_id",       d.email_id);
                        if (d.phone_number)   frm.set_value("phone_number",   d.phone_number);
                        if (d.country)        frm.set_value("country",        d.country);
                        if (d.cover_letter)   frm.set_value("cover_letter",   d.cover_letter);
                        frappe.show_alert({
                            message: "✅ Resume parsed successfully!",
                            indicator: "green"
                        }, 5);
                        setTimeout(() => frm.save(), 1000);
                    }
                },
                error() {
                    clearTimeout(slowWarning);
                    frm.set_intro("");
                    frm.page.set_indicator("", "");
                    frappe.msgprint({
                        title: "Server Error",
                        message: "Parser failed. Check bench logs.",
                        indicator: "red"
                    });
                }
            });
        });
    }
});
