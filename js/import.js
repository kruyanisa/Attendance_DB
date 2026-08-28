/**
 * SMS - Import Module
 * -------------------
 * Common Import UI/flow for Student, Teacher, Room and Schedule domains.
 *
 * Current implementation:
 * - Provides the Import entry UI.
 * - Provides NEW / UPDATE mode selection.
 * - Provides Excel file selection and basic client-side checks.
 * - Does NOT write to the database.
 * - Does NOT create Academic Years or Rooms.
 * - Commit / Review / Audit integration will be added only through the
 *   contracts defined by the Student Import Blueprint.
 *
 * Future domain-specific validation/commit logic should be added without
 * duplicating the common Import UI/flow.
 */

(function () {
    "use strict";

    const IMPORT_CONFIG = {
        acceptedExtensions: [".xlsx", ".xls", ".csv"],
        maxFileSizeMB: 20
    };

    const importState = {
    domain: "student",
    mode: null,
    file: null,
    status: "idle",
    parsedRows: [],
    normalizedRows: [],
    fileType: null,
    validationResult: null,
    editingRow: null,

    // Student Import transaction state
    attemptId: null,
    academicYearId: null,
    commitRows: []
};

    function getView() {
        return document.getElementById("view-import");
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatFileSize(bytes) {
        if (!Number.isFinite(bytes)) return "-";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function isExcelFile(file) {
        if (!file) return false;

        const name = file.name.toLowerCase();
        return IMPORT_CONFIG.acceptedExtensions.some(ext => name.endsWith(ext));
    }

    function isFileSizeAllowed(file) {
        if (!file) return false;
        return file.size <= IMPORT_CONFIG.maxFileSizeMB * 1024 * 1024;
    }

    function parseStudentFullName(fullName) {
    const value = String(fullName ?? "").trim();

    const prefixes = [
        "เด็กชาย",
        "เด็กหญิง",
        "นาย",
        "นางสาว"
    ];

    const prefix = prefixes.find(p => value.startsWith(p));

    if (!prefix) {
        return {
            prefix: "",
            first_name: "",
            last_name: "",
            parse_error: "ไม่พบคำนำหน้าชื่อที่รองรับ"
        };
    }

    const name = value
    .slice(prefix.length)
    .trim()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

    const parts = name.split(" ").filter(Boolean);

    if (parts.length < 2) {
        return {
            prefix,
            first_name: parts[0] || "",
            last_name: "",
            parse_error: "ไม่สามารถแยกชื่อและนามสกุลได้"
        };
    }

    return {
        prefix,
        first_name: parts[0],
        last_name: parts.slice(1).join(" "),
        parse_error: ""
    };
}

function normalizeStudentRows(rows) {
    return rows.map(row => {
        const fullName = String(row.full_name ?? "").trim();
        const parsedName = parseStudentFullName(fullName);

        return {
            academic_year: String(row.academic_year ?? "").trim(),
            student_code: String(row.student_code ?? "").trim(),
            student_no: String(row.student_no ?? "").trim(),
            full_name: fullName,
            prefix: parsedName.prefix,
            first_name: parsedName.first_name,
            last_name: parsedName.last_name,
            room_name: String(row.room_name ?? "").trim(),
            gender: String(row.gender ?? "").trim(),
            birth_date: String(row.birth_date ?? "").trim(),
            nickname: String(row.nickname ?? "").trim(),
            parse_error: parsedName.parse_error
        };
    });
}
    function validateStudentRows(rows) {
    const requiredFields = [
        "academic_year",
        "student_code",
        "student_no",
        "full_name",
        "room_name"
    ];

    const errors = [];
    const validRows = [];
    const seenStudentCodes = new Set();

    rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const rowErrors = [];

        requiredFields.forEach(field => {
            if (!row[field]) {
                rowErrors.push(`${field} ว่าง`);
            }
        });

        if (
            row.academic_year &&
            !/^\d{4}$/.test(row.academic_year)
        ) {
            rowErrors.push("academic_year ต้องเป็นปี 4 หลัก");
        }
        if (row.parse_error) {
            rowErrors.push(row.parse_error);
        }

        if (
            row.student_no &&
            (!/^\d+$/.test(row.student_no) ||
             Number(row.student_no) <= 0)
        ) {
            rowErrors.push("student_no ไม่ถูกต้อง");
        }

        if (!/^\d{5}$/.test(row.student_code)) {
            rowErrors.push("student_code ต้องเป็นตัวเลข 5 หลัก");
        } else if (seenStudentCodes.has(row.student_code)) {
            rowErrors.push("student_code ซ้ำภายในไฟล์");
        } else {
            seenStudentCodes.add(row.student_code);
        }

        if (rowErrors.length) {
            errors.push({
                row: rowNumber,
                messages: rowErrors
            });
        } else {
            validRows.push(row);
        }
    });

    return {
        total: rows.length,
        valid: validRows.length,
        invalid: errors.length,
        errors,
        validRows
    };
}
function renderValidationResult(result) {
    const container = document.getElementById("import-validation-result");

    if (!container) return;

    const errorHtml = result.errors.length
        ? `
            <div class="import-validation-errors">
                ${result.errors.map(error => `
                    <div class="import-validation-error">
                        <strong>แถว ${error.row}</strong>
                        <span>${escapeHtml(error.messages.join(", "))}</span>
                    </div>
                `).join("")}
            </div>
        `
        : "";

    container.innerHTML = `
        <div class="import-validation-summary">
            <div>
                <strong>ผลการตรวจสอบ</strong>
                <span>ข้อมูลทั้งหมด ${result.total} รายการ</span>
            </div>

            <div class="import-validation-counts">
                <span class="valid">
                    ✓ ผ่าน ${result.valid}
                </span>

                <span class="invalid">
                    ✕ ไม่ผ่าน ${result.invalid}
                </span>
            </div>

            ${errorHtml}
        </div>
    `;
}
function renderImportPreview() {
    const container = document.getElementById("import-preview");
    if (!container) return;

    const rows = importState.normalizedRows || [];
    const result = importState.validationResult;

    if (!rows.length || !result) {
        container.innerHTML = "";
        return;
    }

    const errorMap = new Map(
        result.errors.map(error => [error.row - 2, error])
    );

    container.innerHTML = `
        <div class="import-preview-card">
            <div class="import-preview-header">
                <div>
                    <h3>ตัวอย่างข้อมูล</h3>
                    <p>ตรวจสอบข้อมูลก่อนดำเนินการต่อ</p>
                </div>

                <span class="import-preview-count">
                    ${rows.length} รายการ
                </span>
                ${result.invalid > 0 ? `
                <div class="import-preview-original-warning">
                     ⚠ พบข้อมูลที่ต้องแก้ไข
                     กรุณาแก้ไขในไฟล์ต้นฉบับ แล้วลบไฟล์เดิมและ Upload ใหม่
                </div>
                    ` : `
                <div class="import-preview-ready">
                   ✓ ข้อมูลผ่านการตรวจสอบ สามารถดำเนินการต่อได้
                </div>
                    `}
            </div>

            <div class="import-preview-table-wrap">
                <table class="import-preview-table">
                    <thead>
                        <tr>
                            <th>สถานะ</th>
                            <th>รหัสนักเรียน</th>
                            <th>คำนำหน้า</th>
                            <th>ชื่อ</th>
                            <th>นามสกุล</th>
                            <th>ห้อง</th>
                            <th>เลขที่</th>
                            <th>ปีการศึกษา</th>                            
                        </tr>
                    </thead>

                    <tbody>
                        ${rows.map((row, index) => {
                            const error = errorMap.get(index);
                            const isError = Boolean(error);

                            return `
                                <tr class="${isError ? "is-error" : "is-ready"}">
                                    <td>
                                        <span class="import-row-status ${isError ? "error" : "ready"}">
                                            ${isError ? "⚠ Error" : "✓ Ready"}
                                        </span>
                                    </td>

                                    <td>${escapeHtml(row.student_code)}</td>

                                    <td>${escapeHtml(row.prefix)}</td>
                                    <td>${escapeHtml(row.first_name)}</td>
                                    <td>${escapeHtml(row.last_name)}</td>

                                    <td>${escapeHtml(row.room_name)}</td>

                                    <td>${escapeHtml(row.student_no)}</td>

                                    <td>${escapeHtml(row.academic_year)}</td>
                                
                                </tr>

                                ${
                                    isError
                                        ? `
                                            <tr class="import-row-error-detail">
                                                <td colspan="9">
                                                    ${escapeHtml(error.messages.join(", "))}
                                                </td>
                                            </tr>
                                        `
                                        : ""
                                }
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;

}
    function setStatus(message, type = "info") {
        const status = document.getElementById("import-status");
        if (!status) return;

        status.textContent = message;
        status.dataset.type = type;
    }

    function renderFileInfo() {
        const container = document.getElementById("import-file-info");
        if (!container) return;

        if (!importState.file) {
            container.innerHTML = `
                <div class="import-file-empty">
                    ยังไม่ได้เลือกไฟล์
                </div>
            `;
            return;
        }

        container.innerHTML = `
    <div class="import-file-selected">
        <div class="import-file-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" role="img">
                <rect x="7" y="5" width="34" height="38" rx="5" fill="#217346"/>
                <path d="M28 5h8l5 5v8h-13z" fill="#33A05C"/>
                <path d="M28 5v13h13" fill="#1B5E3A"/>
                <path d="M15 18l4.5 7-4.5 7h5l2.5-4.5 2.5 4.5h5l-4.5-7 4.5-7h-5l-2.5 4.5-2.5-4.5z" fill="#fff"/>
            </svg>
        </div>

        <div class="import-file-details">
            <strong>${escapeHtml(importState.file.name)}</strong>
            <div class="import-file-meta">
                ${formatFileSize(importState.file.size)}
            </div>
        </div>

        <button type="button"
                class="import-secondary-btn"
                id="import-remove-file">
            ลบไฟล์
        </button>
    </div>
`;

        document
            .getElementById("import-remove-file")
            ?.addEventListener("click", clearFile);
    }

    function updateModeCards() {
        document.querySelectorAll("[data-import-mode]").forEach(card => {
            const active = card.dataset.importMode === importState.mode;
            card.classList.toggle("is-selected", active);
            card.setAttribute("aria-pressed", active ? "true" : "false");
        });

        const checkButton = document.getElementById("import-check-file");
        if (checkButton) {
            checkButton.disabled = !importState.mode || !importState.file;
        }
    }

    function selectMode(mode) {
        if (!["NEW", "UPDATE"].includes(mode)) return;

        importState.mode = mode;
        importState.status = "mode-selected";

        updateModeCards();

        setStatus(
            mode === "NEW"
                ? "เลือก NEW แล้ว กรุณาเลือกไฟล์ Excel หรือ CSV"
                : "เลือก UPDATE แล้ว กรุณาเลือกไฟล์ Excel หรือ CSV",
            "info"
        );
    }

    function clearFile() {
        importState.file = null;
        importState.parsedRows = [];
        importState.normalizedRows = [];
        importState.fileType = null;
        importState.validationResult = null;
        importState.attemptId = null;
        importState.academicYearId = null;
        importState.commitRows = [];
        importState.status = importState.mode ? "mode-selected" : "idle";

        const input = document.getElementById("import-file-input");
        if (input) input.value = "";

        const confirmButton = document.getElementById("import-confirm");

if (confirmButton) {
    confirmButton.style.display = "none";
}

renderValidationResult({
    total: 0,
    valid: 0,
    invalid: 0,
    errors: []
});

renderImportPreview();

        renderFileInfo();
        updateModeCards();

        setStatus(
            importState.mode
                ? "เลือกไฟล์ Excel หรือ CSV เพื่อดำเนินการต่อ"
                : "กรุณาเลือกประเภทการ Import",
            "info"
        );
    }

    function handleFile(file) {
        if (!file) return;

        if (!isExcelFile(file)) {
            importState.file = null;
            setStatus("รองรับเฉพาะไฟล์ Excel (.xlsx, .xls) หรือ CSV (.csv)", "error");
            renderFileInfo();
            updateModeCards();
            return;
        }

        if (!isFileSizeAllowed(file)) {
            importState.file = null;
            setStatus(
                `ไฟล์มีขนาดเกิน ${IMPORT_CONFIG.maxFileSizeMB} MB`,
                "error"
            );
            renderFileInfo();
            updateModeCards();
            return;
        }

        importState.file = file;
        importState.status = importState.mode
            ? "ready-to-check"
            : "file-selected";

        renderFileInfo();
        updateModeCards();

        setStatus(
            importState.mode
                ? "ไฟล์พร้อมสำหรับการตรวจสอบ"
                : "เลือกประเภทการ Import ก่อนตรวจสอบไฟล์",
            "success"
        );
    }

    function bindFileInput() {
        const input = document.getElementById("import-file-input");
        if (!input) return;

        input.addEventListener("change", event => {
            handleFile(event.target.files?.[0] || null);
        });
    }

    function bindDropZone() {
        const dropZone = document.getElementById("import-drop-zone");
        if (!dropZone) return;

        ["dragenter", "dragover"].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                dropZone.classList.add("is-dragover");
            });
        });

        ["dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, event => {
                event.preventDefault();
                dropZone.classList.remove("is-dragover");
            });
        });

        dropZone.addEventListener("drop", event => {
            handleFile(event.dataTransfer?.files?.[0] || null);
        });
    }

    function bindModeCards() {
        document.querySelectorAll("[data-import-mode]").forEach(card => {
            card.addEventListener("click", () => {
                selectMode(card.dataset.importMode);
            });

            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectMode(card.dataset.importMode);
                }
            });
        });
    }

    async function checkImportFile() {
    if (!importState.mode) {
        setStatus("กรุณาเลือกประเภทการ Import ก่อน", "error");
        return;
    }

    if (!importState.file) {
        setStatus("กรุณาเลือกไฟล์ Excel หรือ CSV ก่อน", "error");
        return;
    }

    const file = importState.file;
    const extension = file.name.toLowerCase().split(".").pop();

    try {
        let rows = [];

        if (extension === "csv") {
            if (typeof Papa === "undefined") {
                throw new Error("ไม่พบ Papa Parse");
            }

            const result = await new Promise((resolve, reject) => {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    encoding: "UTF-8",
                    transformHeader: header => header.replace(/^\uFEFF/, "").trim(),
                    complete: resolve,
                    error: reject
                });
            });

            if (result.errors?.length) {
                throw new Error(
                    `พบข้อผิดพลาดใน CSV ${result.errors.length} รายการ`
                );
            }

            rows = result.data || [];
            importState.fileType = "csv";

        } else {
            if (typeof XLSX === "undefined") {
                throw new Error("ไม่พบ SheetJS");
            }

            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            rows = XLSX.utils.sheet_to_json(worksheet, {
                defval: "",
                raw: false
            });

            importState.fileType = "excel";
        }

        if (!rows.length) {
            throw new Error("ไฟล์ไม่มีข้อมูล");
        }

        importState.parsedRows = rows;
        importState.normalizedRows = normalizeStudentRows(rows);

        const result = validateStudentRows(
            importState.normalizedRows
        );

        importState.validationResult = result;

        renderValidationResult(result);
        renderImportPreview();

        if (result.invalid > 0) {
            importState.status = "validation-error";

            setStatus(
                `ตรวจสอบเสร็จ พบข้อมูลไม่ผ่าน ${result.invalid} รายการ`,
                "error"
            );

            return;
        }

        // ==============================
// Server-side Student Import Validation
// ==============================
const prepared = await prepareStudentImport(
    importState.normalizedRows,
    importState.mode,
    importState.file.name
);

if (!prepared.valid) {
    importState.status = "validation-error";

    const serverErrors = prepared.invalidRows || [];

    importState.validationResult = {
        total: prepared.totalRows,
        valid: prepared.readyCount,
        invalid: prepared.errorCount,
        errors: serverErrors.map(row => ({
            row: row.rowNumber,
            messages: row.errors || []
        }))
    };

    renderValidationResult(importState.validationResult);
    renderImportPreview();

    setStatus(
        `ตรวจสอบไม่ผ่าน ${prepared.errorCount} รายการ`,
        "error"
    );

    return;
}

// เก็บข้อมูลที่ผ่าน Server Validation
importState.commitRows = prepared.validRows || [];
importState.academicYearId = prepared.academicYear?.id || null;

if (!importState.academicYearId) {
    throw new Error("ไม่พบ Academic Year ID");
}

// ==============================
// Create Import Attempt
// ==============================
importState.attemptId = await createStudentImportAttempt({
    mode: importState.mode,
    academicYearId: importState.academicYearId,
    sourceFileName: importState.file.name,
    totalRows: prepared.totalRows
});

importState.status = "ready-to-confirm";

console.log("[Import] Attempt created:", {
    attemptId: importState.attemptId,
    academicYearId: importState.academicYearId,
    rows: importState.commitRows.length
});

const confirmButton =
    document.getElementById("import-confirm");

if (confirmButton) {
    confirmButton.style.display = "inline-flex";
}

        setStatus(
            `ตรวจสอบผ่านทั้งหมด ${result.valid} รายการ`,
            "success"
        );

        if (typeof Swal !== "undefined") {
            await Swal.fire({
                icon: "success",
                title: "ตรวจสอบไฟล์สำเร็จ",
                text: `ข้อมูล ${result.valid} รายการผ่านการตรวจสอบ`,
                confirmButtonText: "ตกลง"
            });
        }

        console.log(
            "[Import] Validation result:",
            result
        );

    } catch (error) {
        console.error("[Import] Validation error:", error);

        importState.status = "error";
        importState.validationResult = null;

        setStatus(
            error.message || "ไม่สามารถตรวจสอบไฟล์ได้",
            "error"
        );

        if (typeof Swal !== "undefined") {
            await Swal.fire({
                icon: "error",
                title: "ตรวจสอบไฟล์ไม่สำเร็จ",
                text: error.message || "ไม่สามารถตรวจสอบไฟล์ได้",
                confirmButtonText: "ตกลง"
            });
        }
    }
}
async function confirmStudentImport() {

    if (importState.status !== "ready-to-confirm") {
        setStatus(
            "ข้อมูลยังไม่พร้อมสำหรับการ Import",
            "error"
        );
        return;
    }

    if (!importState.attemptId) {
        setStatus(
            "ไม่พบ Import Attempt",
            "error"
        );
        return;
    }

    if (!importState.academicYearId) {
        setStatus(
            "ไม่พบ Academic Year",
            "error"
        );
        return;
    }

    if (!Array.isArray(importState.commitRows) ||
        importState.commitRows.length === 0) {

        setStatus(
            "ไม่พบข้อมูลสำหรับ Import",
            "error"
        );
        return;
    }

    const confirmResult = await Swal.fire({
        icon: "question",
        title: "ยืนยันการ Import?",
        text: `กำลังนำเข้าข้อมูล ${importState.commitRows.length} รายการ`,
        showCancelButton: true,
        confirmButtonText: "ยืนยัน Import",
        cancelButtonText: "ยกเลิก"
    });

    if (!confirmResult.isConfirmed) {
        return;
    }

    try {

        importState.status = "committing";

        setStatus(
            "กำลังบันทึกข้อมูล...",
            "info"
        );

        const result = await commitStudentImport({
            rows: importState.commitRows,
            mode: importState.mode,
            academicYearId: importState.academicYearId,
            sourceFileName: importState.file?.name || "",
            attemptId: importState.attemptId
        });

        importState.status = "committed";

        setStatus(
            "Import สำเร็จ",
            "success"
        );

        await Swal.fire({
            icon: "success",
            title: "Import สำเร็จ",
            text: `นำเข้าข้อมูล ${importState.commitRows.length} รายการเรียบร้อยแล้ว`,
            confirmButtonText: "ตกลง"
        });

        console.log(
            "[Import] Commit result:",
            result
        );

    } catch (error) {

        console.error(
            "[Import] Commit error:",
            error
        );

        importState.status = "error";

        setStatus(
            error.message || "ไม่สามารถ Import ข้อมูลได้",
            "error"
        );

        await Swal.fire({
            icon: "error",
            title: "Import ไม่สำเร็จ",
            text: error.message || "ไม่สามารถ Import ข้อมูลได้",
            confirmButtonText: "ตกลง"
        });
    }
}
    function renderImportView(options = {}) {
        const view = getView();
        if (!view) return;

        importState.domain = options.domain || "student";

        view.innerHTML = `
            <div class="import-page">
                <div class="import-header">
                    <div>
                        <div class="import-eyebrow">DATA IMPORT</div>
                        <h2 class="import-title">นำเข้าข้อมูล</h2>
                        <p class="import-description">
                            นำเข้าข้อมูลผ่านไฟล์ Excel หรือ CSV โดยระบบจะตรวจสอบข้อมูลก่อนบันทึกจริง
                        </p>
                    </div>
                </div>

                <div class="import-step">
                    <div class="import-step-heading">
                        <span class="import-step-number">1</span>
                        <div>
                            <h3>เลือกประเภทการ Import</h3>
                            <p>ขณะนี้เริ่มต้นที่ Student Import ตาม Blueprint</p>
                        </div>
                    </div>

                    <div class="import-mode-grid">
                        <button type="button"
                                class="import-mode-card"
                                data-import-mode="NEW"
                                aria-pressed="false">
                            <span class="import-mode-badge new">NEW</span>
                            <strong>เพิ่มนักเรียนใหม่</strong>
                            <span>
                                สำหรับข้อมูลนักเรียนที่ยังไม่มี Student Identity ในระบบ
                            </span>
                        </button>

                        <button type="button"
                                class="import-mode-card"
                                data-import-mode="UPDATE"
                                aria-pressed="false">
                            <span class="import-mode-badge update">UPDATE</span>
                            <strong>ปรับปรุงข้อมูลนักเรียน</strong>
                            <span>
                                สำหรับแก้ไขข้อมูลของ Student Identity ที่มีอยู่แล้ว
                            </span>
                        </button>
                    </div>
                </div>

                <div class="import-step">
                    <div class="import-step-heading">
                        <span class="import-step-number">2</span>
                        <div>
                            <h3>เลือกไฟล์ Excel</h3>
                            <p>รองรับ .xlsx, .xls และ .csv</p>
                        </div>
                    </div>

                    <label class="import-drop-zone" id="import-drop-zone">
                        <input
                            id="import-file-input"
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            hidden
                        />

                        <span class="import-upload-icon">↑</span>
                        <strong>ลากไฟล์มาวางที่นี่</strong>
                        <span>หรือคลิกเพื่อเลือกไฟล์</span>
                    </label>

                    <div id="import-file-info" class="import-file-info"></div>

                    <div id="import-validation-result"
                         class="import-validation-result"></div>
                    <div id="import-preview"
                         class="import-preview"></div>

                </div>

                <div class="import-action-bar">
                    <div>
                        <span id="import-status"
                              class="import-status"
                              data-type="info">
                            กรุณาเลือกประเภทการ Import
                        </span>
                    </div>

                    <div class="import-action-buttons">

    <button type="button"
            id="import-check-file"
            class="import-primary-btn"
            disabled>
        ตรวจสอบไฟล์
    </button>

    <button type="button"
            id="import-confirm"
            class="import-primary-btn"
            style="display:none;">
        ยืนยันการ Import
    </button>

</div>
                </div>
            </div>
        `;

        bindModeCards();
        bindFileInput();
        bindDropZone();

        document
            .getElementById("import-check-file")
            ?.addEventListener("click", checkImportFile);
        document
            .getElementById("import-confirm")
            ?.addEventListener("click", confirmStudentImport);

        renderFileInfo();
        updateModeCards();
    }

    function openImport(options = {}) {
        const view = getView();

        if (!view) {
            console.warn("Import view #view-import was not found.");
            return;
        }

        document.querySelectorAll(".view-section").forEach(section => {
            section.style.display = "none";
        });

        view.style.display = "block";
        renderImportView(options);
    }

    window.ImportModule = {
        open: openImport,
        render: renderImportView,
        getState: () => ({ ...importState })
    };
})();