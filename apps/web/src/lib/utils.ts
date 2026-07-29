import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMode(mode: "coach" | "real_world") {
  return mode === "coach" ? "Coach Mode" : "Real-World Mode";
}
