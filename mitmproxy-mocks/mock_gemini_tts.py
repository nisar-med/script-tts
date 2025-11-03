"""
MITM Proxy Mock Script for Gemini TTS (Text-to-Speech) API

This script intercepts requests to the Gemini TTS API (gemini-2.5-flash-preview-tts model)
and returns mock audio data in base64-encoded PCM format.

Usage:
    mitmproxy -s mock_gemini_tts.py
    or
    mitmdump -s mock_gemini_tts.py
"""

import json
import base64
import struct
import math
from mitmproxy import http


def generate_sine_wave_pcm(duration_seconds: float = 1.0, frequency: float = 440.0, sample_rate: int = 24000) -> bytes:
    """
    Generate a simple sine wave as PCM audio data.
    This creates a basic tone that can be used as mock audio.
    
    Args:
        duration_seconds: Duration of the audio in seconds
        frequency: Frequency of the sine wave in Hz (440 Hz is A4 note)
        sample_rate: Sample rate in Hz (24000 is what Gemini uses)
    
    Returns:
        PCM audio data as bytes (16-bit signed little-endian)
    """
    num_samples = int(sample_rate * duration_seconds)
    pcm_data = bytearray()
    
    for i in range(num_samples):
        # Generate sine wave sample
        t = i / sample_rate
        sample = int(32767 * 0.3 * math.sin(2 * math.pi * frequency * t))
        # Pack as 16-bit signed little-endian
        pcm_data.extend(struct.pack('<h', sample))
    
    return bytes(pcm_data)


def generate_silence_pcm(duration_seconds: float = 0.5, sample_rate: int = 24000) -> bytes:
    """
    Generate silence as PCM audio data.
    
    Args:
        duration_seconds: Duration of silence in seconds
        sample_rate: Sample rate in Hz
    
    Returns:
        PCM audio data as bytes (all zeros)
    """
    num_samples = int(sample_rate * duration_seconds)
    return bytes(num_samples * 2)  # 2 bytes per sample (16-bit)


def generate_mock_audio_for_text(text: str, voice_name: str = "Puck") -> str:
    """
    Generate mock audio data based on text length.
    Returns base64-encoded PCM data.
    
    Args:
        text: The text to "synthesize"
        voice_name: The voice being used (for logging)
    
    Returns:
        Base64-encoded PCM audio data
    """
    # Estimate duration based on text length (rough approximation)
    # Assume ~150 words per minute, ~5 characters per word
    char_count = len(text)
    estimated_duration = max(0.5, (char_count / 5) / 150 * 60)
    
    print(f"[MOCK TTS] Generating {estimated_duration:.2f}s audio for {char_count} characters with voice '{voice_name}'")
    
    # Generate a simple tone (you could also use silence or more complex audio)
    # Using a frequency based on voice name hash for variety
    frequency = 300 + (hash(voice_name) % 300)  # Range: 300-600 Hz
    pcm_data = generate_sine_wave_pcm(duration_seconds=estimated_duration, frequency=frequency)
    
    # Encode to base64
    return base64.b64encode(pcm_data).decode('utf-8')


def extract_text_and_voice_from_request(request_data: dict) -> tuple[str, str]:
    """
    Extract the text content and voice name from the TTS API request.
    
    Returns:
        Tuple of (text_content, voice_name)
    """
    text_content = ""
    voice_name = "Puck"  # Default
    
    try:
        # Extract text from contents
        contents = request_data.get("contents", [])
        if isinstance(contents, list) and len(contents) > 0:
            parts = contents[0].get("parts", [])
            if isinstance(parts, list) and len(parts) > 0:
                text_content = parts[0].get("text", "")
        
        # Extract voice name from config
        config = request_data.get("config", {})
        speech_config = config.get("speechConfig", {})
        voice_config = speech_config.get("voiceConfig", {})
        prebuilt_voice = voice_config.get("prebuiltVoiceConfig", {})
        voice_name = prebuilt_voice.get("voiceName", "Puck")
        
    except Exception as e:
        print(f"[MOCK TTS] Error extracting request data: {e}")
    
    return text_content, voice_name


def request(flow: http.HTTPFlow) -> None:
    """
    Intercept requests to Gemini TTS API and return mock audio responses.
    """
    # Check if this is a Gemini TTS API request
    # Handle both direct calls and proxied calls through Vite
    is_gemini_tts = (
        "generativelanguage.googleapis.com" in flow.request.pretty_host or
        "/v1beta/models/gemini-2.5-flash-preview-tts:" in flow.request.path or
        "gemini-2.5-flash-preview-tts" in flow.request.path
    )
    
    if is_gemini_tts:
        
        print(f"[MOCK TTS] Intercepted Gemini TTS request")
        print(f"[MOCK TTS] URL: {flow.request.pretty_url}")
        
        try:
            # Parse the request body
            request_data = json.loads(flow.request.content.decode('utf-8'))
            
            # Extract text and voice
            text_content, voice_name = extract_text_and_voice_from_request(request_data)
            
            # Strip SSML tags for length estimation
            import re
            text_plain = re.sub(r'<[^>]+>', '', text_content)
            
            print(f"[MOCK TTS] Text preview: {text_plain[:100]}...")
            print(f"[MOCK TTS] Voice: {voice_name}")
            
            # Generate mock audio
            audio_base64 = generate_mock_audio_for_text(text_plain, voice_name)
            
            # Check if this is a streaming request (generateContentStream)
            # Streaming requests use the :streamGenerateContent endpoint
            is_streaming_request = ":streamGenerateContent" in flow.request.path or "streamGenerateContent" in flow.request.path
            
            print(f"[MOCK TTS] Sending audio response (streaming: {is_streaming_request})")
            
            if is_streaming_request:
                # For streaming API, use SSE (Server-Sent Events) format
                # Real API response format: "data: {JSON}\n\n"
                
                response_chunk = {
                    "candidates": [{
                        "content": {
                            "parts": [{
                                "inlineData": {
                                    "mimeType": "audio/L16;codec=pcm;rate=24000",
                                    "data": audio_base64
                                }
                            }],
                            "role": "model"
                        },
                        "finishReason": "STOP",
                        "index": 0
                    }],
                    "usageMetadata": {
                        "promptTokenCount": 50,
                        "candidatesTokenCount": 96,
                        "totalTokenCount": 146,
                        "promptTokensDetails": [{"modality": "TEXT", "tokenCount": 50}],
                        "candidatesTokensDetails": [{"modality": "AUDIO", "tokenCount": 96}]
                    },
                    "modelVersion": "gemini-2.5-flash-preview-tts"
                }
                
                # SSE format: "data: " prefix + JSON + double newline
                response_body = f"data: {json.dumps(response_chunk)}\n\n"
                
                print(f"[MOCK TTS] Streaming SSE response length: {len(response_body)} bytes")
                
                flow.response = http.Response.make(
                    200,
                    response_body.encode('utf-8'),
                    {
                        "Content-Type": "text/event-stream; charset=utf-8",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
            else:
                # Non-streaming API - single complete response
                response_data = {
                    "candidates": [{
                        "content": {
                            "parts": [{
                                "inlineData": {
                                    "mimeType": "audio/pcm",
                                    "data": audio_base64
                                }
                            }],
                            "role": "model"
                        },
                        "finishReason": "STOP",
                        "index": 0,
                        "safetyRatings": []
                    }],
                    "usageMetadata": {
                        "promptTokenCount": 50,
                        "candidatesTokenCount": 0,
                        "totalTokenCount": 50
                    }
                }
                
                response_body = json.dumps(response_data)
                
                flow.response = http.Response.make(
                    200,
                    response_body.encode('utf-8'),
                    {
                        "Content-Type": "application/json; charset=utf-8",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
            
            print(f"[MOCK TTS] Returned mock TTS audio response")
            
        except Exception as e:
            print(f"[MOCK TTS] Error processing request: {e}")
            import traceback
            traceback.print_exc()
            
            # Return error response
            error_response = json.dumps({
                "error": {
                    "code": 500,
                    "message": f"Mock TTS error: {str(e)}",
                    "status": "INTERNAL"
                }
            })
            flow.response = http.Response.make(
                500,
                error_response.encode('utf-8'),
                {"Content-Type": "application/json"}
            )
