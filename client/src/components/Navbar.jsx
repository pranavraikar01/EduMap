import React from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear the token
    navigate("/login"); // Redirect to login page
  };

  return (
    <header className={styles.header}>
      <a className={styles.logo} href="#">
        <span className={styles["logo-text"]}>EduMap</span>
      </a>
      <nav className={styles.nav}>
        <Link to={"/"} className={styles["nav-element"]}>
          Home
        </Link>
        <Link to={"/mindmap"} className={styles["nav-element"]}>
          Mind Map
        </Link>
        <Link to={"/my-mindmaps"} className={styles["nav-element"]}>
          My Mind Map
        </Link>
        {!token ? (
          <Link to={"/login"} className={styles["nav-element"]}>
            Login
          </Link>
        ) : (
          <button onClick={handleLogout} className={styles["nav-element"]}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
