
/* ============================================================
   AUDIT.3-05C — ADMIN ATTENDANCE AUDIT HISTORY
   READ ONLY / ADMIN ONLY

   - แสดงชื่อครูและนักเรียนจริง
   - Server-side pagination 25 รายการต่อหน้า
   - ไม่แก้ไขข้อมูลใน Supabase
   ============================================================ */

const AdminAudit = (() => {
    const PAGE_SIZE = 25;

    let currentPage = 1;
    let requestVersion = 0;

    const actionNames = {
        INSERT: "บันทึกใหม่",
        UPDATE: "แก้ไขข้อมูล",
        SOFT_DELETE: "ยกเลิกรายการ",
        RESTORE: "คืนรายการ"
    };

    const statusNames = {
        PRESENT: "มาเรียน",
        LATE: "มาสาย",
        SICK: "ลาป่วย",
        PERSONAL: "ลากิจ",
        ABSENT: "ขาดเรียน"
    };

    const fields = [
        "id",
        "attendance_id",
        "attendance_session_id",
        "student_id",
        "actor_user_id",
        "actor_teacher_id",
        "actor_type",
        "action",
        "old_status",
        "new_status",
        "old_data",
        "new_data",
        "occurred_at"
    ].join(",");

    function element(id) {
        return document.getElementById(id);
    }

    function shortId(value) {
        return value ? String(value).slice(0, 8) + "…" : "-";
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "-";

        return new Intl.DateTimeFormat("th-TH", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }).format(date);
    }

    function getFullName(person, includePrefix = false) {
        if (!person) return "";

        const prefix = includePrefix
            ? String(person.prefix || "").trim()
            : "";

        const firstName = String(
            person.first_name || ""
        ).trim();

        const lastName = String(
            person.last_name || ""
        ).trim();

        const name = [
            prefix + firstName,
            lastName
        ].filter(Boolean).join(" ").trim();

        return name;
    }

    function showMessage(message) {
        const tbody = element("admin-audit-table-body");

        if (!tbody) return;

        tbody.replaceChildren();

        const row = tbody.insertRow();
        const cell = row.insertCell();

        cell.colSpan = 7;
        cell.style.textAlign = "center";
        cell.style.padding = "24px";
        cell.textContent = message;
    }

    function setInputsDisabled(disabled) {
        [
            "admin-audit-date-from",
            "admin-audit-date-to",
            "admin-audit-action",
            "admin-audit-search"
        ].forEach(id => {
            const input = element(id);

            if (input) {
                input.disabled = disabled;
            }
        });
    }

    function ensurePagination() {
        let container = element("admin-audit-pagination");

        if (container) return container;

        const tbody = element("admin-audit-table-body");

        if (!tbody) return null;

        const tableContainer = tbody.closest("div");

        if (!tableContainer) return null;

        container = document.createElement("div");
        container.id = "admin-audit-pagination";

        container.style.cssText = [
            "display:flex",
            "justify-content:space-between",
            "align-items:center",
            "flex-wrap:wrap",
            "gap:12px",
            "margin-top:18px",
            "padding:12px 0",
            "border-top:1px solid var(--border)"
        ].join(";");

        const info = document.createElement("span");
        info.id = "admin-audit-page-info";

        const controls = document.createElement("div");

        controls.style.cssText =
            "display:flex;align-items:center;gap:10px;";

        const previous = document.createElement("button");

        previous.type = "button";
        previous.className = "btn";
        previous.textContent = "← ก่อนหน้า";

        const next = document.createElement("button");

        next.type = "button";
        next.className = "btn";
        next.textContent = "ถัดไป →";

        previous.onclick = () => load(currentPage - 1);
        next.onclick = () => load(currentPage + 1);

        controls.append(previous, next);
        container.append(info, controls);

        tableContainer.insertAdjacentElement(
            "afterend",
            container
        );

        container._info = info;
        container._previous = previous;
        container._next = next;

        return container;
    }

    // ---------------------------------------------------------
    // อ่านชื่อครูและนักเรียนเฉพาะที่อยู่ในหน้าปัจจุบัน
    // ---------------------------------------------------------

    async function loadNamesForPage(records) {
        const teacherIds = [
            ...new Set(
                records.map(r => r.actor_teacher_id)
                    .filter(Boolean)
            )
        ];

        const studentIds = [
            ...new Set(
                records.map(r => r.student_id)
                    .filter(Boolean)
            )
        ];

        const teacherMap = new Map();
        const studentMap = new Map();

        let teacherError = null;
        let studentError = null;

        if (teacherIds.length) {
            const { data, error } = await supabaseClient
                .from("teachers")
                .select("id,first_name,last_name")
                .in("id", teacherIds);

            if (error) {
                teacherError = error;
                console.error(
                    "AUDIT.3: Cannot load teacher names:",
                    error
                );
            } else {
                (data || []).forEach(teacher => {
                    teacherMap.set(
                        teacher.id,
                        getFullName(teacher)
                    );
                });
            }
        }

        if (studentIds.length) {
            const { data, error } = await supabaseClient
                .from("students")
                .select(
                    "id,prefix,first_name,last_name,student_code,student_no"
                )
                .in("id", studentIds);

            if (error) {
                studentError = error;
                console.error(
                    "AUDIT.3: Cannot load student names:",
                    error
                );
            } else {
                (data || []).forEach(student => {
                    studentMap.set(student.id, student);
                });
            }
        }

        return {
            teacherMap,
            studentMap,
            hasNameError: Boolean(
                teacherError || studentError
            )
        };
    }

    function getActorName(record, teacherMap) {
        if (record.actor_teacher_id) {
            const name = teacherMap.get(
                record.actor_teacher_id
            );

            if (name) return name;

            return "ครู " +
                shortId(record.actor_teacher_id);
        }

        if (record.actor_user_id) {
            return "ผู้ใช้ " +
                shortId(record.actor_user_id);
        }

        return "ไม่ทราบผู้ดำเนินการ";
    }

    function getStudentName(record, studentMap) {
        const student = studentMap.get(record.student_id);

        if (!student) {
            return shortId(record.student_id);
        }

        return getFullName(student, true) ||
            shortId(record.student_id);
    }

    // ---------------------------------------------------------
    // AUDIT.3-07A — รายละเอียดประวัติแบบอ่านง่าย
    // READ ONLY / ไม่แก้ข้อมูลฐานข้อมูล
    // ---------------------------------------------------------

    function showDetails(record, teacherMap, studentMap) {
        const student = studentMap.get(record.student_id);

        const container = document.createElement("div");
        container.className = "admin-audit-detail";

        container.style.cssText = [
            "text-align:left",
            "color:var(--text)",
            "font-family:Prompt,sans-serif",
            "font-size:14px",
            "line-height:1.7",
            "max-height:65vh",
            "overflow-y:auto",
            "padding:4px"
        ].join(";");

        function createText(tag, value) {
            const node = document.createElement(tag);
            node.textContent = value;
            return node;
        }

        function createInfo(label, value) {
            const box = document.createElement("div");

            box.style.cssText = [
                "padding:10px 12px",
                "border:1px solid var(--border)",
                "border-radius:10px",
                "min-width:0"
            ].join(";");

            const title = createText("div", label);
            title.style.cssText =
                "font-size:12px;color:var(--text-light);";

            const content = createText("div", value || "-");

            content.style.cssText = [
                "font-weight:600",
                "overflow-wrap:anywhere"
            ].join(";");

            box.append(title, content);
            return box;
        }

        function createGrid(items) {
            const grid = document.createElement("div");

            grid.style.cssText = [
                "display:grid",
                "grid-template-columns:repeat(auto-fit,minmax(190px,1fr))",
                "gap:10px",
                "margin-bottom:16px"
            ].join(";");

            items.forEach(item => grid.appendChild(item));

            return grid;
        }

        function createSection(title, items) {
            const heading = createText("h3", title);

            heading.style.cssText = [
                "font-size:16px",
                "margin:16px 0 10px",
                "color:var(--text)"
            ].join(";");

            container.appendChild(heading);
            container.appendChild(createGrid(items));
        }

        function statusText(value) {
            if (value == null) return "ยังไม่มีข้อมูล";
            return statusNames[value] || String(value);
        }

        function valueText(value) {
            if (value == null || value === "") return "-";
            return String(value);
        }

        const studentName = getStudentName(
            record,
            studentMap
        );

        const actorName = getActorName(
            record,
            teacherMap
        );

        createSection("📋 ข้อมูลการดำเนินการ", [
            createInfo(
                "วันเวลาที่ดำเนินการ",
                formatDate(record.occurred_at)
            ),
            createInfo(
                "ประเภทการดำเนินการ",
                actionNames[record.action] || record.action
            ),
            createInfo("ผู้ดำเนินการ", actorName),
            createInfo("นักเรียน", studentName),
            createInfo(
                "รหัสนักเรียน",
                student?.student_code || "-"
            ),
            createInfo(
                "เลขที่",
                valueText(student?.student_no)
            )
        ]);

        createSection("🔄 การเปลี่ยนแปลงสถานะ", [
            createInfo(
                "สถานะเดิม",
                statusText(record.old_status)
            ),
            createInfo(
                "สถานะใหม่",
                statusText(record.new_status)
            )
        ]);

        const oldData = record.old_data || {};
        const newData = record.new_data || {};

        createSection("📝 รายละเอียดเพิ่มเติม", [
            createInfo(
                "ประเภทการเช็กชื่อเดิม",
                valueText(oldData.attendance_type)
            ),
            createInfo(
                "ประเภทการเช็กชื่อใหม่",
                valueText(newData.attendance_type)
            ),
            createInfo(
                "หมายเหตุเดิม",
                valueText(oldData.remark)
            ),
            createInfo(
                "หมายเหตุใหม่",
                valueText(newData.remark)
            )
        ]);

        Swal.fire({
            title: "📋 รายละเอียดประวัติ",
            html: container,
            width: 720,
            padding: "20px",
            heightAuto: false,
            confirmButtonText: "ปิด",
            confirmButtonColor: "#2563eb"
        });
    }

    // ---------------------------------------------------------
    // แสดงข้อมูลในตาราง
    // ---------------------------------------------------------

    function renderRows(records, teacherMap, studentMap) {
        const tbody = element("admin-audit-table-body");

        if (!tbody) return;

        tbody.replaceChildren();

        if (!records.length) {
            showMessage(
                "ไม่พบประวัติที่ตรงกับเงื่อนไข"
            );
            return;
        }

        const fragment =
            document.createDocumentFragment();

        records.forEach(record => {
            const row = document.createElement("tr");

            const values = [
                formatDate(record.occurred_at),

                getActorName(record, teacherMap),

                getStudentName(record, studentMap),

                actionNames[record.action] ||
                    record.action,

                statusNames[record.old_status] ||
                    record.old_status || "-",

                statusNames[record.new_status] ||
                    record.new_status || "-"
            ];

            values.forEach(value => {
                const cell = row.insertCell();
                cell.textContent = value;
            });

            const detailCell = row.insertCell();

            const button = document.createElement("button");

            button.type = "button";
            button.className = "btn";
            button.textContent = "ดูรายละเอียด";
            button.style.padding = "6px 10px";

            button.onclick = () => {
                showDetails(
                    record,
                    teacherMap,
                    studentMap
                );
            };

            detailCell.appendChild(button);
            fragment.appendChild(row);
        });

        tbody.appendChild(fragment);
    }

    // ---------------------------------------------------------
    // AUDIT.3 — ค้นหาครูและนักเรียนด้วยชื่อจริง
    // ค้นชื่อก่อน แล้วนำ ID ไปกรอง Audit ที่ Supabase
    // ---------------------------------------------------------

    async function findPeopleByName(keyword) {
        const words = keyword.trim().split(/\s+/).filter(Boolean);

        if (!words.length || keyword.trim().length < 2) {
            throw new Error("กรุณาพิมพ์ชื่ออย่างน้อย 2 ตัวอักษร");
        }

        // ป้องกันการค้นหากว้างเกินไปและ URL ยาวเกินจำเป็น
        const MAX_MATCHES = 25;
        const tables = ["students", "teachers"];

        const results = await Promise.all(
            tables.map(async table => {
                let queries = [];

                if (words.length === 1) {
                    queries = [
                        supabaseClient
                            .from(table)
                            .select("id")
                            .ilike("first_name", `%${words[0]}%`)
                            .limit(MAX_MATCHES + 1),

                        supabaseClient
                            .from(table)
                            .select("id")
                            .ilike("last_name", `%${words[0]}%`)
                            .limit(MAX_MATCHES + 1)
                    ];
                } else {
                    queries = [
                        supabaseClient
                            .from(table)
                            .select("id")
                            .ilike("first_name", `%${words[0]}%`)
                            .ilike(
                                "last_name",
                                `%${words.slice(1).join(" ")}%`
                            )
                            .limit(MAX_MATCHES + 1)
                    ];
                }

                const responses = await Promise.all(queries);
                const ids = new Set();

                responses.forEach(response => {
                    if (response.error) {
                        throw response.error;
                    }

                    (response.data || []).forEach(person => {
                        ids.add(person.id);
                    });
                });

                if (ids.size > MAX_MATCHES ||
                    responses.some(response =>
                        (response.data || []).length > MAX_MATCHES
                    )) {
                    throw new Error(
                        "พบชื่อที่ตรงกันจำนวนมาก กรุณาระบุชื่อให้ชัดเจนขึ้น"
                    );
                }

                return Array.from(ids);
            })
        );

        return {
            studentIds: results[0],
            teacherIds: results[1]
        };
    }
    // ---------------------------------------------------------
    // โหลดประวัติจาก Supabase
    // ---------------------------------------------------------

    async function load(page = 1) {
        const status = element("admin-audit-status");
        const pagination = ensurePagination();

        if (!status || !pagination) return;

        const requestId = ++requestVersion;
        let authorized = false;

        page = Math.max(1, page);

        status.textContent = "กำลังโหลดประวัติ...";
        pagination.style.display = "none";
        setInputsDisabled(true);

        try {
            const role = await getCurrentUserRole();

            if (requestId !== requestVersion) return;

            if (role !== "Admin") {
                showMessage("เฉพาะ Admin เท่านั้น");

                status.textContent =
                    "ไม่มีสิทธิ์เข้าถึง";
                return;
            }

            authorized = true;

            const from =
                element("admin-audit-date-from").value;

            const to =
                element("admin-audit-date-to").value;

            const action =
                element("admin-audit-action").value;

            const keyword =
                element("admin-audit-search")
                    .value.trim();

            if (from && to && from > to) {
                throw new Error(
                    "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด"
                );
            }

            let query = supabaseClient
                .from("attendance_audit_logs")
                .select(fields, { count: "exact" });

            if (from) {
                query = query.gte(
                    "occurred_at",
                    `${from}T00:00:00+07:00`
                );
            }

            if (to) {
                query = query.lte(
                    "occurred_at",
                    `${to}T23:59:59.999+07:00`
                );
            }

            if (action) {
                query = query.eq("action", action);
            }

            // AUDIT.3 — ค้นประวัติด้วยชื่อครูหรือนักเรียน
            if (keyword) {
                const people = await findPeopleByName(keyword);

                if (requestId !== requestVersion) return;

                const conditions = [
                    ...people.studentIds.map(
                        id => `student_id.eq.${id}`
                    ),
                    ...people.teacherIds.map(
                        id => `actor_teacher_id.eq.${id}`
                    )
                ];

                if (conditions.length === 0) {
                    // ไม่มีชื่อที่ตรงกัน: ให้ Supabase คืน 0 รายการ
                    query = query.eq(
                        "id",
                        "00000000-0000-0000-0000-000000000000"
                    );
                } else {
                    query = query.or(conditions.join(","));
                }
            }

            const start = (page - 1) * PAGE_SIZE;

            const { data, error, count } = await query
                .order("occurred_at", {
                    ascending: false
                })
                .order("id", {
                    ascending: false
                })
                .range(
                    start,
                    start + PAGE_SIZE - 1
                );

            if (requestId !== requestVersion) return;

            if (error) throw error;

            const total = count || 0;

            const totalPages = Math.max(
                1,
                Math.ceil(total / PAGE_SIZE)
            );

            if (page > totalPages) {
                return load(totalPages);
            }

            const records = data || [];

            // โหลดชื่อบุคคลเฉพาะรายการในหน้านี้
            const names = await loadNamesForPage(records);

            if (requestId !== requestVersion) return;

            currentPage = page;

            renderRows(
                records,
                names.teacherMap,
                names.studentMap
            );

            const first = total ? start + 1 : 0;
            const last = Math.min(
                start + PAGE_SIZE,
                total
            );

            status.textContent =
                `พบประวัติ ${total} รายการ` +
                (names.hasNameError
                    ? " (บางชื่อโหลดไม่สำเร็จ)"
                    : "");

            pagination._info.textContent =
                `แสดง ${first}–${last} จาก ${total} รายการ` +
                ` | หน้า ${page}/${totalPages}`;

            pagination._previous.disabled =
                page <= 1;

            pagination._next.disabled =
                page >= totalPages;

            pagination.style.display = "flex";

        } catch (error) {
            if (requestId !== requestVersion) return;

            console.error(
                "AUDIT.3: Load failed:",
                error
            );

            status.textContent =
                "ไม่สามารถโหลดประวัติได้";

            showMessage(
                error.message ||
                "เกิดข้อผิดพลาดในการโหลดข้อมูล"
            );

        } finally {
            if (requestId === requestVersion) {
                setInputsDisabled(!authorized);
            }
        }
    }

    // ---------------------------------------------------------
    // เริ่มต้นหน้า Admin Audit
    // ---------------------------------------------------------

    async function init() {
        const status = element("admin-audit-status");
        const searchInput = element("admin-audit-search");

        if (!status || !searchInput) return;

        searchInput.placeholder =
            "ชื่อครู / ชื่อนักเรียน";

        [
            "admin-audit-date-from",
            "admin-audit-date-to",
            "admin-audit-action"
        ].forEach(id => {
            const input = element(id);

            if (input) {
                input.onchange = () => load(1);
            }
        });

        searchInput.onchange = () => load(1);

        await load(1);
    }

    return { init };
})();
