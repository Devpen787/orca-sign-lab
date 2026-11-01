"""Calibrate the independent DSGS pose-validation toolchain.

This is deliberately not an ORCA linguistic pass. It proves that a pinned
German-to-DSGS reference generator can create a holistic pose and that an
independent pose metric separates that reference from controlled failures.
The next integration gate is an ORCA-URDF-to-MediaPipe landmark adapter.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.metadata
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np
from pose_evaluation.metrics.distance_metric import DistanceMetric
from pose_evaluation.metrics.dtw_metric import DTWDTAIImplementationDistanceMeasure
from pose_evaluation.metrics.pose_processors import (
    FillMaskedOrInvalidValuesPoseProcessor,
    GetHandsOnlyHolisticPoseProcessor,
    ReducePosesToCommonComponentsProcessor,
)
from pose_format import Pose


UPSTREAM_REVISION = "259aacd6b0f268ccc6ed239e46f1c44beb056852"
RAW_ROOT = (
    "https://raw.githubusercontent.com/sign-language-processing/"
    f"spoken-to-signed-translation/{UPSTREAM_REVISION}/assets/dummy_lexicon"
)
ASSETS = {
    "index.csv": "60120b8d66d60bd31c18f6d341438116a5e2b4378751becf442cd8efca8e7e4d",
    "sgg/essen.pose": "c945c5eeae71d283ddce84010bc44082de39ee198996370741dc8a1a1ce74a13",
    "sgg/kinder.pose": "9e7721a6cc12cf7c68018cf8e8526aa88622461791c6e9a61da3e0d6a9fd1499",
    "sgg/kleine.pose": "f9fce617b1a8db02514814dd091c521abc2fc30376294ccc9aa4bc4aebfd1247",
    "sgg/pizza.pose": "b29adda6ae1360ceb294dc023951670087b71885d3ed14d6ca9fad75fcae67f4",
}
REFERENCE_TEXT = "Kleine Kinder essen Pizza in Zürich"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def fetch_verified_assets(lexicon: Path) -> None:
    for relative_path, expected_hash in ASSETS.items():
        target = lexicon / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or sha256(target) != expected_hash:
            request = urllib.request.Request(
                f"{RAW_ROOT}/{relative_path}",
                headers={"User-Agent": "orca-sign-motion-validation/0.1"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                target.write_bytes(response.read())
        actual_hash = sha256(target)
        if actual_hash != expected_hash:
            raise RuntimeError(
                f"Reference hash mismatch for {relative_path}: "
                f"expected {expected_hash}, received {actual_hash}"
            )


def component_offsets(pose: Pose) -> dict[str, tuple[int, int]]:
    offsets: dict[str, tuple[int, int]] = {}
    start = 0
    for component in pose.header.components:
        end = start + len(component.points)
        offsets[component.name] = (start, end)
        start = end
    return offsets


def create_adversarial_fixtures(reference: Pose) -> dict[str, Pose]:
    offsets = component_offsets(reference)
    fixtures = {"self_match": copy.deepcopy(reference)}

    collapsed = copy.deepcopy(reference)
    right_start, right_end = offsets["RIGHT_HAND_LANDMARKS"]
    wrist = collapsed.body.data[:, :, right_start : right_start + 1, :].copy()
    collapsed.body.data[:, :, right_start:right_end, :] = np.repeat(
        wrist, right_end - right_start, axis=2
    )
    fixtures["collapsed_dominant_hand"] = collapsed

    reversed_motion = copy.deepcopy(reference)
    reversed_motion.body.data = reversed_motion.body.data[::-1].copy()
    reversed_motion.body.confidence = reversed_motion.body.confidence[::-1].copy()
    fixtures["reversed_motion"] = reversed_motion

    frozen_support = copy.deepcopy(reference)
    left_start, left_end = offsets["LEFT_HAND_LANDMARKS"]
    first_left = frozen_support.body.data[0:1, :, left_start:left_end, :].copy()
    frozen_support.body.data[:, :, left_start:left_end, :] = np.repeat(
        first_left, frozen_support.body.data.shape[0], axis=0
    )
    fixtures["frozen_support_hand"] = frozen_support
    return fixtures


def generate_reference(lexicon: Path, output: Path, coverage: Path) -> str:
    cli = Path(sys.executable).with_name("text_to_gloss_to_pose")
    if not cli.exists():
        raise RuntimeError(
            "text_to_gloss_to_pose is missing. Install validation/requirements.txt "
            "inside the active Python 3.12 virtual environment."
        )
    command = [
        str(cli),
        "--text",
        REFERENCE_TEXT,
        "--glosser",
        "simple",
        "--lexicon",
        str(lexicon),
        "--spoken-language",
        "de",
        "--signed-language",
        "sgg",
        "--pose",
        str(output),
        "--coverage-stats",
        str(coverage),
    ]
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    return completed.stdout


def evaluate(reference: Pose) -> dict[str, float]:
    # use_fast=False avoids an optional native dtaidistance extension and keeps
    # this calibration runnable on a clean macOS Python 3.12 environment.
    metric = DistanceMetric(
        name="DTWp",
        distance_measure=DTWDTAIImplementationDistanceMeasure(use_fast=False),
        pose_preprocessors=[
            GetHandsOnlyHolisticPoseProcessor(),
            FillMaskedOrInvalidValuesPoseProcessor(masked_fill_value=10.0),
            ReducePosesToCommonComponentsProcessor(),
        ],
    )
    return {
        name: float(metric.score(candidate, reference))
        for name, candidate in create_adversarial_fixtures(reference).items()
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, default=Path(".validation-cache"))
    args = parser.parse_args()

    if sys.version_info >= (3, 14):
        raise RuntimeError(
            "The pinned pose stack is not compatible with Python 3.14. "
            "Use Python 3.12 as documented in validation/README.md."
        )

    cache = args.cache.resolve()
    lexicon = cache / "lexicon"
    reference_path = cache / "generated-reference.pose"
    coverage_path = cache / "coverage.json"
    result_path = cache / "toolchain-result.json"
    cache.mkdir(parents=True, exist_ok=True)

    fetch_verified_assets(lexicon)
    generator_stdout = generate_reference(lexicon, reference_path, coverage_path)
    reference = Pose.read(reference_path.read_bytes())
    scores = evaluate(reference)

    discrimination_pass = (
        abs(scores["self_match"]) < 1e-9
        and all(score > 1.0 for name, score in scores.items() if name != "self_match")
    )
    coverage = json.loads(coverage_path.read_text())
    result = {
        "status": "CALIBRATION_PASS" if discrimination_pass else "CALIBRATION_FAIL",
        "scope": "TOOLCHAIN_ONLY_NOT_ORCA_LINGUISTIC_VALIDATION",
        "reference": {
            "text": REFERENCE_TEXT,
            "language": "German to DSGS (sgg)",
            "upstream_revision": UPSTREAM_REVISION,
            "frames": int(reference.body.data.shape[0]),
            "fps": float(reference.body.fps),
            "duration_seconds": round(reference.body.data.shape[0] / reference.body.fps, 2),
            "components": [component.name for component in reference.header.components],
            "coverage": coverage,
        },
        "metric": {
            "name": "DTWp",
            "direction": "lower_is_closer",
            "scores": scores,
            "preprocessing_note": "hands only; trim processor omitted due pinned upstream API mismatch",
        },
        "packages": {
            name: importlib.metadata.version(name)
            for name in (
                "spoken-to-signed",
                "pose-evaluation",
                "pose-format",
                "numpy",
                "dtaidistance",
            )
        },
        "generator_stdout_tail": generator_stdout.strip().splitlines()[-4:],
        "next_gate": "Calibrate robot-to-reference thresholds with labelled signer-reviewed examples; current browser distances remain unbenchmarked.",
    }
    result_path.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return 0 if discrimination_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
