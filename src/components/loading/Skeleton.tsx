"use client";

import React from "react";
import clsx from "clsx";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("skeleton", className)} {...props} />;
}

export default Skeleton;
