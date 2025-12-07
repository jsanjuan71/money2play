"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  FamilyRestroom,
  ChildCare,
  ArrowBack,
} from "@mui/icons-material";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";

type AuthMode = "login" | "register";
type UserType = "parent" | "kid";

export default function AuthPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginParent, registerParent, loginKid, isAuthenticated, userType: authUserType } = useAuth();

  // Get initial state from URL params
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const initialType = searchParams.get("type") === "kid" ? "kid" : "parent";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [userType, setUserType] = useState<UserType>(initialType);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parent form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  // Kid form fields
  const [parentEmail, setParentEmail] = useState("");
  const [kidName, setKidName] = useState("");
  const [pin, setPin] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (authUserType === "parent") {
        router.push("/parent");
      } else if (authUserType === "kid") {
        router.push("/kid");
      }
    }
  }, [isAuthenticated, authUserType, router]);

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        await registerParent(email, password, name);
      } else {
        await loginParent(email, password);
      }
      router.push("/parent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleKidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginKid(parentEmail, kidName, pin);
      router.push("/kid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #4CAF50 0%, #81C784 50%, #7C4DFF 100%)",
        display: "flex",
        alignItems: "center",
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ mb: 2 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button
              startIcon={<ArrowBack />}
              sx={{ color: "white" }}
            >
              {t("common.back")}
            </Button>
          </Link>
        </Box>

        <Paper sx={{ p: 4 }}>
          {/* Logo/Title */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h4"
              fontWeight="800"
              sx={{
                background: "linear-gradient(135deg, #4CAF50 0%, #7C4DFF 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Money n Play
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("app.tagline")}
            </Typography>
          </Box>

          {/* User Type Tabs */}
          <Tabs
            value={userType}
            onChange={(_, v) => {
              setUserType(v);
              setError(null);
            }}
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab
              value="parent"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FamilyRestroom />
                  {t("auth.parentLogin")}
                </Box>
              }
            />
            <Tab
              value="kid"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ChildCare />
                  {t("auth.kidLogin")}
                </Box>
              }
            />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Parent Auth Form */}
          {userType === "parent" && (
            <form onSubmit={handleParentSubmit}>
              {/* Login/Register Toggle for Parents */}
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <Button
                  variant={mode === "login" ? "contained" : "outlined"}
                  onClick={() => setMode("login")}
                  sx={{ borderRadius: "20px 0 0 20px" }}
                >
                  {t("auth.login")}
                </Button>
                <Button
                  variant={mode === "register" ? "contained" : "outlined"}
                  onClick={() => setMode("register")}
                  sx={{ borderRadius: "0 20px 20px 0" }}
                >
                  {t("auth.register")}
                </Button>
              </Box>

              {mode === "register" && (
                <TextField
                  fullWidth
                  label={t("auth.name")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                />
              )}

              <TextField
                fullWidth
                type="email"
                label={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                type={showPassword ? "text" : "password"}
                label={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {mode === "register" && (
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  label={t("auth.confirmPassword")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                />
              )}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : mode === "login" ? (
                  t("auth.login")
                ) : (
                  t("auth.createAccount")
                )}
              </Button>
            </form>
          )}

          {/* Kid Auth Form */}
          {userType === "kid" && (
            <form onSubmit={handleKidSubmit}>
              <Box
                sx={{
                  textAlign: "center",
                  mb: 3,
                  p: 2,
                  bgcolor: "secondary.light",
                  borderRadius: 2,
                  color: "white",
                }}
              >
                <Typography variant="h6">{t("auth.welcomeBack")}</Typography>
                <Typography variant="body2">
                  Enter your details to start playing!
                </Typography>
              </Box>

              <TextField
                fullWidth
                type="email"
                label={t("auth.parentEmail")}
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                required
                sx={{ mb: 2 }}
                helperText="Your parent's email address"
              />

              <TextField
                fullWidth
                label={t("auth.kidName")}
                value={kidName}
                onChange={(e) => setKidName(e.target.value)}
                required
                sx={{ mb: 2 }}
                helperText="Your name as registered by your parent"
              />

              <TextField
                fullWidth
                type="password"
                label={t("auth.pin")}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                sx={{ mb: 3 }}
                inputProps={{ maxLength: 6, inputMode: "numeric" }}
                helperText="Your 4-6 digit PIN"
              />

              <Button
                type="submit"
                variant="contained"
                color="secondary"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Let's Play!"
                )}
              </Button>
            </form>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
