// OCR helper for card-audit.mjs: macOS Vision framework, no external dependencies.
// Usage: card-audit-ocr <image> <image> ...: prints "=== <path>" followed by one recognized
// line per printed text line (or "!LOAD-ERROR" when an image cannot be read).
// Scans are OCR'd at 3x: Vision reads display-font titles and icon-adjacent numerals more
// reliably when upscaled (2x still misreads titles like IRONHEART as TRONHEART).
// Compile: swiftc -o <binary> scripts/card-audit-ocr.swift
import AppKit
import Vision

for path in CommandLine.arguments.dropFirst() {
  print("=== \(path)")
  guard let image = NSImage(contentsOfFile: path) else {
    print("!LOAD-ERROR")
    continue
  }
  let scaled = NSImage(size: NSSize(width: image.size.width * 3, height: image.size.height * 3))
  scaled.lockFocus()
  NSGraphicsContext.current?.imageInterpolation = .high
  image.draw(in: NSRect(origin: .zero, size: scaled.size))
  scaled.unlockFocus()
  guard
    let tiff = scaled.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiff),
    let cg = bitmap.cgImage
  else {
    print("!LOAD-ERROR")
    continue
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = false
  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  do {
    try handler.perform([request])
  } catch {
    print("!LOAD-ERROR")
    continue
  }
  for observation in request.results ?? [] {
    if let candidate = observation.topCandidates(1).first {
      print(candidate.string)
    }
  }
}
