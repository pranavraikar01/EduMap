import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Register.module.css";
import { FaGoogle } from "react-icons/fa";
import illustration from "../assets/illustration.png";


const Register = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [cpassword, setCpassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

    const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3000/api/v1/users/Register", {
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
        navigate("/mindmap"); // Redirect to mindmap page after Register
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
        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.inputField}
            />
          </div>

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
          </div>

          <div>
            

          <label>Confirm Password</label>
            <input
              type="password"
              value={cpassword}
              onChange={(e) => setCpassword(e.target.value)}
              required
              className={styles.inputField}
            />
          </div>
          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? "Logging in..." : "Sign up"}
          </button>
          {error && <p className={styles.error}>{error}</p>}
          {/* <div className={styles.divider}>or</div>
          <button className={styles.googleButton}>
            <FaGoogle className={styles.googleIcon} /> Sign in with Google
          </button> */}
          <p className={styles.createAccount}>
            Already a member? <a href="/register">Log in</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
