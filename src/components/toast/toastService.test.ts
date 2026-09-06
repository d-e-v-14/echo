import { beforeEach, describe, expect, it } from "vitest";
import {
  dismiss,
  dismissAll,
  getToasts,
  showToast,
  subscribe,
  toast,
  updateToast,
} from "./toastService";

beforeEach(() => {
  dismissAll();
});

describe("toastService", () => {
  it("supports all toast types via the shorthand API", () => {
    const successId = toast.success("Saved");
    const errorId = toast.error("Failed");
    const warningId = toast.warning("Careful");
    const infoId = toast.info("Heads up");
    const loadingId = toast.loading("Working…");

    const items = getToasts();
    expect(items).toHaveLength(5);
    expect(items.find((t) => t.id === successId)?.type).toBe("success");
    expect(items.find((t) => t.id === errorId)?.type).toBe("error");
    expect(items.find((t) => t.id === warningId)?.type).toBe("warning");
    expect(items.find((t) => t.id === infoId)?.type).toBe("info");
    expect(items.find((t) => t.id === loadingId)?.type).toBe("loading");
  });

  it("uses sensible default durations and keeps loading sticky", () => {
    toast.success("ok");
    toast.loading("busy");
    const [success, loading] = getToasts();
    expect(success.duration).toBe(3000);
    expect(success.duration).toBe(3000);
    expect(loading.duration).toBe(0);
  });

  it("dedupes identical messages so a single failure does not double-toast", () => {
    toast.error("Your session has expired. Please sign in again.");
    toast.error("Your session has expired. Please sign in again.");
    expect(getToasts()).toHaveLength(1);
  });

  it("notifies subscribers on changes", () => {
    const seen: string[][] = [];
    const unsubscribe = subscribe((items) => seen.push(items.map((i) => i.message)));
    toast.info("first");
    toast.info("second");
    dismissAll();
    unsubscribe();
    expect(seen).toEqual([
      ["first"],
      ["first", "second"],
      [],
    ]);
  });

  it("supports loading -> success/error lifecycle", () => {
    const id = toast.loading("Signing you in…");
    updateToast(id, { type: "success", message: "Welcome back!" });
    const updated = getToasts()[0];
    expect(updated.type).toBe("success");
    expect(updated.message).toBe("Welcome back!");
    expect(updated.duration).toBe(3000);
  });

  it("dismisses a single toast", () => {
    const a = toast.info("a");
    toast.info("b");
    dismiss(a);
    expect(getToasts().map((t) => t.message)).toEqual(["b"]);
  });

  it("showToast returns a stable id and honors explicit duration", () => {
    const id = showToast("hello", "warning", 9000);
    const item = getToasts()[0];
    expect(item.id).toBe(id);
    expect(item.duration).toBe(9000);
  });
});