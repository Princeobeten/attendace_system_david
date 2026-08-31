"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Opens the device camera and binds it to a <video> element.
 * Returns the ref to attach, plus status flags for the UI.
 */
export function useWebcam({ facingMode = "user", width = 1280, height = 720 } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "This browser cannot access the camera. Use Chrome, Edge or Safari over https:// or localhost."
        );
      }
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId }, width, height }
          : { facingMode, width, height },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);

      // Labels are only exposed once permission has been granted.
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "videoinput"));
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access and try again."
          : err.message
      );
      setReady(false);
    }
  }, [deviceId, facingMode, width, height, stop]);

  useEffect(() => stop, [stop]);

  return { videoRef, ready, error, start, stop, devices, deviceId, setDeviceId };
}
