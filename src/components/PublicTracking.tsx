"use client"

import { useState } from "react"
import { useApp } from "../context/AppContext"
import { Search, Clock, CheckCircle, AlertCircle, FileText, User, Calendar, MessageSquare } from "lucide-react"

export function PublicTracking() {
  const [noSurat, setNoSurat] = useState("")
  const [searchResult, setSearchResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const { state } = useApp()

  const handleSearch = async () => {
    if (!noSurat.trim()) {
      alert("Mohon masukkan nomor surat")
      return
    }

    setIsLoading(true)

    // Simulate API call delay for better UX
    setTimeout(() => {
      // Enhanced search algorithm - case insensitive and partial matching
      const normalizedSearch = noSurat.trim().toLowerCase()
      const foundReport = state.reports.find(
        (report) =>
          report.noSurat?.toLowerCase().includes(normalizedSearch) ||
          report.hal?.toLowerCase().includes(normalizedSearch) ||
          report.id?.toString().includes(noSurat),
      )

      if (foundReport) {
        const timeline = generateTrackingTimeline(foundReport)

        setSearchResult({
          ...foundReport,
          timeline: timeline,
          currentLocation: getCurrentLocation(foundReport),
          estimatedCompletion: getEstimatedCompletion(foundReport),
          lastUpdate: new Date().toLocaleString("id-ID"),
        })
      } else {
        setSearchResult(false)
      }
      setIsLoading(false)
    }, 800)
  }

  const generateTrackingTimeline = (report) => {
    const timeline = [
      {
        step: "Surat Diterima",
        status: "completed",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID"),
        location: "Tata Usaha",
        description: "Surat masuk dan didaftarkan dalam sistem",
      },
      {
        step: "Verifikasi Dokumen",
        status: report.progress >= 25 ? "completed" : "in-progress",
        date: report.progress >= 25 ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID") : null,
        location: "Koordinator",
        description: "Pemeriksaan kelengkapan dan validitas dokumen",
      },
      {
        step: "Penugasan Staff",
        status: report.progress >= 50 ? "completed" : report.progress >= 25 ? "in-progress" : "pending",
        date: report.progress >= 50 ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID") : null,
        location: "Staff Pelaksana",
        description: "Surat ditugaskan kepada staff untuk diproses",
        notes:
          report.assignments && report.assignments.length > 0
            ? report.assignments
                .map((a) => a.notes)
                .filter(Boolean)
                .join("; ")
            : null,
      },
      {
        step: "Proses Pelayanan",
        status: report.progress >= 75 ? "completed" : report.progress >= 50 ? "in-progress" : "pending",
        date: report.progress >= 75 ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID") : null,
        location: "Unit Pelayanan",
        description: "Pelaksanaan layanan sesuai jenis permohonan",
      },
      {
        step: "Selesai",
        status: report.progress >= 100 ? "completed" : "pending",
        date: report.progress >= 100 ? new Date().toLocaleDateString("id-ID") : null,
        location: "Selesai",
        description: "Surat telah selesai diproses dan siap diambil",
      },
    ]

    return timeline
  }

  const getCurrentLocation = (report) => {
    if (report.progress >= 100) return "Selesai - Siap Diambil"
    if (report.progress >= 75) return "Unit Pelayanan"
    if (report.progress >= 50) return "Staff Pelaksana"
    if (report.progress >= 25) return "Koordinator"
    return "Tata Usaha"
  }

  const getEstimatedCompletion = (report) => {
    if (report.progress >= 100) return "Sudah Selesai"

    const daysRemaining = Math.ceil((100 - report.progress) / 20)
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + daysRemaining)

    return completionDate.toLocaleDateString("id-ID")
  }

  const getTimelineStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "in-progress":
        return "bg-blue-500"
      default:
        return "bg-gray-300"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "in-progress":
        return <Clock className="w-5 h-5 text-yellow-500" />
      case "pending":
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const calculateProgress = (report) => {
    return report?.progress || 0
  }

  const getCoordinatorNotesFromWorkflow = (step, report) => {
    if (step.step === "Penugasan Staff" && step.notes) {
      return step.notes
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-border/20">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Search className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Lacak Status Surat Publik</h1>
            <p className="text-muted-foreground">Masukkan nomor surat untuk melacak status dan progres penanganan</p>
          </div>

          <div className="flex gap-4 mb-8">
            <div className="flex-1 relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={noSurat}
                onChange={(e) => setNoSurat(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Masukkan Nomor Surat (contoh: 001/SDM/2025)"
                className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-lg transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              <Search className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Mencari..." : "Lacak Surat"}
            </button>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Sedang mencari surat...</p>
            </div>
          )}

          {/* Not found state */}
          {searchResult === false && !isLoading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Surat Tidak Ditemukan</h3>
              <p className="text-muted-foreground mb-4">Nomor surat yang Anda masukkan tidak ditemukan dalam sistem.</p>
              <div className="bg-muted/30 p-4 rounded-lg border border-border/20 text-sm text-muted-foreground">
                <p className="font-medium mb-2">Tips pencarian:</p>
                <ul className="text-left space-y-1">
                  <li>• Pastikan nomor surat ditulis dengan benar</li>
                  <li>• Coba gunakan format lengkap (contoh: 001/SDM/2025)</li>
                  <li>• Periksa kembali nomor surat pada dokumen asli</li>
                </ul>
              </div>
            </div>
          )}

          {searchResult && !isLoading && (
            <div className="space-y-6">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-primary">Progress Penanganan</h3>
                  <span className="text-sm font-medium text-primary">{calculateProgress(searchResult)}%</span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${calculateProgress(searchResult)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-card/50 p-6 rounded-lg border border-border/20">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Informasi Surat
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">No. Surat:</span>
                    <span className="text-muted-foreground">{searchResult.noSurat}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Hal:</span>
                    <span className="text-muted-foreground">{searchResult.hal}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        searchResult.status === "Selesai"
                          ? "bg-green-100 text-green-800"
                          : searchResult.status === "Dalam Proses"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {searchResult.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Layanan:</span>
                    <span className="text-muted-foreground">{searchResult.layanan}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Lokasi Saat Ini:</span>
                    <span className="text-muted-foreground">{searchResult.currentLocation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Estimasi Selesai:</span>
                    <span className="text-muted-foreground">{searchResult.estimatedCompletion}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card/50 p-6 rounded-lg border border-border/20">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Timeline Proses
                </h3>
                <div className="space-y-4">
                  {searchResult.timeline.map((step, index) => {
                    const coordinatorNotes = getCoordinatorNotesFromWorkflow(step, searchResult)

                    return (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-4 h-4 rounded-full ${getTimelineStatusColor(step.status)}`} />
                          {index < searchResult.timeline.length - 1 && <div className="w-0.5 h-8 bg-border mt-2" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground">{step.step}</h4>
                            {step.status === "completed" && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {step.status === "in-progress" && <Clock className="w-4 h-4 text-blue-500" />}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{step.description}</p>
                          {coordinatorNotes && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-blue-800">
                                    <span className="font-semibold">Catatan Koordinator:</span> {coordinatorNotes}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                            {step.date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{step.date}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{step.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                Terakhir diperbarui: {searchResult.lastUpdate}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
