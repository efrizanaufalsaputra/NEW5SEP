import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[v0] Upload API route called - handler executing")

  try {
    console.log("[v0] Request method:", request.method)
    console.log("[v0] Request URL:", request.url)
    console.log("[v0] Headers:", Object.fromEntries(request.headers.entries()))

    // Test if we can parse form data
    let formData
    try {
      console.log("[v0] Attempting to parse form data...")
      formData = await request.formData()
      console.log("[v0] Form data parsed successfully")

      // Log all form data entries
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`[v0] Form field ${key}: File(${value.name}, ${value.size} bytes)`)
        } else {
          console.log(`[v0] Form field ${key}: ${value}`)
        }
      }
    } catch (formError) {
      console.error("[v0] Form data parsing failed:", formError)
      return NextResponse.json(
        {
          error: "Form data parsing failed",
          details: formError instanceof Error ? formError.message : "Unknown error",
        },
        { status: 400 },
      )
    }

    const file = formData.get("file") as File
    const reportId = formData.get("reportId") as string
    const uploadedBy = formData.get("uploadedBy") as string

    console.log("[v0] Extracted form data:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      reportId,
      uploadedBy,
    })

    if (!file) {
      console.log("[v0] No file provided in form data")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!reportId || !uploadedBy) {
      console.log("[v0] Missing required fields:", { reportId: !!reportId, uploadedBy: !!uploadedBy })
      return NextResponse.json({ error: "Report ID and uploader information required" }, { status: 400 })
    }

    // Check file size
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.log("[v0] File too large:", file.size)
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 })
    }

    const blobToken =
      process.env.BLOB_READ_WRITE_TOKEN || "vercel_blob_rw_hla9k9j9qPLxBMYK_RMP4NilujhVxB6eF1Ysv2CXFU7jQJZ"
    console.log("[v0] Blob token available:", !!blobToken)

    if (!blobToken) {
      console.log("[v0] No Blob token - returning mock response")
      // Return a mock response for testing
      const mockAttachment = {
        id: `mock-${Date.now()}`,
        fileName: file.name,
        fileUrl: `https://example.com/mock-files/${file.name}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploadedBy,
        type: "original" as const,
      }

      console.log("[v0] Returning mock attachment:", mockAttachment)
      return NextResponse.json(mockAttachment)
    }

    try {
      console.log("[v0] Using direct Blob REST API")

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const fileName = `sitrack-reports/${reportId}/${timestamp}-${file.name}`

      console.log("[v0] Uploading to Blob with filename:", fileName)

      // Convert file to buffer
      const fileBuffer = await file.arrayBuffer()

      // Make direct API call to Vercel Blob
      const blobResponse = await fetch(`https://blob.vercel-storage.com/${fileName}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${blobToken}`,
          "Content-Type": file.type || "application/octet-stream",
          "x-content-type": file.type || "application/octet-stream",
        },
        body: fileBuffer,
      })

      console.log("[v0] Blob API response status:", blobResponse.status)

      if (!blobResponse.ok) {
        const errorText = await blobResponse.text()
        console.error("[v0] Blob API error:", errorText)
        throw new Error(`Blob API error: ${blobResponse.status} ${errorText}`)
      }

      const blobResult = await blobResponse.json()
      console.log("[v0] Blob upload successful:", blobResult)

      const fileAttachment = {
        id: `blob-${Date.now()}`,
        fileName: file.name,
        fileUrl: blobResult.url || `https://blob.vercel-storage.com/${fileName}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploadedBy,
        type: "original" as const,
      }

      console.log("[v0] Returning blob attachment:", fileAttachment)
      return NextResponse.json(fileAttachment)
    } catch (blobError) {
      console.error("[v0] Blob operation failed:", blobError)
      return NextResponse.json(
        {
          error: "Blob upload failed",
          details: blobError instanceof Error ? blobError.message : "Unknown blob error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Unexpected error in upload handler:", error)
    console.error("[v0] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown",
      stack: error instanceof Error ? error.stack : "Unknown",
    })

    return NextResponse.json(
      {
        error: "Upload handler failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
