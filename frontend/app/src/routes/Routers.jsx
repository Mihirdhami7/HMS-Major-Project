import React from "react"
import Home from "../pages/Home"
import Login from "../pages/Login"
import Service from "../pages/Services"
import SignUp from "../pages/Signup"
import ContactUs from "../pages/ContactUs"
import {Routes,Route} from 'react-router-dom'

const Routers= () => {
    return <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/Home" element={<Home/>} />
        <Route path="/Services" element={<Service/>} />
        <Route path="/Login" element={<Login/>} />
        <Route path="/Register" element={<SignUp/>} />
        <Route path="/Contact" element={<ContactUs/>} />
        <Route path="/" element={<Home/>} />

   </Routes>
};
export default Routers