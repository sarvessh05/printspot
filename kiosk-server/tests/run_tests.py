import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    print("STARTING TEST RUNNER...")
    retcode = pytest.main(["tests/test_fastapi.py", "-v"])
    sys.exit(retcode)
