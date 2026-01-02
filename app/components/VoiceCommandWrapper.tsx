"use client";

import { VoiceCommandHandler } from "./VoiceCommandHandler";
import { useRouter } from "next/navigation";

export function VoiceCommandWrapper() {
  const router = useRouter();

  return (
    <VoiceCommandHandler
      onEventCreated={() => {
        router.refresh();
      }}
      onRoutineCreated={() => {
        router.refresh();
      }}
      onTaskCreated={() => {
        router.refresh();
      }}
    />
  );
}



