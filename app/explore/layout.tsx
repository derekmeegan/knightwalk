"use client";

import { ReactFlowProvider } from "reactflow";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
