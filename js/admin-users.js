
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
                const td = el(
                    "td",
                    textValue(column.value(row))
                );

                td.style.cssText =
                    "padding:10px;border-bottom:1px solid #e2e8f0";

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
                { title: "ชื่อ–นามสกุล", value: nameOf },
                { title: "ชื่อเล่น", value: r => r.nickname },
                { title: "โทรศัพท์", value: r => r.phone },
                {
    title: "Role บัญชี",
    value: r => r.account_role
},
                {
                    title: "เชื่อม Profile",
                    value: r => r.profile_id ? "มี" : "ไม่มี"
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

const displayRows = await withAccountRoles(
    type,
    data || []
);

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

    return { init };
})();
