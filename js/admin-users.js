
"use strict";

// =====================================================
// B56-04.7 — Admin User Management
// 4 Roles + Overview + Counts + Search + Pagination
// READ ONLY — ไม่มีการสร้าง แก้ไข หรือลบข้อมูล
// =====================================================

const AdminUsers = (() => {
    const PAGE_SIZE = 50;
    const ROLES = ["Admin", "Teacher", "Parent", "Student"];

    let loading = false;

    const state = {
        admin: { page: 0, search: "" },
        teacher: { page: 0, search: "" },
        parent: { page: 0, search: "" },
        student: { page: 0, search: "" }
    };

    // =================================================
    // DOM Helpers — แสดงข้อมูลโดยไม่แทรก HTML
    // =================================================

    function el(tag, value = "", className = "") {
        const node = document.createElement(tag);

        if (value !== null && value !== undefined) {
            node.textContent = String(value);
        }

        if (className) node.className = className;

        return node;
    }

    function message(target, value) {
        target.replaceChildren(el("p", value));
    }

    function textValue(value) {
        return value === null ||
            value === undefined ||
            value === ""
                ? "—"
                : String(value);
    }

    function nameOf(row) {
        return [row.first_name, row.last_name]
            .filter(Boolean)
            .join(" ") || "—";
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? "—"
            : date.toLocaleDateString("th-TH");
    }

    function table(target, columns, rows) {
        const wrap = el("div");
        wrap.style.cssText =
            "overflow-x:auto;margin-top:14px";

        const element = el("table");
        element.style.cssText =
            "width:100%;border-collapse:collapse;text-align:left";

        const thead = el("thead");
        const header = el("tr");

        columns.forEach(column => {
            const th = el("th", column.title);
            th.style.cssText =
                "padding:10px;border-bottom:1px solid #cbd5e1";
            header.append(th);
        });

        thead.append(header);

        const tbody = el("tbody");

        rows.forEach(row => {
            const tr = el("tr");

            columns.forEach(column => {
                const td = el("td");

                td.style.cssText =
                    "padding:10px;border-bottom:1px solid #e2e8f0";

                if (typeof column.render === "function") {
                    const content = column.render(row);

                    if (content instanceof Node) {
                        td.append(content);
                    } else {
                        td.textContent = textValue(content);
                    }
                } else {
                    td.textContent = textValue(
                        column.value(row)
                    );
                }

                tr.append(td);
            });

            tbody.append(tr);
        });

        element.append(thead, tbody);
        wrap.append(element);
        target.append(wrap);
    }

    // =================================================
    // B56 — Colorful Summary Cards
    // ใช้ร่วมกันทั้ง 5 แท็บ
    // =================================================

    function summary(target, items) {
        const wrap = el("div");

        wrap.style.cssText = [
            "display:flex",
            "flex-wrap:wrap",
            "gap:12px",
            "margin:16px 0"
        ].join(";");

        const themes = {
            blue: {
                bg: "#eff6ff",
                border: "#bfdbfe",
                color: "#1d4ed8",
                accent: "#2563eb",
                icon: "👥"
            },
            green: {
                bg: "#ecfdf5",
                border: "#a7f3d0",
                color: "#047857",
                accent: "#10b981",
                icon: "✅"
            },
            orange: {
                bg: "#fff7ed",
                border: "#fed7aa",
                color: "#c2410c",
                accent: "#f97316",
                icon: "⏳"
            },
            red: {
                bg: "#fef2f2",
                border: "#fecaca",
                color: "#b91c1c",
                accent: "#ef4444",
                icon: "⛔"
            }
        };

        function getTheme(label) {
            const text = String(label);

            if (
                text.includes("ปิดใช้งาน") ||
                text.includes("ระงับ")
            ) {
                return themes.red;
            }

            if (
                text.includes("ยังไม่เชื่อม") ||
                text.includes("ไม่มี Profile")
            ) {
                return themes.orange;
            }

            if (
                text.includes("เชื่อม Profile") ||
                text === "ใช้งาน"
            ) {
                return themes.green;
            }

            return themes.blue;
        }

        items.forEach(item => {
            const theme = getTheme(item.label);
            const card = el("div");

            card.style.cssText = [
                "padding:14px 18px",
                "border:1px solid " + theme.border,
                "border-radius:14px",
                "min-width:155px",
                "background:" + theme.bg,
                "box-sizing:border-box",
                "transition:transform .2s ease,box-shadow .2s ease",
                "cursor:default"
            ].join(";");

            const top = el("div");

            top.style.cssText = [
                "display:flex",
                "align-items:center",
                "justify-content:space-between",
                "gap:12px"
            ].join(";");

            const label = el("div", item.label);

            label.style.cssText = [
                "font-size:13px",
                "font-weight:600",
                "color:" + theme.color
            ].join(";");

            const icon = el("span", theme.icon);

            icon.style.cssText = [
                "font-size:20px",
                "line-height:1"
            ].join(";");

            top.append(label, icon);

            const value = el("strong", item.value);

            value.style.cssText = [
                "display:block",
                "font-size:30px",
                "font-weight:800",
                "margin:10px 0",
                "color:" + theme.color,
                "line-height:1.2",
                "font-variant-numeric:tabular-nums"
            ].join(";");

            const bar = el("div");

            bar.style.cssText = [
                "height:4px",
                "border-radius:10px",
                "background:" + theme.accent,
                "opacity:.9"
            ].join(";");

            card.append(top, value, bar);

            card.addEventListener("mouseenter", () => {
                card.style.transform = "translateY(-2px)";
                card.style.boxShadow =
                    "0 6px 16px rgba(15,23,42,.08)";
            });

            card.addEventListener("mouseleave", () => {
                card.style.transform = "";
                card.style.boxShadow = "";
            });

            wrap.append(card);
        });

        target.append(wrap);
    }

    // =================================================
    // Database Helpers
    // =================================================

    async function roleIds() {
        const { data, error } = await supabaseClient
            .from("roles")
            .select("id,name")
            .in("name", ROLES)
            .is("deleted_at", null);

        if (error) throw error;

        return new Map(
            (data || []).map(row => [row.name, row.id])
        );
    }

    // B56 — อ่าน Role จริงของ Profile แต่ละรายการ
    async function withAccountRoles(type, rows) {
        if (!rows.length) return rows;

        // B56 — แสดงข้อมูลบุคคลของบัญชี Admin
        // ดึงจาก teachers เฉพาะ Profile ที่เชื่อมกันจริง
        if (type === "admin") {
            const profileIds = rows.map(row => row.id);

            const { data: teachers, error } =
                await supabaseClient
                    .from("teachers")
                    .select(
                        "profile_id,first_name,last_name," +
                        "teacher_code,instructor_number"
                    )
                    .in("profile_id", profileIds)
                    .is("deleted_at", null);

            if (error) throw error;

            const teacherMap = new Map(
                (teachers || []).map(teacher => [
                    teacher.profile_id,
                    teacher
                ])
            );

            return rows.map(row => {
                const teacher = teacherMap.get(row.id);

                return {
                    ...row,
                    account_role: "Admin",
                    admin_name: teacher
                        ? nameOf(teacher)
                        : "ยังไม่มีข้อมูลชื่อ",
                    admin_teacher_code:
                        teacher?.teacher_code || "—",
                    admin_school_code:
                        teacher?.instructor_number || "—"
                };
            });
        }

        const ids = [...new Set(
            rows.map(row => row.profile_id).filter(Boolean)
        )];

        if (!ids.length) {
            return rows.map(row => ({
                ...row,
                account_role: "ยังไม่มี Profile"
            }));
        }

        const { data: profiles, error } =
            await supabaseClient
                .from("profiles")
                .select("id,role_id")
                .in("id", ids);

        if (error) throw error;

        const roleMap = await roleIds();
        const roleNames = new Map(
            [...roleMap.entries()].map(
                ([name, id]) => [id, name]
            )
        );

        const profileRoles = new Map(
            (profiles || []).map(profile => [
                profile.id,
                roleNames.get(profile.role_id) || "ไม่พบ Role"
            ])
        );

        return rows.map(row => ({
            ...row,
            account_role: !row.profile_id
                ? "ยังไม่มี Profile"
                : (
                    profileRoles.get(row.profile_id) ||
                    "ไม่พบ Profile"
                )
        }));
    }
    // =================================================
    // B56 — Load students linked to visible parents.
    // READ ONLY. Used by the Parent table.
    // =================================================
    async function withParentStudents(rows) {
        if (!rows.length) return rows;

        const parentIds = rows.map(row => row.id);

        const { data: links, error: linkError } =
            await supabaseClient
                .from("parent_students")
                .select("parent_id,student_id,is_primary")
                .in("parent_id", parentIds)
                .is("deleted_at", null);

        if (linkError) throw linkError;

        const studentIds = [
            ...new Set(
                (links || []).map(link => link.student_id)
            )
        ];

        let students = [];

        if (studentIds.length) {
            const { data, error } = await supabaseClient
                .from("students")
                .select(
                    "id,student_code,first_name," +
                    "last_name,current_room_id"
                )
                .in("id", studentIds);

            if (error) throw error;

            students = data || [];
        }

        const roomIds = [
            ...new Set(
                students
                    .map(student => student.current_room_id)
                    .filter(Boolean)
            )
        ];

        let rooms = [];

        if (roomIds.length) {
            const { data, error } = await supabaseClient
                .from("rooms")
                .select("id,room_name")
                .in("id", roomIds);

            if (error) throw error;

            rooms = data || [];
        }

        const studentMap = new Map(
            students.map(student => [student.id, student])
        );

        const roomMap = new Map(
            rooms.map(room => [room.id, room.room_name])
        );

        const linksByParent = new Map();

        (links || []).forEach(link => {
            if (!linksByParent.has(link.parent_id)) {
                linksByParent.set(link.parent_id, []);
            }

            const student = studentMap.get(link.student_id);

            linksByParent.get(link.parent_id).push({
                student_id: link.student_id,
                is_primary: link.is_primary === true,
                name: student
                    ? nameOf(student)
                    : "ไม่พบข้อมูลนักเรียน",
                student_code: student?.student_code || "—",
                room_name: student?.current_room_id
                    ? roomMap.get(student.current_room_id) || "—"
                    : "—"
            });
        });

        return rows.map(row => ({
            ...row,
            linked_students:
                linksByParent.get(row.id) || []
        }));
    }

    async function countRows(tableName, linkedOnly = false) {
        let query = supabaseClient
            .from(tableName)
            .select("id", { count: "exact", head: true })
            .is("deleted_at", null);

        if (linkedOnly) {
            query = query.not("profile_id", "is", null);
        }

        const { count, error } = await query;

        if (error) throw error;

        return count ?? 0;
    }

    // =================================================
    // Overview — จำนวน Profiles จริงทั้ง 4 Role
    // =================================================

    async function loadOverview() {
        const target = document.getElementById(
            "admin-users-overview-content"
        );

        if (!target) return;

        const ids = await roleIds();

        const results = await Promise.all(
            ROLES.map(async roleName => {
                const id = ids.get(roleName);

                if (!id) {
                    return {
                        role: roleName,
                        total: 0,
                        active: 0
                    };
                }

                const base = () => supabaseClient
                    .from("profiles")
                    .select("id", {
                        count: "exact",
                        head: true
                    })
                    .eq("role_id", id);

                const [all, active] = await Promise.all([
                    base(),
                    base()
                        .eq("is_active", true)
                        .is("deleted_at", null)
                ]);

                if (all.error) throw all.error;
                if (active.error) throw active.error;

                return {
                    role: roleName,
                    total: all.count ?? 0,
                    active: active.count ?? 0
                };
            })
        );

        const grandTotal = results.reduce(
            (sum, row) => sum + row.total, 0
        );

        const activeTotal = results.reduce(
            (sum, row) => sum + row.active, 0
        );

        target.replaceChildren();

        summary(target, [
            { label: "Profiles ทั้งหมด", value: grandTotal },
            { label: "ใช้งาน", value: activeTotal },
            {
                label: "ปิดใช้งาน",
                value: grandTotal - activeTotal
            }
        ]);

        table(target, [
            { title: "บทบาท", value: r => r.role },
            { title: "Profiles ทั้งหมด", value: r => r.total },
            { title: "ใช้งาน", value: r => r.active },
            {
                title: "ปิดใช้งาน",
                value: r => r.total - r.active
            }
        ], results);

        target.append(
            el("p",
                "จำนวนนี้เป็น Profiles ไม่ใช่จำนวนคนทั้งหมดในโรงเรียน")
        );
    }

    // =================================================
    // Search + Pagination
    // =================================================

    function cleanSearch(value) {
        return String(value || "")
            .trim()
            .replace(/[,%()."\\]/g, "")
            .slice(0, 80);
    }

    function applySearch(query, type, keyword) {
        if (!keyword || type === "admin") return query;

        const fields = {
            teacher: [
                "teacher_code",
                "first_name",
                "last_name",
                "instructor_number"
            ],
            parent: [
                "first_name",
                "last_name",
                "nickname",
                "phone"
            ],
            student: [
                "student_code",
                "first_name",
                "last_name"
            ]
        };

        const columns = fields[type] || [];

        return query.or(
            columns.map(
                field => `${field}.ilike.%${keyword}%`
            ).join(",")
        );
    }

    function searchControls(target, type, reload) {
        if (type === "admin") return;

        const row = el("div");
        row.style.cssText =
            "display:flex;gap:8px;flex-wrap:wrap;margin:12px 0";

        const input = document.createElement("input");
        input.type = "search";
        input.placeholder = "ค้นหารหัสหรือชื่อ...";
        input.value = state[type].search;
        input.style.cssText =
            "padding:10px;border:1px solid #cbd5e1;" +
            "border-radius:8px;min-width:220px;max-width:100%";

        const button = el("button", "🔍 ค้นหา", "btn");
        button.type = "button";

        const run = () => {
            state[type].search = cleanSearch(input.value);
            state[type].page = 0;
            reload(type);
        };

        button.addEventListener("click", run);

        input.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                run();
            }
        });

        row.append(input, button);

// B56 — ปุ่มเพิ่มบัญชีครู อยู่แถวเดียวกับค้นหา
if (type === "teacher") {
    const addTeacherButton = el(
        "button",
        "＋ เพิ่มบัญชีครู",
        "btn"
    );

    addTeacherButton.type = "button";

    addTeacherButton.addEventListener(
        "click",
        openTeacherCreateForm
    );

    row.append(addTeacherButton);
}
        // =================================================
        // B56 — Parent Create Button
        // =================================================
        if (type === "parent") {
            const addParentButton = el(
                "button",
                "＋ เพิ่มผู้ปกครอง",
                "btn"
            );

            addParentButton.type = "button";

            addParentButton.addEventListener(
                "click",
                openParentCreateForm
            );

            row.append(addParentButton);

            // LINE.08.9.G.20.B
            // ปุ่มคำขอลงทะเบียน LINE
            const lineRequestButton = el(
                "button",
                "💬 คำขอลงทะเบียน LINE",
                "btn"
            );

            lineRequestButton.type = "button";

            lineRequestButton.addEventListener(
                "click",
                () => LineManagement.openRequests()
            );

            row.append(lineRequestButton);
        }

target.append(row);

    }

    function pagination(target, type, count, reload) {
        const page = state[type].page;
        const pages = Math.max(
            1, Math.ceil(count / PAGE_SIZE)
        );

        const row = el("div");
        row.style.cssText =
            "display:flex;gap:12px;align-items:center;" +
            "flex-wrap:wrap;margin-top:14px";

        const prev = el("button", "← ก่อนหน้า", "btn");
        prev.type = "button";
        prev.disabled = page === 0;

        const next = el("button", "ถัดไป →", "btn");
        next.type = "button";
        next.disabled = page + 1 >= pages;

        const label = el(
            "span",
            `หน้า ${page + 1} / ${pages} • พบ ${count} รายการ`
        );

        prev.onclick = () => {
            state[type].page--;
            reload(type);
        };

        next.onclick = () => {
            state[type].page++;
            reload(type);
        };

        row.append(prev, label, next);
        target.append(row);
    }

    // =================================================
    // Role Configuration
    // =================================================

    const config = {
        admin: {
            tableName: "profiles",
            columns: [
    {
        title: "ชื่อ–นามสกุล",
        value: r => r.admin_name
    },
    {
        title: "รหัสครู SMS",
        value: r => r.admin_teacher_code
    },
    {
        title: "รหัสโรงเรียน",
        value: r => r.admin_school_code
    },
    {
        title: "Role บัญชี",
        value: r => r.account_role
    },
    {
        title: "สถานะ",
        value: r => (
            r.is_active && !r.deleted_at
                ? "ใช้งาน"
                : "ปิดใช้งาน"
        )
    },
    {
        title: "สร้างเมื่อ",
        value: r => formatDate(r.created_at)
    }
],

            select: "id,is_active,deleted_at,created_at",
            order: "created_at"
        },
        teacher: {
            tableName: "teachers",
            columns: [
                { title: "รหัสครู", value: r => r.teacher_code },
                { title: "ชื่อ–นามสกุล", value: nameOf },
                {
                    title: "รหัสโรงเรียน",
                    value: r => r.instructor_number
                },
                { title: "อีเมล", value: r => r.email },
{
    title: "Role บัญชี",
    value: r => r.account_role
},
{
    title: "เชื่อม Profile",
    value: r => r.profile_id ? "มี" : "ไม่มี"
}
            ],
            select: "id,teacher_code,first_name,last_name," +
                "instructor_number,email,profile_id",
            order: "teacher_code"
        },

        parent: {
            tableName: "parents",
            columns: [
                {
                    title: "ชื่อ–นามสกุล",
                    render: r => {
                        const wrap = el("div");

                        wrap.style.cssText = [
                            "display:flex",
                            "align-items:center",
                            "gap:6px",
                            "flex-wrap:wrap"
                        ].join(";");

                        wrap.append(
                            el("span", nameOf(r))
                        );

                        const students = r.linked_students || [];
                        const primaryCount = students.filter(
                            s => s.is_primary
                        ).length;

                        if (primaryCount > 0) {
                            const badge = el(
                                "span",
                                students.length === 1
                                    ? "หลัก"
                                    : "หลัก " + primaryCount + " คน"
                            );

                            badge.style.cssText = [
                                "background:#dcfce7",
                                "border:1px solid #86efac",
                                "color:#166534",
                                "border-radius:6px",
                                "padding:2px 7px",
                                "font-size:12px",
                                "font-weight:700",
                                "white-space:nowrap"
                            ].join(";");

                            wrap.append(badge);
                        }

                        return wrap;
                    }
                },
                {
                    title: "นักเรียนในความดูแล",
                    render: r => {
                        const students = r.linked_students || [];

                        if (!students.length) {
                            const label = el(
                                "span",
                                "ยังไม่เชื่อมนักเรียน"
                            );

                            label.style.color = "#64748b";
                            return label;
                        }

                        // One student: show the student's details.
                        if (students.length === 1) {
                            const student = students[0];

                            const button = el("button");
                            button.type = "button";

                            button.style.cssText = [
                                "display:flex",
                                "flex-direction:column",
                                "align-items:flex-start",
                                "gap:2px",
                                "background:transparent",
                                "border:0",
                                "padding:2px 0",
                                "text-align:left",
                                "cursor:pointer",
                                "max-width:100%",
                                "line-height:1.4"
                            ].join(";");

                            const name = el(
                                "span",
                                student.name
                            );

                            name.style.cssText = [
                                "font-weight:600",
                                "color:#1d4ed8",
                                "font-size:13px",
                                "overflow-wrap:anywhere"
                            ].join(";");

                            const detail = el(
                                "span",
                                student.student_code +
                                " · " +
                                student.room_name
                            );

                            detail.style.cssText = [
                                "font-size:12px",
                                "color:#64748b",
                                "overflow-wrap:anywhere"
                            ].join(";");

                            button.title =
                                "คลิกเพื่อจัดการผู้ปกครองหลัก";

                            button.append(name, detail);

                            button.addEventListener(
                                "click",
                                () => openPrimaryParentViewer(student)
                            );

                            return button;
                        }

                        // Two or more students: keep existing flow.
                        const button = el(
                            "button",
                            students.length + " คน · ดูรายชื่อ"
                        );

                        button.type = "button";

                        button.style.cssText = [
                            "background:#f0fdf4",
                            "color:#166534",
                            "border:1px solid #bbf7d0",
                            "border-radius:8px",
                            "padding:8px 12px",
                            "font-weight:600",
                            "cursor:pointer"
                        ].join(";");

                        button.addEventListener(
                            "click",
                            async () => {
                                const details = students.map(
                                    (student, index) => [
                                        (index + 1) + ". " +
                                            student.name,
                                        "รหัสนักเรียน: " +
                                            student.student_code +
                                            "   ชั้นเรียน: " +
                                            student.room_name,
                                        "สถานะ: " +
                                            (student.is_primary
                                                ? "ผู้ปกครองหลัก"
                                                : "ผู้ปกครองทั่วไป")
                                    ].join("\n")
                                ).join("\n\n");

                                const result = await Swal.fire({
                                    title: "นักเรียนในความดูแล",
                                    text:
                                        "ผู้ปกครอง: " +
                                        nameOf(r) +
                                        "\n\n" +
                                        details,
                                    width: "min(650px, calc(100vw - 24px))",
                                    heightAuto: false,
                                    showDenyButton: true,
                                    confirmButtonText: "ปิด",
                                    denyButtonText: "จัดการผู้ปกครองหลัก",
                                    didOpen: () => {
                                        const popup = Swal.getPopup();

                                        popup.style.maxHeight =
                                            "calc(100dvh - 24px)";
                                        popup.style.overflowY = "auto";

                                        const content =
                                            Swal.getHtmlContainer();

                                        if (content) {
                                            content.style.whiteSpace =
                                                "pre-line";
                                            content.style.textAlign =
                                                "left";
                                            content.style.lineHeight =
                                                "1.8";
                                        }
                                    }
                                });

                                if (!result.isDenied) return;

                                const options = Object.fromEntries(
                                    students.map(student => [
                                        student.student_id,
                                        student.name +
                                            " (" +
                                            student.student_code +
                                            ")"
                                    ])
                                );

                                const choice = await Swal.fire({
                                    title: "เลือกนักเรียน",
                                    input: "select",
                                    inputOptions: options,
                                    inputPlaceholder: "เลือกนักเรียน",
                                    inputValue: "",
                                    width: "min(600px, calc(100vw - 24px))",
                                    showCancelButton: true,
                                    confirmButtonText: "ถัดไป",
                                    cancelButtonText: "ยกเลิก",
                                    inputValidator: value =>
                                        !value
                                            ? "กรุณาเลือกนักเรียน"
                                            : null
                                });

                                if (!choice.isConfirmed) return;

                                const chosenStudent = students.find(
                                    student =>
                                        student.student_id === choice.value
                                );

                                if (chosenStudent) {
                                    await openPrimaryParentViewer(
                                        chosenStudent
                                    );
                                }
                            }
                        );

                        return button;
                    }
                },
                {
                    title: "โทรศัพท์",
                    value: r => r.phone
                },
                {
                    title: "Login",
                    value: r => r.profile_id ? "มี" : "ไม่มี"
                },
                {
                    title: "LINE",
                    render: r => LineManagement.renderParentLineStatus(r)
                },
                {
                    title: "จัดการ",

                    render: r => {
                        const button = el(
                            "button",
                            "🔗 เชื่อมนักเรียน",
                            "btn"
                        );

                        button.type = "button";

                        button.addEventListener(
                            "click",
                            () => openParentStudentLinkForm(r)
                        );

                        return button;
                    }
                }
            ],
            select: "id,first_name,last_name,nickname," +
                "phone,profile_id",
            order: "first_name"
        },
        student: {
            tableName: "students",
            columns: [
                {
                    title: "รหัสนักเรียน",
                    value: r => r.student_code
                },
                { title: "ชื่อ–นามสกุล", value: nameOf },
                {
                    title: "สถานะการเรียน",
                    value: r => r.current_status
                },
                {
    title: "Role บัญชี",
    value: r => r.account_role
},
                {
                    title: "เชื่อม Profile",
                    value: r => (
                        r.profile_id
                            ? "มี Profile"
                            : "ยังไม่มี Profile"
                    )
                }
            ],
            select: "id,student_code,first_name,last_name," +
                "current_status,profile_id",
            order: "student_code"
        }
    };
    // =================================================
    // B56 — Primary Parent Viewer (READ ONLY)
    // =================================================
    async function openPrimaryParentViewer(student) {
        if (!student?.student_id) return;

        Swal.fire({
            title: "กำลังโหลดข้อมูลผู้ปกครอง",
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const { data: links, error: linkError } =
                await supabaseClient
                    .from("parent_students")
                    .select("parent_id,is_primary")
                    .eq("student_id", student.student_id)
                    .is("deleted_at", null);

            if (linkError) throw linkError;

            const parentIds = [
                ...new Set(
                    (links || []).map(link => link.parent_id)
                )
            ];

            let parents = [];

            if (parentIds.length) {
                const { data, error } = await supabaseClient
                    .from("parents")
                    .select("id,first_name,last_name")
                    .in("id", parentIds)
                    .is("deleted_at", null);

                if (error) throw error;

                parents = data || [];
            }

            const parentMap = new Map(
                parents.map(parent => [parent.id, parent])
            );

            await Swal.fire({
                title: "จัดการผู้ปกครองหลัก",
                width: "min(650px, calc(100vw - 24px))",
                padding: "16px",
                heightAuto: false,
                confirmButtonText: "ปิดหน้าต่าง",
                showCloseButton: true,
                html: '<div id="b56-primary-parent-content"></div>',

                didOpen: () => {
                    const popup = Swal.getPopup();

                    popup.style.maxHeight =
                        "calc(100dvh - 24px)";

                    popup.style.overflowY = "auto";

                    const target = document.getElementById(
                        "b56-primary-parent-content"
                    );

                    target.style.cssText = [
                        "text-align:left",
                        "display:grid",
                        "gap:12px",
                        "min-width:0"
                    ].join(";");

                    const studentBox = el("div");

                    studentBox.style.cssText = [
                        "background:#f0fdf4",
                        "border:1px solid #bbf7d0",
                        "border-radius:12px",
                        "padding:14px"
                    ].join(";");

                    const studentLabel = el(
                        "div",
                        "นักเรียน"
                    );

                    studentLabel.style.cssText =
                        "font-size:13px;color:#475569";

                    const studentName = el(
                        "strong",
                        student.name
                    );

                    studentName.style.cssText =
                        "display:block;margin:6px 0";

                    const studentDetail = el(
                        "div",
                        "รหัสนักเรียน: " +
                        student.student_code +
                        "  ชั้นเรียน: " +
                        student.room_name
                    );

                    studentDetail.style.cssText =
                        "font-size:13px;color:#475569";

                    studentBox.append(
                        studentLabel,
                        studentName,
                        studentDetail
                    );

                    target.append(studentBox);

                    const heading = el(
                        "strong",
                        "ผู้ปกครองที่เชื่อมอยู่"
                    );

                    target.append(heading);

                    if (!links || !links.length) {
                        target.append(
                            el(
                                "p",
                                "ยังไม่มีผู้ปกครองเชื่อมกับนักเรียน"
                            )
                        );
                    }

                    (links || []).forEach(link => {
                        const parent = parentMap.get(
                            link.parent_id
                        );

                        const card = el("div");

                        card.style.cssText = [
                            "border:1px solid #e2e8f0",
                            "border-radius:10px",
                            "padding:14px",
                            "display:grid",
                            "gap:6px",
                            "min-width:0"
                        ].join(";");

                        const name = el(
                            "strong",
                            parent
                                ? nameOf(parent)
                                : "ไม่พบข้อมูลผู้ปกครองที่ใช้งาน"
                        );

                        name.style.overflowWrap = "anywhere";

                        const status = el(
                            "div",
                            link.is_primary
                                ? "ผู้ปกครองหลักปัจจุบัน"
                                : "ผู้ปกครองทั่วไป"
                        );

                        status.style.cssText = [
                            "font-size:13px",
                            "font-weight:600",
                            "color:" + (
                                link.is_primary
                                    ? "#166534"
                                    : "#64748b"
                            )
                        ].join(";");

                        card.append(name, status);
                        target.append(card);
                    });

                    // =================================================
                    // B56 — Primary Parent Selection Preview
                    // READ ONLY: no RPC or database updates.
                    // =================================================
                    const activeLinks = (links || []).filter(
                        link => parentMap.has(link.parent_id)
                    );

                    const primaryLinks = activeLinks.filter(
                        link => link.is_primary === true
                    );

                    const currentPrimary =
                        primaryLinks.length === 1
                            ? primaryLinks[0]
                            : null;

                    const candidates = activeLinks.filter(
                        link =>
                            !currentPrimary ||
                            link.parent_id !== currentPrimary.parent_id
                    );

                    const selectionBox = el("div");

                    selectionBox.style.cssText = [
                        "display:grid",
                        "gap:10px",
                        "padding:14px",
                        "border:1px solid #bbf7d0",
                        "border-radius:12px",
                        "background:#f0fdf4",
                        "min-width:0"
                    ].join(";");

                    const selectionTitle = el(
                        "strong",
                        "เลือกผู้ปกครองหลัก"
                    );

                    selectionBox.append(selectionTitle);

                    if (primaryLinks.length > 1) {
                        const warning = el(
                            "p",
                            "พบสถานะผู้ปกครองหลักมากกว่า 1 คน " +
                            "กรุณาตรวจสอบข้อมูลในฐานข้อมูลก่อน"
                        );

                        warning.style.color = "#991b1b";
                        selectionBox.append(warning);

                    } else if (
                        currentPrimary &&
                        candidates.length === 0
                    ) {
                        const message = el(
                            "p",
                            "ขณะนี้มีผู้ปกครองหลักอยู่แล้ว " +
                            "และยังไม่มีผู้ปกครองคนอื่นให้เลือก " +
                            "หากต้องการเปลี่ยน กรุณาเชื่อม" +
                            "ผู้ปกครองคนใหม่กับนักเรียนก่อน"
                        );

                        message.style.cssText =
                            "margin:0;color:#166534;" +
                            "line-height:1.8";

                        selectionBox.append(message);

                    } else if (candidates.length === 0) {
                        selectionBox.append(
                            el(
                                "p",
                                "ยังไม่มีผู้ปกครองที่สามารถเลือกได้"
                            )
                        );

                    } else {
                        const label = el(
                            "label",
                            "ผู้ปกครองหลักคนใหม่"
                        );

                        label.style.fontWeight = "600";

                        const select =
                            document.createElement("select");

                        select.style.cssText = [
                            "width:100%",
                            "max-width:100%",
                            "min-width:0",
                            "padding:11px",
                            "border:1px solid #cbd5e1",
                            "border-radius:8px",
                            "background:#ffffff",
                            "box-sizing:border-box"
                        ].join(";");

                        const placeholder =
                            document.createElement("option");

                        placeholder.value = "";
                        placeholder.textContent =
                            "— เลือกผู้ปกครอง —";

                        select.append(placeholder);

                        candidates.forEach(link => {
                            const parent = parentMap.get(
                                link.parent_id
                            );

                            const option =
                                document.createElement("option");

                            option.value = link.parent_id;
                            option.textContent = nameOf(parent);

                            select.append(option);
                        });

                        const preview = el("div");

                        preview.style.cssText = [
                            "padding:12px",
                            "background:#ffffff",
                            "border:1px solid #bbf7d0",
                            "border-radius:9px",
                            "line-height:1.8",
                            "white-space:pre-line",
                            "overflow-wrap:anywhere"
                        ].join(";");

                        preview.textContent =
                            "กรุณาเลือกผู้ปกครองหลักคนใหม่";

                        select.addEventListener(
                            "change",
                            () => {
                                const chosen = parentMap.get(
                                    select.value
                                );

                                if (!chosen) {
                                    preview.textContent =
                                        "กรุณาเลือกผู้ปกครอง";
                                    return;
                                }

                                const previousName = currentPrimary
                                    ? nameOf(
                                        parentMap.get(
                                            currentPrimary.parent_id
                                        )
                                    )
                                    : "ยังไม่มีผู้ปกครองหลัก";

                                preview.textContent = [
                                    "สรุปการเปลี่ยนผู้ปกครองหลัก",
                                    "",
                                    "นักเรียน: " + student.name,
                                    "ผู้ปกครองหลักเดิม: " +
                                        previousName,
                                    "ผู้ปกครองหลักคนใหม่: " +
                                        nameOf(chosen),
                                    "",
                                    "ผู้ปกครองเดิมจะยังคง" +
                                        "เชื่อมกับนักเรียนตามปกติ",
                                    "",
                                    "โหมดตรวจสอบ: " +
                                        "ยังไม่บันทึกข้อมูลจริง"
                                ].join("\n");
                            }
                        );

                        selectionBox.append(
                            label,
                            select,
                            preview
                        );

                        // B56 — Confirm primary parent change.
                        // Writes only after Admin's final approval.
                        const changeButton = el(
                            "button",
                            "ตรวจสอบและยืนยันการเปลี่ยน",
                            "btn"
                        );

                        changeButton.type = "button";
                        changeButton.disabled = true;

                        changeButton.style.cssText = [
                            "width:100%",
                            "padding:12px",
                            "border-radius:9px",
                            "background:#166534",
                            "color:white",
                            "font-weight:700",
                            "cursor:pointer",
                            "box-sizing:border-box"
                        ].join(";");

                        changeButton.style.opacity = "0.5";

                        select.addEventListener("change", () => {
                            const valid = candidates.some(
                                link => link.parent_id === select.value
                            );

                            changeButton.disabled = !valid;
                            changeButton.style.opacity =
                                valid ? "1" : "0.5";
                        });

                        let changing = false;

                        changeButton.addEventListener(
                            "click",
                            async () => {
                                if (changing || changeButton.disabled) {
                                    return;
                                }

                                const newParentId = select.value;

                                const chosenLink = candidates.find(
                                    link => link.parent_id === newParentId
                                );

                                const chosenParent = parentMap.get(
                                    newParentId
                                );

                                if (!chosenLink || !chosenParent) {
                                    return;
                                }

                                changing = true;
                                changeButton.disabled = true;

                                const expectedPrimaryId =
                                    currentPrimary?.parent_id || null;

                                try {
                                    // Recheck the current primary parent.
                                    const {
                                        data: latestPrimary,
                                        error: checkError
                                    } = await supabaseClient
                                        .from("parent_students")
                                        .select("parent_id")
                                        .eq(
                                            "student_id",
                                            student.student_id
                                        )
                                        .eq("is_primary", true)
                                        .is("deleted_at", null)
                                        .maybeSingle();

                                    if (checkError) {
                                        throw checkError;
                                    }

                                    const actualPrimaryId =
                                        latestPrimary?.parent_id || null;

                                    if (
                                        actualPrimaryId !==
                                        expectedPrimaryId
                                    ) {
                                        await Swal.fire({
                                            icon: "warning",
                                            title: "ข้อมูลมีการเปลี่ยนแปลง",
                                            text:
                                                "ผู้ปกครองหลักถูกเปลี่ยน" +
                                                "ไปแล้ว กรุณาโหลดข้อมูลใหม่",
                                            confirmButtonText: "ตกลง"
                                        });
                                        return;
                                    }

                                    const previousName = currentPrimary
                                        ? nameOf(
                                            parentMap.get(
                                                currentPrimary.parent_id
                                            )
                                        )
                                        : "ยังไม่มีผู้ปกครองหลัก";

                                    const confirmation =
                                        await Swal.fire({
                                            title:
                                                "ยืนยันเปลี่ยนผู้ปกครองหลัก",
                                            width:
                                                "min(620px, calc(100vw - 24px))",
                                            heightAuto: false,
                                            padding: "20px",
                                            customClass: {
                                                popup: "b56-primary-confirm-popup"
                                            },
                                            html: `
                                                <div class="b56-primary-confirm">
                                                    <div class="b56-confirm-student">
                                                        <div class="b56-confirm-label">
                                                            ข้อมูลนักเรียน
                                                        </div>
                                                        <strong id="b56-confirm-student-name"></strong>
                                                        <div id="b56-confirm-student-code"></div>
                                                    </div>

                                                    <div class="b56-confirm-parent">
                                                        <div class="b56-confirm-label">
                                                            ผู้ปกครองหลักเดิม
                                                        </div>
                                                        <strong id="b56-confirm-old-parent"></strong>
                                                    </div>

                                                    <div class="b56-confirm-arrow">
                                                        ↓ เปลี่ยนเป็น
                                                    </div>

                                                    <div class="b56-confirm-new-parent">
                                                        <div class="b56-confirm-label">
                                                            ผู้ปกครองหลักคนใหม่
                                                        </div>
                                                        <strong id="b56-confirm-new-parent"></strong>
                                                    </div>

                                                    <div class="b56-confirm-note">
                                                        <p>
                                                            ผู้ปกครองเดิมยังคงเชื่อมกับนักเรียนตามปกติ
                                                        </p>
                                                        <p>
                                                            ผู้ปกครองหลักคนใหม่จะเป็นผู้รับแจ้งเตือน LINE ตามค่าเริ่มต้น
                                                        </p>
                                                    </div>
                                                </div>
                                            `,
                                            showCancelButton: true,
                                            confirmButtonText:
                                                "ยืนยันเปลี่ยนจริง",
                                            cancelButtonText: "ยกเลิก",
                                            focusCancel: true,
                                            didOpen: () => {
                                                const popup =
                                                    Swal.getPopup();

                                                popup.style.maxHeight =
                                                    "calc(100dvh - 24px)";
                                                popup.style.overflowY = "auto";

                                                const content =
                                                    Swal.getHtmlContainer();

                                                content.querySelector(
                                                    "#b56-confirm-student-name"
                                                ).textContent = student.name;

                                                content.querySelector(
                                                    "#b56-confirm-student-code"
                                                ).textContent =
                                                    "รหัสนักเรียน: " +
                                                    student.student_code +
                                                    " · ชั้นเรียน: " +
                                                    student.room_name;

                                                content.querySelector(
                                                    "#b56-confirm-old-parent"
                                                ).textContent = previousName;

                                                content.querySelector(
                                                    "#b56-confirm-new-parent"
                                                ).textContent =
                                                    nameOf(chosenParent);
                                            }
                                        });

                                    if (!confirmation.isConfirmed) {
                                        return;
                                    }

                                    Swal.fire({
                                        title:
                                            "กำลังเปลี่ยนผู้ปกครองหลัก",
                                        text:
                                            "กรุณาอย่าส่งคำขอซ้ำ",
                                        allowOutsideClick: false,
                                        allowEscapeKey: false,
                                        showConfirmButton: false,
                                        didOpen: () => Swal.showLoading()
                                    });

                                    const {
                                        data: updatedLinkId,
                                        error: saveError
                                    } = await supabaseClient.rpc(
                                        "admin_set_primary_parent",
                                        {
                                            p_student_id:
                                                student.student_id,
                                            p_new_parent_id:
                                                newParentId,
                                            p_expected_primary_parent_id:
                                                expectedPrimaryId
                                        }
                                    );

                                    if (saveError) {
                                        throw saveError;
                                    }

                                    if (!updatedLinkId) {
                                        throw new Error(
                                            "PRIMARY_PARENT_RESULT_UNCONFIRMED"
                                        );
                                    }

                                    const {
                                        data: verified,
                                        error: verifyError
                                    } = await supabaseClient
                                        .from("parent_students")
                                        .select("id,parent_id,is_primary")
                                        .eq(
                                            "student_id",
                                            student.student_id
                                        )
                                        .eq("is_primary", true)
                                        .is("deleted_at", null)
                                        .maybeSingle();

                                    if (verifyError) {
                                        throw verifyError;
                                    }

                                    if (
                                        !verified ||
                                        verified.parent_id !== newParentId ||
                                        verified.id !== updatedLinkId
                                    ) {
                                        throw new Error(
                                            "PRIMARY_PARENT_VERIFY_FAILED"
                                        );
                                    }

                                    await Swal.fire({
                                        icon: "success",
                                        title:
                                            "เปลี่ยนผู้ปกครองหลักสำเร็จ",
                                        text:
                                            nameOf(chosenParent) +
                                            " เป็นผู้ปกครองหลักของ " +
                                            student.name + " แล้ว",
                                        confirmButtonText: "ตกลง"
                                    });

                                    await loadRole("parent");

                                } catch (error) {
                                    console.error(
                                        "B56 Set Primary Parent:",
                                        error
                                    );

                                    // Never automatically repeat a write.
                                    let latestName = null;

                                    try {
                                        const {
                                            data: latest,
                                            error: lookupError
                                        } = await supabaseClient
                                            .from("parent_students")
                                            .select("parent_id")
                                            .eq(
                                                "student_id",
                                                student.student_id
                                            )
                                            .eq("is_primary", true)
                                            .is("deleted_at", null)
                                            .maybeSingle();

                                        if (lookupError) {
                                            throw lookupError;
                                        }

                                        if (latest) {
                                            latestName = latest.parent_id ===
                                                newParentId
                                                ? "ผู้ปกครองที่เลือก"
                                                : "ผู้ปกครองรายอื่น";
                                        }

                                    } catch (lookupError) {
                                        console.warn(
                                            "B56 Primary Recheck:",
                                            lookupError
                                        );
                                    }

                                    await Swal.fire({
                                        icon: "warning",
                                        title:
                                            "กรุณาตรวจสอบสถานะล่าสุด",
                                        text: latestName ===
                                            "ผู้ปกครองที่เลือก"
                                            ? "ตรวจพบว่าผู้ปกครองที่เลือก" +
                                                "เป็นผู้ปกครองหลักแล้ว " +
                                                "ไม่ต้องส่งคำขอซ้ำ"
                                            : "ยังไม่สามารถยืนยันผล" +
                                                "การเปลี่ยนได้ กรุณาโหลด" +
                                                "ข้อมูลใหม่ก่อนดำเนินการอีกครั้ง",
                                        confirmButtonText: "รับทราบ"
                                    });

                                } finally {
                                    changing = false;

                                    if (changeButton.isConnected) {
                                        changeButton.disabled = false;
                                    }
                                }
                            }
                        );

                        selectionBox.append(changeButton);

                    }

                    target.append(selectionBox);

                    const note = el(
                        "p",
                        "ขณะนี้เป็นโหมดแสดงข้อมูลเท่านั้น " +
                        "ยังไม่สามารถเปลี่ยนผู้ปกครองหลักจากหน้านี้ได้"
                    );

                    note.style.cssText =
                        "font-size:12px;color:#64748b;" +
                        "line-height:1.7";

                    target.append(note);
                }
            });

        } catch (error) {
            console.error(
                "B56 Primary Parent Viewer:",
                error
            );

            await Swal.fire({
                title: "โหลดข้อมูลไม่สำเร็จ",
                text: "ไม่สามารถตรวจสอบรายชื่อผู้ปกครองได้",
                confirmButtonText: "ปิด"
            });
        }
    }
    // =================================================
    // B56 — Parent Student Link Form
    // Search + Relationship + Review (READ ONLY)
    // No database writes in this step.
    // =================================================
    async function openParentStudentLinkForm(parent) {
        if (!parent?.id) {
            await Swal.fire({
                title: "ไม่พบข้อมูลผู้ปกครอง",
                text: "กรุณาโหลดรายการผู้ปกครองใหม่",
                confirmButtonText: "ตกลง"
            });
            return;
        }

        await Swal.fire({
            title: "เชื่อมนักเรียน",
            width: "min(700px, calc(100vw - 24px))",
            padding: "16px",
            heightAuto: false,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: "ปิดหน้าต่าง",
            showCloseButton: true,
            focusConfirm: false,
            customClass: {
                popup: "b56-parent-link-popup"
            },

            html: `
                <div style="text-align:left;">

                    <div style="
                        background:#f0fdf4;
                        border:1px solid #bbf7d0;
                        border-radius:12px;
                        padding:14px;
                        margin-bottom:18px;
                    ">
                        <div style="
                            font-size:13px;
                            color:#475569;
                            margin-bottom:5px;
                        ">
                            ผู้ปกครองที่เลือก
                        </div>

                        <div
                            id="b56-link-parent-name"
                            style="
                                font-weight:700;
                                font-size:18px;
                                color:#166534;
                            ">
                        </div>
                    </div>

                    <label
                        for="b56-student-search"
                        style="font-weight:600;">
                        ค้นหานักเรียน
                    </label>

                    <div style="
                        display:flex;
                        gap:8px;
                        margin:8px 0 12px;
                        flex-wrap:wrap;
                    ">
                        <input
                            id="b56-student-search"
                            type="search"
                            placeholder="รหัส / ชื่อ / นามสกุล"
                            autocomplete="off"
                            style="
                                flex:1;
                                min-width:180px;
                                padding:11px;
                                border:1px solid #cbd5e1;
                                border-radius:8px;
                                box-sizing:border-box;
                            "
                        >

                        <button
                            id="b56-student-search-button"
                            type="button"
                            style="
                                padding:10px 18px;
                                background:#2563eb;
                                color:white;
                                border:0;
                                border-radius:8px;
                                cursor:pointer;
                                font-weight:600;
                            ">
                            ค้นหา
                        </button>
                    </div>

                    <div
                        id="b56-student-search-status"
                        style="
                            color:#64748b;
                            font-size:13px;
                            margin:10px 0;
                        ">
                        กรอกรหัสหรือชื่ออย่างน้อย 2 ตัวอักษร
                    </div>

                    <div
                        id="b56-student-search-results"
                        style="
                            max-height:240px;
                            overflow-y:auto;
                            display:grid;
                            gap:8px;
                        ">
                    </div>

                    <div
                        id="b56-student-selected"
                        style="margin-top:16px;">
                    </div>

                    <div
                        id="b56-link-review"
                        style="margin-top:14px;">
                    </div>

                    <p style="
                        font-size:12px;
                        color:#64748b;
                        margin-top:18px;
                        line-height:1.7;
                    ">
                        แสดงเฉพาะนักเรียนสถานะ ACTIVE
                        ขั้นตอนนี้เป็นการตรวจสอบข้อมูลเท่านั้น
                        ยังไม่มีการบันทึกความสัมพันธ์
                    </p>
                </div>
            `,

            didOpen: () => {
                const container = Swal.getHtmlContainer();
                const popup = Swal.getPopup();
                popup.style.maxHeight = "calc(100dvh - 24px)";
                popup.style.overflowY = "auto";

                const get = id =>
                    container.querySelector("#" + id);

                const parentName =
                    get("b56-link-parent-name");

                const input =
                    get("b56-student-search");

                const searchButton =
                    get("b56-student-search-button");

                const status =
                    get("b56-student-search-status");

                const results =
                    get("b56-student-search-results");

                const selected =
                    get("b56-student-selected");

                const review =
                    get("b56-link-review");

                parentName.textContent = nameOf(parent);

                let searchSequence = 0;

                const searchStudents = async () => {
                    const keyword = cleanSearch(input.value);
                    const sequence = ++searchSequence;

                    results.replaceChildren();
                    selected.replaceChildren();
                    review.replaceChildren();

                    if (keyword.length < 2) {
                        status.textContent =
                            "กรุณากรอกอย่างน้อย 2 ตัวอักษร";
                        return;
                    }

                    status.textContent =
                        "กำลังค้นหานักเรียน...";

                    searchButton.disabled = true;

                    try {
                        const { data, error } =
                            await supabaseClient
                                .from("students")
                                .select(
                                    "id,student_code," +
                                    "first_name,last_name," +
                                    "current_room_id,current_status"
                                )
                                .eq(
                                    "current_status",
                                    "ACTIVE"
                                )
                                .is("deleted_at", null)
                                .or(
                                    "student_code.ilike.%" +
                                    keyword + "%," +
                                    "first_name.ilike.%" +
                                    keyword + "%," +
                                    "last_name.ilike.%" +
                                    keyword + "%"
                                )
                                .order("student_code")
                                .limit(20);

                        if (sequence !== searchSequence ||
                            !container.isConnected) {
                            return;
                        }

                        if (error) throw error;

                        const students = data || [];
                        // B56 — Read active parent links for
                        // students in the current search results.
                        const linksByStudent = new Map();

                        if (students.length) {
                            const studentIds = students.map(
                                student => student.id
                            );

                            const {
                                data: activeLinks,
                                error: linksError
                            } = await supabaseClient
                                .from("parent_students")
                                .select("student_id,parent_id")
                                .in("student_id", studentIds)
                                .is("deleted_at", null);

                            if (linksError) throw linksError;

                            if (
                                sequence !== searchSequence ||
                                !container.isConnected
                            ) {
                                return;
                            }

                            (activeLinks || []).forEach(link => {
                                if (!linksByStudent.has(
                                    link.student_id
                                )) {
                                    linksByStudent.set(
                                        link.student_id,
                                        new Set()
                                    );
                                }

                                linksByStudent
                                    .get(link.student_id)
                                    .add(link.parent_id);
                            });
                        }
                        // B56 — Get room names for search results.
                        const roomIds = [
                            ...new Set(
                                students
                                    .map(s => s.current_room_id)
                                    .filter(Boolean)
                            )
                        ];

                        const roomMap = new Map();

                        if (roomIds.length) {
                            const {
                                data: rooms,
                                error: roomError
                            } = await supabaseClient
                                .from("rooms")
                                .select("id,room_name")
                                .in("id", roomIds)
                                .is("deleted_at", null);

                            if (roomError) throw roomError;

                            if (
                                sequence !== searchSequence ||
                                !container.isConnected
                            ) {
                                return;
                            }

                            (rooms || []).forEach(room => {
                                roomMap.set(
                                    room.id,
                                    room.room_name
                                );
                            });
                        }

                        if (!students.length) {
                            status.textContent =
                                "ไม่พบนักเรียนที่ตรงกับคำค้นหา";
                            return;
                        }

                        status.textContent =
                            "พบ " + students.length +
                            " รายการ (แสดงสูงสุด 20 รายการ)";

                        students.forEach(student => {
                            const item = el("div");

                            item.style.cssText = [
                                "display:flex",
                                "align-items:center",
                                "justify-content:space-between",
                                "gap:12px",
                                "padding:12px",
                                "border:1px solid #e2e8f0",
                                "border-radius:10px",
                                "flex-wrap:wrap"
                            ].join(";");

                            const info = el("div");

                            const studentName =
                                nameOf(student);

                            const name = el(
                                "div",
                                studentName
                            );

                            name.style.fontWeight = "600";

                            const code = el(
                                "div",
                                "รหัสนักเรียน: " +
                                textValue(student.student_code) +
                                "　ชั้นเรียน: " +
                                textValue(
                                    roomMap.get(
                                        student.current_room_id
                                    )
                                )
                            );

                            code.style.cssText =
                                "font-size:13px;color:#64748b";

                            info.append(name, code);

                            const linkedParents =
                                linksByStudent.get(student.id) ||
                                new Set();

                            let linkText;
                            let linkColor;

                            if (linkedParents.has(parent.id)) {
                                linkText =
                                    "เชื่อมกับผู้ปกครองรายนี้แล้ว";
                                linkColor = "#166534";
                            } else if (linkedParents.size > 0) {
                                linkText =
                                    "มีผู้ปกครองรายอื่นเชื่อมอยู่";
                                linkColor = "#92400e";
                            } else {
                                linkText =
                                    "ยังไม่มีผู้ปกครองเชื่อมอยู่";
                                linkColor = "#64748b";
                            }

                            const linkLabel = el(
                                "div",
                                linkText
                            );

                            linkLabel.style.cssText = [
                                "font-size:12px",
                                "font-weight:600",
                                "margin-top:5px",
                                "color:" + linkColor
                            ].join(";");

                            info.append(linkLabel);

                            const chooseButton = el(
                                "button",
                                "เลือก",
                                "btn"
                            );

                            chooseButton.type = "button";

                            chooseButton.addEventListener(
                                "click",
                                () => {
                                    selected.replaceChildren();
                                    review.replaceChildren();

                                    const box = el("div");

                                    box.style.cssText = [
                                        "padding:16px",
                                        "border:1px solid #bbf7d0",
                                        "border-radius:12px",
                                        "background:#f0fdf4"
                                    ].join(";");

                                    const heading = el(
                                        "strong",
                                        "นักเรียนที่เลือก"
                                    );

                                    const details = el(
                                        "div",
                                        studentName +
                                        "\nรหัสนักเรียน: " +
                                        textValue(
                                            student.student_code
                                        )
                                    );

                                    details.style.cssText =
                                        "white-space:pre-line;" +
                                        "margin:8px 0 14px;" +
                                        "line-height:1.7";

                                    const label = el(
                                        "label",
                                        "ความสัมพันธ์กับนักเรียน"
                                    );

                                    label.style.cssText =
                                        "display:block;" +
                                        "font-weight:600;" +
                                        "margin-bottom:7px";

                                    const relationship = el(
                                        "div",
                                        "ผู้ปกครอง"
                                    );

                                    relationship.style.cssText = [
                                        "width:100%",
                                        "padding:11px",
                                        "border:1px solid #bbf7d0",
                                        "border-radius:8px",
                                        "background:#ffffff",
                                        "color:#166534",
                                        "font-weight:700",
                                        "box-sizing:border-box"
                                    ].join(";");

                                    const reviewButton = el(
                                        "button",
                                        "ตรวจสอบข้อมูลก่อนเชื่อม",
                                        "btn"
                                    );

                                    reviewButton.type = "button";

                                    reviewButton.style.cssText = [
                                        "display:block",
                                        "width:100%",
                                        "margin-top:14px",
                                        "padding:12px",
                                        "border-radius:9px",
                                        "background:#2563eb",
                                        "color:white",
                                        "font-weight:700",
                                        "cursor:pointer"
                                    ].join(";");

                                    reviewButton.addEventListener(
                                        "click",
                                        () => {
                                            review.replaceChildren();

                                            const summaryBox = el("div");

                                            summaryBox.style.cssText = [
                                                "padding:16px",
                                                "border:1px solid #bfdbfe",
                                                "border-radius:12px",
                                                "background:#eff6ff",
                                                "line-height:1.9"
                                            ].join(";");

                                            const summaryTitle = el(
                                                "strong",
                                                "สรุปข้อมูลก่อนเชื่อม"
                                            );

                                            const summaryText = el(
                                                "div",
                                                "ผู้ปกครอง: " +
                                                nameOf(parent) +
                                                "\nนักเรียน: " +
                                                studentName +
                                                "\nรหัสนักเรียน: " +
                                                textValue(
                                                    student.student_code
                                                ) +
                                                "\nความสัมพันธ์: ผู้ปกครอง"
                                            );

                                            summaryText.style.cssText =
                                                "white-space:pre-line;" +
                                                "margin-top:8px";

                                            const note = el(
                                                "p",
                                                "โหมดตรวจสอบ: " +
                                                "ยังไม่บันทึกข้อมูลจริง"
                                            );

                                            note.style.cssText =
                                                "font-size:13px;" +
                                                "color:#92400e;" +
                                                "font-weight:600;" +
                                                "margin-bottom:0";

                                            summaryBox.append(
                                                summaryTitle,
                                                summaryText,
                                                note
                                            );

                                            review.append(summaryBox);

                                            // B56 — Final confirmation
                                            // before writing a real link.
                                            const saveButton = el(
                                                "button",
                                                "ยืนยันเชื่อมนักเรียน",
                                                "btn"
                                            );

                                            saveButton.type = "button";

                                            saveButton.style.cssText = [
                                                "display:block",
                                                "width:100%",
                                                "margin-top:12px",
                                                "padding:12px",
                                                "border-radius:9px",
                                                "background:#166534",
                                                "color:white",
                                                "font-weight:700",
                                                "cursor:pointer"
                                            ].join(";");

                                            let saving = false;

                                            saveButton.addEventListener(
                                                "click",
                                                async () => {
                                                    if (
                                                        saving ||
                                                        !container.isConnected ||
                                                        !selected.contains(box)
                                                    ) {
                                                        return;
                                                    }

                                                    saving = true;
                                                    saveButton.disabled = true;

                                                    try {
                                                        // Recheck the pair
                                                        // immediately before confirmation.
                                                        const {
                                                            data: oldLink,
                                                            error: checkError
                                                        } = await supabaseClient
                                                            .from("parent_students")
                                                            .select("id,deleted_at")
                                                            .eq("parent_id", parent.id)
                                                            .eq("student_id", student.id)
                                                            .maybeSingle();

                                                        if (checkError) {
                                                            throw checkError;
                                                        }

                                                        if (
                                                            oldLink &&
                                                            oldLink.deleted_at === null
                                                        ) {
                                                            await Swal.fire({
                                                                title: "เชื่อมอยู่แล้ว",
                                                                text: "นักเรียนคนนี้เชื่อมกับผู้ปกครองรายนี้อยู่แล้ว ไม่ต้องบันทึกซ้ำ",
                                                                confirmButtonText: "ตกลง"
                                                            });
                                                            return;
                                                        }

                                                        const isReactivation =
                                                            Boolean(oldLink);

                                                        const confirmation =
                                                            await Swal.fire({
                                                                title: isReactivation
                                                                    ? "ยืนยันเปิดใช้ความสัมพันธ์เดิม"
                                                                    : "ยืนยันเชื่อมนักเรียน",
                                                                width:
                                                                    "min(620px, calc(100vw - 24px))",
                                                                padding: "20px",
                                                                heightAuto: false,
                                                                customClass: {
                                                                    popup: "b56-link-confirm-popup"
                                                                },
                                                                html: `
                                                                    <div class="b56-link-confirm">
                                                                        <div class="b56-link-confirm-student">
                                                                            <div class="b56-link-confirm-label">
                                                                                ข้อมูลนักเรียน
                                                                            </div>
                                                                            <strong id="b56-link-confirm-student"></strong>
                                                                            <div id="b56-link-confirm-code"></div>
                                                                        </div>

                                                                        <div class="b56-link-confirm-parent">
                                                                            <div class="b56-link-confirm-label">
                                                                                ผู้ปกครองที่จะเชื่อม
                                                                            </div>
                                                                            <strong id="b56-link-confirm-parent"></strong>
                                                                        </div>

                                                                        <div class="b56-link-confirm-relationship">
                                                                            ความสัมพันธ์: <strong>ผู้ปกครอง</strong>
                                                                        </div>

                                                                        <div class="b56-link-confirm-note">
                                                                            <p id="b56-link-confirm-action"></p>
                                                                            <p>
                                                                                ผู้ปกครองเดิมของนักเรียนจะยังคงเชื่อมอยู่ตามปกติ
                                                                            </p>
                                                                            <p>
                                                                                การเชื่อมครั้งนี้ยังไม่กำหนดเป็นผู้ปกครองหลัก
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                `,
                                                                showCancelButton: true,
                                                                confirmButtonText:
                                                                    "ยืนยันบันทึกจริง",
                                                                cancelButtonText: "ยกเลิก",
                                                                focusCancel: true,
                                                                didOpen: () => {
                                                                    const popup =
                                                                        Swal.getPopup();

                                                                    popup.style.maxHeight =
                                                                        "calc(100dvh - 24px)";
                                                                    popup.style.overflowY =
                                                                        "auto";

                                                                    const content =
                                                                        Swal.getHtmlContainer();

                                                                    const setText = (id, value) => {
                                                                        const element =
                                                                            content.querySelector(
                                                                                "#" + id
                                                                            );

                                                                        if (element) {
                                                                            element.textContent = value;
                                                                        }
                                                                    };

                                                                    setText(
                                                                        "b56-link-confirm-student",
                                                                        studentName
                                                                    );

                                                                    setText(
                                                                        "b56-link-confirm-code",
                                                                        "รหัสนักเรียน: " +
                                                                            textValue(
                                                                                student.student_code
                                                                            ) +
                                                                            " · ชั้นเรียน: " +
                                                                            textValue(
                                                                                roomMap.get(
                                                                                    student.current_room_id
                                                                                )
                                                                            )
                                                                    );

                                                                    setText(
                                                                        "b56-link-confirm-parent",
                                                                        nameOf(parent)
                                                                    );

                                                                    setText(
                                                                        "b56-link-confirm-action",
                                                                        isReactivation
                                                                            ? "ระบบจะเปิดใช้งานความสัมพันธ์เดิมอีกครั้ง"
                                                                            : "ระบบจะบันทึกความสัมพันธ์ใหม่ลงฐานข้อมูล"
                                                                    );
                                                                }
                                                            });

                                                        if (!confirmation.isConfirmed) {
                                                            return;
                                                        }

                                                        // Do not submit if the
                                                        // selected UI is no longer current.
                                                        if (
                                                            !selected.contains(box)
                                                        ) {
                                                            return;
                                                        }

                                                        Swal.fire({
                                                            title: "กำลังเชื่อมนักเรียน",
                                                            text: "กรุณาอย่าส่งคำขอซ้ำ",
                                                            allowOutsideClick: false,
                                                            allowEscapeKey: false,
                                                            showConfirmButton: false,
                                                            didOpen: () =>
                                                                Swal.showLoading()
                                                        });

                                                        const {
                                                            data: linkId,
                                                            error: saveError
                                                        } = await supabaseClient.rpc(
                                                            "admin_link_parent_student",
                                                            {
                                                                p_parent_id: parent.id,
                                                                p_student_id: student.id,
                                                                p_relationship: "Parent",
                                                                p_is_primary: false
                                                            }
                                                        );

                                                        if (saveError) {
                                                            throw saveError;
                                                        }

                                                        if (
                                                            typeof linkId !== "string" ||
                                                            !/^[0-9a-f-]{36}$/i.test(linkId)
                                                        ) {
                                                            throw new Error(
                                                                "PARENT_LINK_RESULT_UNCONFIRMED"
                                                            );
                                                        }

                                                        // Verify the saved link.
                                                        const {
                                                            data: verified,
                                                            error: verifyError
                                                        } = await supabaseClient
                                                            .from("parent_students")
                                                            .select("id,deleted_at")
                                                            .eq("id", linkId)
                                                            .eq("parent_id", parent.id)
                                                            .eq("student_id", student.id)
                                                            .maybeSingle();

                                                        if (
                                                            verifyError ||
                                                            !verified ||
                                                            verified.deleted_at !== null
                                                        ) {
                                                            throw new Error(
                                                                "PARENT_LINK_VERIFY_FAILED"
                                                            );
                                                        }

                                                        await Swal.fire({
                                                            icon: "success",
                                                            title: "เชื่อมนักเรียนสำเร็จ",
                                                            text: "บันทึกความสัมพันธ์ผู้ปกครองกับนักเรียนเรียบร้อยแล้ว",
                                                            confirmButtonText: "ตกลง"
                                                        });

                                                        await loadRole("parent");

                                                    } catch (error) {
                                                        console.error(
                                                            "B56 Parent Student Link:",
                                                            error
                                                        );

                                                        // READ ONLY reconciliation.
                                                        // Never automatically retry
                                                        // a failed write request.
                                                        let linkFound = false;
                                                        let checkSucceeded = false;

                                                        try {
                                                            const {
                                                                data: currentLink,
                                                                error: lookupError
                                                            } = await supabaseClient
                                                                .from("parent_students")
                                                                .select("id,deleted_at")
                                                                .eq("parent_id", parent.id)
                                                                .eq("student_id", student.id)
                                                                .maybeSingle();

                                                            if (lookupError) {
                                                                throw lookupError;
                                                            }

                                                            checkSucceeded = true;

                                                            linkFound = Boolean(
                                                                currentLink &&
                                                                currentLink.deleted_at === null
                                                            );

                                                        } catch (lookupError) {
                                                            console.warn(
                                                                "B56 Link Reconciliation:",
                                                                lookupError
                                                            );
                                                        }

                                                        if (linkFound) {
                                                            await Swal.fire({
                                                                icon: "info",
                                                                title: "พบความสัมพันธ์ที่ใช้งานอยู่",
                                                                text:
                                                                    "ตรวจสอบฐานข้อมูลล่าสุดแล้ว " +
                                                                    "พบว่านักเรียนคนนี้เชื่อมกับ" +
                                                                    "ผู้ปกครองรายนี้อยู่แล้ว " +
                                                                    "ไม่จำเป็นต้องส่งคำขอซ้ำ",
                                                                confirmButtonText: "ตกลง"
                                                            });

                                                            await loadRole("parent");

                                                        } else {
                                                            await Swal.fire({
                                                                icon: "warning",
                                                                title: "ยังยืนยันผลการบันทึกไม่ได้",
                                                                text: checkSucceeded
                                                                    ? "ไม่พบความสัมพันธ์ที่ใช้งานอยู่ในการตรวจล่าสุด กรุณาตรวจสอบรายการอีกครั้งก่อนดำเนินการใหม่"
                                                                    : "ไม่สามารถตรวจสอบฐานข้อมูลล่าสุดได้ กรุณาตรวจสอบรายการผู้ปกครองก่อน ห้ามส่งคำขอซ้ำทันที",
                                                                confirmButtonText: "รับทราบ"
                                                            });
                                                        }

                                                    } finally {

                                                        saving = false;

                                                        if (
                                                            saveButton.isConnected
                                                        ) {
                                                            saveButton.disabled = false;
                                                        }
                                                    }
                                                }
                                            );

                                            review.append(saveButton);

                                            review.scrollIntoView({
                                                behavior: "smooth",
                                                block: "nearest"
                                            });
                                        }
                                    );

                                    box.append(
                                        heading,
                                        details,
                                        label,
                                        relationship,
                                        reviewButton
                                    );

                                    selected.append(box);

                                    // B56 — Check existing parent-student link.
                                    // READ ONLY: no database changes.
                                    const linkStatus = el(
                                        "div",
                                        "กำลังตรวจสอบความสัมพันธ์เดิม..."
                                    );

                                    linkStatus.style.cssText = [
                                        "margin-top:12px",
                                        "padding:12px",
                                        "border-radius:9px",
                                        "background:#f1f5f9",
                                        "color:#475569",
                                        "font-size:14px",
                                        "line-height:1.7"
                                    ].join(";");

                                    selected.append(linkStatus);

                                    // Do not allow review until the
                                    // database check has succeeded.
                                    reviewButton.disabled = true;
                                    reviewButton.style.opacity = "0.6";

                                    const checkExistingLink = async () => {
                                        try {
                                            const {
                                                data: existingLink,
                                                error: linkError
                                            } = await supabaseClient
                                                .from("parent_students")
                                                .select(
                                                    "id,deleted_at," +
                                                    "relationship,is_primary"
                                                )
                                                .eq(
                                                    "parent_id",
                                                    parent.id
                                                )
                                                .eq(
                                                    "student_id",
                                                    student.id
                                                )
                                                .maybeSingle();

                                            // Ignore results from a
                                            // selection that was replaced.
                                            if (
                                                !container.isConnected ||
                                                !selected.contains(box)
                                            ) {
                                                return;
                                            }

                                            if (linkError) {
                                                throw linkError;
                                            }

                                            if (
                                                existingLink &&
                                                existingLink.deleted_at === null
                                            ) {
                                                linkStatus.textContent =
                                                    "เชื่อมอยู่แล้ว: " +
                                                    "นักเรียนคนนี้มีความสัมพันธ์" +
                                                    "กับผู้ปกครองรายนี้อยู่แล้ว " +
                                                    "ไม่ต้องเชื่อมซ้ำ";

                                                linkStatus.style.background =
                                                    "#fef3c7";

                                                linkStatus.style.color =
                                                    "#92400e";

                                                reviewButton.disabled = true;
                                                reviewButton.style.opacity =
                                                    "0.6";

                                                return;
                                            }

                                            if (existingLink) {
                                                linkStatus.textContent =
                                                    "เคยเชื่อมแล้ว: " +
                                                    "พบความสัมพันธ์เดิมที่" +
                                                    "ถูกยกเลิกไว้ " +
                                                    "สามารถตรวจสอบข้อมูลเพื่อ" +
                                                    "เปิดใช้งานรายการเดิม" +
                                                    "ในขั้นตอนถัดไป";

                                                linkStatus.style.background =
                                                    "#fef3c7";

                                                linkStatus.style.color =
                                                    "#92400e";
                                            } else {
                                                linkStatus.textContent =
                                                    "ยังไม่เคยเชื่อม: " +
                                                    "ไม่พบความสัมพันธ์เดิม" +
                                                    "ระหว่างผู้ปกครองและ" +
                                                    "นักเรียนรายนี้";

                                                linkStatus.style.background =
                                                    "#dcfce7";

                                                linkStatus.style.color =
                                                    "#166534";
                                            }

                                            reviewButton.disabled = false;
                                            reviewButton.style.opacity = "1";

                                        } catch (error) {
                                            if (
                                                !container.isConnected ||
                                                !selected.contains(box)
                                            ) {
                                                return;
                                            }

                                            console.error(
                                                "B56 Parent Link Check:",
                                                error
                                            );

                                            linkStatus.textContent =
                                                "ไม่สามารถตรวจสอบ" +
                                                "ความสัมพันธ์เดิมได้ " +
                                                "กรุณาลองใหม่อีกครั้ง";

                                            linkStatus.style.background =
                                                "#fee2e2";

                                            linkStatus.style.color =
                                                "#991b1b";

                                            reviewButton.disabled = true;
                                            reviewButton.style.opacity =
                                                "0.6";
                                        }
                                    };

                                    checkExistingLink();

                                }
                            );

                            item.append(info, chooseButton);
                            results.append(item);
                        });

                    } catch (error) {
                        if (sequence !== searchSequence ||
                            !container.isConnected) {
                            return;
                        }

                        console.error(
                            "B56 Student Search:",
                            error
                        );

                        status.textContent =
                            "ค้นหานักเรียนไม่สำเร็จ " +
                            "กรุณาตรวจสอบ Console";
                    } finally {
                        if (sequence === searchSequence &&
                            container.isConnected) {
                            searchButton.disabled = false;
                        }
                    }
                };

                searchButton.addEventListener(
                    "click",
                    searchStudents
                );

                input.addEventListener(
                    "keydown",
                    event => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            searchStudents();
                        }
                    }
                );

                input.focus();
            }
        });
    }
    // =================================================
    // B56 — Parent Create Form
    // Parent record only; no Auth/Profile/LINE creation.
    // Supports Admin review of possible duplicate names.
    // =================================================

    async function openParentCreateForm() {
        const values = {
            firstName: "",
            lastName: "",
            nickname: "",
            phone: "",
            email: ""
        };

        const result = await Swal.fire({
            title: "👨‍👩‍👧 เพิ่มข้อมูลผู้ปกครอง",
            width: 600,
            html: `
                <div style="text-align:left;">
                    <label for="b56-parent-first">
                        ชื่อ *
                    </label>
                    <input id="b56-parent-first"
                           class="swal2-input"
                           maxlength="100"
                           style="width:100%;margin:4px 0 12px;box-sizing:border-box;">

                    <label for="b56-parent-last">
                        นามสกุล *
                    </label>
                    <input id="b56-parent-last"
                           class="swal2-input"
                           maxlength="100"
                           style="width:100%;margin:4px 0 12px;box-sizing:border-box;">

                    <label for="b56-parent-nickname">
                        ชื่อเล่น (ไม่บังคับ)
                    </label>
                    <input id="b56-parent-nickname"
                           class="swal2-input"
                           maxlength="50"
                           style="width:100%;margin:4px 0 12px;box-sizing:border-box;">

                    <label for="b56-parent-phone">
                        เบอร์โทรศัพท์ (ไม่บังคับ)
                    </label>
                    <input id="b56-parent-phone"
                           class="swal2-input"
                           type="tel"
                           maxlength="20"
                           style="width:100%;margin:4px 0 12px;box-sizing:border-box;">

                    <label for="b56-parent-email">
                        Email (ไม่บังคับ)
                    </label>
                    <input id="b56-parent-email"
                           class="swal2-input"
                           type="email"
                           maxlength="254"
                           style="width:100%;margin:4px 0 12px;box-sizing:border-box;">

                    <p style="font-size:13px;color:#64748b;line-height:1.7;">
                        ขั้นตอนนี้สร้างเฉพาะข้อมูลผู้ปกครอง
                        ยังไม่สร้างบัญชี Login หรือเชื่อม LINE
                        และยังไม่เชื่อมข้อมูลนักเรียน
                    </p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "ตรวจสอบข้อมูล",
            cancelButtonText: "ยกเลิก",
            focusConfirm: false,

            preConfirm: () => {
                const get = id =>
                    document.getElementById(id).value.trim();

                values.firstName = get("b56-parent-first");
                values.lastName = get("b56-parent-last");
                values.nickname = get("b56-parent-nickname");
                values.phone = get("b56-parent-phone");
                values.email = get("b56-parent-email").toLowerCase();

                if (!values.firstName || !values.lastName) {
                    Swal.showValidationMessage(
                        "กรุณากรอกชื่อและนามสกุล"
                    );
                    return false;
                }

                if (
                    values.email &&
                    !document.getElementById("b56-parent-email")
                        .checkValidity()
                ) {
                    Swal.showValidationMessage(
                        "กรุณาตรวจสอบรูปแบบ Email"
                    );
                    return false;
                }

                return { ...values };
            }
        });

        if (!result.isConfirmed) return;

        const parent = result.value;

        const preview = [
            `ชื่อ: ${parent.firstName}`,
            `นามสกุล: ${parent.lastName}`,
            `ชื่อเล่น: ${parent.nickname || "ไม่ระบุ"}`,
            `โทรศัพท์: ${parent.phone || "ไม่ระบุ"}`,
            `Email: ${parent.email || "ไม่ระบุ"}`,
            "",
            "ระบบจะสร้างข้อมูลผู้ปกครองโดยไม่มีบัญชี Login"
        ].join("\n");

        const confirmation = await Swal.fire({
            title: "ยืนยันเพิ่มข้อมูลผู้ปกครอง",
            text: preview,
            showCancelButton: true,
            confirmButtonText: "ยืนยันบันทึก",
            cancelButtonText: "ยกเลิก",
            didOpen: () => {
                const content = Swal.getHtmlContainer();
                if (content) {
                    content.style.whiteSpace = "pre-line";
                    content.style.textAlign = "left";
                }
            }
        });

        if (!confirmation.isConfirmed) return;

        const showLoading = () => {
            Swal.fire({
                title: "กำลังบันทึกข้อมูลผู้ปกครอง",
                text: "กรุณาอย่าส่งคำขอซ้ำ",
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });
        };

        const validateParentId = data => {
            return (
                typeof data === "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                    .test(data)
            );
        };

        // Keep the Request ID available for error recovery.
        // Never generate a second ID for the same attempt.
        const requestId = crypto.randomUUID();

        showLoading();

        try {

            const params = {
                p_first_name: parent.firstName,
                p_last_name: parent.lastName,
                p_nickname: parent.nickname || null,
                p_phone: parent.phone || null,
                p_email: parent.email || null,
                p_request_id: requestId
            };

            let { data, error } = await supabaseClient.rpc(
                "admin_create_parent_safe",
                {
                    ...params,
                    p_reviewed_parent_id: null,
                    p_confirm_distinct: false
                }
            );

            const possibleDuplicate =
                error?.code === "P0001" &&
                String(error?.message || "")
                    .includes("PARENT_POSSIBLE_DUPLICATE");

            if (possibleDuplicate) {

                // Find matching parents using the same
                // normalization rules as the create RPC.
                const {
                    data: candidates,
                    error: lookupError
                } = await supabaseClient.rpc(
                    "admin_find_matching_parents",
                    {
                        p_first_name: parent.firstName,
                        p_last_name: parent.lastName
                    }
                );

                if (lookupError) {
                    throw new Error(
                        "PARENT_DUPLICATE_LOOKUP_FAILED"
                    );
                }

                if (!candidates || candidates.length > 100) {
                    throw new Error(
                        "PARENT_DUPLICATE_REVIEW_INCOMPLETE"
                    );
                }

                const normalize = value =>
                    String(value || "").trim().toLocaleLowerCase();

                // Confirm exact normalized name matching.
                const matchingParents = candidates.filter(
                    item =>
                        normalize(item.first_name) ===
                            normalize(parent.firstName) &&
                        normalize(item.last_name) ===
                            normalize(parent.lastName)
                );

                if (matchingParents.length === 0) {
                    throw new Error(
                        "PARENT_DUPLICATE_LOOKUP_FAILED"
                    );
                }

                const candidateSummary = matchingParents.map(
                    (item, index) => [
                        `${index + 1}. ${item.first_name} ${item.last_name}`,
                        `ชื่อเล่น: ${item.nickname || "ไม่ระบุ"}`,
                        `โทรศัพท์: ${item.phone || "ไม่ระบุ"}`,
                        `Email: ${item.email || "ไม่ระบุ"}`,
                        `บัญชี Login: ${item.profile_id ? "มี Profile" : "ยังไม่มี Profile"}`
                    ].join("\n")
                ).join("\n\n");

                const reviewText = [
                    `พบผู้ปกครองชื่อ–นามสกุลตรงกัน ${matchingParents.length} รายการ`,
                    "",
                    candidateSummary,
                    "",
                    "โปรดตรวจสอบข้อมูลเดิมให้ครบถ้วน",
                    "หากเป็นบุคคลเดิม ให้กดยกเลิกและใช้ Parent ID เดิม",
                    "หากเป็นคนละบุคคลจริง จึงยืนยันสร้างรายการใหม่"
                ].join("\n");

                const review = await Swal.fire({
                    icon: "warning",
                    title: "พบผู้ปกครองที่อาจซ้ำ",
                    width: 650,
                    text: reviewText,
                    showCancelButton: true,
                    confirmButtonText: "ยืนยันว่าเป็นคนละคน",
                    cancelButtonText: "ยกเลิก ไม่สร้าง",
                    reverseButtons: true,
                    focusCancel: true,
                    didOpen: () => {
                        const content = Swal.getHtmlContainer();
                        if (content) {
                            content.style.whiteSpace = "pre-line";
                            content.style.textAlign = "left";
                            content.style.maxHeight = "50vh";
                            content.style.overflowY = "auto";
                        }
                    }
                });

                if (!review.isConfirmed) {
                    return;
                }

                // Require one verified matching record as the
                // reviewed reference for the backend RPC.
                const reviewedParentId = matchingParents[0].id;

                const finalConfirmation = await Swal.fire({
                    icon: "question",
                    title: "ยืนยันสร้างผู้ปกครองคนใหม่",
                    text: [
                        `ชื่อ: ${parent.firstName} ${parent.lastName}`,
                        "",
                        "คุณยืนยันว่าได้ตรวจสอบรายการเดิมแล้ว",
                        "และบุคคลนี้ไม่ใช่ผู้ปกครองคนเดิมใช่หรือไม่?",
                        "",
                        "ระบบจะสร้าง Parent ID ใหม่แยกจากรายการเดิม"
                    ].join("\n"),
                    showCancelButton: true,
                    confirmButtonText: "ยืนยันสร้างคนใหม่",
                    cancelButtonText: "ยกเลิก",
                    focusCancel: true,
                    didOpen: () => {
                        const content = Swal.getHtmlContainer();
                        if (content) {
                            content.style.whiteSpace = "pre-line";
                        }
                    }
                });

                if (!finalConfirmation.isConfirmed) {
                    return;
                }

                showLoading();

                const distinctResult = await supabaseClient.rpc(
                    "admin_create_parent_safe",
                    {
                        ...params,
                        p_reviewed_parent_id: reviewedParentId,
                        p_confirm_distinct: true
                    }
                );

                data = distinctResult.data;
                error = distinctResult.error;
            }

            if (error) {
                throw error;
            }

            if (!validateParentId(data)) {
                throw new Error("PARENT_RESULT_UNCONFIRMED");
            }

            await Swal.fire({
                icon: "success",
                title: "เพิ่มผู้ปกครองสำเร็จ",
                text: "บันทึกข้อมูลผู้ปกครองแล้ว ยังไม่ได้เชื่อมบัญชี Login, LINE หรือนักเรียน",
                confirmButtonText: "ตกลง"
            });

            await loadRole("parent");

        } catch (error) {
            console.error(
                "B56 Parent Create:",
                error?.code || error?.message || "UNKNOWN"
            );

            // Check whether the request was committed,
            // even if the response was lost.
            let recoveredParentId = null;

            try {
                const { data: userData, error: userError } =
                    await supabaseClient.auth.getUser();

                if (!userError && userData?.user?.id) {
                    const { data: audit, error: auditError } =
                        await supabaseClient
                            .from("parent_audit_logs")
                            .select("parent_id,actor_id,action")
                            .eq("request_id", requestId)
                            .maybeSingle();

                    if (
                        !auditError &&
                        audit?.action === "CREATE" &&
                        audit.actor_id === userData.user.id &&
                        audit.parent_id
                    ) {
                        recoveredParentId = audit.parent_id;
                    }
                }
            } catch (recoveryError) {
                console.warn(
                    "B56 Parent Audit Recovery:",
                    recoveryError?.message || "UNKNOWN"
                );
            }

            if (recoveredParentId) {
                await Swal.fire({
                    icon: "success",
                    title: "ตรวจพบว่าบันทึกข้อมูลแล้ว",
                    text: "ระบบพบประวัติการสร้างผู้ปกครองจากคำขอนี้ จึงไม่ต้องส่งคำขอสร้างใหม่",
                    confirmButtonText: "ตกลง"
                });

                await loadRole("parent");
                return;
            }

            const message = String(error?.message || "");

            const lookupFailed =
                message.includes("PARENT_DUPLICATE_LOOKUP_FAILED") ||
                message.includes("PARENT_DUPLICATE_REVIEW_INCOMPLETE");

            await Swal.fire({
                icon: "warning",
                title: lookupFailed
                    ? "ยังตรวจสอบข้อมูลผู้ปกครองซ้ำไม่ได้"
                    : "ยังไม่สามารถยืนยันผลการบันทึก",
                text: lookupFailed
                    ? "ระบบไม่สามารถแสดงรายการผู้ปกครองเดิมได้ครบถ้วน จึงหยุดการสร้างข้อมูล กรุณาตรวจสอบข้อมูลก่อนดำเนินการใหม่"
                    : "ยังไม่พบหลักฐานยืนยันการบันทึกจากคำขอนี้ หรือไม่สามารถตรวจสอบ Audit ได้ กรุณาตรวจสอบรายการผู้ปกครองก่อนลองบันทึกอีกครั้ง เพื่อป้องกันข้อมูลซ้ำ",
                confirmButtonText: "รับทราบ"
            });
        }
    }
    // =================================================
    // B56-05.5.2 — Teacher Create Form
    // Preview + Back to Edit / READ ONLY
    // =================================================

    
async function openTeacherCreateForm() {
    // B56 Frontend Safety Lock
    const TEACHER_CREATE_ENABLED = true;

          const values = {
            firstName: "",
            lastName: "",
            email: "",
            instructorNumber: "",
            nickname: "",
            phone: ""
        };

        const fields = [
            ["firstName", "ชื่อ *", "text", 100],
            ["lastName", "นามสกุล *", "text", 100],
            ["email", "Email สำหรับ Login *", "email", 255],
            ["instructorNumber", "รหัสประจำตัวครูของโรงเรียน *", "text", 20],
            ["nickname", "ชื่อเล่น (ไม่บังคับ)", "text", 50],
            ["phone", "เบอร์โทร (ไม่บังคับ)", "tel", 20]
        ];

        // Escape HTML ของข้อความกำหนดไว้ในโค้ด
        // เพื่อให้ปลอดภัยหากมีการปรับฟอร์มภายหลัง
        function escapeHtml(text) {
            return String(text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        // วนกลับมาหน้ากรอกข้อมูลได้โดยไม่ล้างค่า
        while (true) {
            const formHtml = `
                <div style="
                    text-align:left;
                    display:grid;
                    gap:7px
                ">
                    ${fields.map(([key, label, type, max]) => `
                        <div>
                            <label for="b56-${key}">
                                ${escapeHtml(label)}
                            </label>
                            <input
                                id="b56-${key}"
                                class="swal2-input"
                                type="${type}"
                                maxlength="${max}"
                                autocomplete="off"
                                style="
                                width:100%;
                                height:38px;
                                padding:6px 10px;
                                margin:2px 0 0;
                                box-sizing:border-box;
                                font-size:14px
                                "
                            >
                        </div>
                    `).join("")}

                    <p style="
                        font-size:13px;
                        color:#64748b;
                        margin:0
                    ">
                    ระบบจะสร้างรหัสประจำตัวครูและรหัสผ่านสำหรับเข้าสู่ระบบ
                    ให้อัตโนมัติเมื่อสร้างบัญชีสำเร็จ
                    </p>
                </div>
            `;

            const formResult = await Swal.fire({
                title: "👩‍🏫 เพิ่มบัญชีครู",
                width: 650,
                padding: "12px 20px",
                html: formHtml,
                showCancelButton: true,
                confirmButtonText: "ถัดไป: สรุปข้อมูล",
                cancelButtonText: "ยกเลิก",
                focusConfirm: false,

                didOpen: () => {
                    // เติมค่าที่เคยกรอกไว้เมื่อกดกลับ
                    fields.forEach(([key]) => {
                        const input = document.getElementById(
                            `b56-${key}`
                        );

                        if (input) {
                            input.value = values[key];
                        }
                    });
                },

                preConfirm: () => {
                    fields.forEach(([key]) => {
                        const input = document.getElementById(
                            `b56-${key}`
                        );

                        values[key] = input
                            ? input.value.trim()
                            : "";
                    });

                    values.email = values.email.toLowerCase();

                    if (!values.firstName || !values.lastName) {
    Swal.showValidationMessage(
        "กรุณากรอกชื่อและนามสกุล"
    );
    return false;
}

if (!values.instructorNumber) {
    Swal.showValidationMessage(
        "กรุณากรอกรหัสประจำตัวครูของโรงเรียน"
    );
    return false;
}

                    const emailInput =
                        document.getElementById("b56-email");

                    if (
                        !values.email ||
                        !emailInput ||
                        !emailInput.checkValidity()
                    ) {
                        Swal.showValidationMessage(
                            "กรุณากรอก Email ให้ถูกต้อง"
                        );
                        return false;
                    }

                    for (const [key, , , max] of fields) {
                        if (values[key].length > max) {
                            Swal.showValidationMessage(
                                "ข้อมูลบางช่องยาวเกินที่กำหนด"
                            );
                            return false;
                        }
                    }

                    return true;
                }
            });

            // ยกเลิก = ออกจากขั้นตอนเพิ่มครู
            if (!formResult.isConfirmed) {
                return;
            }

            const summaryRows = [
    ["ชื่อ-นามสกุล", `${values.firstName} ${values.lastName}`],
    ["Email สำหรับ Login", values.email],
    ["รหัสประจำตัวครูของโรงเรียน", values.instructorNumber],
    ["ชื่อเล่น", values.nickname || "ไม่ระบุ"],
    ["เบอร์โทร", values.phone || "ไม่ระบุ"]
];

const summaryHtml = `
    <div style="
        text-align:left;
        display:grid;
        gap:16px
    ">
        <div style="
            padding:18px;
            border:1px solid #e2e8f0;
            border-radius:16px;
            background:#f8fafc
        ">
            <div style="
                font-size:14px;
                color:#475569;
                margin-bottom:14px;
                line-height:1.6
            ">
                กรุณาทบทวนข้อมูลให้ถูกต้องก่อนยืนยันสร้างบัญชี
                ระบบจะตรวจสอบข้อมูลซ้ำกับฐานข้อมูลเมื่อกดยืนยัน
            </div>

            <div style="
                display:grid;
                grid-template-columns:170px 1fr;
                gap:10px 14px;
                align-items:start
            ">
                ${summaryRows.map(([label, value]) => `
                    <div style="
                        color:#64748b;
                        font-size:14px;
                        font-weight:600
                    ">
                        ${escapeHtml(label)}
                    </div>
                    <div style="
                        color:#0f172a;
                        font-size:15px;
                        font-weight:500;
                        word-break:break-word
                    ">
                        ${escapeHtml(value)}
                    </div>
                `).join("")}
            </div>
        </div>

        <div style="
            padding:16px 18px;
            border:1px solid #bfdbfe;
            border-radius:16px;
            background:#eff6ff
        ">
            <div style="
                font-size:15px;
                font-weight:700;
                color:#1d4ed8;
                margin-bottom:6px
            ">
                ก่อนยืนยันสร้างบัญชี
            </div>

            <div style="
                font-size:14px;
                color:#334155;
                line-height:1.7
            ">
                
            กรุณาตรวจสอบชื่อ–นามสกุล Email และรหัสประจำตัวครูของโรงเรียนให้ถูกต้อง<br>
            เมื่อระบบเปิดใช้งาน Admin จะสามารถยืนยันสร้างบัญชีครูได้จากหน้านี้

            </div>
        </div>
    </div>
`;

const summaryResult = await Swal.fire({
    title: "ยืนยันข้อมูลก่อนสร้างบัญชี",
    html: summaryHtml,
    width: 760,

    showDenyButton: true,
    showCancelButton: true,

confirmButtonText: "ยืนยันสร้างบัญชีครู",
denyButtonText: "← กลับไปแก้ไข",
cancelButtonText: "ปิด",

reverseButtons: false,
focusConfirm: false,

// ปิดปุ่มสร้างบัญชีไว้จนกว่าจะปลด Safety Lock
didOpen: () => {
    if (!TEACHER_CREATE_ENABLED) {
        Swal.getConfirmButton().disabled = true;
    }
}

});

            if (summaryResult.isDenied) {
    // ย้อนกลับโดยเก็บค่าทั้ง 6 ช่อง
    continue;
}

if (summaryResult.isDismissed) {
    // กดปิด = ออกจากขั้นตอนเพิ่มครู
    return;
}

            // ป้องกันการกดส่งคำขอซ้ำในรอบเดียว
            // ระหว่างส่งจะปิด Modal เดิมและแสดง Loading
            Swal.fire({
                title: "กำลังตรวจสอบ Backend",
                text: "กรุณาอย่าส่งคำขอซ้ำ",
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // เมื่อปลดล็อกในอนาคต
                // จึงจะส่งข้อมูลครูจริงทั้ง 6 ช่อง
                const requestBody = TEACHER_CREATE_ENABLED
                    ? {
                        role: "Teacher",
                        firstName: values.firstName,
                        lastName: values.lastName,
                        email: values.email,
                        instructorNumber:
                            values.instructorNumber,
                        nickname: values.nickname,
                        phone: values.phone
                    }
                    : {};

                // ขณะล็อกไว้จะส่ง {} เท่านั้น
                // Backend ต้องปฏิเสธด้วย HTTP 400
                const { data, error } =
                    await supabaseClient.functions.invoke(
                        "admin-create-user",
                        { body: requestBody }
                    );

                const status =
                    error?.context?.status ??
                    (error ? null : 200);

                let result = data;

                if (error?.context instanceof Response) {
                    result = await error.context
                        .clone()
                        .json()
                        .catch(() => null);
                }

                // โหมดทดสอบที่ปลอดภัย
                if (!TEACHER_CREATE_ENABLED) {
                    const passed =
                        status === 400 &&
                        result?.message ===
                            "Invalid teacher information";

                    if (passed) {
                        await Swal.fire({
                            icon: "success",
                            title: "ทดสอบ Backend ผ่าน",
                            text:
                                "Admin ผ่านการตรวจสิทธิ์ " +
                                "และ Backend ปฏิเสธข้อมูล " +
                                "ทดสอบที่ไม่ครบ " +
                                "โดยไม่สร้างบัญชีครู",
                            confirmButtonText: "ตกลง"
                        });
                    } else {
                        await Swal.fire({
                            icon: "warning",
                            title: "ผลทดสอบไม่ตรงที่คาด",
                            text:
                                `HTTP ${status ?? "ไม่ทราบ"}: ` +
                                (result?.message ||
                                    error?.message ||
                                    "ไม่ทราบสาเหตุ"),
                            confirmButtonText: "ตกลง"
                        });
                    }

                    return;
                }

                // โหมดสร้างบัญชีจริง
                // ยังไม่ทำงานขณะ TEACHER_CREATE_ENABLED=false
                if (
                    !error &&
                    result?.success === true &&
                    result?.teacherCode &&
                    result?.temporaryPassword
                ) {
                    const accountInfo = [
                        `รหัสอ้างอิงในระบบ: ${result.teacherCode}`,
                        `Email: ${result.email}`,
                        `Password เริ่มต้น: ${result.temporaryPassword}`,
                        "",
                        "รหัสผ่านแสดงเฉพาะครั้งนี้",
                        "โปรดส่งมอบให้ครูผ่านช่องทางที่ปลอดภัย"
                    ].join("\n");

                    await Swal.fire({
                        icon: "success",
                        title: "สร้างบัญชีครูสำเร็จ",
                        text: accountInfo,
                        width: 650,
                        confirmButtonText: "รับทราบและปิด",
                        didOpen: () => {
                            const content =
                                Swal.getHtmlContainer();

                            if (content) {
                                content.style.whiteSpace = "pre-line";
                                content.style.textAlign = "left";
                                content.style.lineHeight = "1.9";
                                content.style.padding = "12px 20px";
                                content.style.overflowWrap = "anywhere";
                            }
                        }
                    });

                    // โหลดรายชื่อ Teacher ใหม่
                    await loadRole("teacher");
                    return;
                }
                // B56 — Backend ยังปิดการสร้างบัญชี
                // แยกจากกรณีสถานะบัญชีไม่แน่นอน
                if (
                    status === 503 &&
                    result?.message ===
                        "B56 verification mode: account creation is disabled"
                ) {
                    await Swal.fire({
                        icon: "info",
                        title: "ยังไม่เปิดสร้างบัญชีครู",
                        text:
                            "ระบบ Backend ยังอยู่ในโหมดปลอดภัย " +
                            "จึงไม่มีการสร้างบัญชีครูในคำขอนี้",
                        confirmButtonText: "ตกลง"
                    });

                    return;
                }

                // กรณีผลการสร้างไม่แน่นอน
                // ห้ามลองสร้างซ้ำทันที
                if (
                    result?.reconciliationRequired === true ||
                    status === null ||
                    status >= 500
                ) {
                    await Swal.fire({
                        icon: "warning",
                        title: "ต้องตรวจสอบสถานะบัญชี",
                        text:
                            "ผลการสร้างบัญชีไม่แน่นอน " +
                            "ห้ามกดสร้างซ้ำ " +
                            "ให้ตรวจสอบ Supabase Auth, " +
                            "Profiles และ Teachers ก่อน",
                        confirmButtonText: "รับทราบ"
                    });

                    return;
                }

                // ข้อมูลไม่ถูกต้องหรือซ้ำ
                const errorMessage =
                    result?.message ||
                    error?.message ||
                    "ไม่สามารถสร้างบัญชีได้";

                
                // B56 — แสดงรายละเอียดข้อมูลซ้ำจาก Backend
                const duplicateFields = result?.duplicateFields;

                const duplicateMessages = [];

                if (duplicateFields?.email === true) {
                    duplicateMessages.push(
                        "• Email นี้มีอยู่ในระบบแล้ว"
                    );
                }

                if (duplicateFields?.instructorNumber === true) {
                    duplicateMessages.push(
                        "• รหัสประจำตัวครูของโรงเรียนนี้มีอยู่ในระบบแล้ว"
                    );
                }

                const hasDuplicates = duplicateMessages.length > 0;

                const displayMessage = hasDuplicates
                    ? duplicateMessages.join("\n") +
                      "\n\nกรุณาแก้ไขข้อมูลที่ซ้ำก่อนสร้างบัญชี"
                    : errorMessage;

                await Swal.fire({
                    icon: hasDuplicates ? "warning" : "error",
                    title: hasDuplicates
                        ? "พบข้อมูลซ้ำ"
                        : "สร้างบัญชีไม่สำเร็จ",
                    text: displayMessage,
                    width: 600,
                    confirmButtonText: "ตกลง",
                    didOpen: () => {
                        const content = Swal.getHtmlContainer();

                        if (content) {
                            content.style.whiteSpace = "pre-line";
                            content.style.textAlign = "left";
                            content.style.lineHeight = "1.9";
                            content.style.fontSize = "16px";
                            content.style.padding = "16px 20px";
                            content.style.borderRadius = "12px";
                            content.style.overflowWrap = "anywhere";

                            if (hasDuplicates) {
                                content.style.color = "#b91c1c";
                                content.style.backgroundColor = "#fff1f2";
                                content.style.border =
                                    "1px solid #fecdd3";
                            }
                        }
                    }
                });

                return;

            } catch (error) {
                console.error(
                    "B56 teacher request failed:",
                    error instanceof Error
                        ? error.name
                        : "unknown"
                );

                await Swal.fire({
                    icon: "warning",
                    title: "ไม่ทราบสถานะคำขอ",
                    text:
                        "การเชื่อมต่อขัดข้อง " +
                        "ห้ามส่งคำขอซ้ำทันที " +
                        "ให้ตรวจสอบสถานะบัญชีก่อน",
                    confirmButtonText: "รับทราบ"
                });

                return;
            }

        }
    }

    // =================================================
    // Load Individual Role
    // =================================================

    async function loadRole(type) {
        const target = document.getElementById(
            `admin-users-${type}-content`
        );

        const cfg = config[type];

        if (!target || !cfg) return;

        message(target, "กำลังโหลดข้อมูล...");

        try {
            const ids = type === "admin"
                ? await roleIds()
                : null;

            const makeQuery = (countOnly = false) => {
                let query = supabaseClient
                    .from(cfg.tableName)
                    .select(
                        countOnly ? "id" : cfg.select,
                        countOnly
                            ? { count: "exact", head: true }
                            : { count: "exact" }
                    );

                if (type === "admin") {
                    query = query.eq(
                        "role_id",
                        ids.get("Admin")
                    );
                } else {
                    query = query.is("deleted_at", null);
                }

                return query;
            };

            const keyword = cleanSearch(
                state[type].search
            );

            let listQuery = applySearch(
                makeQuery(false), type, keyword
            );

            const offset = state[type].page * PAGE_SIZE;

            listQuery = listQuery
                .order(cfg.order, {
                    ascending: type !== "admin"
                })
                .range(offset, offset + PAGE_SIZE - 1);

            const { data, count, error } = await listQuery;

if (error) throw error;

let displayRows = await withAccountRoles(
    type,
    data || []
);

if (type === "parent") {

    // โหลดความสัมพันธ์ผู้ปกครองกับนักเรียนตามเดิม
    displayRows = await withParentStudents(
        displayRows
    );

    // LINE.08.9.G.22.C
    // โหลดสถานะ LINE ผ่าน RPC ที่ตรวจสิทธิ์ Admin
    // READ ONLY

    let linkedParentIds = null;

    try {
        linkedParentIds =
            await LineManagement.getLinkedParentIds();

    } catch (error) {
        console.error(
            "LINE Parent Status:",
            error
        );
    }

    displayRows = displayRows.map(parent => ({
        ...parent,

        line_status: linkedParentIds === null
            ? "ตรวจสอบไม่ได้"
            : linkedParentIds.has(parent.id)
                ? "เชื่อมแล้ว"
                : "ยังไม่เชื่อม"
    }));
}
            const [total, linked] = type === "admin"
                ? [null, null]
                : await Promise.all([
                    countRows(cfg.tableName),
                    countRows(cfg.tableName, true)
                ]);

            target.replaceChildren();

            if (type === "admin") {
                summary(target, [
                    {
                        label: "Admin Profiles",
                        value: count ?? 0
                    }
                ]);
            } else {
                summary(target, [
                    { label: "ข้อมูลทั้งหมด", value: total },
                    { label: "เชื่อม Profile", value: linked },
                    {
                        label: "ยังไม่เชื่อม Profile",
                        value: total - linked
                    }
                ]);
            }

searchControls(target, type, loadRole);

if (displayRows.length) {
    table(target, cfg.columns, displayRows);
} else {
    target.append(
        el("p", "ไม่พบข้อมูลที่ตรงกับเงื่อนไข")
    );
}

            pagination(
                target,
                type,
                count ?? 0,
                loadRole
            );

            if (type === "parent") {
                target.append(
                    el("p",
                        "LINE Alert ยังไม่เปิดใช้งานจริง")
                );
            }

            if (type === "student") {
                target.append(
                    el("p",
                        "จำนวนข้อมูลทั้งหมดอาจมากกว่ารายการ " +
                        "ที่แสดงในหน้านี้")
                );
            }

        } catch (error) {
            console.error(
                `AdminUsers ${type}:`,
                error
            );

            message(
                target,
                "ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบ Console"
            );
        }
    }

    // =================================================
    // Initialize — Frontend Admin check
    // Backend authorization will be implemented later.
    // =================================================

    async function init() {
        const view = document.getElementById(
            "view-admin-users"
        );

        if (!view || loading) return;

        loading = true;

        try {
            const role = await getCurrentUserRole();

            if (role !== "Admin") {
                view.style.display = "none";

                await Swal.fire(
                    "ไม่มีสิทธิ์",
                    "เมนูนี้สำหรับ Admin เท่านั้น",
                    "error"
                );

                if (typeof switchView === "function") {
                    switchView("dashboard");
                }

                return;
            }

            const jobs = [
                [
                    "admin-users-overview-content",
                    loadOverview
                ],
                [
                    "admin-users-admin-content",
                    () => loadRole("admin")
                ],
                [
                    "admin-users-teacher-content",
                    () => loadRole("teacher")
                ],
                [
                    "admin-users-parent-content",
                    () => loadRole("parent")
                ],
                [
                    "admin-users-student-content",
                    () => loadRole("student")
                ]
            ];

            await Promise.all(
                jobs.map(async ([id, job]) => {
                    const target = document.getElementById(id);
                    if (!target) return;

                    try {
                        await job();
                    } catch (error) {
                        console.error(
                            "AdminUsers:",
                            id,
                            error
                        );
                        message(
                            target,
                            "ไม่สามารถโหลดข้อมูลส่วนนี้ได้"
                        );
                    }
                })
            );

        } catch (error) {
            console.error("AdminUsers init:", error);

            view.style.display = "none";

            if (typeof switchView === "function") {
                switchView("dashboard");
            }

        } finally {
            loading = false;
        }
    }

    // =================================================
    // LINE.08.9.G.37.A
    // Refresh Parent table after LINE status changes
    // READ ONLY - does not modify database records
    // =================================================

    async function refreshParentLineStatus() {
        await loadRole("parent");

        const target = document.getElementById(
            "admin-users-parent-content"
        );

        if (
            !target ||
            target.textContent.includes(
                "ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบ Console"
                        ) ||
            target.textContent.includes("ตรวจสอบไม่ได้")
        ) {
            throw new Error("PARENT_LINE_REFRESH_FAILED");
        }
    }

    return {
        init,
        refreshParentLineStatus
    };
})();