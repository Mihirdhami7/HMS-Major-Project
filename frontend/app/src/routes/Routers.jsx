import Home from "../pages/Home"
import Login from "../pages/Login"
import SignUp from "../pages/Signup"

import {Routes,Route} from 'react-router-dom'

const Routers= () => {
    console.log("Routers component rendered");
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} /> 
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<SignUp />} />
        </Routes>
    );
};
export default Routers;