frappe.ui.form.on("Job Applicant", {
    refresh(frm) {
        frm.add_custom_button("Parse Resume", function () {

            // If resume already attached, use it directly
            if (frm.doc.resume_attachment) {
                parseResume(frm, frm.doc.resume_attachment);
                return;
            }

            // Otherwise open file picker
            let input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf";

            input.onchange = async function () {
                let file = input.files[0];
                if (!file) return;

                frm.page.set_indicator("Uploading...", "orange");
                frm.set_intro("⏳ Uploading resume...", "blue");

                let formData = new FormData();
                formData.append("file", file);
                formData.append("is_private", 1);

                let uploadResult;
                try {
                    let upload = await fetch("/api/method/upload_file", {
                        method: "POST",
                        headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
                        body: formData
                    });
                    uploadResult = await upload.json();
                } catch(e) {
                    frappe.msgprint({ title: "Upload Failed", message: e.message, indicator: "red" });
                    frm.set_intro(""); frm.page.set_indicator("", "");
                    return;
                }

                let file_url = uploadResult.message && uploadResult.message.file_url;
                if (!file_url) {
                    frm.set_intro(""); frm.page.set_indicator("", "");
                    frappe.msgprint({ title: "Upload Failed", message: JSON.stringify(uploadResult), indicator: "red" });
                    return;
                }

                parseResume(frm, file_url);
            };

            input.click();
        });
    }
});

function parseResume(frm, file_url) {
    frm.page.set_indicator("Parsing...", "orange");
    frm.set_intro("⏳ Reading resume, please wait...", "blue");

    let slowWarning = setTimeout(() => {
        frappe.show_alert({ message: "Still working... large PDFs take a moment.", indicator: "orange" }, 6);
    }, 10000);

    frappe.call({
        method: "cv_parser.api.resume_parser.parse_resume",
        args: { file_url: file_url },
        timeout: 60,
        callback(r) {
            clearTimeout(slowWarning);
            frm.set_intro(""); frm.page.set_indicator("", "");

            if (r.exc || !r.message) {
                frappe.msgprint({ title: "Parsing Failed", message: r.exc || "No data returned.", indicator: "red" });
                return;
            }

            let d = r.message;
            if (d.applicant_name) frm.set_value("applicant_name", d.applicant_name);
            if (d.email_id)       frm.set_value("email_id",       d.email_id);
            if (d.phone_number)   frm.set_value("phone_number",   d.phone_number);
            if (d.country)        frm.set_value("country",        d.country);
            if (d.cover_letter)   frm.set_value("cover_letter",   d.cover_letter);
            frm.set_value("resume_attachment", file_url);

            frappe.show_alert({ message: "✅ Resume parsed successfully!", indicator: "green" }, 5);
            setTimeout(() => frm.save(), 1000);
        },
        error() {
            clearTimeout(slowWarning);
            frm.set_intro(""); frm.page.set_indicator("", "");
            frappe.msgprint({ title: "Server Error", message: "Parser failed. Check bench logs.", indicator: "red" });
        }
    });
}
