import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { FaGoogle } from "react-icons/fa";
import illustration from "../assets/illustration.png";


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

    const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3000/api/v1/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      console.log(data.status);
      if (data.status == "success") {
        localStorage.setItem("token", data.token); // Save token to localStorage
        navigate("/mindmap"); // Redirect to mindmap page after login
      } else {
        setError("Invalid credentials");
      }
    } catch (error) {
      setError("An error occurred");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.illustration}>
      <h2>Streamline Your Learning with Mind Maps</h2>
<p>
  In today's fast-paced academic world, organizing complex information is essential. Our tool helps you visualize key concepts and their relationships, making it easier to understand and remember even the densest material. Discover a smarter way to learn and retain knowledge.
</p>

        <img src={illustration} alt="Illustration" className={styles.image} />
        </div>
      <div className={styles.formContainer}>
        <h1 className={styles.logo}>EduMap</h1>
        <h2>Welcome to EduMap</h2>
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.inputField}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.inputField}
            />
            {/* <a href="#" className={styles.forgotPassword}>
              Forgot password?
            </a> */}
          </div>
          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? "Logging in..." : "Sign in"}
          </button>
          {error && <p className={styles.error}>{error}</p>}
          {/* <div className={styles.divider}>or</div>
          <button className={styles.googleButton}>
            <FaGoogle className={styles.googleIcon} /> Sign in with Google
          </button> */}
          <p className={styles.createAccount}>
            New to EduMap? <a href="/register">Create Account</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
