import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.lbconsultoriadigital.lorenafacil",
  appName: "Lorena Fácil",
  webDir: "public",
  server: {
    cleartext: false,
    url: "https://lorenafacil.vercel.app",
  },
};

export default config;
