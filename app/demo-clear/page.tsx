"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DemoClear() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Clear all app storage to simulate first-time user
      localStorage.clear(); // Clear everything to be sure
      // Small delay to ensure clear completes
      setTimeout(() => {
        router.push("/language-selection");
      }, 100);
    }
  }, [router]);

  return (
    <div style={{ padding: "20px", textAlign: "center", fontFamily: "system-ui" }}>
      <h1>Clearing storage...</h1>
      <p>Simulating first-time user experience</p>
      <p>Redirecting to language selection...</p>
    </div>
  );
}

