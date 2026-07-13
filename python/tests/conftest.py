import os
import sys

# Put the python/ package dir on sys.path so tests can `import models`,
# `import regions`, `import datastore`, etc. — the same way main.py does at runtime.
_PYTHON_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _PYTHON_DIR not in sys.path:
    sys.path.insert(0, _PYTHON_DIR)
