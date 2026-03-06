# Contributing to Shep

First off, thanks for considering contributing to Shep! It's people like you that make Shep such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps which reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots and animated GIFs if possible**
* **Include your environment details**: macOS version, Python version, Node version, etc.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and expected behavior**
* **Explain why this enhancement would be useful**

### Pull Requests

* Fill in the required template
* Follow the styleguides
* Include appropriate test cases
* End all files with a newline

## Development Setup

### Prerequisites

- Python 3.8+
- Node.js 16+
- Ollama installed on macOS

### Getting Started

```bash
# Clone the repository
git clone https://github.com/mattgraham93/shep.git
cd shep/quick_tools/ollama_manager

# Install Python dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Install Node dependencies
npm install

# Run the dev server
./launch.sh
```

### Project Structure

```
.
├── backend.py              # FastAPI server
├── requirements.txt        # Python dependencies
├── package.json            # Node dependencies
├── src/
│   ├── App.jsx            # Main React component
│   ├── index.css          # Global styles
│   ├── main.jsx           # React entry point
│   └── components/        # Reusable UI components
│       ├── DaemonStatus.jsx
│       ├── ModelsTable.jsx
│       ├── SearchModal.jsx
│       ├── PullProgressModal.jsx
│       └── SettingsPanel.jsx
├── public/
│   └── assets/branding/   # Logo and icons
└── vite.config.js         # Vite configuration
```

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

Example:
```
Add real-time model status updates

- Poll daemon every 5 seconds
- Display VRAM usage per model
- Cache results to avoid redundant requests

Fixes #123
```

### JavaScript/React Style Guide

* Use 2-space indentation (enforced by .editorconfig)
* Use single quotes for strings
* Use functional components with hooks
* Write descriptive component documentation
* Use meaningful variable names

### Python Style Guide

* Follow PEP 8
* Use 4-space indentation (enforced by .editorconfig)
* Add docstrings to functions and classes
* Use type hints where applicable
* Max line length: 100 characters

### CSS/Tailwind

* Use Tailwind CSS utility classes instead of custom CSS
* Follow mobile-first responsive design
* Use consistent spacing values
* Reference design system colors

## Running Tests

Currently, manual testing is required. To verify changes:

```bash
# Test backend endpoints
curl http://localhost:8000/api/health
curl http://localhost:8000/api/models

# Test frontend by running in browser
# Open http://localhost:5173
```

## Questions?

Feel free to open an issue with the `[question]` tag, or reach out to the maintainer.

---=
