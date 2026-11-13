
/*
============================================================
LINE-RECIPIENT.16
Additional LINE Recipients — Admin Activity UI

หน้าที่:
- แสดงกิจกรรมที่มีคาบในตารางสอนแล้ว
- แสดงครูผู้รับผิดชอบและรายละเอียดคาบ
- ใช้ Activity ID แยกกิจกรรมที่ชื่อเหมือนกัน
- ยังไม่เพิ่มหรือลบผู้รับ LINE (READ ONLY)

ความสัมพันธ์กับระบบเดิม:
- app.js: มอบหมายกิจกรรมและจัดการตารางสอน
- api.js: getActivitySchedules(), getAdminActivityTeachers()
- index.html: admin-activity-line-recipients-content
- LINE Preview RPC: รายชื่อผู้รับเมื่อกดแจ้งเตือน

ห้ามใช้ activity_teachers เพิ่มครูรับ LINE อย่างเดียว
============================================================
*/

const LineAlertRecipients = (() => {

    const CONTAINER_ID =
        "admin-activity-line-recipients-content";

    const WEEKDAYS = [
        "",
        "จันทร์",
        "อังคาร",
        "พุธ",
        "พฤหัสบดี",
        "ศุกร์",
        "เสาร์",
        "อาทิตย์"
    ];

    function createElement(tag, text = "") {
        const element = document.createElement(tag);
        element.textContent = text;
        return element;
    }

    function getTeacherLabel(teacher) {
        const name = [
            teacher.first_name,
            teacher.last_name
        ].filter(Boolean).join(" ");

        const number =
            teacher.instructor_number ||
            teacher.teacher_code ||
            "";

        return [number, name]
            .filter(Boolean)
            .join(" — ");
    }

    function formatTime(time) {
        return time
            ? String(time).slice(0, 5)
            : "-";
    }

    // ============================================================
    // LINE-RECIPIENT.25
    // Eligible Teacher accounts + LINE status
    // READ ONLY / Admin RPCs / No database writes
    // ============================================================

    async function getEligibleLineRecipientTeachers(teachers) {
        if (!Array.isArray(teachers) || teachers.length === 0) {
            return [];
        }

        const teacherIds = teachers.map(teacher => teacher.id);

        // 1. Find the real Teacher role.
        const { data: teacherRole, error: roleError } =
            await supabaseClient
                .from("roles")
                .select("id")
                .eq("name", "Teacher")
                .is("deleted_at", null)
                .single();

        if (roleError || !teacherRole) {
            throw roleError || new Error("ไม่พบ Role Teacher");
        }

        // 2. Link teacher records to their actual accounts.
        const { data: teacherAccounts, error: teacherError } =
            await supabaseClient
                .from("teachers")
                .select("id, profile_id")
                .in("id", teacherIds)
                .is("deleted_at", null);

        if (teacherError) throw teacherError;

        const profileIds = (teacherAccounts || [])
            .map(row => row.profile_id)
            .filter(Boolean);

        if (profileIds.length === 0) {
            return [];
        }

        // 3. Only active accounts with Role = Teacher.
        const { data: profiles, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("id")
                .in("id", profileIds)
                .eq("role_id", teacherRole.id)
                .eq("is_active", true)
                .is("deleted_at", null);

        if (profileError) throw profileError;

        const activeProfileIds = new Set(
            (profiles || []).map(profile => profile.id)
        );

        const eligibleTeacherIds = new Set(
            (teacherAccounts || [])
                .filter(row =>
                    row.profile_id &&
                    activeProfileIds.has(row.profile_id)
                )
                .map(row => row.id)
        );

        // 4. Reuse the existing Admin LINE status RPC.
        const { data: linkedRows, error: linkedError } =
            await supabaseClient.rpc(
                "admin_list_linked_line_teachers"
            );

        if (linkedError) throw linkedError;

        const linkedTeacherIds = new Set(
            (linkedRows || [])
                .map(row => row.teacher_id)
                .filter(Boolean)
        );

        // 5. Reuse the existing pending-request RPC.
        const { data: pendingRows, error: pendingError } =
            await supabaseClient.rpc(
                "admin_list_teacher_line_registration_requests"
            );

        if (pendingError) throw pendingError;

        const pendingTeacherCodes = new Set(
            (pendingRows || [])
                .filter(request => request.is_expired !== true)
                .map(request => request.teacher_code)
                .filter(Boolean)
        );

        // 6. Return eligible teachers with display status.
        return teachers
            .filter(teacher =>
                eligibleTeacherIds.has(teacher.id)
            )
            .map(teacher => {
                let lineStatus = "รอเชื่อม LINE";

                if (linkedTeacherIds.has(teacher.id)) {
                    lineStatus = "เชื่อม LINE แล้ว";
                } else if (
                    pendingTeacherCodes.has(teacher.teacher_code)
                ) {
                    lineStatus = "รออนุมัติ LINE";
                }

                return {
                    ...teacher,
                    lineStatus
                };
            });
    }

    // ============================================================
    // LINE-RECIPIENT.30.1
    // Activity card for Admin LINE recipients
    // Display only — No database writes
    // ============================================================

    function createActivityCard(activity, teacherMap) {
        const card = createElement("div");

        card.style.cssText = [
            "border:1px solid var(--border)",
            "border-radius:12px",
            "padding:16px",
            "background:var(--card)"
        ].join(";");

        // Activity name
        const title = createElement(
            "h3",
            activity.name ||
                activity.typeName ||
                "กิจกรรมไม่มีชื่อ"
        );

        title.style.cssText = [
            "margin:0 0 8px",
            "font-weight:700"
        ].join(";");

        // Activity type
        const type = createElement(
            "p",
            `ประเภท: ${activity.typeName || "-"} ` +
            `(${activity.typeCode || "-"})`
        );

        type.style.cssText = [
            "margin:0 0 10px",
            "font-size:14px"
        ].join(";");

        // Responsible teachers
        const teachers = activity.teacherIds
            .map(id => teacherMap.get(id))
            .filter(Boolean)
            .map(getTeacherLabel);

        const teacherInfo = createElement(
            "p",
            "ครูผู้รับผิดชอบ: " +
            (
                teachers.length
                    ? teachers.join(", ")
                    : "ไม่พบข้อมูลครู"
            )
        );

        teacherInfo.style.cssText = [
            "margin:0 0 14px",
            "font-size:14px",
            "line-height:1.7"
        ].join(";");

        // Schedule heading
        const scheduleHeading = createElement(
            "strong",
            `คาบกิจกรรม (${activity.schedules.length} รายการ)`
        );

        // Schedule list
        const scheduleList = createElement("div");

        scheduleList.style.cssText = [
            "display:grid",
            "gap:7px",
            "margin-top:10px"
        ].join(";");

        const schedules = [...activity.schedules].sort(
            (a, b) =>
                Number(a.weekday) - Number(b.weekday) ||
                Number(a.lessonNo) - Number(b.lessonNo)
        );

        schedules.forEach(schedule => {
            const day =
                WEEKDAYS[Number(schedule.weekday)] ||
                "ไม่ระบุวัน";

            const lesson =
                schedule.lessonNo ?? "-";

            const scheduleText =
                `วัน${day} · คาบ ${lesson} ` +
                `· ${formatTime(schedule.startTime)}–` +
                `${formatTime(schedule.endTime)} น.`;

            const row = createElement(
                "div",
                scheduleText
            );

            row.style.cssText = [
                "padding:10px 12px",
                "background:var(--bg)",
                "border-radius:8px",
                "font-size:14px",
                "line-height:1.6"
            ].join(";");

            scheduleList.appendChild(row);
        });

        card.append(
            title,
            type,
            teacherInfo,
            scheduleHeading,
            scheduleList
        );

        return card;
    }

    // ============================================================
    // LINE-RECIPIENT.21
    // Admin Activity LINE Recipients
    //
    // - Filter by teacher and activity type
    // - Show additional LINE recipients from database
    // - READ ONLY: no add/remove operations
    // ============================================================

    async function load() {
        const container = document.getElementById(
            CONTAINER_ID
        );

        if (!container) return;

        container.textContent =
            "กำลังโหลดกิจกรรมและรายชื่อผู้รับ LINE...";

        try {
            // 1. Admin only
            const role = await getCurrentUserRole();

            if (role !== "Admin") {
                container.textContent =
                    "เฉพาะ Admin เท่านั้นที่ดูข้อมูลส่วนนี้ได้";
                return;
            }

            // 2. Current semester
            const semester =
                await getScheduleManageActiveSemester();

            if (!semester) {
                container.textContent =
                    "ไม่พบภาคเรียนปัจจุบันที่เปิดให้จัดการ";
                return;
            }

            // 3. Read existing schedules and teachers
            const [schedules, teachers] = await Promise.all([
                getActivitySchedules(),
                getAdminActivityTeachers()
            ]);

            const teacherMap = new Map(
                (teachers || []).map(teacher => [
                    teacher.id,
                    teacher
                ])
            );

            // 4. Group schedules by Activity ID
            const activitiesMap = new Map();

            (schedules || [])
                .filter(schedule =>
                    schedule.semesterId === semester.id
                )
                .forEach(schedule => {
                    const activityId = schedule.activityId;

                    if (!activityId) return;

                    if (!activitiesMap.has(activityId)) {
                        activitiesMap.set(activityId, {
                            id: activityId,
                            name: schedule.activityName,
                            typeCode: schedule.activityTypeCode,
                            typeName: schedule.activityTypeName,
                            teacherIds: [
                                ...(schedule.teacherIds || [])
                            ],
                            schedules: []
                        });
                    }

                    const activity =
                        activitiesMap.get(activityId);

                    (schedule.teacherIds || []).forEach(
                        teacherId => {
                            if (
                                !activity.teacherIds.includes(
                                    teacherId
                                )
                            ) {
                                activity.teacherIds.push(
                                    teacherId
                                );
                            }
                        }
                    );

                    activity.schedules.push(schedule);
                });

            const activities =
                Array.from(activitiesMap.values());

            // 5. Read additional recipients for
            //    these activities only.
            const recipientMap = new Map();

            const activityIds =
                activities.map(activity => activity.id);

            if (activityIds.length > 0) {
                // Batch IDs to keep each query manageable.
                const batchSize = 100;

                for (
                    let i = 0;
                    i < activityIds.length;
                    i += batchSize
                ) {
                    const batchIds = activityIds.slice(
                        i,
                        i + batchSize
                    );

                    const { data, error } =
                        await supabaseClient
                            .from("activity_line_recipients")
                            .select(
                                "activity_id, teacher_id"
                            )
                            .in("activity_id", batchIds);

                    if (error) throw error;

                    (data || []).forEach(recipient => {
                        if (
                            !recipientMap.has(
                                recipient.activity_id
                            )
                        ) {
                            recipientMap.set(
                                recipient.activity_id,
                                new Set()
                            );
                        }

                        recipientMap.get(
                            recipient.activity_id
                        ).add(recipient.teacher_id);
                    });
                }
            }

            // 6. Teachers available in current activities
            const assignedTeacherIds = new Set();

            activities.forEach(activity => {
                activity.teacherIds.forEach(id => {
                    assignedTeacherIds.add(id);
                });
            });

            const availableTeachers = (teachers || [])
                .filter(teacher =>
                    assignedTeacherIds.has(teacher.id)
                )
                .sort((a, b) =>
                    getTeacherLabel(a).localeCompare(
                        getTeacherLabel(b),
                        "th"
                    )
                );

            // 7. Activity types from actual schedules
            const typeMap = new Map();

            activities.forEach(activity => {
                const code = String(
                    activity.typeCode || ""
                );

                if (!code) return;

                if (!typeMap.has(code)) {
                    typeMap.set(code, {
                        code,
                        name: activity.typeName || code
                    });
                }
            });

            const activityTypes =
                Array.from(typeMap.values())
                    .sort((a, b) =>
                        a.name.localeCompare(b.name, "th")
                    );

            // 8. Prepare UI
            container.replaceChildren();

            const summary = createElement(
                "p",
                `ภาคเรียนที่ ${semester.semester_no} ` +
                `· พบ ${activities.length} กิจกรรมที่มีคาบแล้ว`
            );

            summary.style.marginBottom = "16px";

            const filterBar =
                document.createElement("div");

            filterBar.style.cssText = [
                "display:flex",
                "flex-wrap:wrap",
                "gap:12px",
                "margin-bottom:16px"
            ].join(";");

            // Teacher filter
            const teacherSelect =
                document.createElement("select");

            teacherSelect.id =
                "line-recipient-teacher-filter";

            teacherSelect.setAttribute(
                "aria-label",
                "กรองตามครูผู้รับผิดชอบ"
            );

            teacherSelect.add(
                new Option("👨‍🏫 ครูทุกคน", "")
            );

            availableTeachers.forEach(teacher => {
                teacherSelect.add(
                    new Option(
                        getTeacherLabel(teacher),
                        teacher.id
                    )
                );
            });

            // Activity type filter
            const typeSelect =
                document.createElement("select");

            typeSelect.id =
                "line-recipient-type-filter";

            typeSelect.setAttribute(
                "aria-label",
                "กรองตามประเภทกิจกรรม"
            );

            typeSelect.add(
                new Option(
                    "🎯 ทุกประเภทกิจกรรม",
                    ""
                )
            );

            activityTypes.forEach(type => {
                typeSelect.add(
                    new Option(
                        type.name,
                        type.code
                    )
                );
            });

            [teacherSelect, typeSelect].forEach(select => {
                select.style.cssText = [
                    "flex:1 1 240px",
                    "min-width:0",
                    "max-width:320px",
                    "min-height:44px",
                    "padding:10px 12px",
                    "border:1px solid var(--border)",
                    "border-radius:10px",
                    "background:var(--card)",
                    "color:var(--text)",
                    "font-family:inherit",
                    "font-size:14px",
                    "box-sizing:border-box",
                    "cursor:pointer"
                ].join(";");

                filterBar.appendChild(select);
            });

            const resultInfo = createElement("p");

            resultInfo.style.cssText = [
                "margin:0 0 14px",
                "font-size:14px",
                "color:var(--text-light)"
            ].join(";");

            const list = createElement("div");

            list.style.cssText = [
                "display:grid",
                "gap:14px"
            ].join(";");

            // ====================================================
            // LINE-RECIPIENT.30.2
            // Admin: Add / Remove additional LINE recipients
            // Includes confirmation, Back, and DB verification
            // No LINE sending or attendance permission changes
            // ====================================================

            function createRecipientSection(activity) {
                const section = document.createElement("div");

                section.style.cssText = [
                    "margin-top:16px",
                    "padding-top:14px",
                    "border-top:1px solid var(--border)"
                ].join(";");

                const heading = createElement(
                    "strong",
                    "🔔 ครูผู้รับ LINE เพิ่มเติม"
                );

                section.appendChild(heading);

                const recipientIds = Array.from(
                    recipientMap.get(activity.id) || []
                );

                // ------------------------------------------------
                // Helper: Read latest recipients from database
                // ------------------------------------------------
                async function readLatestRecipients() {
                    const { data, error } = await supabaseClient
                        .from("activity_line_recipients")
                        .select("teacher_id")
                        .eq("activity_id", activity.id);

                    if (error) throw error;

                    return new Set(
                        (data || []).map(row => row.teacher_id)
                    );
                }

                // ------------------------------------------------
                // Helper: Display status in readable Thai
                // ------------------------------------------------
                function statusLabel(teacher) {
                    if (teacher.lineStatus === "เชื่อม LINE แล้ว") {
                        return "✅ เชื่อม LINE แล้ว";
                    }

                    if (teacher.lineStatus === "รออนุมัติ LINE") {
                        return "⏳ รออนุมัติ LINE";
                    }

                    return "⏳ รอเชื่อม LINE";
                }

                // ------------------------------------------------
                // Helper: Create detail row safely
                // ------------------------------------------------
                function detailRow(label, value) {
                    const row = document.createElement("div");

                    row.style.cssText = [
                        "padding:10px 12px",
                        "border-bottom:1px solid #e2e8f0",
                        "line-height:1.7"
                    ].join(";");

                    const title = createElement("div", label);
                    title.style.cssText =
                        "font-size:12px;color:#64748b";

                    const content = createElement("div", value);
                    content.style.cssText = [
                        "font-size:15px",
                        "font-weight:600",
                        "overflow-wrap:anywhere"
                    ].join(";");

                    row.append(title, content);

                    return row;
                }

                const activityName =
                    activity.name || activity.typeName || "-";

                const responsibleNames = activity.teacherIds
                    .map(id => teacherMap.get(id))
                    .filter(Boolean)
                    .map(getTeacherLabel);

                const responsibleText =
                    responsibleNames.join(", ") ||
                    "ไม่พบข้อมูลครู";

                // ------------------------------------------------
                // 1. Display existing additional recipients
                // ------------------------------------------------
                if (recipientIds.length === 0) {
                    const empty = createElement(
                        "p",
                        "ยังไม่มีครูผู้รับ LINE เพิ่มเติม"
                    );

                    empty.style.cssText = [
                        "margin:10px 0",
                        "font-size:14px",
                        "color:var(--text-light)"
                    ].join(";");

                    section.appendChild(empty);
                } else {
                    recipientIds
                        .sort((a, b) => {
                            const nameA = teacherMap.has(a)
                                ? getTeacherLabel(teacherMap.get(a))
                                : a;

                            const nameB = teacherMap.has(b)
                                ? getTeacherLabel(teacherMap.get(b))
                                : b;

                            return nameA.localeCompare(nameB, "th");
                        })
                        .forEach(teacherId => {
                            const teacher = teacherMap.get(teacherId);

                            const line = document.createElement("div");

                            line.style.cssText = [
                                "display:flex",
                                "justify-content:space-between",
                                "align-items:center",
                                "gap:10px",
                                "flex-wrap:wrap",
                                "margin-top:10px",
                                "padding:10px 12px",
                                "background:var(--bg)",
                                "border-radius:9px"
                            ].join(";");

                            const name = createElement(
                                "span",
                                teacher
                                    ? getTeacherLabel(teacher)
                                    : "ไม่พบชื่อครูในทะเบียน"
                            );

                            const removeButton =
                                document.createElement("button");

                            removeButton.type = "button";
                            removeButton.textContent = "ลบผู้รับ";
                            removeButton.style.cssText = [
                                "padding:7px 12px",
                                "border:1px solid #fca5a5",
                                "border-radius:8px",
                                "background:#fef2f2",
                                "color:#b91c1c",
                                "cursor:pointer"
                            ].join(";");

                            removeButton.addEventListener(
                                "click",
                                async () => {
                                    if (removeButton.disabled) return;

                                    removeButton.disabled = true;

                                    let writeAttempted = false;

                                    try {
                                        if (
                                            await getCurrentUserRole() !==
                                            "Admin"
                                        ) {
                                            throw new Error(
                                                "ADMIN_REQUIRED"
                                            );
                                        }

                                        const confirmation =
                                            document.createElement("div");

                                        confirmation.style.cssText =
                                            "text-align:left";

                                        confirmation.append(
                                            detailRow(
                                                "กิจกรรม",
                                                activityName
                                            ),
                                            detailRow(
                                                "ครูที่จะลบออก",
                                                teacher
                                                    ? getTeacherLabel(teacher)
                                                    : "ไม่พบชื่อครู"
                                            ),
                                            createElement(
                                                "p",
                                                "การลบจะยกเลิกเฉพาะ" +
                                                "การเป็นผู้รับ LINE เพิ่มเติม " +
                                                "ไม่ลบบัญชีครูหรือสิทธิ์เช็กชื่อ"
                                            )
                                        );

                                        const answer = await Swal.fire({
                                            title: "ยืนยันลบผู้รับ LINE",
                                            html: confirmation,
                                            showCancelButton: true,
                                            confirmButtonText: "ยืนยันลบ",
                                            cancelButtonText: "ยกเลิก",
                                            confirmButtonColor: "#dc2626",
                                            focusCancel: true,
                                            width: 560
                                        });

                                        if (!answer.isConfirmed) return;

                                        const latest =
                                            await readLatestRecipients();

                                        if (!latest.has(teacherId)) {
                                            recipientMap.set(
                                                activity.id,
                                                latest
                                            );

                                            render();

                                            await Swal.fire({
                                                icon: "warning",
                                                title: "ข้อมูลเปลี่ยนแปลง",
                                                text:
                                                    "ไม่พบผู้รับคนนี้แล้ว " +
                                                    "ระบบโหลดข้อมูลล่าสุดให้แล้ว"
                                            });

                                            return;
                                        }

                                        writeAttempted = true;

                                        const { error } =
                                            await supabaseClient.rpc(
                                                "admin_remove_activity_line_recipient",
                                                {
                                                    p_activity_id: activity.id,
                                                    p_teacher_id: teacherId
                                                }
                                            );

                                        if (error) throw error;

                                        const verified =
                                            await readLatestRecipients();

                                        recipientMap.set(
                                            activity.id,
                                            verified
                                        );

                                        render();

                                        if (verified.has(teacherId)) {
                                            throw new Error(
                                                "REMOVE_NOT_VERIFIED"
                                            );
                                        }

                                        await Swal.fire({
                                            icon: "success",
                                            title: "ลบผู้รับสำเร็จ",
                                            text:
                                                "ยกเลิกผู้รับ LINE เพิ่มเติมแล้ว " +
                                                "ไม่มีการส่ง LINE"
                                        });

                                    } catch (error) {
                                        console.error(
                                            "LINE-RECIPIENT REMOVE:",
                                            error
                                        );

                                        await Swal.fire({
                                            icon: "warning",
                                            title: writeAttempted
                                                ? "ต้องตรวจสอบผลการลบ"
                                                : "ไม่สามารถลบผู้รับได้",
                                            text: writeAttempted
                                                ? "อาจมีการเปลี่ยนข้อมูลแล้ว " +
                                                  "กรุณารีเฟรชและตรวจรายการล่าสุดก่อนลองอีกครั้ง"
                                                : "ไม่สามารถตรวจสอบสิทธิ์หรือข้อมูลได้"
                                        });

                                    } finally {
                                        removeButton.disabled = false;
                                    }
                                }
                            );

                            line.append(name, removeButton);
                            section.appendChild(line);
                        });
                }

                // ------------------------------------------------
                // 2. Add additional recipient
                // ------------------------------------------------
                const addButton = document.createElement("button");

                addButton.type = "button";
                addButton.className = "btn";
                addButton.textContent = "＋ เพิ่มครูผู้รับ LINE";

                addButton.style.cssText = [
                    "margin-top:12px",
                    "padding:10px 16px",
                    "font-size:14px"
                ].join(";");

                addButton.addEventListener("click", async () => {
                    if (addButton.disabled) return;

                    addButton.disabled = true;

                    let writeAttempted = false;

                    try {
                        if (
                            await getCurrentUserRole() !== "Admin"
                        ) {
                            throw new Error("ADMIN_REQUIRED");
                        }

                        const eligibleTeachers =
                            await getEligibleLineRecipientTeachers(
                                teachers || []
                            );

                        const latest =
                            await readLatestRecipients();

                        const excludedIds = new Set([
                            ...activity.teacherIds,
                            ...latest
                        ]);

                        const availableRecipients =
                            eligibleTeachers
                                .filter(teacher =>
                                    !excludedIds.has(teacher.id)
                                )
                                .sort((a, b) =>
                                    getTeacherLabel(a).localeCompare(
                                        getTeacherLabel(b),
                                        "th"
                                    )
                                );

                        if (availableRecipients.length === 0) {
                            await Swal.fire({
                                icon: "info",
                                title: "ไม่มีครูให้เลือก",
                                text:
                                    "ไม่พบบัญชี Teacher ที่สามารถเพิ่มได้"
                            });

                            return;
                        }

                        let selectedId = "";

                        // ----------------------------------------
                        // 3. Selection -> Preview -> Back loop
                        // ----------------------------------------
                        while (true) {
                            const form =
                                document.createElement("div");

                            form.style.textAlign = "left";

                            form.append(
                                detailRow("กิจกรรม", activityName),
                                detailRow(
                                    "ครูผู้รับผิดชอบ",
                                    responsibleText
                                )
                            );

                            const label = createElement(
                                "label",
                                "เลือกครูผู้รับ LINE เพิ่มเติม"
                            );

                            label.style.cssText = [
                                "display:block",
                                "font-weight:600",
                                "margin:16px 0 8px"
                            ].join(";");

                            const select =
                                document.createElement("select");

                            select.style.cssText = [
                                "width:100%",
                                "padding:12px",
                                "border:1px solid #cbd5e1",
                                "border-radius:9px",
                                "font-size:14px",
                                "box-sizing:border-box"
                            ].join(";");

                            select.add(
                                new Option("-- เลือกครู --", "")
                            );

                            availableRecipients.forEach(teacher => {
                                select.add(
                                    new Option(
                                        getTeacherLabel(teacher) +
                                        " — " +
                                        statusLabel(teacher),
                                        teacher.id
                                    )
                                );
                            });

                            select.value = selectedId;

                            const note = createElement(
                                "p",
                                "การเลือกครูยังไม่บันทึกข้อมูล " +
                                "ระบบจะให้ตรวจสอบอีกครั้ง"
                            );

                            note.style.cssText =
                                "font-size:13px;color:#64748b";

                            form.append(label, select, note);

                            const selection = await Swal.fire({
                                title: "เพิ่มครูผู้รับ LINE",
                                html: form,
                                width: 560,
                                showCancelButton: true,
                                confirmButtonText: "ตรวจสอบรายการ",
                                cancelButtonText: "ยกเลิก",
                                focusConfirm: false,

                                preConfirm: () => {
                                    const chosen =
                                        availableRecipients.find(
                                            teacher =>
                                                teacher.id === select.value
                                        );

                                    if (!chosen) {
                                        Swal.showValidationMessage(
                                            "กรุณาเลือกครู"
                                        );

                                        return false;
                                    }

                                    return chosen.id;
                                }
                            });

                            if (!selection.isConfirmed) return;

                            selectedId = selection.value;

                            const chosen =
                                availableRecipients.find(
                                    teacher =>
                                        teacher.id === selectedId
                                );

                            if (!chosen) {
                                throw new Error(
                                    "SELECTED_TEACHER_NOT_FOUND"
                                );
                            }

                            const preview =
                                document.createElement("div");

                            preview.style.cssText =
                                "text-align:left;line-height:1.7";

                            preview.append(
                                detailRow("กิจกรรม", activityName),
                                detailRow(
                                    "ครูผู้รับผิดชอบ",
                                    responsibleText
                                ),
                                detailRow(
                                    "ครูผู้รับ LINE เพิ่มเติม",
                                    getTeacherLabel(chosen)
                                ),
                                detailRow(
                                    "สถานะ LINE",
                                    statusLabel(chosen)
                                )
                            );

                            const warning = createElement(
                                "p",
                                "การยืนยันจะบันทึกผู้รับลงฐานข้อมูลจริง " +
                                "แต่จะไม่ส่ง LINE และไม่เพิ่มสิทธิ์เช็กชื่อ"
                            );

                            warning.style.cssText = [
                                "margin-top:16px",
                                "font-size:13px",
                                "color:#92400e",
                                "font-weight:600"
                            ].join(";");

                            preview.appendChild(warning);

                            // No icon 'i'; Back button included
                            const confirmation = await Swal.fire({
                                title: "ตรวจสอบก่อนบันทึก",
                                html: preview,
                                width: 560,
                                showDenyButton: true,
                                showCancelButton: true,
                                confirmButtonText: "ยืนยันบันทึกจริง",
                                denyButtonText: "← ย้อนกลับ",
                                cancelButtonText: "ยกเลิก",
                                confirmButtonColor: "#15803d",
                                denyButtonColor: "#64748b",
                                focusCancel: true
                            });

                            if (confirmation.isDenied) {
                                continue;
                            }

                            if (!confirmation.isConfirmed) {
                                return;
                            }

                            // ------------------------------------
                            // 4. Recheck before database write
                            // ------------------------------------
                            const latestBefore =
                                await readLatestRecipients();

                            if (latestBefore.has(chosen.id)) {
                                recipientMap.set(
                                    activity.id,
                                    latestBefore
                                );

                                render();

                                await Swal.fire({
                                    icon: "warning",
                                    title: "พบผู้รับซ้ำ",
                                    text:
                                        "ครูคนนี้เป็นผู้รับอยู่แล้ว " +
                                        "ระบบโหลดรายการล่าสุดให้แล้ว"
                                });

                                return;
                            }

                            // ------------------------------------
                            // 5. Save via Admin-only RPC
                            // ------------------------------------
                            writeAttempted = true;

                            const { data: savedId, error } =
                                await supabaseClient.rpc(
                                    "admin_add_activity_line_recipient",
                                    {
                                        p_activity_id: activity.id,
                                        p_teacher_id: chosen.id
                                    }
                                );

                            if (error) throw error;

                            if (!savedId) {
                                throw new Error(
                                    "RPC_RETURNED_NO_ID"
                                );
                            }

                            // ------------------------------------
                            // 6. Verify actual saved record
                            // ------------------------------------
                            const {
                                data: verified,
                                error: verifyError
                            } = await supabaseClient
                                .from("activity_line_recipients")
                                .select("id,activity_id,teacher_id")
                                .eq("id", savedId)
                                .maybeSingle();

                            if (verifyError) throw verifyError;

                            if (
                                !verified ||
                                verified.activity_id !== activity.id ||
                                verified.teacher_id !== chosen.id
                            ) {
                                throw new Error(
                                    "SAVE_NOT_VERIFIED"
                                );
                            }

                            const latestAfter =
                                await readLatestRecipients();

                            recipientMap.set(
                                activity.id,
                                latestAfter
                            );

                            render();

                            await Swal.fire({
                                icon: "success",
                                title: "บันทึกสำเร็จ",
                                text:
                                    "เพิ่ม " +
                                    getTeacherLabel(chosen) +
                                    " เป็นผู้รับ LINE เพิ่มเติมแล้ว " +
                                    "ไม่มีการส่ง LINE"
                            });

                            return;
                        }

                    } catch (error) {
                        console.error(
                            "LINE-RECIPIENT ADD:",
                            error
                        );

                        await Swal.fire({
                            icon: "warning",
                            title: writeAttempted
                                ? "ต้องตรวจสอบผลการบันทึก"
                                : "ไม่สามารถเปิดรายการครูได้",
                            text: writeAttempted
                                ? "อาจบันทึกลงฐานข้อมูลแล้ว " +
                                  "กรุณารีเฟรชและตรวจรายการก่อนลองใหม่"
                                : "ไม่สามารถตรวจสอบข้อมูลหรือสิทธิ์ได้"
                        });

                    } finally {
                        addButton.disabled = false;
                    }
                });

                section.appendChild(addButton);

                return section;
            }

            // 10. Render with two filters
            function render() {
                const selectedTeacherId =
                    teacherSelect.value;

                const selectedTypeCode =
                    typeSelect.value;

                const filtered = activities.filter(
                    activity => {
                        const teacherMatched =
                            !selectedTeacherId ||
                            activity.teacherIds.includes(
                                selectedTeacherId
                            );

                        const typeMatched =
                            !selectedTypeCode ||
                            activity.typeCode ===
                                selectedTypeCode;

                        return (
                            teacherMatched &&
                            typeMatched
                        );
                    }
                );

                resultInfo.textContent =
                    `แสดง ${filtered.length} จาก ` +
                    `${activities.length} กิจกรรม`;

                list.replaceChildren();

                if (filtered.length === 0) {
                    const message = createElement(
                        "div",
                        activities.length === 0
                            ? "ยังไม่พบกิจกรรมที่มีคาบในตารางสอน"
                            : "ไม่พบกิจกรรมที่ตรงกับตัวกรอง"
                    );

                    message.style.cssText = [
                        "padding:24px",
                        "border:1px dashed var(--border)",
                        "border-radius:12px",
                        "text-align:center",
                        "color:var(--text-light)"
                    ].join(";");

                    list.appendChild(message);
                    return;
                }

                filtered.forEach(activity => {
                    const card = createActivityCard(
                        activity,
                        teacherMap
                    );

                    card.appendChild(
                        createRecipientSection(activity)
                    );

                    list.appendChild(card);
                });
            }

            teacherSelect.addEventListener(
                "change",
                render
            );

            typeSelect.addEventListener(
                "change",
                render
            );

            // 11. Display
            container.append(
                summary,
                filterBar,
                resultInfo,
                list
            );

            render();

        } catch (error) {
            console.error(
                "LINE-RECIPIENT.21 load failed:",
                error
            );

            container.textContent =
                "ไม่สามารถโหลดรายการกิจกรรมได้ " +
                "กรุณาตรวจสอบ Console";
        }
    }

    return { load };

})();

/*
============================================================
LINE-RECIPIENT.18
Connect Admin LINE Recipients Tab
============================================================
*/

document.addEventListener("DOMContentLoaded", () => {

    const lineTab = document.getElementById(
        "admin-activity-tab-line"
    );

    if (!lineTab) {
        console.warn(
            "LINE-RECIPIENT.18: LINE Tab not found"
        );
        return;
    }

    lineTab.addEventListener("click", async () => {

        await LineAlertRecipients.load();

    });

});
