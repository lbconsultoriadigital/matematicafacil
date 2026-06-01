import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.lbconsultoriadigital.lorenafacil",
  appName: "Lorena Fácil",
  webDir: "out",
  server: {
    androidScheme: "https",
    cleartext: false,
    hostname: "localhost",
    allowNavigation: ["lorenafacil.vercel.app"],
  },
};

export default config;
