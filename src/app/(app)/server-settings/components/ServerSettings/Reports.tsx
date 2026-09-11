"use client";

import { useState, useEffect } from "react";
import { getServerReports, type ServerUserReport } from "@/api";
import { useToast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/components/toast/errorNormalizer";

interface ReportsProps {
  serverId: string;
  isOwner?: boolean;
  isAdmin?: boolean;
}

const statusStyles: Record<string, string> = {
  open: "border-[#FFC341]/40 bg-[#FFC341]/10 text-[#FFC341]",
  resolved: "border-[#23a55a]/40 bg-[#23a55a]/10 text-[#23a55a]",
  dismissed: "border-white/[0.12] bg-white/[0.04] text-[#b5bac1]",
};

export default function Reports({ serverId }: ReportsProps) {
  const [reports, setReports] = useState<ServerUserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadReports();
  }, [serverId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await getServerReports(serverId);
      setReports(data);
    } catch (err: any) {
      showToast(getErrorMessage(err, "Failed to load reports"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-[#72767d] mt-1">
          {reports.length} report{reports.length !== 1 ? "s" : ""} in this server
        </p>
      </div>

      <div className="border border-white/[0.06] rounded-lg bg-[#111214]">
        {loading ? (
          <div className="p-8 text-center text-[#72767d] text-sm">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[#b5bac1] text-sm mb-1">No reports</div>
            <div className="text-[#72767d] text-xs">
              No reports have been filed in this server.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {reports.map((report) => {
              const reported = report.reported;
              const reporter = report.reporter;
              const statusClass =
                statusStyles[report.status] ?? statusStyles.open;

              return (
                <div
                  key={report.id}
                  className="px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={reported?.avatar_url || "/User_profil.png"}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium truncate">
                          {reported?.fullname ||
                            reported?.username ||
                            "Unknown user"}
                        </span>
                        {reported?.username && (
                          <span className="text-sm text-[#72767d] truncate">
                            @{reported.username}
                          </span>
                        )}
                        {report.category && (
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-[#b5bac1]">
                            {report.category}
                          </span>
                        )}
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${statusClass}`}
                        >
                          {report.status}
                        </span>
                      </div>

                      {reported?.email && (
                        <div className="mt-0.5 truncate text-xs text-[#72767d]">
                          {reported.email}
                        </div>
                      )}

                      {report.message_content && (
                        <div className="mt-2">
                          <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#72767d]">
                            Reported message
                          </div>
                          <p className="text-sm text-[#dbdee1] whitespace-pre-wrap break-words">
                            {report.message_content}
                          </p>
                        </div>
                      )}

                      <div className="mt-2">
                        <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#72767d]">
                          Reason
                        </div>
                        <p className="text-sm text-[#dbdee1] whitespace-pre-wrap break-words">
                          {report.reason}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#72767d]">
                        <span>
                          Server:{" "}
                          <span className="text-[#b5bac1]">
                            {report.server?.name || "—"}
                          </span>
                        </span>
                        <span>
                          Channel:{" "}
                          <span className="text-[#b5bac1]">
                            #{report.channel?.name || "—"}
                          </span>
                        </span>
                        <span>
                          Reported by{" "}
                          <span className="text-[#b5bac1]">
                            {reporter?.fullname ||
                              reporter?.username ||
                              "Unknown"}
                          </span>
                          {reporter?.email && <> · {reporter.email}</>}
                        </span>
                        <span>
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
