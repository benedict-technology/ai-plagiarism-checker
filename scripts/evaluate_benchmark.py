import sys
from pathlib import Path
from pprint import pprint

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.evaluation import evaluate_benchmark


if __name__ == "__main__":
    pprint(evaluate_benchmark())
