"use client";

import { useState } from "react";
import { IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import { Language } from "@mui/icons-material";
import { useTranslations } from "next-intl";

const locales = [
  { code: "en", name: "english" },
  { code: "es", name: "spanish" },
] as const;

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLocaleChange = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
    window.location.reload();
    handleClose();
  };

  return (
    <>
      <Tooltip title={t("language")}>
        <IconButton onClick={handleClick} color="inherit">
          <Language />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {locales.map((locale) => (
          <MenuItem
            key={locale.code}
            onClick={() => handleLocaleChange(locale.code)}
          >
            {t(locale.name)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
