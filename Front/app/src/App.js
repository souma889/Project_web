import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./login";
import Register from "./register";
import Notes from "./notes";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔐 Auth */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* 📝 Notes (protected page later) */}
        <Route path="/notes" element={<Notes />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;