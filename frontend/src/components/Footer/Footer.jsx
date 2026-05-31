import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0d1117] text-slate-200 pt-14">
      <div className="container mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1.8fr] gap-12 pb-12 border-b border-white/10">

          {/* Brand */}
          <div>
            <h3 className="text-xl font-medium text-white mb-3 tracking-tight">EasyTreat</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-5 max-w-[220px]">
              Transforming healthcare with smart technology — built for patients, trusted by providers.
            </p>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-medium text-white uppercase tracking-widest mb-4">Company</p>
            <ul className="space-y-2.5">
              {["About us", "Careers", "Blog", "Press", "Contact"].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-medium text-white uppercase tracking-widest mb-4">Legal</p>
            <ul className="space-y-2.5">
              {["Privacy policy", "Terms & conditions", "Cookie policy", "HIPAA compliance"].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter + Social */}
          <div>
            <p className="text-xs font-medium text-white uppercase tracking-widest mb-4">Stay updated</p>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Get product updates, health tech news, and tips — straight to your inbox.
            </p>
            <div className="flex overflow-hidden rounded-lg border border-white/15">
              <input
                type="email"
                placeholder="you@example.com"
                className="flex-1 bg-white/5 border-none outline-none px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 font-sans"
              />
              <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>

            {/* Social */}
            <div className="flex gap-2.5 mt-5">
              {[Facebook, Twitter, Linkedin, Youtube].map((Icon, i) => (
                <Link
                  key={i}
                  to="#"
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/12 bg-white/4 text-slate-400 hover:bg-white/10 hover:border-white/25 hover:text-white transition-all"
                >
                  <Icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between py-5 gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Hospital Management System. All rights reserved.
          </p>
          <div className="flex gap-5">
            {["Accessibility", "Sitemap", "Support"].map((item) => (
              <Link key={item} to="#" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}