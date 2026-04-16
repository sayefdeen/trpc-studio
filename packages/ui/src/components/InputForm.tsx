import { useCallback, useState } from "react";

import type { FieldDescriptor } from "../utils/zodToFields";

interface InputFormProps {
  fields: FieldDescriptor[];
  onSubmit: (values: Record<string, unknown>) => void;
  isLoading: boolean;
}

function validateFields(
  fields: FieldDescriptor[],
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!field.required) continue;
    const val = values[field.name];
    if (val === undefined || val === null || val === "") {
      errors[field.name] = `${field.name} is required`;
    }
  }
  return errors;
}

export function InputForm({ fields, onSubmit, isLoading }: InputFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.defaultValue !== undefined) {
        initial[field.name] = field.defaultValue;
      }
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const validationErrors = validateFields(fields, values);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Clean up empty strings and undefined values
      const cleaned: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(values)) {
        if (val !== "" && val !== undefined) {
          cleaned[key] = val;
        }
      }
      onSubmit(cleaned);
    },
    [fields, values, onSubmit],
  );

  if (fields.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400 italic">No input parameters</p>
        <button
          onClick={() => onSubmit({})}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Executing..." : "Execute"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(val) => handleChange(field.name, val)}
          {...(errors[field.name] !== undefined ? { error: errors[field.name] } : {})}
        />
      ))}
      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Executing..." : "Execute"}
      </button>
    </form>
  );
}

interface FieldInputProps {
  field: FieldDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

function FieldInput({ field, value, onChange, error }: FieldInputProps) {
  const hasError = error !== undefined;
  const inputBorder = hasError
    ? "border-red-400 focus:ring-red-500"
    : "border-gray-300 focus:ring-blue-500";

  const label = (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {field.name}
      {field.required && <span className="text-red-500 ml-0.5">*</span>}
      {field.description && (
        <span className="text-gray-400 font-normal ml-2">{field.description}</span>
      )}
    </label>
  );

  const errorMsg = hasError ? <p className="text-xs text-red-500 mt-1">{error}</p> : null;

  if (field.type === "enum" && field.enumValues) {
    return (
      <div>
        {label}
        <select
          value={(value as string) ?? field.defaultValue ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${inputBorder}`}
        >
          <option value="">Select...</option>
          {field.enumValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        {errorMsg}
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={(value as boolean) ?? field.defaultValue ?? false}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        {label}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        {label}
        <input
          type="number"
          value={value !== undefined ? String(value) : ""}
          placeholder={
            field.defaultValue !== undefined ? `default: ${String(field.defaultValue)}` : ""
          }
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${inputBorder}`}
        />
        {errorMsg}
      </div>
    );
  }

  if (field.type === "object" && field.children) {
    return <ObjectField field={field} value={value} onChange={onChange} />;
  }

  if (field.type === "array") {
    return <ArrayField field={field} value={value} onChange={onChange} />;
  }

  // Default: string
  return (
    <div>
      {label}
      <input
        type="text"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${inputBorder}`}
      />
      {errorMsg}
    </div>
  );
}

function ObjectField({ field, value, onChange }: FieldInputProps) {
  const objValue = (value as Record<string, unknown>) ?? {};

  const handleChildChange = useCallback(
    (childName: string, childValue: unknown) => {
      onChange({ ...objValue, [childName]: childValue });
    },
    [objValue, onChange],
  );

  return (
    <fieldset className="border border-gray-200 rounded-md p-3">
      <legend className="text-sm font-medium text-gray-700 px-1">
        {field.name}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </legend>
      <div className="space-y-2">
        {field.children?.map((child) => (
          <FieldInput
            key={child.name}
            field={child}
            value={objValue[child.name]}
            onChange={(val) => handleChildChange(child.name, val)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function ArrayField({ field, value, onChange }: FieldInputProps) {
  const items = (value as unknown[]) ?? [];

  const addItem = useCallback(() => {
    onChange([...items, ""]);
  }, [items, onChange]);

  const removeItem = useCallback(
    (index: number) => {
      const next = [...items];
      next.splice(index, 1);
      onChange(next);
    },
    [items, onChange],
  );

  const updateItem = useCallback(
    (index: number, val: unknown) => {
      const next = [...items];
      next[index] = val;
      onChange(next);
    },
    [items, onChange],
  );

  return (
    <div className="border border-gray-200 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          {field.name}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
          <span className="text-gray-400 font-normal ml-1">[]</span>
        </label>
        <button
          type="button"
          onClick={addItem}
          className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
        >
          + Add item
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {field.itemField ? (
              <div className="flex-1">
                <FieldInput
                  field={{ ...field.itemField, name: `[${String(index)}]` }}
                  value={item}
                  onChange={(val) => updateItem(index, val)}
                />
              </div>
            ) : (
              <input
                type="text"
                value={(item as string) ?? ""}
                onChange={(e) => updateItem(index, e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
