// PDF text and image extraction for the Primal Challenges cards: macOS PDFKit + CoreGraphics,
// no external dependencies.
// Usage: extract-trials <pdf> <pdf> ...: prints one JSON object per input file:
//   { "file": "<path>", "pages": [{ "page": 1, "lines": ["..."], "words": [{ "t": "WOLTYAR", "x": 119, "y": 437 }],
//     "images": [{ "obj": 571, "w": 458, "h": 396, "x": 118, "y": 356, "pw": 165, "ph": 142, "sig": null }] }] }
// Lines come from the page's text layer (reading order); words carry PDFSelection bounds
// (top-left origin, PDF points) so the parser can reconstruct spatial layouts: the Winds
// die maps print their biome labels as plain words at stable grid positions, which the text
// layer carries even where OCR cannot read the stylized banners. Cover pages with thin or
// empty text layers are reported with an empty word list; the parser skips them.
// Images carry their XObject number, pixel size, placement (center at the same top-left
// origin as the words, placed size in points) and: for icon-sized placements only: a
// 24×24 RGBA signature: the Winds maps place their terrain tokens as raster icons, matched
// against the TERRAIN legend's printed icons through that signature. The image's SMask is
// drawn as the signature's alpha so the icon shape survives the re-encoding between the
// legend's large icons and the maps' small tokens.
// Compile (the .mjs entry does this on demand): swiftc -o <binary> scripts/extract-trials.swift
import AppKit
import PDFKit

struct Word: Codable {
  let t: String
  let x: Double
  let y: Double
}

struct PlacedImage: Codable {
  let obj: Int
  let w: Int
  let h: Int
  let x: Double
  let y: Double
  let pw: Double
  let ph: Double
  let sig: [Int]?
}

struct Page: Codable {
  let page: Int
  let lines: [String]
  let words: [Word]
  let images: [PlacedImage]
}

struct Document: Codable {
  let file: String
  let pages: [Page]
}

// MARK: Raw PDF objects: image placements live in each page's content stream, which PDFKit
// does not expose, so indirect objects are scanned from the file bytes (dict as text, stream
// sliced through its /Length so binary data never passes through a String) and the page tree
// is walked in reading order, the order PDFKit reports.

struct RawObject {
  let dict: String
  let stream: Data
}

/// True when the byte is a PDF delimiter (whitespace or a structural character).
func isDelimiter(_ byte: UInt8) -> Bool {
  byte == 0 || (byte >= 9 && byte <= 13) || byte == 32 || byte == 40 || byte == 41 || byte == 60
    || byte == 62 || byte == 91 || byte == 93 || byte == 123 || byte == 125 || byte == 47 || byte == 37
}

func findMarker(_ bytes: [UInt8], _ marker: [UInt8], from: Int) -> Int? {
  guard !marker.isEmpty, from < bytes.count else { return nil }
  var index = from
  while index <= bytes.count - marker.count {
    if bytes[index] == marker[0] {
      var matches = true
      for offset in 1..<marker.count where bytes[index + offset] != marker[offset] {
        matches = false
        break
      }
      if matches { return index }
    }
    index += 1
  }
  return nil
}

/// Reads the digits ending at `end` (skipping whitespace first): (value, digitsStart).
func numberEnding(at end: Int, _ bytes: [UInt8]) -> (value: Int, start: Int)? {
  var index = end
  while index > 0 && isDelimiter(bytes[index - 1]) && bytes[index - 1] != 40 && bytes[index - 1] != 60 {
    if bytes[index - 1] == 32 || (bytes[index - 1] >= 9 && bytes[index - 1] <= 13) { index -= 1 } else { break }
  }
  let digitsEnd = index
  while index > 0 && bytes[index - 1] >= 48 && bytes[index - 1] <= 57 { index -= 1 }
  guard index < digitsEnd, index >= 0 else { return nil }
  let value = Int(String(decoding: bytes[index..<digitsEnd], as: UTF8.self))
  return value.map { ($0, index) }
}

func scanObjects(_ data: Data) -> [Int: RawObject] {
  let bytes = [UInt8](data)
  var objects: [Int: RawObject] = [:]
  let objMarker = Array(" obj".utf8)
  let dictOpen = Array("<<".utf8)
  let streamMarker = Array("stream".utf8)
  let endobjMarker = Array("endobj".utf8)
  var searchFrom = 0
  while let headerAt = findMarker(bytes, objMarker, from: searchFrom) {
    searchFrom = headerAt + objMarker.count
    // "<N> 0 obj": the generation number, then the object number, both digits.
    guard let generation = numberEnding(at: headerAt, bytes), generation.value == 0 else { continue }
    guard let number = numberEnding(at: generation.start, bytes) else { continue }
    let bodyStart = headerAt + objMarker.count
    // Objects begin with a dictionary; anything else is a false " obj" hit inside binary data.
    var dictStart = bodyStart
    while dictStart < bytes.count && bytes[dictStart] == 10 || dictStart < bytes.count && bytes[dictStart] == 13 { dictStart += 1 }
    guard findMarker(bytes, dictOpen, from: dictStart) == dictStart else { continue }
    guard let dictEndRelative = findFirstEndobj(bytes, bodyStart) else { continue }
    let dictEnd = dictEndRelative
    // A stream object carries its data between `stream\n` and `endstream`, sized by /Length.
    // `stream` must stand alone: preceded by a delimiter, so the tail of `endstream` cannot match.
    if let streamKeyword = findMarker(bytes, streamMarker, from: bodyStart), streamKeyword < dictEnd,
       streamKeyword > 0 && isDelimiter(bytes[streamKeyword - 1]) {
      // "stream" must be a standalone keyword, not the tail of "endstream".
      let dict = String(decoding: bytes[bodyStart..<streamKeyword], as: UTF8.self)
      var dataStart = streamKeyword + streamMarker.count
      if dataStart + 1 < bytes.count && bytes[dataStart] == 13 && bytes[dataStart + 1] == 10 { dataStart += 2 }
      else if dataStart < bytes.count && (bytes[dataStart] == 10 || bytes[dataStart] == 13) { dataStart += 1 }
      let stream: Data
      if let length = streamLength(dict, objects), length >= 0, dataStart + length <= bytes.count,
         hasEndstream(bytes, at: dataStart + length) {
        stream = Data(bytes[dataStart..<dataStart + length])
      } else if let endobjAt = findMarker(bytes, endobjMarker, from: dataStart) {
        // Fallback: the data runs to the last `endstream` before `endobj`.
        let window = [UInt8](bytes[dataStart..<endobjAt])
        if let endstreamAt = findLastEndstream(window) {
          stream = Data(window[..<endstreamAt])
        } else { stream = Data(window) }
      } else {
        stream = Data()
      }
      objects[number.value] = RawObject(dict: dict, stream: stream)
    } else {
      objects[number.value] = RawObject(dict: String(decoding: bytes[bodyStart..<dictEnd], as: UTF8.self), stream: Data())
    }
  }
  return objects
}

/// The first `endobj` after `start`: an object without a stream ends there.
func findFirstEndobj(_ bytes: [UInt8], _ start: Int) -> Int? {
  findMarker(bytes, Array("endobj".utf8), from: start)
}

/// `endstream` follows within a few bytes of `at` (allowing the writer's EOLs).
func hasEndstream(_ bytes: [UInt8], at: Int) -> Bool {
  var index = at
  while index < bytes.count && (bytes[index] == 13 || bytes[index] == 10) { index += 1 }
  return findMarker(bytes, Array("endstream".utf8), from: index) == index
}

func findLastEndstream(_ window: [UInt8]) -> Int? {
  var last: Int? = nil
  var searchFrom = 0
  while let found = findMarker(window, Array("endstream".utf8), from: searchFrom) {
    last = found
    searchFrom = found + 1
  }
  if let last, last > 0 && (window[last - 1] == 10 || window[last - 1] == 13) { return last - 1 }
  return last
}

/// `/Length N`, or `/Length N 0 R` resolved through an already-scanned number-only object.
func streamLength(_ dict: String, _ objects: [Int: RawObject]) -> Int? {
  if let match = firstMatch(dict, pattern: #"/Length\s+(\d+)\s+0\s+R"#),
     let number = Int(match), let referenced = objects[number],
     let value = Int(referenced.dict.trimmingCharacters(in: .whitespacesAndNewlines)) {
    return value
  }
  if let match = firstMatch(dict, pattern: #"/Length\s+(\d+)"#) { return Int(match) }
  return nil
}

// MARK: Dictionary readers: the dict region is ASCII, so String regexes are safe there.

func firstMatch(_ text: String, pattern: String) -> String? {
  guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
  guard let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
        match.numberOfRanges > 1, let range = Range(match.range(at: 1), in: text) else { return nil }
  return String(text[range])
}

func allMatches(_ text: String, pattern: String) -> [String] {
  guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
  return regex.matches(in: text, range: NSRange(text.startIndex..., in: text)).compactMap { match in
    match.numberOfRanges > 1 ? Range(match.range(at: 1), in: text).map { String(text[$0]) } : nil
  }
}

/// The object numbers referenced after a key, bounded by the enclosing `[ … ]`.
func dictRefs(_ object: RawObject, _ key: String) -> [Int] {
  let text = object.dict
  guard let keyRange = text.range(of: key) else { return [] }
  var region = text[keyRange.upperBound...].prefix(4000)
  if let close = region.firstIndex(of: "]") { region = region[..<close] }
  return allMatches(String(region), pattern: #"(\d+)\s+0\s+R"#).compactMap(Int.init)
}

/// The name → object-number entries of a name dictionary such as `/XObject << … >>`.
func nameDictRefs(_ object: RawObject, _ key: String) -> [String: Int] {
  let text = object.dict
  guard let keyRange = text.range(of: key) else { return [:] }
  var region = String(text[keyRange.upperBound...].prefix(4000))
  if let close = region.range(of: ">>") { region = String(region[..<close.lowerBound] ) }
  var result: [String: Int] = [:]
  let pattern = #"/([A-Za-z0-9_.]+)\s+(\d+)\s+0\s+R"#
  guard let regex = try? NSRegularExpression(pattern: pattern) else { return [:] }
  for match in regex.matches(in: region, range: NSRange(region.startIndex..., in: region)) {
    guard let name = Range(match.range(at: 1), in: region), let number = Range(match.range(at: 2), in: region) else { continue }
    result[String(region[name])] = Int(region[number])
  }
  return result
}

/// Name → object number for a page's XObjects, whether /Resources is inline or a reference.
func xobjectMap(_ pageObject: RawObject, _ objects: [Int: RawObject]) -> [String: Int] {
  if let ref = firstMatch(pageObject.dict, pattern: #"/Resources\s+(\d+)\s+0\s+R"#),
     let number = Int(ref), let resources = objects[number] {
    return nameDictRefs(resources, "/XObject")
  }
  return nameDictRefs(pageObject, "/XObject")
}

func pageTreeOrder(root: Int, objects: [Int: RawObject]) -> [Int] {
  var order: [Int] = []
  func visit(_ number: Int) {
    guard let node = objects[number] else { return }
    let isPages = node.dict.range(of: "/Type/Pages") != nil || node.dict.range(of: "/Type /Pages") != nil
    if isPages {
      for child in dictRefs(node, "/Kids") where child != number { visit(child) }
    } else {
      order.append(number)
    }
  }
  visit(root)
  return order
}

func catalogRoot(objects: [Int: RawObject]) -> Int? {
  for object in objects.values where object.dict.range(of: "/Type/Catalog") != nil {
    if let pages = firstMatch(object.dict, pattern: #"/Pages\s+(\d+)\s+0\s+R"#) { return Int(pages) }
  }
  return nil
}

// MARK: Content-stream scanning: tracks the CTM through q/Q/cm so each image `Do` maps to
// its placed rectangle. Text strings and dictionaries are skipped so their contents cannot
// pose as operators; the die maps draw their images directly, so form XObjects are not
// descended into (a missing board or token surfaces in the parser's report).

typealias Matrix = (a: Double, b: Double, c: Double, d: Double, e: Double, f: Double)
let identity: Matrix = (1, 0, 0, 1, 0, 0)

/// The composition that applies `first`, then `second`: the concatenation `cm` performs.
func concat(_ first: Matrix, _ second: Matrix) -> Matrix {
  (
    first.a * second.a + first.c * second.b,
    first.b * second.a + first.d * second.b,
    first.a * second.c + first.c * second.d,
    first.b * second.c + first.d * second.d,
    first.a * second.e + first.c * second.f + first.e,
    first.b * second.e + first.d * second.f + first.f
  )
}

func apply(_ matrix: Matrix, _ x: Double, _ y: Double) -> (Double, Double) {
  (matrix.a * x + matrix.c * y + matrix.e, matrix.b * x + matrix.d * y + matrix.f)
}

struct Placement {
  let obj: Int
  let x0: Double
  let y0: Double
  let x1: Double
  let y1: Double
}

func imagePlacements(pageObject: RawObject, objects: [Int: RawObject]) -> [Placement] {
  // /Contents is a single stream or an array; they share the graphics state, so the
  // decompressed streams are scanned as one.
  var content = Data()
  if let ref = firstMatch(pageObject.dict, pattern: #"/Contents\s+(\d+)\s+0\s+R"#),
     let number = Int(ref), let streamObject = objects[number] {
    content = inflated(streamObject)
  } else {
    for number in dictRefs(pageObject, "/Contents") {
      guard let streamObject = objects[number] else { continue }
      content += inflated(streamObject)
    }
  }
  let xobjects = xobjectMap(pageObject, objects)
  return scanContent(content, xobjects: xobjects)
}

func inflated(_ object: RawObject) -> Data {
  guard object.dict.range(of: "/FlateDecode") != nil else { return object.stream }
  return inflate(object.stream) ?? object.stream
}

/// Apple's `.zlib` is raw DEFLATE, so the PDF stream's two-byte zlib wrapper is stripped
/// before decoding (tried as-is afterwards, for writers that omit the wrapper).
func inflate(_ data: Data) -> Data? {
  if data.count > 2, let result = (try? (Data(data.dropFirst(2)) as NSData).decompressed(using: .zlib)) as Data? {
    return result
  }
  return (try? (data as NSData).decompressed(using: .zlib)) as Data?
}

private enum Operand {
  case number(Double)
  case name(String)
}

func scanContent(_ content: Data, xobjects: [String: Int]) -> [Placement] {
  let bytes = [UInt8](content)
  var placements: [Placement] = []
  var stack: [Matrix] = []
  var ctm = identity
  var operands: [Operand] = []
  var index = 0
  let count = bytes.count
  while index < count {
    let byte = bytes[index]
    if byte == 0 || (byte >= 9 && byte <= 13) || byte == 32 { index += 1; continue }
    if byte == 37 { // % comment runs to the end of the line
      while index < count && bytes[index] != 10 && bytes[index] != 13 { index += 1 }
      continue
    }
    if byte == 40 { // ( literal string: skip with nesting and backslash escapes
      var depth = 1
      index += 1
      while index < count && depth > 0 {
        if bytes[index] == 92 { index += 2; continue }
        if bytes[index] == 40 { depth += 1 } else if bytes[index] == 41 { depth -= 1 }
        index += 1
      }
      continue
    }
    if byte == 60 { // < hex string or << dictionary
      if index + 1 < count && bytes[index + 1] == 60 {
        index += 2
        while index + 1 < count && !(bytes[index] == 62 && bytes[index + 1] == 62) { index += 1 }
        index = min(index + 2, count)
      } else {
        index += 1
        while index < count && bytes[index] != 62 { index += 1 }
        index = min(index + 1, count)
      }
      continue
    }
    if byte == 62 || byte == 91 || byte == 93 || byte == 123 || byte == 125 { index += 1; continue }
    if byte == 47 { // /Name
      index += 1
      let start = index
      while index < count && !isDelimiter(bytes[index]) { index += 1 }
      operands.append(.name(String(decoding: bytes[start..<index], as: UTF8.self)))
      continue
    }
    if (byte >= 48 && byte <= 57) || byte == 45 || byte == 43 || byte == 46 { // number
      let start = index
      while index < count {
        let current = bytes[index]
        if (current >= 48 && current <= 57) || current == 46 || current == 45 || current == 43 { index += 1 } else { break }
      }
      operands.append(.number(Double(String(decoding: bytes[start..<index], as: UTF8.self)) ?? 0))
      continue
    }
    let start = index // operator: a run of letters
    while index < count {
      let current = bytes[index]
      if (current >= 65 && current <= 90) || (current >= 97 && current <= 122) || current == 39 || current == 42 { index += 1 } else { break }
    }
    guard index > start else { index += 1; continue }
    let op = String(decoding: bytes[start..<index], as: UTF8.self)
    switch op {
    case "q":
      stack.append(ctm)
    case "Q":
      if !stack.isEmpty { ctm = stack.removeLast() }
    case "cm":
      let values = operands.suffix(6).compactMap { operand -> Double? in
        if case .number(let value) = operand { return value } else { return nil }
      }
      if values.count == 6 {
        ctm = concat((values[0], values[1], values[2], values[3], values[4], values[5]), ctm)
      }
    case "Do":
      if case .name(let name)? = operands.last, let obj = xobjects[name] {
        let origin = apply(ctm, 0, 0)
        let corner = apply(ctm, 1, 1)
        placements.append(Placement(obj: obj, x0: origin.0, y0: origin.1, x1: corner.0, y1: corner.1))
      }
    default:
      break
    }
    operands.removeAll(keepingCapacity: true)
  }
  return placements
}

// MARK: Image decoding: JPEG or raw FlateDecode samples; the signature draws the image into
// a 16×16 RGB context and its SMask into a 16×16 grayscale context, giving RGBA bytes the
// parser matches legend icons against map tokens with.

let signatureSize = 24

func decodeCGImage(_ object: RawObject) -> CGImage? {
  if object.dict.range(of: "/DCTDecode") != nil {
    let source = CGImageSourceCreateWithData(object.stream as CFData, nil)
    return source.flatMap { CGImageSourceCreateImageAtIndex($0, 0, nil) }
  }
  guard object.dict.range(of: "/FlateDecode") != nil else { return nil }
  guard let width = firstMatch(object.dict, pattern: #"/Width\s+(\d+)"#).flatMap(Int.init),
        let height = firstMatch(object.dict, pattern: #"/Height\s+(\d+)"#).flatMap(Int.init) else { return nil }
  let samples = inflated(object)
  let bands = object.dict.range(of: "/DeviceRGB") != nil ? 3 : 1
  guard samples.count >= width * height * bands else { return nil }
  let provider = CGDataProvider(data: samples as CFData)!
  let space = bands == 3 ? CGColorSpaceCreateDeviceRGB() : CGColorSpaceCreateDeviceGray()
  return CGImage(
    width: width, height: height, bitsPerComponent: 8, bitsPerPixel: bands * 8, bytesPerRow: width * bands,
    space: space, bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue), provider: provider, decode: nil,
    shouldInterpolate: true, intent: .defaultIntent
  )
}

func signature(_ object: RawObject, objects: [Int: RawObject]) -> [Int]? {
  guard let base = decodeCGImage(object) else { return nil }
  let rgbContext = CGContext(
    data: nil, width: signatureSize, height: signatureSize, bitsPerComponent: 8,
    bytesPerRow: signatureSize * 4, space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
  )
  guard let rgbContext else { return nil }
  rgbContext.interpolationQuality = .high
  rgbContext.draw(base, in: CGRect(x: 0, y: 0, width: signatureSize, height: signatureSize))
  guard let rgbData = rgbContext.data else { return nil }
  var alphaBytes: [UInt8]
  if let smaskRef = firstMatch(object.dict, pattern: #"/SMask\s+(\d+)\s+0\s+R"#),
     let smaskNumber = Int(smaskRef), let smaskObject = objects[smaskNumber],
     let mask = decodeCGImage(smaskObject) {
    let grayContext = CGContext(
      data: nil, width: signatureSize, height: signatureSize, bitsPerComponent: 8,
      bytesPerRow: signatureSize, space: CGColorSpaceCreateDeviceGray(),
      bitmapInfo: CGImageAlphaInfo.none.rawValue
    )
    guard let grayContext, let grayData = grayContext.data else { return nil }
    grayContext.interpolationQuality = .high
    grayContext.draw(mask, in: CGRect(x: 0, y: 0, width: signatureSize, height: signatureSize))
    alphaBytes = [UInt8](UnsafeBufferPointer(start: grayData.assumingMemoryBound(to: UInt8.self), count: signatureSize * signatureSize))
  } else {
    alphaBytes = [UInt8](repeating: 255, count: signatureSize * signatureSize)
  }
  let rgb = UnsafeBufferPointer(start: rgbData.assumingMemoryBound(to: UInt8.self), count: signatureSize * signatureSize * 4)
  var result: [Int] = []
  result.reserveCapacity(signatureSize * signatureSize * 4)
  for pixel in 0..<(signatureSize * signatureSize) {
    result.append(Int(rgb[pixel * 4]))
    result.append(Int(rgb[pixel * 4 + 1]))
    result.append(Int(rgb[pixel * 4 + 2]))
    result.append(Int(alphaBytes[pixel]))
  }
  return result
}

// MARK: Main: PDFKit for text, the raw scan for images, per file.

var documents: [Document] = []
for path in CommandLine.arguments.dropFirst() {
  guard let doc = PDFDocument(url: URL(fileURLWithPath: path)) else {
    FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!)
    continue
  }
  let fileData = (try? Data(contentsOf: URL(fileURLWithPath: path))) ?? Data()
  let objects = scanObjects(fileData)
  let pageObjects = catalogRoot(objects: objects).map { pageTreeOrder(root: $0, objects: objects) } ?? []
  var pages: [Page] = []
  for index in 0..<doc.pageCount {
    guard let page = doc.page(at: index) else { continue }
    let media = page.bounds(for: .mediaBox)
    let raw = page.string ?? ""
    let ns = raw as NSString
    var lines: [String] = []
    var words: [Word] = []
    var lineStart = 0
    while lineStart < ns.length {
      var lineEnd = lineStart
      while lineEnd < ns.length && ns.character(at: lineEnd) != 0x0A { lineEnd += 1 }
      let line = ns
        .substring(with: NSRange(location: lineStart, length: lineEnd - lineStart))
        .trimmingCharacters(in: .whitespaces)
      if !line.isEmpty { lines.append(line) }
      // Word-level bounds: split the line on whitespace and measure each word's selection.
      var wordStart = lineStart
      while wordStart < lineEnd {
        var wordEnd = wordStart
        while wordEnd < lineEnd && ns.character(at: wordEnd) != 0x20 { wordEnd += 1 }
        if wordEnd > wordStart {
          let text = ns.substring(with: NSRange(location: wordStart, length: wordEnd - wordStart))
          if let sel = page.selection(for: NSRange(location: wordStart, length: wordEnd - wordStart)) {
            let r = sel.bounds(for: page)
            words.append(Word(t: text, x: r.midX, y: media.maxY - r.midY))
          }
        }
        wordStart = wordEnd == lineEnd ? lineEnd : wordEnd + 1
      }
      lineStart = lineEnd == ns.length ? lineEnd : lineEnd + 1
    }
    // Images: placements from this page's content stream; signatures for icon-sized ones.
    var images: [PlacedImage] = []
    if index < pageObjects.count, let pageObject = objects[pageObjects[index]] {
      for placement in imagePlacements(pageObject: pageObject, objects: objects) {
        guard let imageObject = objects[placement.obj] else { continue }
        guard let width = firstMatch(imageObject.dict, pattern: #"/Width\s+(\d+)"#).flatMap(Int.init),
              let height = firstMatch(imageObject.dict, pattern: #"/Height\s+(\d+)"#).flatMap(Int.init) else { continue }
        let pw = abs(placement.x1 - placement.x0)
        let ph = abs(placement.y1 - placement.y0)
        let cx = (placement.x0 + placement.x1) / 2
        let cy = (placement.y0 + placement.y1) / 2
        images.append(
          PlacedImage(
            obj: placement.obj, w: width, h: height, x: cx, y: media.maxY - cy, pw: pw, ph: ph,
            sig: pw < 100 && ph < 100 ? signature(imageObject, objects: objects) : nil
          )
        )
      }
    }
    pages.append(Page(page: index + 1, lines: lines, words: words, images: images))
  }
  documents.append(Document(file: path, pages: pages))
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
if let data = try? encoder.encode(documents) {
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}
