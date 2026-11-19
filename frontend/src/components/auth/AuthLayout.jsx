import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: "📅", title: "Book in minutes", text: "Choose a hospital, department and doctor, then pay the booking fee online." },
  { icon: "💊", title: "Prescriptions & medicines", text: "Get your prescription as a PDF and collect medicines at the hospital pharmacy." },
  { icon: "🏥", title: "One place for every role", text: "Patients, doctors, hospital admins and suppliers work on the same platform." },
];

/**
 * Split layout for the auth pages: brand panel on the left (hidden on small screens),
 * the form card on the right.
 */
export default function AuthLayout({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-5 rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-gray-800">
          {/* Brand panel */}
          <aside className="hidden lg:flex lg:col-span-2 flex-col justify-between bg-gradient-to-br from-blue-600 to-green-500 text-white p-10">
            <div>
              <Link to="/" className="text-2xl font-bold tracking-tight">EasyTreat</Link>
              <h2 className="mt-8 text-3xl font-bold leading-tight">Healthcare made simple for everyone.</h2>
              <p className="mt-3 text-white/85 text-sm">Appointments, prescriptions, pharmacy and hospital management in one place.</p>
            </div>
            <img src="/images/account.png" alt="" className="w-full max-w-xs mx-auto my-8 drop-shadow-xl" />
            <ul className="space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">{f.icon}</span>
                  <span>
                    <span className="block font-semibold text-sm">{f.title}</span>
                    <span className="block text-xs text-white/80">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>

          {/* Form */}
          <main className={`lg:col-span-3 p-6 sm:p-10 ${wide ? "" : "flex flex-col justify-center"}`}>
            <div className={wide ? "" : "max-w-md w-full mx-auto"}>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
              <div className="mt-6">{children}</div>
              {footer && <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">{footer}</div>}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  wide: PropTypes.bool,
};
