"""Export compact, source-pinned DSGS hand traces for the browser validator.

The source `.pose` files contain holistic MediaPipe data. The browser only gets
the two 21-point hand components, sampled uniformly and retaining confidence.
Body and face landmarks are intentionally not copied because the ORCA hand rig
cannot produce them.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from pose_format import Pose


UPSTREAM_REVISION = "259aacd6b0f268ccc6ed239e46f1c44beb056852"
SOURCE_REPOSITORY = "https://github.com/sign-language-processing/spoken-to-signed-translation"
SOURCE_FILES = {
    "KLEINE": ("kleine.pose", "f9fce617b1a8db02514814dd091c521abc2fc30376294ccc9aa4bc4aebfd1247"),
    "KINDER": ("kinder.pose", "9e7721a6cc12cf7c68018cf8e8526aa88622461791c6e9a61da3e0d6a9fd1499"),
    "ESSEN": ("essen.pose", "c945c5eeae71d283ddce84010bc44082de39ee198996370741dc8a1a1ce74a13"),
    "PIZZA": ("pizza.pose", "b29adda6ae1360ceb294dc023951670087b71885d3ed14d6ca9fad75fcae67f4"),
}
SAMPLE_COUNT = 15


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def component_slice(pose: Pose, component_name: str) -> slice:
    start = 0
    for component in pose.header.components:
        end = start + len(component.points)
        if component.name == component_name:
            return slice(start, end)
        start = end
    raise KeyError(f"Missing pose component: {component_name}")


def valid_frames(pose: Pose, component_name: str) -> np.ndarray:
    hand_slice = component_slice(pose, component_name)
    data = pose.body.data[:, 0, hand_slice, :]
    confidence = pose.body.confidence[:, 0, hand_slice]
    unmasked = ~np.ma.getmaskarray(data).any(axis=(1, 2))
    confidence_values = np.asarray(np.ma.filled(confidence, 0.0))
    return np.flatnonzero(unmasked & (confidence_values.mean(axis=1) >= 0.2))


def sampled_hand(
    pose: Pose,
    component_name: str,
    shared_valid_frames: np.ndarray,
) -> list[dict[str, object]]:
    hand_slice = component_slice(pose, component_name)
    sample_slots = np.linspace(0, len(shared_valid_frames) - 1, SAMPLE_COUNT).round().astype(int)
    indices = shared_valid_frames[sample_slots]
    result: list[dict[str, object]] = []
    for sample_index, frame_index in enumerate(indices):
        points = pose.body.data[frame_index, 0, hand_slice, :]
        confidence = pose.body.confidence[frame_index, 0, hand_slice]
        result.append(
            {
                "at": round(sample_index / (SAMPLE_COUNT - 1), 6),
                "points": [
                    [round(float(coordinate), 6) for coordinate in point]
                    for point in points
                ],
                "meanConfidence": round(float(np.mean(confidence)), 6),
            }
        )
    return result


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    source_dir = root / ".validation-cache" / "lexicon" / "sgg"
    destination = root / "src" / "demo" / "data" / "dsgsWordReferences.json"
    words: dict[str, object] = {}

    for gloss, (filename, expected_hash) in SOURCE_FILES.items():
        source = source_dir / filename
        if not source.exists():
            raise FileNotFoundError(
                f"{source} is missing. Run validation/run_toolchain_spike.py first."
            )
        actual_hash = sha256(source)
        if actual_hash != expected_hash:
            raise RuntimeError(
                f"Reference hash mismatch for {filename}: expected {expected_hash}, got {actual_hash}"
            )
        pose = Pose.read(source.read_bytes())
        left_valid = valid_frames(pose, "LEFT_HAND_LANDMARKS")
        right_valid = valid_frames(pose, "RIGHT_HAND_LANDMARKS")
        left_available = len(left_valid) >= SAMPLE_COUNT
        if not len(right_valid) >= SAMPLE_COUNT:
            raise RuntimeError(f"{filename} has too few valid dominant-hand frames")
        shared_valid = (
            np.intersect1d(left_valid, right_valid)
            if left_available
            else right_valid
        )
        if len(shared_valid) < SAMPLE_COUNT:
            raise RuntimeError(f"{filename} has too few shared valid hand frames")
        words[gloss] = {
            "sourceFile": filename,
            "sourceSha256": actual_hash,
            "fps": float(pose.body.fps),
            "sourceFrames": int(pose.body.data.shape[0]),
            "availableHands": ["left", "right"] if left_available else ["right"],
            "hands": {
                "left": (
                    sampled_hand(pose, "LEFT_HAND_LANDMARKS", shared_valid)
                    if left_available
                    else []
                ),
                "right": sampled_hand(pose, "RIGHT_HAND_LANDMARKS", shared_valid),
            },
        }

    payload = {
        "meta": {
            "repository": SOURCE_REPOSITORY,
            "revision": UPSTREAM_REVISION,
            "license": "MIT",
            "signedLanguage": "sgg / DSGS",
            "format": "MediaPipe Holistic hand landmarks",
            "samplesPerWord": SAMPLE_COUNT,
            "scope": "hands only; body, face, absolute signing location and linguistic correctness unsupported",
        },
        "words": words,
    }
    destination.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"Wrote {destination.relative_to(root)} with {len(words)} source-pinned word traces")


if __name__ == "__main__":
    main()
