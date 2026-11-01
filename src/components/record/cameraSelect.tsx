// CS3483 addition: camera picker for setup step 1 (a labelled <select> instead of the
// original Bootstrap dropdown, so the current choice is always visible).
import { useEffect, useId, useState } from "react";
import { MEDIA_CONSTRAINTS } from "../../utils/constants";
import type { VideoRef } from "../../types";

const currentDeviceId = (videoRef: VideoRef): string | null => {
  const stream = videoRef.current?.srcObject;
  if (!(stream instanceof MediaStream)) {
    return null;
  }
  return stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
};

export const cameraLabel = (device: MediaDeviceInfo | undefined, index: number): string =>
  (device?.label ?? "").split("(")[0].trim() || `Camera ${index + 1}`;

export const switchCamera = async (videoRef: VideoRef, deviceId: string) => {
  const video = videoRef.current;
  if (video === null || currentDeviceId(videoRef) === deviceId) {
    return;
  }
  const baseVideo = typeof MEDIA_CONSTRAINTS.video === "object" ? MEDIA_CONSTRAINTS.video : {};
  const stream = await navigator.mediaDevices.getUserMedia({
    ...MEDIA_CONSTRAINTS,
    video: { ...baseVideo, deviceId: { exact: deviceId } }
  });
  const old = video.srcObject;
  video.srcObject = stream;
  if (old instanceof MediaStream) {
    old.getTracks().forEach((track) => {
      track.stop();
    });
  }
};

export const useCameras = (videoRef: VideoRef) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const refresh = () => {
      navigator.mediaDevices.enumerateDevices()
        .then((all) => {
          setDevices(all.filter((d) => d.kind === "videoinput"));
          setDeviceId(currentDeviceId(videoRef));
        })
        .catch((error: unknown) => console.error("Unable to enumerate media devices", error));
    };
    refresh();
    // Labels only appear once camera access is granted, i.e. after the stream starts.
    video?.addEventListener("loadedmetadata", refresh);
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () => {
      video?.removeEventListener("loadedmetadata", refresh);
      navigator.mediaDevices.removeEventListener("devicechange", refresh);
    };
  }, [videoRef]);

  const select = (id: string) => {
    setDeviceId(id);
    switchCamera(videoRef, id).catch((error: unknown) => console.error("Unable to switch camera", error));
  };

  const index = devices.findIndex((d) => d.deviceId === deviceId);
  return { devices, deviceId, select, label: index < 0 ? "No camera" : cameraLabel(devices[index], index) };
};

const CameraSelect = ({ cameras }: { cameras: ReturnType<typeof useCameras> }) => {
  const id = useId();
  return (
    <div className="cc-field">
      <label htmlFor={id}>Camera</label>
      <select id={id} className="cc-select" value={cameras.deviceId ?? ""}
        onChange={(e) => cameras.select(e.target.value)}>
        {cameras.deviceId === null && <option value="">Waiting for camera…</option>}
        {cameras.devices.map((device, i) => (
          <option key={device.deviceId || i} value={device.deviceId}>{cameraLabel(device, i)}</option>
        ))}
      </select>
    </div>
  );
};

export default CameraSelect;
