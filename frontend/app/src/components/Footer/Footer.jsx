import { Link } from "react-router-dom";
import { Input } from "../ui/input"
import { Button } from "../ui/button"

import { Facebook, Twitter, Linkedin, Youtube } from "lucide-react"

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white py-12">
            <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                <h3 className="text-xl font-semibold mb-4">HMS</h3>
                <p className="text-gray-400">Transforming Healthcare with Smart Technology</p>
                </div>
                <div>
                <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2">
                    <li>
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                        About
                    </Link>
                    </li>
                    <li>
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                        Contact
                    </Link>
                    </li>
                    <li>
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                        Privacy Policy
                    </Link>
                    </li>
                    <li>
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                        Terms & Conditions
                    </Link>
                    </li>
                </ul>
                </div>
                <div>
                <h4 className="text-lg font-semibold mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    <Facebook className="w-6 h-6" />
                    </Link>
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    <Twitter className="w-6 h-6" />
                    </Link>
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    <Linkedin className="w-6 h-6" />
                    </Link>
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                    <Youtube className="w-6 h-6" />
                    </Link>
                </div>
                </div>
                <div>
                <h4 className="text-lg font-semibold mb-4">Newsletter</h4>
                <form className="flex">
                    <Input type="email" placeholder="Your email" className="rounded-r-none" />
                    <Button type="submit" className="rounded-l-none">
                    Subscribe
                    </Button>
                </form>
                </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-800 text-center">
                <p className="text-gray-400">
                &copy; {new Date().getFullYear()} Hospital Management System. All rights reserved.
                </p>
            </div>
            </div>
        </footer>
    )
}

