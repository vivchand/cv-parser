frappe.listview_settings["Job Applicant"] = {
    onload: function(listview) {
        listview.page.add_inner_button(__("Bulk Import CVs"), function() {
            let input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = ".pdf";
            document.body.appendChild(input);
            input.addEventListener("change", function() {
                let files = Array.from(input.files);
                document.body.removeChild(input);
                if (files.length) run_bulk_import(files);
            });
            input.click();
        });
    }
};

function run_bulk_import(files) {
    let d = new frappe.ui.Dialog({
        title: "Bulk Import CVs - " + files.length + " file(s)",
        fields: [{
            fieldtype: "HTML",
            fieldname: "progress_area",
            options: '<div id="cv-bulk-progress" style="padding:10px;min-height:60px;"><p>Starting...</p></div>'
        }]
    });
    d.show();

    let results = { success: 0, skipped: 0, failed: 0, details: [] };

    function update_progress(html) {
        let el = d.fields_dict.progress_area.$wrapper.find("#cv-bulk-progress")[0];
        if (el) el.innerHTML = html;
    }

    async function process() {
        await new Promise(r => setTimeout(r, 400));

        for (let i = 0; i < files.length; i++) {
            let file = files[i];

            update_progress(`
                <p>Uploading <strong>${file.name}</strong> (${i+1} of ${files.length})</p>
                <div style="background:var(--border-color);border-radius:4px;height:8px;">
                    <div style="width:${Math.round(((i+1)/files.length)*100)}%;background:var(--primary);height:100%;border-radius:4px;"></div>
                </div>`);

            try {
                // Step 1: Upload
                let formData = new FormData();
                formData.append("file", file, file.name);
                formData.append("is_private", 1);
                formData.append("folder", "Home/Attachments");

                let uploadRes = await fetch("/api/method/upload_file", {
                    method: "POST",
                    headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
                    body: formData
                });
                let uploadData = await uploadRes.json();
                if (!uploadData.message || !uploadData.message.file_url) {
                    throw new Error("Upload failed");
                }
                let file_url = uploadData.message.file_url;

                // Step 2: Parse
                let parseResult = await frappe.call({
                    method: "cv_parser.api.resume_parser.parse_resume",
                    args: { file_url: file_url }
                });
                if (!parseResult.message) throw new Error("Parse failed");
                let p = parseResult.message;
                let email = p.email_id || "";

                // Step 3: Duplicate check
                if (email) {
                    let chk = await frappe.call({
                        method: "frappe.client.get_count",
                        args: { doctype: "Job Applicant", filters: { email_id: email } }
                    });
                    if (chk.message > 0) {
                        results.skipped++;
                        results.details.push({ name: file.name, status: "skipped", msg: "Duplicate: " + email });
                        continue;
                    }
                }

                // Step 4: Create Job Applicant
                await frappe.call({
                    method: "frappe.client.insert",
                    args: {
                        doc: {
                            doctype: "Job Applicant",
                            applicant_name: p.applicant_name || file.name,
                            email_id: email || ("unknown_" + Date.now() + "@unknown.com"),
                            phone_number: p.phone_number || "",
                            resume_attachment: file_url,
                            cover_letter: p.cover_letter || "",
                            status: "Open",
                            __ignore_mandatory: 1
                        }
                    }
                });

                results.success++;
                results.details.push({ name: file.name, status: "success", msg: p.applicant_name || "Created" });

            } catch(err) {
                results.failed++;
                results.details.push({ name: file.name, status: "failed", msg: err.message || "Error" });
            }
        }

        update_progress(`
            <div style="display:flex;gap:20px;margin-bottom:12px;">
                <span style="color:var(--green);font-weight:600;">✓ ${results.success} imported</span>
                <span style="color:orange;font-weight:600;">⚠ ${results.skipped} skipped</span>
                <span style="color:var(--red);font-weight:600;">✗ ${results.failed} failed</span>
            </div>
            ${results.details.map(d => `
                <div style="display:flex;gap:8px;padding:4px 0;font-size:0.85rem;border-bottom:1px solid var(--border-color);">
                    <span>${d.status==="success" ? "✓" : d.status==="skipped" ? "⚠" : "✗"}</span>
                    <span style="flex:1;">${d.name}</span>
                    <span style="color:var(--text-muted);">${d.msg}</span>
                </div>`).join("")}`);

        d.set_primary_action(__("Close"), () => { d.hide(); cur_list && cur_list.refresh(); });
    }

    process();
}
