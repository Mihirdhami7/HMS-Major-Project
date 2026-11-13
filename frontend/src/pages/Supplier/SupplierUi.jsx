// Small presentational pieces shared by the supplier pages.
import PropTypes from "prop-types";
import { STATUS_STYLES, capitalize } from "./supplierUtils";

export function StatCard({ icon, label, value, sub, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4 enabled:hover:shadow-md enabled:hover:border-blue-200 transition ${active ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-100"}`}
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center text-2xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </button>
  );
}

StatCard.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  sub: PropTypes.string,
  onClick: PropTypes.func,
  active: PropTypes.bool,
};

export function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      {(title || right) && (
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            {title && <p className="text-sm font-semibold text-gray-800">{title}</p>}
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

Card.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  right: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
};

export function Empty({ text = "No data yet." }) {
  return <p className="text-xs text-gray-400 py-10 text-center">{text}</p>;
}

Empty.propTypes = { text: PropTypes.string };

export function OrderStatus({ status }) {
  const s = status || "requested";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[s] || STATUS_STYLES.requested}`}>
      {capitalize(s)}
    </span>
  );
}

OrderStatus.propTypes = { status: PropTypes.string };

/** Modal shell with the gradient header used across the app. */
export function Modal({ title, subtitle, onClose, children, footer, size = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${size} max-h-[90vh] flex flex-col overflow-hidden`}>
        <div className="bg-gradient-to-r from-blue-500 to-green-500 px-6 py-4 text-white flex justify-between items-start shrink-0">
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            {subtitle && <p className="text-sm text-white/90">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full px-2 text-xl leading-none" aria-label="Close">×</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

Modal.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.string,
};
