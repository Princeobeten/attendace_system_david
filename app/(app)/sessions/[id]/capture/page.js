"use client";

import { use } from "react";
import CaptureScreen from "./CaptureScreen";

export default function CapturePage({ params }) {
  const { id } = use(params);
  return <CaptureScreen sessionId={id} />;
}
