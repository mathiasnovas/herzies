import Foundation

// Load the private MediaRemote framework
guard let bundle = CFBundleCreate(kCFAllocatorDefault,
    NSURL(fileURLWithPath: "/System/Library/PrivateFrameworks/MediaRemote.framework")) else {
    print("{\"error\":\"Could not load MediaRemote framework\"}")
    exit(1)
}

// MRMediaRemoteGetNowPlayingInfo
guard let infoPtr = CFBundleGetFunctionPointerForName(bundle,
    "MRMediaRemoteGetNowPlayingInfo" as CFString) else {
    print("{\"error\":\"Could not load MRMediaRemoteGetNowPlayingInfo\"}")
    exit(1)
}

// MRMediaRemoteGetNowPlayingApplicationIsPlaying
guard let playingPtr = CFBundleGetFunctionPointerForName(bundle,
    "MRMediaRemoteGetNowPlayingApplicationIsPlaying" as CFString) else {
    print("{\"error\":\"Could not load playing state function\"}")
    exit(1)
}

typealias GetInfoFunc = @convention(c) (DispatchQueue, @escaping ([String: Any]) -> Void) -> Void
typealias GetPlayingFunc = @convention(c) (DispatchQueue, @escaping (Bool) -> Void) -> Void

let getInfo = unsafeBitCast(infoPtr, to: GetInfoFunc.self)
let getPlaying = unsafeBitCast(playingPtr, to: GetPlayingFunc.self)

let group = DispatchGroup()
var nowPlayingInfo: [String: Any] = [:]
var isPlaying = false

group.enter()
getPlaying(DispatchQueue.main) { playing in
    isPlaying = playing
    group.leave()
}

group.enter()
getInfo(DispatchQueue.main) { info in
    nowPlayingInfo = info
    group.leave()
}

// Pump the main run loop so callbacks fire
DispatchQueue.global().async {
    group.wait()

    var result: [String: Any] = ["isPlaying": isPlaying]

    if let title = nowPlayingInfo["kMRMediaRemoteNowPlayingInfoTitle"] as? String {
        result["title"] = title
    }
    if let artist = nowPlayingInfo["kMRMediaRemoteNowPlayingInfoArtist"] as? String {
        result["artist"] = artist
    }
    if let album = nowPlayingInfo["kMRMediaRemoteNowPlayingInfoAlbum"] as? String {
        result["album"] = album
    }
    if let duration = nowPlayingInfo["kMRMediaRemoteNowPlayingInfoDuration"] as? Double {
        result["duration"] = duration
    }
    if let elapsed = nowPlayingInfo["kMRMediaRemoteNowPlayingInfoElapsedTime"] as? Double {
        result["elapsed"] = elapsed
    }
    if let genre = nowPlayingInfo["kMRMediaRemoteNowPlayingInfoGenre"] as? String {
        result["genre"] = genre
    }

    if let jsonData = try? JSONSerialization.data(withJSONObject: result, options: [.sortedKeys]),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    } else {
        print("{\"error\":\"JSON serialization failed\"}")
    }

    exit(0)
}

// Run the main run loop for up to 3 seconds
RunLoop.main.run(until: Date(timeIntervalSinceNow: 3))
