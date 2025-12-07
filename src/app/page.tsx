"use client";

import { Container, Typography, Box, Paper, Button } from "@mui/material";
import { useTranslations } from "next-intl";
import { Header } from "@/components/Header";

export default function Home() {
  const t = useTranslations();

  return (
    <Box className="min-h-screen">
      <Header />
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 2,
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            {t("common.welcome")}
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            {t("home.subtitle")}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 3, mb: 4, maxWidth: 600, mx: "auto" }}
          >
            {t("home.description")}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button variant="contained" size="large">
              {t("common.getStarted")}
            </Button>
            <Button variant="outlined" size="large">
              {t("common.learnMore")}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
