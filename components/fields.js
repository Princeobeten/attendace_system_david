"use client";

import { FACULTIES } from "@/lib/catalog";

/**
 * A labelled dropdown. `options` may be plain values or `{ value, label }`.
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  required = false,
  disabled = false,
  className = "",
}) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label}
          {required && " *"}
        </label>
      )}
      <select
        className="input"
        value={value ?? ""}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const opt = typeof o === "object" ? o : { value: o, label: String(o) };
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/**
 * Faculty → Department cascade. Picking a faculty narrows the department
 * list; picking a department fills in its faculty.
 */
export function FacultyDepartmentFields({ faculty, department, onChange, required = false }) {
  const facultyDepartments =
    FACULTIES.find((f) => f.name === faculty)?.departments ||
    FACULTIES.flatMap((f) => f.departments);

  // Keep a legacy department (one not in the catalogue) selectable.
  const deptOptions = facultyDepartments.map((d) => d.name);
  if (department && !deptOptions.includes(department)) deptOptions.unshift(department);

  return (
    <>
      <SelectField
        label="Faculty"
        required={required}
        value={faculty}
        placeholder="Select faculty"
        options={FACULTIES.map((f) => f.name)}
        onChange={(f) => {
          const stillValid = FACULTIES.find((x) => x.name === f)?.departments.some(
            (d) => d.name === department
          );
          onChange({ faculty: f, department: stillValid ? department : "" });
        }}
      />
      <SelectField
        label="Department"
        required={required}
        value={department}
        placeholder="Select department"
        options={deptOptions}
        onChange={(d) => {
          const owner = FACULTIES.find((f) => f.departments.some((x) => x.name === d));
          onChange({ faculty: owner?.name || faculty, department: d });
        }}
      />
    </>
  );
}
