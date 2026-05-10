import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./login.css";
import book from "./photos/book.png";


function Login() {

  const navigate = useNavigate();


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("http://noteapp.local/api/login", {
        email,
        password
      });

      localStorage.setItem("token", res.data.token);


      navigate("/notes");

    } catch (err) {
      
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      <div className="login-card">
        
        {/* Logo Branding Section */}
        <div className="login-brand">
          <img 
            src={book} 
            alt="Notes Logo" 
            className="logo-svg" 
            style={{ width: '44px', height: '44px', objectFit: 'contain' }}
          />
          <div className="brand-text">
            <span className="brand-my">My</span>
            <span className="brand-notes">Notes</span>
          </div>
        </div>

        <h1>Welcome Back</h1>

        <p className="subtitle">
          Login to your notes account
        </p>

        {/* Authentication Form */}
        <form onSubmit={handleLogin}>

          <div className="input-group">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="login-submit-btn">
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {/* Error Feedback Display */}
        {error && (
          <div className="error-box">
            <p className="error-text">
              {error}
            </p>
          </div>
        )}

        {/* Navigation to Registration */}
        <div className="register-section">
          <span>Don't have an account?</span>
          <Link to="/register" className="reg-link">
            Register
          </Link>
        </div>

      </div>

    </div>
  );
}

export default Login;