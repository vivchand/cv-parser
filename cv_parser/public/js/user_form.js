frappe.ui.form.on("User", {
    refresh(frm) {
        if (frappe.user.has_role("System Manager")) {
            frm.add_custom_button("Set Password", function() {
                let d = new frappe.ui.Dialog({
                    title: "Set New Password",
                    fields: [
                        {
                            fieldname: "new_password",
                            fieldtype: "Password",
                            label: "New Password",
                            reqd: 1
                        },
                        {
                            fieldname: "confirm_password",
                            fieldtype: "Password",
                            label: "Confirm Password",
                            reqd: 1
                        }
                    ],
                    primary_action_label: "Set Password",
                    primary_action(values) {
                        if (values.new_password !== values.confirm_password) {
                            frappe.msgprint("Passwords do not match ❌");
                            return;
                        }
                        frappe.call({
                            method: "cv_parser.api.user_utils.set_user_password",
                            args: {
                                user: frm.doc.name,
                                password: values.new_password
                            },
                            callback(r) {
                                if (r.message) {
                                    frappe.msgprint(r.message);
                                    d.hide();
                                }
                            }
                        });
                    }
                });
                d.show();
            });
        }
    }
});
