import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "TooHigh-TooLow",
  description: "GOLD GOLD GOLD GOLD GOLD GOLD",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}

