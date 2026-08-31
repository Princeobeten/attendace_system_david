import "./globals.css";

export const metadata = {
  title: "FaceTrack — Classroom Attendance System",
  description:
    "A face recognition based student attendance system for tertiary institutions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
