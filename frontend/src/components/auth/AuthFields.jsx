// Inputs shared by the auth pages: label + icon + error text, consistent look.
import { useState } from "react";
import PropTypes from "prop-types";
import { FiEye, FiEyeOff } from "react-icons/fi";

const base =
  "w-full py-2.5 pr-3 rounded-xl border text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition";
const ok = "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500";
const bad = "border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400";

const fieldClass = (hasError, withIcon = true) => `${base} ${withIcon ? "pl-10" : "pl-3"} ${hasError ? bad : ok}`;

export function FieldShell({ label, htmlFor, icon: Icon, error, hint, children }) {
  return (
    <div>
      {label && <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />}
        {children}
      </div>
      {error ? <p className="text-red-600 text-xs mt-1">{error}</p> : hint ? <p className="text-gray-400 text-xs mt-1">{hint}</p> : null}
    </div>
  );
}

FieldShell.propTypes = {
  label: PropTypes.node, htmlFor: PropTypes.string, icon: PropTypes.elementType, error: PropTypes.node,
  hint: PropTypes.node, children: PropTypes.node,
};

/** Text input with an icon on the left. */
export function IconInput({ label, icon, error, hint, invalid, ...props }) {
  return (
    <FieldShell label={label} htmlFor={props.id} icon={icon} error={error} hint={hint}>
      <input {...props} className={fieldClass(invalid || !!error, !!icon)} />
    </FieldShell>
  );
}

IconInput.propTypes = {
  label: PropTypes.node, icon: PropTypes.elementType, error: PropTypes.node, hint: PropTypes.node,
  invalid: PropTypes.bool, id: PropTypes.string,
};

/** Password input with show / hide button. */
export function PasswordInput({ label, icon, error, hint, invalid, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <FieldShell label={label} htmlFor={props.id} icon={icon} error={error} hint={hint}>
      <input {...props} type={show ? "text" : "password"} className={`${fieldClass(invalid || !!error, !!icon)} pr-10`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <FiEyeOff /> : <FiEye />}
      </button>
    </FieldShell>
  );
}

PasswordInput.propTypes = IconInput.propTypes;

/** Select with an icon on the left. */
export function IconSelect({ label, icon, error, hint, invalid, children, ...props }) {
  return (
    <FieldShell label={label} htmlFor={props.id} icon={icon} error={error} hint={hint}>
      <select {...props} className={`${fieldClass(invalid || !!error, !!icon)} appearance-none`}>{children}</select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
    </FieldShell>
  );
}

IconSelect.propTypes = { ...IconInput.propTypes, children: PropTypes.node };

/** Coloured message box (error / success / info). */
export function AuthMessage({ tone = "info", children }) {
  if (!children) return null;
  const tones = {
    error: "bg-red-50 border-red-200 text-red-700",
    success: "bg-green-50 border-green-200 text-green-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };
  return <div className={`mb-5 p-3 rounded-xl border text-sm ${tones[tone]}`}>{children}</div>;
}

AuthMessage.propTypes = { tone: PropTypes.oneOf(["error", "success", "info"]), children: PropTypes.node };
