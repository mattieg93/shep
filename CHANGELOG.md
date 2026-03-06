# Changelog

All notable changes to Shep will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-28

### Added

- Initial release of Shep - Ollama Model Manager
- Modern React UI with real-time model management
- Model discovery and installation with streaming progress
- Daemon control (start/stop) directly from UI
- Settings panel for custom model paths
- OLLAMA_KEEP_ALIVE timeout configuration via GUI
- Real-time VRAM and model status updates
- One-command launch script with prerequisite checking
- Shep branding with light/dark mode icons
- Comprehensive README with troubleshooting guide
- MIT License
- Contributing guidelines

### Technical Highlights

- Built with React 18 + Tailwind CSS on frontend
- FastAPI backend with Uvicorn server
- Streaming downloads with real-time progress feedback
- Smart Python environment detection
- Auto-dependency installation
- Error handling with helpful user messages

### Browser & Platform Support

- macOS only (initial release)
- Modern browsers (Chrome, Safari, Firefox)
- Responsive design

---

## [Unreleased]

### Planned Features

- [ ] Windows/Linux support
- [ ] Model benchmarking and comparison
- [ ] Prompt templates and history
- [ ] Advanced model configuration
- [ ] Database for tracking model usage
- [ ] Export/import model collections
- [ ] Automated model updates
- [ ] Dark mode toggle
