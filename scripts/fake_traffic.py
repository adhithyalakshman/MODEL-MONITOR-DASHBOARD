"""
Synthetic traffic generator — use this to test the pipeline end-to-end
without needing a real model.

Usage:
    python scripts/fake_traffic.py --model-id demo-model --api-key <key> --n 500
"""

import argparse
import random
import time
import requests


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--model-id", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--n", type=int, default=500)
    parser.add_argument("--delay", type=float, default=0.05)
    args = parser.parse_args()

    for i in range(args.n):
        features = {
            "age": random.gauss(35, 10),
            "income": random.gauss(50000, 15000),
        }
        payload = {
            "model_id": args.model_id,
            "input_features": features,
            "prediction": random.gauss(0.5, 0.15),
            "latency_ms": random.uniform(20, 90),
        }
        resp = requests.post(
            f"{args.url}/v1/predictions",
            json=payload,
            headers={"X-API-Key": args.api_key},
        )
        if resp.status_code != 200:
            print("Error:", resp.status_code, resp.text)
            break
        if i % 50 == 0:
            print(f"sent {i}/{args.n}")
        time.sleep(args.delay)

    print("done.")


if __name__ == "__main__":
    main()
