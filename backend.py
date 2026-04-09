"""
Shep - Ollama Manager Backend
FastAPI server for Ollama daemon and model management

Endpoints:
  - GET /api/models - List all models
  - POST /api/daemon/start - Start Ollama daemon
  - POST /api/daemon/stop - Stop daemon and clear VRAM
  - GET /api/daemon/status - Check daemon status
  - POST /api/models/pull - Stream download progress
  - POST /api/models/delete - Delete a model
  - POST /api/models/cancel-pull - Cancel ongoing download
  - GET /api/settings - Read ~/.zshrc settings
  - POST /api/settings - Update ~/.zshrc settings
  - GET /api/library/models - Get curated model list
  - GET /api/health - Health check

Requirements:
  - Ollama must be installed and accessible via 'ollama' command
  - FastAPI, Uvicorn, Requests Python packages
"""

import subprocess
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
import os
import re
import shutil
import time
from pathlib import Path

app = FastAPI()

# Enable CORS for local React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_API_URL = "http://localhost:11434"


def check_daemon_status() -> dict:
    """Check if Ollama daemon is running"""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/tags", timeout=5)
        return {
            "running": response.status_code == 200,
            "status": "running" if response.status_code == 200 else "stopped",
        }
    except (requests.ConnectionError, requests.Timeout):
        return {"running": False, "status": "stopped"}
    except Exception:
        return {"running": False, "status": "stopped"}


@app.get("/api/daemon/status")
async def get_daemon_status():
    """Get daemon status"""
    return check_daemon_status()


@app.get("/api/models")
async def list_models():
    """List all local models with their status"""
    daemon_status = check_daemon_status()

    if not daemon_status["running"]:
        return {
            "daemon": daemon_status,
            "models": [],
            "error": "Ollama daemon is not running",
        }

    try:
        # Get list of all models
        response = requests.get(f"{OLLAMA_API_URL}/api/tags", timeout=10)
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch models")

        data = response.json()
        models = []

        # Get list of currently loaded models with timing data
        loaded_models = {}
        try:
            ps_response = requests.get(f"{OLLAMA_API_URL}/api/ps", timeout=5)
            if ps_response.status_code == 200:
                ps_data = ps_response.json()
                for running_model in ps_data.get("models", []):
                    model_name = running_model.get("name", "")
                    # Store the full model info for loaded models
                    loaded_models[model_name] = {
                        "loaded": True,
                        "expires_at": running_model.get("expires_at", ""),
                        "size_vram": running_model.get("size_vram", 0),  # Actual VRAM being used
                    }
        except Exception:
            # /api/ps might not be available in older Ollama versions
            pass

        for model in data.get("models", []):
            name = model.get("name", "").split(":")[0]  # Remove tag
            model_full_name = model.get("name")
            is_loaded = model_full_name in loaded_models
            
            # Use actual VRAM from running process if loaded, otherwise use model metadata
            vram_size = 0
            if is_loaded:
                vram_size = loaded_models[model_full_name].get("size_vram", 0)
            else:
                vram_size = model.get("size_vram", 0)
            
            model_info = {
                "id": model_full_name,
                "name": name,
                "tag": model_full_name.split(":")[-1] if ":" in model_full_name else "latest",
                "size": model.get("size", 0),
                "size_vram": vram_size,
                "modified_at": model.get("modified_at", ""),
                "loaded": is_loaded,
            }
            
            # Add expiry info if model is loaded
            if is_loaded and loaded_models[model_full_name].get("expires_at"):
                model_info["expires_at"] = loaded_models[model_full_name]["expires_at"]
            
            models.append(model_info)

        return {
            "daemon": daemon_status,
            "models": sorted(models, key=lambda x: x["name"]),
        }
    except requests.Timeout:
        return {
            "daemon": daemon_status,
            "models": [],
            "error": "Timeout: Ollama daemon is slow to respond. Try again.",
        }
    except requests.RequestException as e:
        return {
            "daemon": daemon_status,
            "models": [],
            "error": f"Connection error: {str(e)}",
        }


@app.post("/api/models/{model_name}/stop")
async def stop_model(model_name: str):
    """Stop/unload a specific model (free RAM) - Not directly supported by Ollama"""
    daemon_status = check_daemon_status()

    if not daemon_status["running"]:
        raise HTTPException(status_code=503, detail="Ollama daemon is not running")

    raise HTTPException(
        status_code=501,
        detail="Ollama does not support unloading individual models via API. Models automatically unload after 5 minutes of inactivity. To free RAM immediately, stop the entire daemon.",
    )


@app.delete("/api/models/{model_name}")
async def delete_model(model_name: str):
    """Delete a model from local storage"""
    daemon_status = check_daemon_status()

    if not daemon_status["running"]:
        raise HTTPException(status_code=503, detail="Ollama daemon is not running")

    try:
        response = requests.delete(
            f"{OLLAMA_API_URL}/api/delete",
            json={"name": model_name},
            timeout=10,
        )

        if response.status_code == 200:
            return {"success": True, "message": f"Model {model_name} deleted"}
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to delete model: {response.text}",
            )
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@app.get("/api/library/models")
async def get_library_models():
    """Fetch comprehensive list of models from Ollama.com library"""
    
    # Try to fetch from Ollama.com library with data
    try:
        response = requests.get(
            "https://ollama.com/library",
            timeout=10,
            headers={"User-Agent": "Shep-OllamaManager"}
        )
        if response.status_code == 200:
            html = response.text
            # Look for model cards or list data in the page
            models = []
            
            # Try to extract from JSON embedded in page
            import re as regex
            
            # Look for model names in hrefs like /library/modelname
            pattern = r'href=["\']?/library/([a-z0-9\-\.]+)'
            matches = regex.findall(pattern, html)
            
            if matches:
                seen = set()
                for model_name in matches:
                    # Skip common non-model URLs
                    if model_name not in seen and model_name not in ['blog', 'docs', 'faq']:
                        seen.add(model_name)
                        models.append({
                            "name": model_name,
                            "size": "Unknown",
                            "url": f"https://ollama.com/library/{model_name}"
                        })
                
                if models and len(models) > 5:
                    return {"models": models}
    except Exception as e:
        print(f"Failed to fetch from Ollama.com: {e}")
    
    # Try Ollama API endpoint for models
    try:
        response = requests.get(
            "https://api.ollama.ai/api/models",
            timeout=10,
            headers={"User-Agent": "Shep-OllamaManager"}
        )
        if response.status_code == 200:
            data = response.json()
            models = []
            for item in data.get("models", []):
                name = item.get("name", "").split(":")[0]
                if name and not any(m['name'] == name for m in models):
                    models.append({
                        "name": name,
                        "size": item.get("size", "Unknown"),
                        "url": f"https://ollama.com/library/{name}"
                    })
            if models:
                return {"models": models}
    except Exception as e:
        print(f"Failed to fetch from Ollama API: {e}")
    
    # Try Hugging Face as last resort
    try:
        response = requests.get(
            "https://huggingface.co/api/models",
            timeout=10,
            params={
                "sort": "downloads",
                "direction": -1,
                "limit": 80,
                "filter": "text-generation"
            },
            headers={"User-Agent": "Shep-OllamaManager"}
        )
        if response.status_code == 200:
            hf_models = response.json()
            if isinstance(hf_models, list):
                models = []
                for model in hf_models:
                    model_id = model.get("id", "")
                    if model_id:
                        models.append({
                            "name": model_id.split('/')[-1][:30],
                            "desc": model.get("description", "")[:100] or "Model from Hugging Face",
                            "size": "Unknown",
                            "url": f"https://huggingface.co/{model_id}"
                        })
                if models:
                    return {"models": models}
    except Exception as e:
        print(f"Failed to fetch from Hugging Face: {e}")
    
    # Return empty list if all sources fail
    return {"models": []}


@app.get("/api/library/models/{model_name}/tags")
async def get_model_tags(model_name: str):
    """Fetch available parameter-count variants for a specific model from Ollama library"""
    import re as regex

    def param_sort_key(tag: str) -> float:
        num = float(regex.sub(r'[^\d.]', '', tag))
        return num / 1000 if tag.lower().endswith('m') else num

    try:
        response = requests.get(
            f"https://ollama.com/library/{model_name}",
            timeout=8,
            headers={"User-Agent": "Shep-OllamaManager"}
        )
        if response.status_code == 200:
            html = response.text
            # Match href="/library/{model_name}:{tag}" patterns
            pattern = rf'href=["\']?/library/{regex.escape(model_name)}:([a-zA-Z0-9][a-zA-Z0-9\-\.]*)'
            tags_found = regex.findall(pattern, html)
            # Filter to parameter-count only: e.g. 1b, 7b, 3.8b, 300m
            param_pattern = regex.compile(r'^\d+(\.\d+)?[bm]$', regex.IGNORECASE)
            filtered = list({t.lower() for t in tags_found if param_pattern.match(t)})
            filtered.sort(key=param_sort_key)
            return {"tags": filtered}
    except Exception as e:
        print(f"Failed to fetch tags for {model_name}: {e}")

    return {"tags": []}


@app.post("/api/models/cancel-pull")
async def cancel_pull(model_name: str):
    """Cancel an ongoing pull operation"""
    try:
        # Send stop request to Ollama daemon
        response = requests.post(
            f"{OLLAMA_API_URL}/api/stop",
            json={"name": model_name},
            timeout=5,
        )
        return {"success": True, "message": f"Cancelled pull for {model_name}"}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.post("/api/models/pull")
async def pull_model(model_name: str):
    """Pull/download a model from Ollama library with streaming progress"""
    daemon_status = check_daemon_status()

    if not daemon_status["running"]:
        raise HTTPException(status_code=503, detail="Ollama daemon is not running")

    try:
        response = requests.post(
            f"{OLLAMA_API_URL}/api/pull",
            json={"name": model_name, "stream": True},
            timeout=300,
            stream=True,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to pull model: {response.text}",
            )

        def generate():
            """Stream progress updates from Ollama API"""
            try:
                for line in response.iter_lines():
                    if line:
                        decoded = line.decode('utf-8')
                        yield decoded + '\n'
            except Exception as e:
                yield json.dumps({
                    "error": str(e),
                    "status": "error"
                }).encode('utf-8') + b'\n'

        return StreamingResponse(generate(), media_type="text/event-stream")
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Pull failed: {str(e)}")


@app.post("/api/daemon/start")
async def start_daemon():
    """Attempt to start Ollama daemon on macOS"""
    try:
        # First check if it's already running
        status = check_daemon_status()
        if status["running"]:
            return {"success": True, "message": "Daemon is already running"}
        
        # Try launchctl first
        subprocess.run(
            ["launchctl", "start", "ai.ollama.ollama"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        
        # Wait and check if launchctl worked
        for attempt in range(8):
            await asyncio.sleep(1)
            status = check_daemon_status()
            if status["running"]:
                return {"success": True, "message": "Daemon started successfully"}
        
        # launchctl didn't work, try starting ollama serve directly
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        
        # Wait for it to start
        for attempt in range(8):
            await asyncio.sleep(1)
            status = check_daemon_status()
            if status["running"]:
                return {"success": True, "message": "Daemon started successfully"}
        
        raise HTTPException(
            status_code=500,
            detail="Daemon did not start. Try starting Ollama from Applications or terminal with: ollama serve",
        )
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Timeout: daemon start took too long")
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=500,
            detail="Ollama not found - ensure it's installed and in your PATH",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start daemon: {str(e)}",
        )


@app.post("/api/daemon/stop")
async def stop_daemon():
    """Stop Ollama daemon on macOS"""
    try:
        # Try killall first (most reliable on macOS)
        result = subprocess.run(
            ["killall", "ollama"],
            capture_output=True,
            timeout=5,
        )
        if result.returncode == 0:
            return {"success": True, "message": "Daemon stopped"}
        else:
            # If killall fails, try launchctl as fallback
            try:
                subprocess.run(
                    ["launchctl", "stop", "ai.ollama.ollama"],
                    check=True,
                    timeout=5,
                )
                return {"success": True, "message": "Daemon stopping"}
            except subprocess.CalledProcessError:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to stop daemon. Try stopping Ollama from Applications or Activity Monitor.",
                )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Timeout while stopping daemon")
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="killall/launchctl not found - try stopping Ollama from Applications",
        )


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


_update_cache: dict = {"data": None, "checked_at": 0}
_UPDATE_CACHE_TTL = 3600  # 1 hour


@app.get("/api/update-check")
async def update_check():
    """Check whether a newer version of Ollama is available."""
    global _update_cache

    # Return cached result if still fresh
    if _update_cache["data"] is not None and time.time() - _update_cache["checked_at"] < _UPDATE_CACHE_TTL:
        return _update_cache["data"]

    _no_update = {"update_available": False}

    # Get installed version from local daemon
    try:
        v_resp = requests.get(f"{OLLAMA_API_URL}/api/version", timeout=5)
        if v_resp.status_code != 200:
            return _no_update
        current_version = v_resp.json().get("version", "").lstrip("v")
        if not current_version:
            return _no_update
    except Exception:
        return _no_update

    # Get latest release from GitHub
    try:
        gh_resp = requests.get(
            "https://api.github.com/repos/ollama/ollama/releases/latest",
            timeout=8,
            headers={"Accept": "application/vnd.github+json", "User-Agent": "Shep-OllamaManager"},
        )
        if gh_resp.status_code != 200:
            return _no_update
        latest_version = gh_resp.json().get("tag_name", "").lstrip("v")
        if not latest_version:
            return _no_update
    except Exception:
        return _no_update

    # Compare using tuple of ints to avoid string ordering bugs ("0.9" vs "0.10")
    def semver_tuple(v: str):
        try:
            return tuple(int(x) for x in v.split("."))
        except ValueError:
            return (0,)

    update_available = semver_tuple(latest_version) > semver_tuple(current_version)

    if not update_available:
        result = {"update_available": False, "current_version": current_version, "latest_version": latest_version}
        _update_cache = {"data": result, "checked_at": time.time()}
        return result

    # Detect install method to give a tailored upgrade message
    if Path("/Applications/Ollama.app").exists():
        install_method = "app"
        upgrade_message = "Click the Ollama icon in your menu bar and choose \"Check for Updates\", or download from ollama.com"
    elif shutil.which("ollama") and "homebrew" in (shutil.which("ollama") or "").lower():
        install_method = "brew"
        upgrade_message = "Run `brew upgrade ollama` in your terminal, then restart Ollama"
    else:
        install_method = "other"
        upgrade_message = "Visit ollama.com to download the latest version"

    result = {
        "update_available": True,
        "current_version": current_version,
        "latest_version": latest_version,
        "install_method": install_method,
        "upgrade_message": upgrade_message,
    }
    _update_cache = {"data": result, "checked_at": time.time()}
    return result


@app.get("/api/settings")
async def get_settings():
    """Get current Ollama settings from ~/.zshrc"""
    try:
        zshrc_path = Path.home() / ".zshrc"
        
        if not zshrc_path.exists():
            return {
                "ollama_models": None,
                "ollama_keep_alive": None,
                "error": None
            }
        
        content = zshrc_path.read_text()
        
        # Extract OLLAMA_MODELS
        models_match = re.search(r'export\s+OLLAMA_MODELS\s*=\s*["\']?([^"\']*)["\']?', content)
        ollama_models = models_match.group(1) if models_match else None
        
        # Extract OLLAMA_KEEP_ALIVE
        keep_alive_match = re.search(r'export\s+OLLAMA_KEEP_ALIVE\s*=\s*["\']?([^"\']*)["\']?', content)
        ollama_keep_alive = keep_alive_match.group(1) if keep_alive_match else None
        
        return {
            "ollama_models": ollama_models,
            "ollama_keep_alive": ollama_keep_alive,
            "error": None
        }
    except Exception as e:
        return {
            "ollama_models": None,
            "ollama_keep_alive": None,
            "error": str(e)
        }


@app.post("/api/settings")
async def update_settings(ollama_models: str = None, ollama_keep_alive: str = None):
    """Update Ollama settings in ~/.zshrc"""
    try:
        zshrc_path = Path.home() / ".zshrc"
        
        if not zshrc_path.exists():
            raise HTTPException(status_code=404, detail="~/.zshrc not found")
        
        content = zshrc_path.read_text()
        
        # Update OLLAMA_MODELS if provided
        if ollama_models is not None:
            if ollama_models.strip():
                # Replace or add OLLAMA_MODELS
                if 'OLLAMA_MODELS' in content:
                    content = re.sub(
                        r'export\s+OLLAMA_MODELS\s*=\s*["\']?[^"\']*["\']?',
                        f'export OLLAMA_MODELS="{ollama_models}"',
                        content
                    )
                else:
                    content += f'\nexport OLLAMA_MODELS="{ollama_models}"\n'
            else:
                # Remove OLLAMA_MODELS if empty string provided
                content = re.sub(r'export\s+OLLAMA_MODELS\s*=\s*["\']?[^"\']*["\']?\n?', '', content)
        
        # Update OLLAMA_KEEP_ALIVE if provided
        if ollama_keep_alive is not None:
            if ollama_keep_alive.strip():
                # Replace or add OLLAMA_KEEP_ALIVE
                if 'OLLAMA_KEEP_ALIVE' in content:
                    content = re.sub(
                        r'export\s+OLLAMA_KEEP_ALIVE\s*=\s*["\']?[^"\']*["\']?',
                        f'export OLLAMA_KEEP_ALIVE="{ollama_keep_alive}"',
                        content
                    )
                else:
                    content += f'\nexport OLLAMA_KEEP_ALIVE="{ollama_keep_alive}"\n'
            else:
                # Remove OLLAMA_KEEP_ALIVE if empty string provided
                content = re.sub(r'export\s+OLLAMA_KEEP_ALIVE\s*=\s*["\']?[^"\']*["\']?\n?', '', content)
        
        # Write back to file
        zshrc_path.write_text(content)
        
        return {
            "success": True,
            "message": "Settings updated. Restart your terminal for changes to take effect."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)