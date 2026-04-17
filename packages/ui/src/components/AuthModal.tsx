import { useState } from "react";

import { getAuthKey } from "../hooks/useAuth";

interface AuthConfig {
  type: "bearer" | "cookie" | "header" | "basic";
  name?: string;
  description?: string;
}

const TYPE_LABELS: Record<string, string> = {
  bearer: "Bearer Token",
  basic: "Basic Auth",
  cookie: "Cookie",
  header: "Custom Header",
};

interface AuthModalProps {
  configs: AuthConfig[];
  values: Record<string, string>;
  onSave: (values: Record<string, string>) => void;
  onClose: () => void;
}

export function AuthModal({ configs, values, onSave, onClose }: AuthModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>({ ...values });

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const handleClear = () => {
    onSave({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Authorize</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {configs.map((config, i) => {
            const key = getAuthKey(config, i);
            const label = TYPE_LABELS[config.type] ?? config.type;
            const displayName = config.name ? `${label} (${config.name})` : label;

            return (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {displayName}
                </label>
                {config.description && (
                  <p className="text-xs text-gray-500 mb-1.5">{config.description}</p>
                )}
                <input
                  type={config.type === "bearer" || config.type === "basic" ? "password" : "text"}
                  value={draft[key] ?? ""}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={
                    config.type === "bearer"
                      ? "eyJhbGciOi..."
                      : config.type === "basic"
                        ? "base64-encoded credentials"
                        : config.type === "cookie"
                          ? "cookie value"
                          : "header value"
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800"
          >
            Clear all
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
