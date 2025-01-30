import { useEffect, useRef } from "react";
import logo from "../../assets/images/logo.png";  
import { NavLink } from "react-router-dom";

const navLinks = [
    {
        path: '/home',
        display: 'Home',
    },
    {
        path: '/services',
        display: 'Services',
    },
    {
        path: '/contact',
        display: 'Contact Us',
    },
];

const Header = () => {
    return (
        <header className="header flex items-center">
            <div className="container">
                <div className="container flex items-center justify-between ">
                {/* Logo */}
                <div>
                    <img src={logo} alt="Logo" />
                </div>

                {/* Navigation Menu */}
                <div className="navigation">
                    <ul className="menu flex items-center gap-[2.7rem]">
                        {navLinks.map((link, index) => (
                            <li key={index} >
                                <NavLink
                                    to={link.path}
                                    className={navClass => navClass.isActive
                                        
                                            ? "text-primaryColor text-[16px] leading-7 font-[600]"
                                            : "text-textColor text-[16px] leading-7 font-[500]"
                                    }
                                >
                                    {link.display}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </header>
    );
};
export default Header;
